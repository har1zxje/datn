"""
[M2] Business constants — tập trung tất cả magic numbers vào một chỗ.
Thay đổi giá trị ở đây sẽ áp dụng toàn bộ hệ thống.
"""
from decimal import Decimal

# ── Thuế & Phí vận chuyển ────────────────────────────────
TAX_RATE = Decimal("0.10")                 # 10% VAT
FREE_SHIPPING_THRESHOLD = Decimal("500000")  # Miễn phí ship khi đơn >= 500k VND
STANDARD_SHIPPING_FEE = Decimal("30000")   # Phí ship cố định 30k VND

# ── Freshness / Độ tươi ──────────────────────────────────
FRESHNESS_REFUND_RATE = Decimal("0.30")    # Hoàn 30% tiền khi khiếu nại thành công
FRESHNESS_REWARD_POINTS = 50              # Điểm thưởng khi xác nhận độ tươi
FRESHNESS_CONFIRMATION_HOURS = 24         # Thời hạn xác nhận sau khi nhận hàng (giờ)
FRESHNESS_LOW_SCORE_THRESHOLD = 70        # Điểm dưới ngưỡng này → có thể khiếu nại

# ── AI / Scanner ─────────────────────────────────────────
OOD_CONFIDENCE_THRESHOLD = 0.60          # Ngưỡng OOD detection (xem .env OOD_THRESHOLD)
AI_CONFIDENCE_DISPLAY_THRESHOLD = 70     # % tối thiểu để hiển thị kết quả AI cho user

# ── Labels AI phân loại hư hỏng ──────────────────────────
SPOILED_AI_LABELS: frozenset[str] = frozenset({
    "spoiled_chicken", "spoiled_fish", "spoiled_pork",
    "rotten_apple", "rotten_banana", "rotten_carrot",
    "rotten_cucumber", "rotten_mango", "rotten_orange",
    "rotten_potato", "rotten_bellpepper", "spoiled_lettuce",
})

BAD_MANUAL_RATINGS: frozenset[str] = frozenset({"bad", "poor", "spoiled"})

# ── Upload Files ─────────────────────────────────────────
MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB

# ── Pagination defaults ──────────────────────────────────
DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100
