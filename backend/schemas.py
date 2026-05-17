from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from decimal import Decimal

# ============ AUTH SCHEMAS ============

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    full_name: Optional[str] = None
    is_admin: bool
    role: Optional[str] = None
    
    class Config:
        from_attributes = True

class TokenData(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds
    user: Optional[UserResponse] = None

class UserLogin(BaseModel):
    username: Optional[str] = None  # Accept username OR email
    email: Optional[EmailStr] = None
    password: str = Field(..., min_length=6)
    
    @property
    def identifier(self):
        """Return either email or username"""
        return self.email or self.username

class UserRegister(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6)
    full_name: str = Field(..., max_length=100)
    phone: Optional[str] = None

class UserBase(BaseModel):
    id: int
    username: str
    email: EmailStr
    full_name: Optional[str] = None
    role: str
    is_admin: bool = False
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class UserProfile(UserBase):
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    phone: Optional[str] = None
    last_login: Optional[datetime] = None

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    password: Optional[str] = Field(None, min_length=6)
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    postal_code: Optional[str] = None

# ============ PRODUCT SCHEMAS ============

class CategoryBase(BaseModel):
    name: str
    slug: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    order: int = 0

class CategoryCreate(CategoryBase):
    pass

class Category(CategoryBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class ProductBase(BaseModel):
    name: str
    slug: Optional[str] = None
    description: Optional[str] = None
    category_id: int
    price: Decimal
    discount_price: Optional[Decimal] = None
    quantity: int
    sku: Optional[str] = None
    origin: Optional[str] = None
    unit: Optional[str] = None
    stock_status: Optional[str] = None

class ProductCreate(ProductBase):
    image_url: Optional[str] = None
    harvest_date: Optional[datetime] = None

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[Decimal] = None
    discount_price: Optional[Decimal] = None
    quantity: Optional[int] = None
    is_featured: Optional[bool] = None
    is_active: Optional[bool] = None

class Product(ProductBase):
    id: int
    image_url: Optional[str] = None
    rating: float
    review_count: int
    is_active: bool
    is_featured: bool
    harvest_date: Optional[datetime] = None
    expiry_date: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True

class ProductDetail(Product):
    category: Category

# ============ REVIEW SCHEMAS ============

class ReviewBase(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    title: Optional[str] = None
    comment: Optional[str] = None

class ReviewCreate(ReviewBase):
    product_id: int

class Review(ReviewBase):
    id: int
    product_id: int
    user_id: int
    author: UserBase
    is_approved: bool
    helpful_count: int
    created_at: datetime

    class Config:
        from_attributes = True

# ============ ORDER SCHEMAS ============

class OrderItemCreate(BaseModel):
    product_id: int
    quantity: int = Field(..., ge=1)

class OrderItemDetail(BaseModel):
    id: int
    product_id: int
    product: Product
    quantity: int
    price_at_purchase: Decimal
    subtotal: Decimal

    class Config:
        from_attributes = True

class OrderCreate(BaseModel):
    items: List[OrderItemCreate] = Field(..., min_items=1)
    shipping_address: str
    shipping_city: str
    shipping_phone: str
    payment_method: str = "cod"  # card, bank_transfer, cod
    notes: Optional[str] = None

class OrderUpdate(BaseModel):
    status: Optional[str] = None
    shipping_address: Optional[str] = None
    shipping_city: Optional[str] = None
    shipping_phone: Optional[str] = None
    payment_method: Optional[str] = None
    notes: Optional[str] = None
    admin_notes: Optional[str] = None

class Order(BaseModel):
    id: int
    order_number: str
    user_id: int
    subtotal: Decimal
    tax: Decimal
    shipping_fee: Decimal
    discount: Decimal
    total: Decimal
    status: str
    payment_method: str
    payment_status: str
    shipping_address: Optional[str] = None
    shipping_city: Optional[str] = None
    shipping_phone: Optional[str] = None
    notes: Optional[str] = None
    items: List[OrderItemDetail] = Field(default_factory=list)
    created_at: datetime
    shipped_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class OrderDetail(Order):
    items: List[OrderItemDetail]
    owner: UserBase
    notes: Optional[str] = None

# ============ SCAN SCHEMAS ============

class ScanCreate(BaseModel):
    product_id: Optional[int] = None
    image_url: str
    scan_method: str = "image"  # image, barcode, manual

class ScanResult(BaseModel):
    id: int
    user_id: int
    product_id: Optional[int] = None
    freshness_score: Optional[float] = None
    freshness_level: Optional[str] = None
    detected_issues: Optional[List[str]] = None
    ai_confidence: Optional[float] = None
    status: str
    created_at: datetime
    processing_time: Optional[float] = None

    class Config:
        from_attributes = True

# ============ PAGINATION & FILTER SCHEMAS ============

class PaginationParams(BaseModel):
    skip: int = Field(0, ge=0)
    limit: int = Field(20, ge=1, le=100)

class ProductFilter(PaginationParams):
    category_id: Optional[int] = None
    search: Optional[str] = None
    min_price: Optional[Decimal] = None
    max_price: Optional[Decimal] = None
    in_stock: Optional[bool] = None
    sort_by: str = "created_at"  # created_at, price, rating

class OrderFilter(PaginationParams):
    status: Optional[str] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None

# ============ RESPONSE SCHEMAS ============

class PaginatedResponse(BaseModel):
    total: int
    skip: int
    limit: int
    items: List

class SuccessResponse(BaseModel):
    success: bool
    message: str
    data: Optional[dict] = None

class ErrorResponse(BaseModel):
    success: bool = False
    message: str
    error_code: str
    details: Optional[dict] = None

# ============ STATS SCHEMAS ============

class OrderStats(BaseModel):
    total_orders: int
    pending_orders: int
    completed_orders: int
    total_revenue: Decimal
    average_order_value: Decimal

class UserStats(BaseModel):
    total_users: int
    active_users: int
    verified_users: int
    last_7_days_new_users: int

class DashboardStats(BaseModel):
    orders: OrderStats
    users: UserStats
    products_count: int
    total_scans: int

class OrderDetailResponse(OrderDetail):
    """Response model for order detail endpoint"""
    pass

class OrderStatusUpdate(BaseModel):
    new_status: str

# ============ RESPONSE SCHEMAS ============

UserProfileResponse = UserProfile

# Product response model
ProductResponse = Product

# Error response
class ErrorResponse(BaseModel):
    detail: str
    code: Optional[str] = None
    
    class Config:
        from_attributes = True

# Generic paginated response
class PaginatedResponse(BaseModel):
    total: int
    skip: int
    limit: int
    items: List = []
    
    class Config:
        from_attributes = True
