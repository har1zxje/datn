"""
Products APIs: list, filter, details, reviews, categories.
"""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload

import models
import schemas
from api.auth import get_current_user
from database import get_db
from utils.cache import (
    cache_get, cache_set,
    CACHE_KEY_CATEGORIES, CACHE_TTL_CATEGORIES,
)
from utils.freshness import get_customer_area, mask_customer_name

router = APIRouter(prefix="/products", tags=["Products"])
FEATURED_PRODUCT_LIMIT = 5

COUNTED_ORDER_STATUSES = (
    models.OrderStatus.PENDING,
    models.OrderStatus.CONFIRMED,
    models.OrderStatus.SHIPPED,
    models.OrderStatus.DELIVERED,
)


def build_product_sales_subquery(db: Session):
    return (
        db.query(
            models.OrderItem.product_id.label("product_id"),
            func.coalesce(func.sum(models.OrderItem.quantity), 0).label("sold_count"),
        )
        .join(models.Order, models.Order.id == models.OrderItem.order_id)
        .filter(
            models.Order.status.in_(COUNTED_ORDER_STATUSES),
            func.coalesce(models.Order.order_type, "normal") == "normal",
        )
        .group_by(models.OrderItem.product_id)
        .subquery()
    )


def attach_sold_counts(rows):
    products = []
    for product, sold_count in rows:
        product.sold_count = int(sold_count or 0)
        products.append(product)
    return products


@router.get("/categories", response_model=List[schemas.Category])
def list_categories(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    # [M5] Cache danh mục — ít thay đổi, đọc nhiều
    if skip == 0 and limit == 20:
        cached = cache_get(CACHE_KEY_CATEGORIES)
        if cached is not None:
            return cached

    rows = (
        db.query(models.Category)
        .filter(models.Category.is_active == True)
        .order_by(models.Category.order.asc(), models.Category.name.asc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    if skip == 0 and limit == 20:
        cache_set(CACHE_KEY_CATEGORIES, [schemas.Category.model_validate(r, from_attributes=True).model_dump() for r in rows], ttl=CACHE_TTL_CATEGORIES)

    return rows


@router.get("/categories/{category_id}", response_model=schemas.Category)
def get_category(category_id: int, db: Session = Depends(get_db)):
    category = (
        db.query(models.Category)
        .filter(models.Category.id == category_id, models.Category.is_active == True)
        .first()
    )
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    return category


@router.get("/featured", response_model=List[schemas.ProductResponse])
def read_featured_products(db: Session = Depends(get_db)):
    sales_subquery = build_product_sales_subquery(db)
    rows = (
        db.query(
            models.Product,
            func.coalesce(sales_subquery.c.sold_count, 0).label("sold_count"),
        )
        .outerjoin(sales_subquery, sales_subquery.c.product_id == models.Product.id)
        .filter(
            models.Product.is_featured == True,
            models.Product.is_active == True,
        )
        .order_by(models.Product.updated_at.desc(), models.Product.rating.desc(), models.Product.created_at.desc())
        .limit(FEATURED_PRODUCT_LIMIT)
        .all()
    )
    return attach_sold_counts(rows)


@router.get("", response_model=List[schemas.ProductResponse])
def list_products(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    category_id: Optional[int] = None,
    search: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    in_stock: Optional[bool] = None,
    sort_by: str = "created_at",
    db: Session = Depends(get_db),
):
    sales_subquery = build_product_sales_subquery(db)
    query = (
        db.query(
            models.Product,
            func.coalesce(sales_subquery.c.sold_count, 0).label("sold_count"),
        )
        .outerjoin(sales_subquery, sales_subquery.c.product_id == models.Product.id)
        .filter(models.Product.is_active == True)
    )

    if category_id:
        query = query.filter(models.Product.category_id == category_id)
    if search:
        query = query.filter(
            or_(
                models.Product.name.ilike(f"%{search}%"),
                models.Product.description.ilike(f"%{search}%"),
            )
        )
    if min_price is not None:
        query = query.filter(models.Product.price >= min_price)
    if max_price is not None:
        query = query.filter(models.Product.price <= max_price)
    if in_stock is not None:
        query = query.filter(models.Product.quantity > 0 if in_stock else models.Product.quantity == 0)

    if sort_by == "price":
        query = query.order_by(models.Product.price.asc())
    elif sort_by == "-price":
        query = query.order_by(models.Product.price.desc())
    elif sort_by == "rating":
        query = query.order_by(models.Product.rating.desc())
    elif sort_by == "name":
        query = query.order_by(models.Product.name.asc())
    else:
        query = query.order_by(models.Product.created_at.desc())

    return attach_sold_counts(query.offset(skip).limit(limit).all())


@router.get("/{product_id}", response_model=schemas.ProductResponse)
def get_product(product_id: int, db: Session = Depends(get_db)):
    sales_subquery = build_product_sales_subquery(db)
    row = (
        db.query(
            models.Product,
            func.coalesce(sales_subquery.c.sold_count, 0).label("sold_count"),
        )
        .outerjoin(sales_subquery, sales_subquery.c.product_id == models.Product.id)
        .filter(models.Product.id == product_id, models.Product.is_active == True)
        .first()
    )
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    product, sold_count = row
    product.sold_count = int(sold_count or 0)
    return product


@router.get("/{product_id}/reviews", response_model=List[schemas.Review])
def list_reviews(
    product_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    return (
        db.query(models.Review)
        .filter(models.Review.product_id == product_id, models.Review.is_approved == True)
        .order_by(models.Review.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.post("/{product_id}/reviews", response_model=schemas.Review)
def create_review(
    product_id: int,
    review: schemas.ReviewCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    existing_review = (
        db.query(models.Review)
        .filter(models.Review.product_id == product_id, models.Review.user_id == current_user.id)
        .first()
    )
    if existing_review:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already reviewed this product",
        )

    db_review = models.Review(
        product_id=product_id,
        user_id=current_user.id,
        rating=review.rating,
        title=review.title,
        comment=review.comment,
        is_approved=False,
    )
    db.add(db_review)
    db.commit()
    db.refresh(db_review)

    reviews = db.query(models.Review).filter(models.Review.product_id == product_id).all()
    product.review_count = len(reviews)
    product.rating = round(sum(r.rating for r in reviews) / len(reviews), 1)
    db.commit()
    db.refresh(db_review)
    return db_review


@router.get("/{product_id}/freshness-reviews", response_model=schemas.ProductFreshnessReviewSummary)
def get_product_freshness_reviews(
    product_id: int,
    db: Session = Depends(get_db),
):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    review_query = (
        db.query(models.FreshnessReview)
        .options(
            joinedload(models.FreshnessReview.user),
            joinedload(models.FreshnessReview.order),
        )
        .filter(
            models.FreshnessReview.product_id == product_id,
            models.FreshnessReview.is_public == True,
            models.FreshnessReview.freshness_score.isnot(None),
        )
    )

    avg_score = review_query.with_entities(func.avg(models.FreshnessReview.freshness_score)).scalar()
    total_reviews = review_query.count()
    items = review_query.order_by(models.FreshnessReview.created_at.desc()).limit(5).all()

    return {
        "avg_score": round(float(avg_score), 2) if avg_score is not None else None,
        "total_reviews": total_reviews,
        "reviews": [
            {
                "id": item.id,
                "freshness_score": item.freshness_score,
                "ai_label": item.ai_label,
                "ai_confidence": item.ai_confidence,
                "created_at": item.created_at,
                "delivery_date": item.order.delivered_at if item.order else None,
                "customer_display_name": mask_customer_name(
                    item.user.full_name if item.user else None,
                    item.user.username if item.user else None,
                ),
                "customer_area": get_customer_area(item.order),
                "image_url": item.image_url,
            }
            for item in items
        ],
    }
