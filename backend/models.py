from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Boolean, Text, Enum, JSON, DECIMAL
from sqlalchemy.orm import relationship
from database import Base
import datetime
import enum as python_enum

# Enums for status fields
class UserRole(str, python_enum.Enum):
    CUSTOMER = "customer"
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

# Database Models

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(100))
    phone = Column(String(20))
    role = Column(Enum(UserRole), default=UserRole.CUSTOMER)
    
    # Profile
    avatar_url = Column(String(255))
    bio = Column(Text)
    address = Column(Text)
    city = Column(String(50))
    postal_code = Column(String(20))
    
    # Status
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    verification_token = Column(String(255))
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    last_login = Column(DateTime)
    
    # Relationships
    orders = relationship("Order", back_populates="owner", cascade="all, delete-orphan")
    reviews = relationship("Review", back_populates="author", cascade="all, delete-orphan")
    scans = relationship("ScanResult", back_populates="user", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="user", cascade="all, delete-orphan")

    @property
    def is_admin(self) -> bool:
        """Compatibility field for the React app; role is the source of truth."""
        return self.role == UserRole.ADMIN or self.role == "admin"

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
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    # Relationships
    category = relationship("Category", back_populates="products")
    order_items = relationship("OrderItem", back_populates="product")
    reviews = relationship("Review", back_populates="product", cascade="all, delete-orphan")

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
    status = Column(Enum(OrderStatus), default=OrderStatus.PENDING)
    payment_method = Column(String(50))  # card, bank_transfer, cod
    payment_status = Column(String(50), default="pending")  # pending, completed, failed
    
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
    status = Column(Enum(ScanStatus), default=ScanStatus.PENDING)
    
    # Results
    freshness_score = Column(Float)  # 0-100
    freshness_level = Column(Enum(FreshnessLevel))
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
