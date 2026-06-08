import os
import re
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from sqlalchemy import inspect, text
from sqlalchemy.exc import OperationalError

import models
from api import admin, auth, delivery_profiles, notifications, orders, products, scans
from database import SessionLocal, engine
from observability import setup_observability
from utils.ai_support import infer_ai_class_name

load_dotenv()

# Rate limiter — dùng IP làm key
limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])

models.Base.metadata.create_all(bind=engine)


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", (value or "").strip().lower()).strip("-")
    return slug or "item"


def get_table_columns(table_name: str) -> dict:
    inspector = inspect(engine)
    if table_name not in inspector.get_table_names():
        return {}
    return {column["name"]: column for column in inspector.get_columns(table_name)}


def execute_statements(statements):
    if not statements:
        return

    with engine.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))


def get_postgres_enum_labels(enum_type_name: str) -> set[str]:
    if not str(engine.url).startswith("postgresql"):
        return set()

    with engine.connect() as connection:
        rows = connection.execute(
            text(
                """
                SELECT enumlabel
                FROM pg_type
                JOIN pg_namespace ON pg_namespace.oid = pg_type.typnamespace
                JOIN pg_enum ON pg_enum.enumtypid = pg_type.oid
                WHERE pg_type.typname = :enum_type_name
                  AND pg_namespace.nspname = current_schema()
                ORDER BY pg_enum.enumsortorder
                """
            ),
            {"enum_type_name": enum_type_name},
        ).scalars().all()
    return set(rows)


def get_postgres_column_udt_name(connection, table_name: str, column_name: str) -> str | None:
    if not str(engine.url).startswith("postgresql"):
        return None

    return connection.execute(
        text(
            """
            SELECT udt_name
            FROM information_schema.columns
            WHERE table_schema = current_schema()
              AND table_name = :table_name
              AND column_name = :column_name
            """
        ),
        {"table_name": table_name, "column_name": column_name},
    ).scalar()


def parse_int(value, default=0) -> int:
    try:
        if value is None or value == "":
            return default
        return int(value)
    except (TypeError, ValueError):
        return default


def parse_float(value, default=0.0) -> float:
    try:
        if value is None or value == "":
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def ensure_user_profile_columns():
    """Backfill legacy user schemas so auth/admin flows can still query users."""
    user_cols = get_table_columns("users")
    statements = []

    is_postgres = str(engine.url).startswith("postgresql")

    if "phone" not in user_cols:
        statements.append("ALTER TABLE users ADD COLUMN phone VARCHAR(20)")
    if "role" not in user_cols:
        # PostgreSQL uses the native enum type created by SQLAlchemy (userrole)
        if is_postgres:
            role_labels = get_postgres_enum_labels("userrole")
            default_role = "customer" if "customer" in role_labels or not role_labels else "CUSTOMER"
            statements.append(f"ALTER TABLE users ADD COLUMN role userrole DEFAULT '{default_role}'")
        else:
            statements.append("ALTER TABLE users ADD COLUMN role VARCHAR(20)")
    if "avatar_url" not in user_cols:
        statements.append("ALTER TABLE users ADD COLUMN avatar_url TEXT")
    if "bio" not in user_cols:
        statements.append("ALTER TABLE users ADD COLUMN bio TEXT")
    if "address" not in user_cols:
        statements.append("ALTER TABLE users ADD COLUMN address TEXT")
    if "city" not in user_cols:
        statements.append("ALTER TABLE users ADD COLUMN city VARCHAR(50)")
    if "postal_code" not in user_cols:
        statements.append("ALTER TABLE users ADD COLUMN postal_code VARCHAR(20)")
    if "gender" not in user_cols:
        statements.append("ALTER TABLE users ADD COLUMN gender VARCHAR(20)")
    if "date_of_birth" not in user_cols:
        statements.append("ALTER TABLE users ADD COLUMN date_of_birth VARCHAR(10)")
    if "is_active" not in user_cols:
        default_val = "TRUE" if is_postgres else "1"
        statements.append(f"ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT {default_val}")
    if "is_verified" not in user_cols:
        default_val = "FALSE" if is_postgres else "0"
        statements.append(f"ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT {default_val}")
    if "verification_token" not in user_cols:
        statements.append("ALTER TABLE users ADD COLUMN verification_token VARCHAR(255)")
    if "last_login" not in user_cols:
        ts_type = "TIMESTAMP" if is_postgres else "DATETIME"
        statements.append(f"ALTER TABLE users ADD COLUMN last_login {ts_type}")
    if "loyalty_points" not in user_cols:
        statements.append("ALTER TABLE users ADD COLUMN loyalty_points INTEGER DEFAULT 0")
    if "voucher_balance" not in user_cols:
        statements.append("ALTER TABLE users ADD COLUMN voucher_balance DECIMAL(12, 2) DEFAULT 0")
    # [C2] Password reset columns
    if "password_reset_token" not in user_cols:
        statements.append("ALTER TABLE users ADD COLUMN password_reset_token VARCHAR(255)")
    if "password_reset_expires_at" not in user_cols:
        ts_type = "TIMESTAMP" if is_postgres else "DATETIME"
        statements.append(f"ALTER TABLE users ADD COLUMN password_reset_expires_at {ts_type}")
    # [H1] Token versioning
    if "token_version" not in user_cols:
        statements.append("ALTER TABLE users ADD COLUMN token_version INTEGER DEFAULT 0 NOT NULL")

    if "avatar_url" in user_cols:
        col_type = str(user_cols["avatar_url"]["type"]).upper()
        if "VARCHAR" in col_type or ("CHAR" in col_type and "TEXT" not in col_type):
            if is_postgres:
                statements.append("ALTER TABLE users ALTER COLUMN avatar_url TYPE TEXT")

    execute_statements(statements)

    # PostgreSQL: table was created correctly by SQLAlchemy ORM — no raw enum backfill needed.
    # SQLite: enum is stored as TEXT so lowercase strings are fine.
    if is_postgres:
        return

    user_cols = get_table_columns("users")
    updates = []
    if "role" in user_cols:
        if "is_admin" in user_cols:
            updates.append(
                """
                UPDATE users
                SET role = CASE
                    WHEN COALESCE(is_admin, 0) = 1 THEN 'admin'
                    ELSE 'customer'
                END
                WHERE role IS NULL OR COALESCE(CAST(role AS TEXT), '') = ''
                """
            )
        else:
            updates.append(
                "UPDATE users SET role = 'customer' WHERE role IS NULL OR COALESCE(CAST(role AS TEXT), '') = ''"
            )
    if "is_active" in user_cols:
        updates.append("UPDATE users SET is_active = 1 WHERE is_active IS NULL")
    if "is_verified" in user_cols:
        updates.append("UPDATE users SET is_verified = 0 WHERE is_verified IS NULL")
    if "loyalty_points" in user_cols:
        updates.append("UPDATE users SET loyalty_points = 0 WHERE loyalty_points IS NULL")
    if "voucher_balance" in user_cols:
        updates.append("UPDATE users SET voucher_balance = 0 WHERE voucher_balance IS NULL")

    execute_statements(updates)


def ensure_product_compatibility_columns():
    """Backfill legacy product schemas used by products/admin/warehouse tabs."""
    product_cols = get_table_columns("products")
    statements = []

    is_postgres = str(engine.url).startswith("postgresql")
    ts_type = "TIMESTAMP" if is_postgres else "DATETIME"
    bool_true = "TRUE" if is_postgres else "1"
    bool_false = "FALSE" if is_postgres else "0"

    column_sql = {
        "slug": "ALTER TABLE products ADD COLUMN slug VARCHAR(200)",
        "category_id": "ALTER TABLE products ADD COLUMN category_id INTEGER",
        "discount_price": "ALTER TABLE products ADD COLUMN discount_price DECIMAL(10, 2)",
        "quantity": "ALTER TABLE products ADD COLUMN quantity INTEGER DEFAULT 0",
        "low_stock_threshold": "ALTER TABLE products ADD COLUMN low_stock_threshold INTEGER DEFAULT 5",
        "unit": "ALTER TABLE products ADD COLUMN unit VARCHAR(30) DEFAULT 'kg'",
        "stock_status": "ALTER TABLE products ADD COLUMN stock_status VARCHAR(30) DEFAULT 'in_stock'",
        "sku": "ALTER TABLE products ADD COLUMN sku VARCHAR(50)",
        "image_url": "ALTER TABLE products ADD COLUMN image_url VARCHAR(255)",
        "images": "ALTER TABLE products ADD COLUMN images JSON",
        "review_count": "ALTER TABLE products ADD COLUMN review_count INTEGER DEFAULT 0",
        "origin": "ALTER TABLE products ADD COLUMN origin VARCHAR(100)",
        "harvest_date": f"ALTER TABLE products ADD COLUMN harvest_date {ts_type}",
        "expiry_date": f"ALTER TABLE products ADD COLUMN expiry_date {ts_type}",
        "is_active": f"ALTER TABLE products ADD COLUMN is_active BOOLEAN DEFAULT {bool_true}",
        "is_featured": f"ALTER TABLE products ADD COLUMN is_featured BOOLEAN DEFAULT {bool_false}",
        "ai_supported": f"ALTER TABLE products ADD COLUMN ai_supported BOOLEAN DEFAULT {bool_false}",
        "ai_class_name": "ALTER TABLE products ADD COLUMN ai_class_name VARCHAR(50)",
        "created_at": f"ALTER TABLE products ADD COLUMN created_at {ts_type}",
        "updated_at": f"ALTER TABLE products ADD COLUMN updated_at {ts_type}",
    }

    for column_name, statement in column_sql.items():
        if column_name not in product_cols:
            statements.append(statement)

    execute_statements(statements)

    # PostgreSQL: tables were created correctly by SQLAlchemy ORM — skip integer-literal backfills.
    if is_postgres:
        return

    product_cols = get_table_columns("products")
    updates = []
    if "quantity" in product_cols:
        updates.append("UPDATE products SET quantity = 0 WHERE quantity IS NULL")
    if "low_stock_threshold" in product_cols:
        updates.append("UPDATE products SET low_stock_threshold = 5 WHERE low_stock_threshold IS NULL")
    if "unit" in product_cols:
        updates.append("UPDATE products SET unit = 'kg' WHERE unit IS NULL OR TRIM(unit) = ''")
    if "review_count" in product_cols:
        updates.append("UPDATE products SET review_count = 0 WHERE review_count IS NULL")
    if "is_active" in product_cols:
        updates.append("UPDATE products SET is_active = 1 WHERE is_active IS NULL")
    if "is_featured" in product_cols:
        updates.append("UPDATE products SET is_featured = 0 WHERE is_featured IS NULL")
    if "ai_supported" in product_cols:
        updates.append("UPDATE products SET ai_supported = 0 WHERE ai_supported IS NULL")
    if "created_at" in product_cols:
        updates.append("UPDATE products SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL")
    if "updated_at" in product_cols:
        updates.append("UPDATE products SET updated_at = COALESCE(updated_at, created_at, CURRENT_TIMESTAMP) WHERE updated_at IS NULL")
    if "stock_status" in product_cols:
        updates.append(
            """
            UPDATE products
            SET stock_status = CASE
                WHEN COALESCE(quantity, 0) > 0 THEN 'in_stock'
                ELSE 'out_of_stock'
            END
            WHERE stock_status IS NULL OR TRIM(stock_status) = ''
            """
        )
    if "image_url" in product_cols and "img" in product_cols:
        updates.append(
            """
            UPDATE products
            SET image_url = img
            WHERE (image_url IS NULL OR TRIM(image_url) = '')
              AND img IS NOT NULL
              AND TRIM(img) != ''
            """
        )

    execute_statements(updates)

    category_cols = get_table_columns("categories")
    product_cols = get_table_columns("products")
    if not category_cols or "category_id" not in product_cols:
        return

    with engine.begin() as connection:
        category_rows = connection.execute(
            text("SELECT id, name, slug FROM categories")
        ).mappings().all()
        category_by_name = {str(row["name"]).strip().lower(): row for row in category_rows if row["name"]}
        slug_pool = {str(row["slug"]).strip().lower() for row in category_rows if row["slug"]}

        if "category" in product_cols:
            legacy_categories = connection.execute(
                text(
                    """
                    SELECT DISTINCT category
                    FROM products
                    WHERE category IS NOT NULL AND TRIM(category) != ''
                    """
                )
            ).scalars().all()
            for raw_name in legacy_categories:
                key = str(raw_name).strip().lower()
                if key in category_by_name:
                    continue
                base_slug = slugify(str(raw_name))
                unique_slug = base_slug
                suffix = 1
                while unique_slug.lower() in slug_pool:
                    suffix += 1
                    unique_slug = f"{base_slug}-{suffix}"
                result = connection.execute(
                    text(
                        """
                        INSERT INTO categories (name, slug, is_active, "order", created_at, updated_at)
                        VALUES (:name, :slug, 1, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                        """
                    ),
                    {"name": str(raw_name).strip(), "slug": unique_slug},
                )
                category_by_name[key] = {
                    "id": result.lastrowid,
                    "name": str(raw_name).strip(),
                    "slug": unique_slug,
                }
                slug_pool.add(unique_slug.lower())

            for key, category in category_by_name.items():
                connection.execute(
                    text(
                        """
                        UPDATE products
                        SET category_id = :category_id
                        WHERE (category_id IS NULL OR category_id = 0)
                          AND category IS NOT NULL
                          AND LOWER(TRIM(category)) = :category_key
                        """
                    ),
                    {"category_id": category["id"], "category_key": key},
                )

        fallback_category = category_by_name.get("khac")
        if fallback_category is None:
            result = connection.execute(
                text(
                    """
                    INSERT INTO categories (name, slug, is_active, "order", created_at, updated_at)
                    VALUES ('Khac', 'khac', 1, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    """
                )
            )
            fallback_category = {"id": result.lastrowid}

        connection.execute(
            text(
                """
                UPDATE products
                SET category_id = :fallback_id
                WHERE category_id IS NULL OR category_id = 0
                """
            ),
            {"fallback_id": fallback_category["id"]},
        )

        product_rows = connection.execute(
            text("SELECT id, name, slug FROM products")
        ).mappings().all()
        for row in product_rows:
            if row["slug"] and str(row["slug"]).strip():
                continue
            product_slug = f"{slugify(str(row['name'] or 'product'))}-{row['id']}"
            connection.execute(
                text("UPDATE products SET slug = :slug WHERE id = :product_id"),
                {"slug": product_slug, "product_id": row["id"]},
            )


def normalize_legacy_enum_values():
    """Convert enum names from legacy rows into the lowercase values expected by the ORM."""
    with engine.begin() as connection:
        statements = [
            ("users", "role", {"CUSTOMER": "customer", "STAFF": "staff", "MODERATOR": "moderator", "MANAGER": "manager", "ADMIN": "admin"}),
            ("orders", "status", {"PENDING": "pending", "CONFIRMED": "confirmed", "SHIPPED": "shipped", "DELIVERED": "delivered", "CANCELLED": "cancelled", "RETURNED": "returned"}),
            ("orders", "payment_status", {"PENDING": "pending", "COMPLETED": "completed", "FAILED": "failed", "WAIVED": "waived"}),
            ("scan_results", "status", {"PENDING": "pending", "PROCESSING": "processing", "COMPLETED": "completed", "FAILED": "failed"}),
            ("scan_results", "freshness_level", {"FRESH": "fresh", "GOOD": "good", "MODERATE": "moderate", "EXPIRING": "expiring"}),
            ("freshness_complaints", "complaint_type", {"REFUND": "refund", "REPLACEMENT": "replacement"}),
            ("freshness_complaints", "resolution_status", {"CREATED": "created", "PENDING_REVIEW": "pending_review", "APPROVED": "approved", "REJECTED": "rejected"}),
            ("stock_transactions", "type", {"IMPORT": "import", "EXPORT": "export"}),
        ]

        inspector = inspect(engine)
        existing_tables = set(inspector.get_table_names())
        is_postgres = str(engine.url).startswith("postgresql")

        for table_name, column_name, replacements in statements:
            if table_name not in existing_tables:
                continue

            table_columns = {column["name"] for column in inspector.get_columns(table_name)}
            if column_name not in table_columns:
                continue

            udt_name = get_postgres_column_udt_name(connection, table_name, column_name) if is_postgres else None
            for legacy_value, normalized_value in replacements.items():
                if is_postgres and udt_name:
                    enum_labels = get_postgres_enum_labels(udt_name)
                    if legacy_value in enum_labels and normalized_value not in enum_labels:
                        connection.execute(
                            text(f"ALTER TYPE {udt_name} RENAME VALUE '{legacy_value}' TO '{normalized_value}'")
                        )
                        continue

                    if normalized_value in enum_labels:
                        connection.execute(
                            text(
                                f'UPDATE "{table_name}" '
                                f'SET "{column_name}" = CAST(:normalized AS {udt_name}) '
                                f'WHERE "{column_name}"::text = :legacy'
                            ),
                            {"legacy": legacy_value, "normalized": normalized_value},
                        )
                        continue

                connection.execute(
                    text(f'UPDATE "{table_name}" SET "{column_name}" = :normalized WHERE "{column_name}" = :legacy'),
                    {"legacy": legacy_value, "normalized": normalized_value},
                )


def migrate_legacy_products_table():
    """Rebuild very old SQLite product tables whose column types are incompatible."""
    product_cols = get_table_columns("products")
    if not product_cols:
        return

    price_type = str(product_cols.get("price", {}).get("type", "")).upper()
    has_legacy_shape = "category" in product_cols or "img" in product_cols
    uses_text_price = "CHAR" in price_type or "TEXT" in price_type or "VARCHAR" in price_type
    if not (has_legacy_shape and uses_text_price):
        return

    with engine.begin() as connection:
        category_rows = connection.execute(
            text("SELECT id, name, slug FROM categories")
        ).mappings().all()
        category_by_name = {str(row["name"]).strip().lower(): row for row in category_rows if row["name"]}
        slug_pool = {str(row["slug"]).strip().lower() for row in category_rows if row["slug"]}

        legacy_rows = connection.execute(text("SELECT * FROM products")).mappings().all()
        for row in legacy_rows:
            raw_name = str(row.get("category") or "Khac").strip()
            key = raw_name.lower()
            if key in category_by_name:
                continue
            base_slug = slugify(raw_name)
            unique_slug = base_slug
            suffix = 1
            while unique_slug.lower() in slug_pool:
                suffix += 1
                unique_slug = f"{base_slug}-{suffix}"
            result = connection.execute(
                text(
                    """
                    INSERT INTO categories (name, slug, is_active, "order", created_at, updated_at)
                    VALUES (:name, :slug, 1, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    """
                ),
                {"name": raw_name, "slug": unique_slug},
            )
            category_by_name[key] = {"id": result.lastrowid, "name": raw_name, "slug": unique_slug}
            slug_pool.add(unique_slug.lower())

        if "khac" not in category_by_name:
            result = connection.execute(
                text(
                    """
                    INSERT INTO categories (name, slug, is_active, "order", created_at, updated_at)
                    VALUES ('Khac', 'khac', 1, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    """
                )
            )
            category_by_name["khac"] = {"id": result.lastrowid, "name": "Khac", "slug": "khac"}

        connection.execute(text("PRAGMA foreign_keys=OFF"))
        connection.execute(
            text(
                """
                CREATE TABLE products_new (
                    id INTEGER PRIMARY KEY,
                    name VARCHAR(200) NOT NULL,
                    slug VARCHAR(200),
                    description TEXT,
                    category_id INTEGER NOT NULL,
                    price DECIMAL(10, 2) NOT NULL,
                    discount_price DECIMAL(10, 2),
                    quantity INTEGER DEFAULT 0,
                    low_stock_threshold INTEGER DEFAULT 5,
                    unit VARCHAR(30) DEFAULT 'kg',
                    stock_status VARCHAR(30) DEFAULT 'in_stock',
                    sku VARCHAR(50),
                    image_url VARCHAR(255),
                    images JSON,
                    rating FLOAT DEFAULT 5.0,
                    review_count INTEGER DEFAULT 0,
                    origin VARCHAR(100),
                    harvest_date DATETIME,
                    expiry_date DATETIME,
                    is_active BOOLEAN DEFAULT 1,
                    is_featured BOOLEAN DEFAULT 0,
                    ai_supported BOOLEAN DEFAULT 0,
                    ai_class_name VARCHAR(50),
                    created_at DATETIME,
                    updated_at DATETIME
                )
                """
            )
        )

        for row in legacy_rows:
            category_key = str(row.get("category") or "Khac").strip().lower()
            category_id = category_by_name.get(category_key, {}).get("id")
            quantity = parse_int(row.get("quantity"), 0)
            stock_status = row.get("stock_status") or ("in_stock" if quantity > 0 else "out_of_stock")
            connection.execute(
                text(
                    """
                    INSERT INTO products_new (
                        id, name, slug, description, category_id, price, discount_price,
                        quantity, low_stock_threshold, unit, stock_status, sku, image_url,
                        images, rating, review_count, origin, harvest_date, expiry_date,
                        is_active, is_featured, ai_supported, ai_class_name, created_at, updated_at
                    ) VALUES (
                        :id, :name, :slug, :description, :category_id, :price, NULL,
                        :quantity, :low_stock_threshold, :unit, :stock_status, NULL, :image_url,
                        NULL, :rating, :review_count, NULL, NULL, NULL,
                        :is_active, :is_featured, 0, NULL, :created_at, :updated_at
                    )
                    """
                ),
                {
                    "id": row.get("id"),
                    "name": row.get("name") or "San pham",
                    "slug": f"{slugify(str(row.get('name') or 'product'))}-{row.get('id')}",
                    "description": row.get("description") or "",
                    "category_id": category_id or category_by_name["khac"]["id"],
                    "price": parse_float(row.get("price"), 0.0),
                    "quantity": quantity,
                    "low_stock_threshold": parse_int(row.get("low_stock_threshold"), 5),
                    "unit": row.get("unit") or "kg",
                    "stock_status": stock_status,
                    "image_url": row.get("image_url") or row.get("img"),
                    "rating": parse_float(row.get("rating"), 5.0),
                    "review_count": parse_int(row.get("review_count"), 0),
                    "is_active": parse_int(row.get("is_active"), 1),
                    "is_featured": parse_int(row.get("is_featured"), 0),
                    "created_at": row.get("created_at"),
                    "updated_at": row.get("updated_at") or row.get("created_at"),
                },
            )

        connection.execute(text("DROP TABLE products"))
        connection.execute(text("ALTER TABLE products_new RENAME TO products"))
        connection.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_products_slug ON products (slug)"))
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_products_name ON products (name)"))
        connection.execute(text("PRAGMA foreign_keys=ON"))


def ensure_product_ai_backfill():
    with SessionLocal() as db:
        products_to_update = db.query(models.Product).all()
        changed = False

        for product in products_to_update:
            if product.ai_supported and product.ai_class_name:
                continue

            inferred_class = infer_ai_class_name(product.name)
            if product.ai_class_name and not product.ai_supported:
                product.ai_supported = True
                changed = True
                continue

            if inferred_class and not product.ai_class_name:
                product.ai_supported = True
                product.ai_class_name = inferred_class
                changed = True

        if changed:
            db.commit()


def ensure_stock_transaction_columns():
    transaction_cols = get_table_columns("stock_transactions")
    statements = []

    is_postgres = str(engine.url).startswith("postgresql")
    ts_type = "TIMESTAMP" if is_postgres else "DATETIME"

    if "transaction_date" not in transaction_cols:
        statements.append(f"ALTER TABLE stock_transactions ADD COLUMN transaction_date {ts_type}")

    execute_statements(statements)


def ensure_scan_feedback_columns():
    feedback_cols = get_table_columns("scan_feedback_events")
    statements = []

    is_postgres = str(engine.url).startswith("postgresql")
    ts_type = "TIMESTAMP" if is_postgres else "DATETIME"
    bool_false = "FALSE" if is_postgres else "0"

    if "is_read" not in feedback_cols:
        statements.append(f"ALTER TABLE scan_feedback_events ADD COLUMN is_read BOOLEAN DEFAULT {bool_false}")
    if "read_at" not in feedback_cols:
        statements.append(f"ALTER TABLE scan_feedback_events ADD COLUMN read_at {ts_type}")

    execute_statements(statements)

    if is_postgres:
        return

    feedback_cols = get_table_columns("scan_feedback_events")
    updates = []
    if "is_read" in feedback_cols:
        updates.append("UPDATE scan_feedback_events SET is_read = 0 WHERE is_read IS NULL")

    execute_statements(updates)


def ensure_freshness_review_manual_columns():
    review_cols = get_table_columns("freshness_reviews")
    statements = []

    if "manual_rating" not in review_cols:
        statements.append("ALTER TABLE freshness_reviews ADD COLUMN manual_rating VARCHAR(20)")
    if "manual_note" not in review_cols:
        statements.append("ALTER TABLE freshness_reviews ADD COLUMN manual_note TEXT")

    execute_statements(statements)


def ensure_order_experience_columns():
    order_cols = get_table_columns("orders")
    statements = []

    if "order_type" not in order_cols:
        statements.append("ALTER TABLE orders ADD COLUMN order_type VARCHAR(30) DEFAULT 'normal'")
    if "replacement_parent_order_id" not in order_cols:
        statements.append("ALTER TABLE orders ADD COLUMN replacement_parent_order_id INTEGER")

    execute_statements(statements)

    order_cols = get_table_columns("orders")
    updates = []
    if "order_type" in order_cols:
        updates.append("UPDATE orders SET order_type = 'normal' WHERE order_type IS NULL OR TRIM(order_type) = ''")
    execute_statements(updates)


ensure_user_profile_columns()
migrate_legacy_products_table()
ensure_product_compatibility_columns()
normalize_legacy_enum_values()
ensure_product_ai_backfill()
ensure_stock_transaction_columns()
ensure_scan_feedback_columns()
ensure_freshness_review_manual_columns()
ensure_order_experience_columns()

_is_production = os.getenv("ENVIRONMENT", "development").lower() == "production"

app = FastAPI(
    title="FreshFood AI Backend",
    description="E-commerce API for fresh produce with AI freshness detection",
    version="1.0.0",
    docs_url=None if _is_production else "/docs",       # [H4] Tắt Swagger trên production
    redoc_url=None if _is_production else "/redoc",
)

# Rate limiting setup
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

if os.getenv("ENABLE_METRICS", "True").lower() in {"1", "true", "yes", "on"}:
    setup_observability(app)

uploads_root = Path(__file__).resolve().parent / "uploads"
uploads_root.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_root), name="uploads")

cors_origins_str = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:3000,http://localhost:3001,http://localhost:5173",
)
cors_origins = {origin.strip() for origin in cors_origins_str.split(",") if origin.strip()}
cors_origins.update(
    {
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:5173",
    }
)
cors_origins = sorted(cors_origins)
print(f"CORS Origins configured: {cors_origins}")

cors_allow_origin_regex = None
if os.getenv("ENVIRONMENT", "development").lower() != "production":
    cors_allow_origin_regex = r"^https?://(?:localhost|127\.0\.0\.1|10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?::\d+)?$"

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=cors_allow_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "status": "online",
        "service": "FreshFood AI Backend",
        "version": "1.0.0",
        "environment": os.getenv("ENVIRONMENT", "development"),
        "docs": "/docs",
        "api_prefix": "/api",
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "freshfood-backend",
    }


app.include_router(auth.router, prefix="/api")
app.include_router(products.router, prefix="/api")
app.include_router(orders.router, prefix="/api")
app.include_router(delivery_profiles.router, prefix="/api")
app.include_router(scans.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(notifications.router, prefix="/api")


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "message": "Validation error",
            "error_code": "VALIDATION_ERROR",
            "details": jsonable_encoder(exc.errors()),
        },
    )


@app.exception_handler(OperationalError)
async def database_operational_error_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "message": "Database schema is out of date or inconsistent",
            "error_code": "DATABASE_OPERATIONAL_ERROR",
            "detail": str(exc.orig) if getattr(exc, "orig", None) else str(exc),
        },
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8001,
        reload=os.getenv("DEBUG", "False") == "True",
    )
