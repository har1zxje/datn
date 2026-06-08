from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Boolean, Text, Enum, JSON, DECIMAL
from sqlalchemy.orm import relationship
from database import Base
import datetime
import enum as python_enum

def enum_values(enum_cls):
    return [member.value for member in enum_cls]

# Enums for status fields
class UserRole(str, python_enum.Enum):
    CUSTOMER = "customer"
    STAFF = "staff"
    MODERATOR = "moderator"
    MANAGER = "manager"
    ADMIN = "admin"

class OrderStatus(str, python_enum.Enum):
    PENDING = "pending"  # Chờ xác nhận
    CONFIRMED = "confirmed"  # Đã xác nhận
    SHIPPED = "shipped"  # Đang giao
    DELIVERED = "delivered"  # Đã giao
    CANCELLED = "cancelled"  # Đã hủy
    RETURNED = "returned"  # Đã trả

class ScanStatus(str, python_enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class FreshnessLevel(str, python_enum.Enum):
    FRESH = "fresh"  # > 80%
    GOOD = "good"  # 60-80%
    MODERATE = "moderate"  # 40-60%
    EXPIRING = "expiring"  # < 40%

class TransactionType(str, python_enum.Enum):
    IMPORT = "import"  # Nhập kho
    EXPORT = "export"  # Xuất kho

class PaymentStatus(str, python_enum.Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    WAIVED = "waived"  # Dùng cho đơn đổi hàng miễn phí

class ComplaintType(str, python_enum.Enum):
    REFUND = "refund"
    REPLACEMENT = "replacement"

class ComplaintResolutionStatus(str, python_enum.Enum):
    CREATED = "created"
    PENDING_REVIEW = "pending_review"
    APPROVED = "approved"
    REJECTED = "rejected"

# Database Models

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(100))
    phone = Column(String(20))
    role = Column(Enum(UserRole, values_callable=enum_values, native_enum=False), default=UserRole.CUSTOMER)
    loyalty_points = Column(Integer, default=0)
    voucher_balance = Column(DECIMAL(12, 2), default=0)
    
    # Profile
    avatar_url = Column(Text)          # Text thay vì String(255) để chứa được base64 data URL
    bio = Column(Text)
    address = Column(Text)
    city = Column(String(50))
    postal_code = Column(String(20))
    gender = Column(String(20))        # 'male' | 'female' | 'other'
    date_of_birth = Column(String(10)) # ISO format: YYYY-MM-DD
    
    # Status
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    verification_token = Column(String(255))

    # [C2] Password reset
    password_reset_token = Column(String(255), nullable=True)
    password_reset_expires_at = Column(DateTime, nullable=True)

    # [H1] Token versioning — tăng lên mỗi khi đổi mật khẩu để invalidate refresh token cũ
    token_version = Column(Integer, default=0, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    last_login = Column(DateTime)
    
    # Relationships
    orders = relationship("Order", back_populates="owner", cascade="all, delete-orphan")
    reviews = relationship("Review", back_populates="author", cascade="all, delete-orphan")
    scans = relationship("ScanResult", back_populates="user", cascade="all, delete-orphan")
    scan_feedback_events = relationship("ScanFeedbackEvent", back_populates="user", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="user", cascade="all, delete-orphan")
    delivery_profiles = relationship("DeliveryProfile", back_populates="user", cascade="all, delete-orphan")
    freshness_reviews = relationship("FreshnessReview", back_populates="user", cascade="all, delete-orphan")
    freshness_complaints = relationship("FreshnessComplaint", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("UserNotification", back_populates="user", cascade="all, delete-orphan")

    @property
    def is_admin(self) -> bool:
        """Compatibility field for the React app; role is the source of truth."""
        return self.role == UserRole.ADMIN or self.role == "admin"

    @property
    def is_staff(self) -> bool:
        return self.role == UserRole.STAFF or self.role == "staff"

class Category(Base):
    __tablename__ = "categories"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, index=True, nullable=False)
    slug = Column(String(100), unique=True, index=True)
    description = Column(Text)
    image_url = Column(String(255))
    is_active = Column(Boolean, default=True)
    order = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    # Relationships
    products = relationship("Product", back_populates="category", cascade="all, delete-orphan")

class Product(Base):
    __tablename__ = "products"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), index=True, nullable=False)
    slug = Column(String(200), unique=True, index=True)
    description = Column(Text)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    
    # Pricing
    price = Column(DECIMAL(10, 2), nullable=False)
    discount_price = Column(DECIMAL(10, 2))
    
    # Stock
    quantity = Column(Integer, default=0)
    low_stock_threshold = Column(Integer, default=5)
    unit = Column(String(30), default="kg")
    stock_status = Column(String(30), default="in_stock")
    sku = Column(String(50), unique=True, index=True)
    
    # Media
    image_url = Column(String(255))
    images = Column(JSON)  # Multiple images
    
    # Quality
    rating = Column(Float, default=5.0)
    review_count = Column(Integer, default=0)
    
    # Origin
    origin = Column(String(100))
    harvest_date = Column(DateTime)
    expiry_date = Column(DateTime)
    
    # Status
    is_active = Column(Boolean, default=True)
    is_featured = Column(Boolean, default=False)
    ai_supported = Column(Boolean, default=False)
    ai_class_name = Column(String(50))
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    # Relationships
    category = relationship("Category", back_populates="products")
    order_items = relationship("OrderItem", back_populates="product")
    reviews = relationship("Review", back_populates="product", cascade="all, delete-orphan")
    freshness_reviews = relationship("FreshnessReview", back_populates="product", cascade="all, delete-orphan")

class Order(Base):
    __tablename__ = "orders"
    
    id = Column(Integer, primary_key=True, index=True)
    order_number = Column(String(50), unique=True, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Pricing
    subtotal = Column(DECIMAL(12, 2), nullable=False)
    tax = Column(DECIMAL(10, 2), default=0)
    shipping_fee = Column(DECIMAL(10, 2), default=0)
    discount = Column(DECIMAL(10, 2), default=0)
    total = Column(DECIMAL(12, 2), nullable=False)
    
    # Shipping
    shipping_address = Column(Text)
    shipping_city = Column(String(100))
    shipping_phone = Column(String(20))
    
    # Status & Payment
    status = Column(Enum(OrderStatus, values_callable=enum_values, native_enum=False), default=OrderStatus.PENDING)
    payment_method = Column(String(50))  # card, bank_transfer, cod
    payment_status = Column(Enum(PaymentStatus, values_callable=enum_values, native_enum=False), default=PaymentStatus.PENDING)
    order_type = Column(String(30), default="normal")
    replacement_parent_order_id = Column(Integer, ForeignKey("orders.id"))
    
    # Notes
    notes = Column(Text)
    admin_notes = Column(Text)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    shipped_at = Column(DateTime)
    delivered_at = Column(DateTime)
    
    # Relationships
    owner = relationship("User", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    freshness_reviews = relationship("FreshnessReview", back_populates="order", cascade="all, delete-orphan")
    freshness_complaints = relationship(
        "FreshnessComplaint",
        back_populates="order",
        cascade="all, delete-orphan",
        foreign_keys="FreshnessComplaint.order_id",
    )
    replacement_parent_order = relationship(
        "Order",
        remote_side=[id],
        foreign_keys=[replacement_parent_order_id],
        backref="replacement_orders",
    )
    notifications = relationship("UserNotification", back_populates="order")

class OrderItem(Base):
    __tablename__ = "order_items"
    
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    
    quantity = Column(Integer, nullable=False)
    price_at_purchase = Column(DECIMAL(10, 2), nullable=False)  # Price at order time
    subtotal = Column(DECIMAL(12, 2), nullable=False)  # quantity * price
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    # Relationships
    order = relationship("Order", back_populates="items")
    product = relationship("Product", back_populates="order_items")
    freshness_reviews = relationship("FreshnessReview", back_populates="order_item", cascade="all, delete-orphan")

    @property
    def product_name(self) -> str:
        if self.product and self.product.name:
            return self.product.name
        return f"San pham #{self.product_id}"

    @property
    def ai_supported(self) -> bool:
        return bool(self.product.ai_supported) if self.product else False

    @property
    def ai_class_name(self) -> str | None:
        return self.product.ai_class_name if self.product else None

class Review(Base):
    __tablename__ = "reviews"
    
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    rating = Column(Integer, nullable=False)  # 1-5 stars
    title = Column(String(200))
    comment = Column(Text)
    
    # Moderation
    is_verified_purchase = Column(Boolean, default=False)
    is_approved = Column(Boolean, default=False)
    helpful_count = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    # Relationships
    product = relationship("Product", back_populates="reviews")
    author = relationship("User", back_populates="reviews")

class ScanResult(Base):
    __tablename__ = "scan_results"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    
    # Scan Data
    image_url = Column(String(255))
    status = Column(Enum(ScanStatus, values_callable=enum_values, native_enum=False), default=ScanStatus.PENDING)
    
    # Results
    freshness_score = Column(Float)  # 0-100
    freshness_level = Column(Enum(FreshnessLevel, values_callable=enum_values, native_enum=False))
    detected_issues = Column(JSON)  # List of detected problems
    ai_confidence = Column(Float)  # 0-100
    
    # Details
    scan_method = Column(String(50))  # image, barcode, manual
    external_api_response = Column(JSON)  # Raw response from AI API
    
    # Metadata
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    processing_time = Column(Float)  # seconds
    
    # Relationships
    user = relationship("User", back_populates="scans")
    feedback_events = relationship("ScanFeedbackEvent", back_populates="scan", cascade="all, delete-orphan")

class ScanFeedbackEvent(Base):
    __tablename__ = "scan_feedback_events"

    id = Column(Integer, primary_key=True, index=True)
    scan_id = Column(Integer, ForeignKey("scan_results.id"), nullable=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    source = Column(String(50), default="unknown")  # camera_live, upload_image, api_scan
    image_url = Column(Text)
    model_version = Column(String(80))

    predicted_label = Column(String(120), nullable=False)
    predicted_status = Column(String(60), nullable=False)
    predicted_confidence = Column(Float, nullable=False)  # 0-100

    is_correct = Column(Boolean, nullable=False)
    corrected_label = Column(String(120))
    corrected_status = Column(String(60))
    notes = Column(Text)
    extra_metadata = Column("metadata", JSON)
    is_read = Column(Boolean, default=False, index=True)
    read_at = Column(DateTime)

    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)

    scan = relationship("ScanResult", back_populates="feedback_events")
    user = relationship("User", back_populates="scan_feedback_events")

class DeliveryProfile(Base):
    __tablename__ = "delivery_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    full_name = Column(String(100), nullable=False)
    phone = Column(String(20), nullable=False)
    address = Column(Text, nullable=False)
    city = Column(String(100), nullable=False)
    is_default = Column(Boolean, default=False)

    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    user = relationship("User", back_populates="delivery_profiles")


class FreshnessReview(Base):
    __tablename__ = "freshness_reviews"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False, index=True)
    order_item_id = Column(Integer, ForeignKey("order_items.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    image_url = Column(Text, nullable=False)
    ai_label = Column(String(20))
    ai_confidence = Column(Float)
    freshness_score = Column(Integer)
    manual_rating = Column(String(20))
    manual_note = Column(Text)
    is_public = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)

    order = relationship("Order", back_populates="freshness_reviews")
    order_item = relationship("OrderItem", back_populates="freshness_reviews")
    user = relationship("User", back_populates="freshness_reviews")
    product = relationship("Product", back_populates="freshness_reviews")


class FreshnessComplaint(Base):
    __tablename__ = "freshness_complaints"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    complaint_type = Column(Enum(ComplaintType, values_callable=enum_values, native_enum=False), nullable=False)
    refund_amount = Column(DECIMAL(12, 2), default=0)
    replacement_order_id = Column(Integer, ForeignKey("orders.id"))
    resolution_status = Column(
        Enum(ComplaintResolutionStatus, values_callable=enum_values, native_enum=False),
        default=ComplaintResolutionStatus.CREATED,
    )
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)

    order = relationship("Order", foreign_keys=[order_id], back_populates="freshness_complaints")
    user = relationship("User", back_populates="freshness_complaints")
    replacement_order = relationship("Order", foreign_keys=[replacement_order_id])


class UserNotification(Base):
    __tablename__ = "user_notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=True, index=True)
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    notification_type = Column(String(50), nullable=False, index=True)
    is_read = Column(Boolean, default=False, index=True)
    expires_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)

    user = relationship("User", back_populates="notifications")
    order = relationship("Order", back_populates="notifications")


class OODLog(Base):
    __tablename__ = "ood_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=True, index=True)
    max_confidence = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)


class StockTransaction(Base):
    __tablename__ = "stock_transactions"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    type = Column(Enum(TransactionType, values_callable=enum_values, native_enum=False), nullable=False)  # import | export
    quantity = Column(Integer, nullable=False)
    note = Column(Text)
    # Ngày giao dịch do người dùng nhập (có thể khác created_at)
    transaction_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)

    product = relationship("Product")
    user = relationship("User")


class PaymentQRCodeSetting(Base):
    __tablename__ = "payment_qr_settings"

    id = Column(Integer, primary_key=True, index=True)
    provider_name = Column(String(100), nullable=False, default="Chuyen khoan")
    image_url = Column(Text, nullable=False)
    updated_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    updated_at = Column(
        DateTime,
        default=datetime.datetime.utcnow,
        onupdate=datetime.datetime.utcnow,
        index=True,
    )

    updated_by = relationship("User")


class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    action = Column(String(100), index=True)  # created_order, updated_product, deleted_user
    resource_type = Column(String(50))  # order, product, user
    resource_id = Column(Integer)
    
    details = Column(JSON)  # What changed
    ip_address = Column(String(45))
    user_agent = Column(String(255))
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    
    # Relationships
    user = relationship("User", back_populates="audit_logs")
