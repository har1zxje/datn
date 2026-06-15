from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Literal, Dict
from datetime import datetime
from decimal import Decimal
from models import PaymentStatus, ComplaintType, ComplaintResolutionStatus

# ============ AUTH SCHEMAS ============

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    full_name: Optional[str] = None
    is_admin: bool
    is_staff: bool = False
    role: Optional[str] = None
    loyalty_points: int = 0
    voucher_balance: Decimal = Decimal("0")

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
    is_staff: bool = False
    is_active: bool
    created_at: datetime
    loyalty_points: int = 0
    voucher_balance: Decimal = Decimal("0")

    class Config:
        from_attributes = True

class UserProfile(UserBase):
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    phone: Optional[str] = None
    gender: Optional[str] = None
    date_of_birth: Optional[str] = None  # ISO format: YYYY-MM-DD
    last_login: Optional[datetime] = None

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    password: Optional[str] = Field(None, min_length=6)
    current_password: Optional[str] = Field(None, min_length=6)
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    postal_code: Optional[str] = None
    gender: Optional[str] = None
    date_of_birth: Optional[str] = None  # ISO format: YYYY-MM-DD

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    """[C2] Đặt lại mật khẩu bằng token nhận qua email."""
    token: str = Field(..., min_length=10)
    new_password: str = Field(..., min_length=6)

class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=6)
    new_password: str = Field(..., min_length=6)

class AdminUserRoleUpdate(BaseModel):
    role: Literal["customer", "staff", "admin"]

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
    promotion_type: str = "none"
    promotion_value: Decimal = Decimal("0")
    promotion_label: Optional[str] = None
    quantity: int = Field(..., ge=0)
    sku: Optional[str] = None
    origin: Optional[str] = None
    unit: Optional[str] = None
    stock_status: Optional[str] = None
    ai_supported: bool = False
    ai_class_name: Optional[str] = None

class ProductCreate(ProductBase):
    image_url: Optional[str] = None
    harvest_date: Optional[datetime] = None

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[Decimal] = None
    discount_price: Optional[Decimal] = None
    promotion_type: Optional[str] = None
    promotion_value: Optional[Decimal] = None
    promotion_label: Optional[str] = None
    quantity: Optional[int] = None
    is_featured: Optional[bool] = None
    is_active: Optional[bool] = None
    ai_supported: Optional[bool] = None
    ai_class_name: Optional[str] = None

class Product(ProductBase):
    id: int
    image_url: Optional[str] = None
    rating: float
    review_count: int
    sold_count: int = 0
    discount_percent: float = 0
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
    product_name: Optional[str] = None
    ai_supported: bool = False
    ai_class_name: Optional[str] = None
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
    voucher_code: Optional[str] = None
    points_to_redeem: int = Field(default=0, ge=0)
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
    payment_status: PaymentStatus
    order_type: str = "normal"
    replacement_parent_order_id: Optional[int] = None
    voucher_code: Optional[str] = None
    points_redeemed: int = 0
    shipping_address: Optional[str] = None
    shipping_city: Optional[str] = None
    shipping_phone: Optional[str] = None
    notes: Optional[str] = None
    owner: Optional[UserBase] = None
    items: List[OrderItemDetail] = Field(default_factory=list)
    created_at: datetime
    shipped_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    freshness_reward_points: int = 100
    freshness_confirmation_available: bool = False
    freshness_confirmation_completed: bool = False
    freshness_confirmation_expired: bool = False
    freshness_confirmation_expires_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class OrderDetail(Order):
    items: List[OrderItemDetail]
    owner: UserBase
    notes: Optional[str] = None

# ============ DELIVERY PROFILE SCHEMAS ============

class DeliveryProfileCreate(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=100)
    phone: str = Field(..., min_length=10, max_length=20)
    address: str = Field(..., min_length=1)
    city: str = Field(..., min_length=1, max_length=100)
    is_default: bool = False

class DeliveryProfileUpdate(BaseModel):
    full_name: Optional[str] = Field(None, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)
    address: Optional[str] = None
    city: Optional[str] = Field(None, max_length=100)
    is_default: Optional[bool] = None

class DeliveryProfile(BaseModel):
    id: int
    user_id: int
    full_name: str
    phone: str
    address: str
    city: str
    is_default: bool
    created_at: datetime

    class Config:
        from_attributes = True

# ============ SCAN SCHEMAS ============

class ScanCreate(BaseModel):
    product_id: Optional[int] = None
    image_url: str
    scan_method: str = "image"  # image, barcode, manual
    inspection_indicators: Optional[dict] = None
    commodity_group: Optional[Literal["produce", "meat", "fish", "other"]] = "produce"

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
    assessment_basis: Optional[str] = None
    quality_assessment: Optional[dict] = None
    needs_manual_review: bool = False
    review_reasons: List[str] = Field(default_factory=list)
    spoilage_ratio_pct: Optional[float] = None
    spoilage_profile: Optional[str] = None

    class Config:
        from_attributes = True


class QuickScanResponse(BaseModel):
    status: str = "ok"
    message: Optional[str] = None
    max_confidence: Optional[float] = None
    supported_classes: List[str] = Field(default_factory=list)
    freshness_score: Optional[float] = None
    freshness_level: Optional[str] = None
    detected_issues: List[str] = Field(default_factory=list)
    ai_confidence: Optional[float] = None
    assessment_basis: str
    quality_assessment: Optional[dict] = None
    needs_manual_review: bool = False
    review_reasons: List[str] = Field(default_factory=list)
    spoilage_ratio_pct: Optional[float] = None
    spoilage_profile: Optional[str] = None

class ScanFeedbackCreate(BaseModel):
    source: str = Field(default="unknown", max_length=50)
    scan_id: Optional[int] = None
    image_url: Optional[str] = None
    model_version: Optional[str] = Field(default=None, max_length=80)
    predicted_label: str = Field(..., min_length=1, max_length=120)
    predicted_status: str = Field(..., min_length=1, max_length=60)
    predicted_confidence: float = Field(..., ge=0, le=100)
    is_correct: bool
    corrected_label: Optional[str] = Field(default=None, max_length=120)
    corrected_status: Optional[str] = Field(default=None, max_length=60)
    notes: Optional[str] = None
    metadata: Optional[dict] = None

class ScanFeedbackResponse(BaseModel):
    id: int
    scan_id: Optional[int] = None
    user_id: int
    source: str
    predicted_label: str
    predicted_status: str
    predicted_confidence: float
    is_correct: bool
    corrected_label: Optional[str] = None
    corrected_status: Optional[str] = None
    model_version: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AdminScanFeedbackScanBrief(BaseModel):
    id: int
    image_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AdminScanFeedbackResponse(BaseModel):
    id: int
    scan_id: Optional[int] = None
    user_id: int
    source: str
    image_url: Optional[str] = None
    model_version: Optional[str] = None
    predicted_label: str
    predicted_status: str
    predicted_confidence: float
    is_correct: bool
    corrected_label: Optional[str] = None
    corrected_status: Optional[str] = None
    notes: Optional[str] = None
    extra_metadata: Optional[dict] = None
    is_read: bool = False
    read_at: Optional[datetime] = None
    created_at: datetime
    user: Optional[UserResponse] = None
    scan: Optional[AdminScanFeedbackScanBrief] = None

    class Config:
        from_attributes = True


class AdminScanFeedbackListResponse(BaseModel):
    items: List[AdminScanFeedbackResponse]
    total: int
    unread_count: int
    read_count: int = 0
    disputed_count: int = 0
    global_total: int = 0
    global_unread_count: int = 0
    global_read_count: int = 0
    global_disputed_count: int = 0
    page: int = 1
    limit: int = 12
    total_pages: int = 1
    has_next: bool = False


class AdminFreshnessVerificationReportItem(BaseModel):
    id: int
    order_id: int
    order_number: str
    order_item_id: int
    product_id: int
    product_name: str
    image_url: str
    predicted_label: Optional[str] = None
    predicted_result: Optional[str] = None
    confidence: float = 0
    is_prediction_correct: Optional[bool] = None
    correct_label: Optional[str] = None
    correct_result: Optional[str] = None
    manual_note: Optional[str] = None
    reward_points: int = 0
    voucher_id: Optional[int] = None
    voucher_code: Optional[str] = None
    created_at: datetime
    user: Optional[UserResponse] = None


class AdminFreshnessVerificationReportListResponse(BaseModel):
    items: List[AdminFreshnessVerificationReportItem]
    total: int
    page: int
    limit: int
    total_pages: int
    has_next: bool


class PaymentQRCodeResponse(BaseModel):
    id: int
    provider_name: str
    image_url: str
    updated_by_user_id: Optional[int] = None
    updated_by: Optional[UserResponse] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class FreshnessReviewUploadItem(BaseModel):
    order_item_id: int
    product_id: int
    image_field: str
    is_public: bool = True
    predicted_label: str = Field(..., min_length=1, max_length=120)
    predicted_result: Literal["fresh", "spoiled"]
    confidence: float = Field(..., ge=0, le=1)
    is_prediction_correct: bool
    correct_label: Optional[str] = Field(default=None, max_length=120)
    correct_result: Optional[Literal["fresh", "spoiled"]] = None
    manual_note: Optional[str] = None


class FreshnessConfirmationSubmitPayload(BaseModel):
    reviews: List[FreshnessReviewUploadItem] = Field(..., min_items=1)


class FreshnessReviewResponse(BaseModel):
    id: int
    order_id: int
    order_item_id: int
    user_id: int
    product_id: int
    image_url: str
    ai_label: Optional[str] = None
    ai_confidence: Optional[float] = None
    freshness_score: Optional[int] = None
    predicted_label: Optional[str] = None
    predicted_result: Optional[str] = None
    is_prediction_correct: Optional[bool] = None
    correct_label: Optional[str] = None
    correct_result: Optional[str] = None
    reward_points: int = 0
    voucher_id: Optional[int] = None
    manual_rating: Optional[str] = None
    manual_note: Optional[str] = None
    is_public: bool = True
    created_at: datetime

    class Config:
        from_attributes = True


class FreshnessConfirmationEligibilityResponse(BaseModel):
    order_id: int
    order_number: str
    delivered_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    is_available: bool
    is_expired: bool
    already_confirmed: bool
    reward_points: int = 100
    correct_bonus_points: int = 50
    incorrect_bonus_points: int = 100
    items: List[OrderItemDetail] = Field(default_factory=list)


class FreshnessVoucherResponse(BaseModel):
    id: Optional[int] = None
    code: str
    title: str
    reason: str
    discount_percent: Decimal = Decimal("0")
    discount_amount: Decimal = Decimal("0")
    expires_at: datetime
    created_at: datetime


class FreshnessConfirmationSubmitResponse(BaseModel):
    success: bool = True
    message: str
    awarded_points: int = 0
    loyalty_points: int = 0
    all_predictions_correct: bool = False
    complaint_available: bool = False
    thank_you_message: Optional[str] = None
    voucher: Optional[FreshnessVoucherResponse] = None
    reviews: List[FreshnessReviewResponse] = Field(default_factory=list)


class FreshnessComplaintCreate(BaseModel):
    complaint_type: ComplaintType
    notes: Optional[str] = None


class FreshnessComplaintResponse(BaseModel):
    id: int
    order_id: int
    user_id: int
    complaint_type: ComplaintType
    refund_amount: Decimal = Decimal("0")
    replacement_order_id: Optional[int] = None
    resolution_status: ComplaintResolutionStatus
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class VerificationPredictionPayload(BaseModel):
    label: str = ""
    freshness: str = ""
    confidence: float = Field(default=0, ge=0, le=1)


class VerificationReportCreate(BaseModel):
    orderId: str
    productId: str
    productName: str
    imageBase64: str
    prediction: Optional[VerificationPredictionPayload] = None
    scanCorrect: Optional[bool] = None
    userFeedback: bool
    pointsAwarded: int = Field(..., ge=0)
    timestamp: datetime


class VerificationReportResponse(BaseModel):
    id: int
    order_id: int
    order_item_id: int
    user_id: int
    product_id: int
    product_name: str
    prediction_label: Optional[str] = None
    prediction_freshness: Optional[str] = None
    prediction_confidence: Optional[float] = None
    scan_correct: Optional[bool] = None
    user_feedback: bool
    points_awarded: int
    voucher_code: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class UserPointsUpdateRequest(BaseModel):
    delta: int


class UserPointsUpdateResponse(BaseModel):
    success: bool = True
    delta: int
    loyalty_points: int


class VoucherGenerateRequest(BaseModel):
    userId: int
    reason: str


class VoucherGenerateResponse(BaseModel):
    success: bool = True
    code: str
    title: str
    reason: str
    discount_percent: Decimal = Decimal("0")
    discount_amount: Decimal = Decimal("0")
    expires_at: datetime
    created_at: datetime


class VoucherSummaryResponse(BaseModel):
    code: str
    title: str
    reason: str
    discount_percent: Decimal = Decimal("0")
    discount_amount: Decimal = Decimal("0")
    created_at: datetime
    expires_at: datetime
    is_used: bool = False
    is_expired: bool = False


class ProductFreshnessReviewPublicItem(BaseModel):
    id: int
    freshness_score: Optional[int] = None
    ai_label: Optional[str] = None
    ai_confidence: Optional[float] = None
    created_at: datetime
    delivery_date: Optional[datetime] = None
    customer_display_name: str
    customer_area: str
    image_url: str


class ProductFreshnessReviewSummary(BaseModel):
    avg_score: Optional[float] = None
    total_reviews: int = 0
    reviews: List[ProductFreshnessReviewPublicItem] = Field(default_factory=list)


class UserNotificationResponse(BaseModel):
    id: int
    user_id: int
    order_id: Optional[int] = None
    title: str
    message: str
    notification_type: str
    is_read: bool = False
    expires_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True

# ============ STOCK TRANSACTION SCHEMAS ============

class StockTransactionCreate(BaseModel):
    product_id: int
    type: Literal["import", "export"]
    quantity: int = Field(..., ge=1)
    note: Optional[str] = None
    transaction_date: Optional[datetime] = None  # Ngày giao dịch do người dùng chọn

class StockTransactionResponse(BaseModel):
    id: int
    product_id: int
    user_id: int
    type: str
    quantity: int
    note: Optional[str] = None
    transaction_date: Optional[datetime] = None
    created_at: datetime
    product: Optional["Product"] = None
    user: Optional[UserBase] = None

    class Config:
        from_attributes = True


class AdminUserListResponse(BaseModel):
    items: List[UserBase]
    total: int
    page: int
    limit: int
    total_pages: int
    has_next: bool


class AdminStockTransactionListResponse(BaseModel):
    items: List[StockTransactionResponse]
    total: int
    page: int
    limit: int
    total_pages: int
    has_next: bool

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


class OrderBulkStatusUpdate(BaseModel):
    order_ids: List[int] = Field(..., min_items=1)
    new_status: str


class AdminOrderListResponse(BaseModel):
    items: List[Order]
    total: int
    page: int
    limit: int
    total_pages: int
    has_next: bool
    status_counts: Dict[str, int] = Field(default_factory=dict)


class UserOrderListResponse(BaseModel):
    items: List[Order]
    total: int
    page: int
    limit: int
    total_pages: int
    has_next: bool
    status_counts: Dict[str, int] = Field(default_factory=dict)

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
