# Tổng quan dự án: FreshFood AI E-commerce

---

## 1. Đây là loại ứng dụng gì?

Đây là một **ứng dụng web thương mại điện tử** chuyên bán thực phẩm tươi sống, tích hợp **AI phân tích độ tươi** của sản phẩm qua ảnh chụp.

---

## 2. Tech Stack

| Tầng | Công nghệ |
|------|-----------|
| **Backend** | Python, FastAPI, SQLAlchemy ORM, SQLite/PostgreSQL |
| **Frontend** | React 19, Tailwind CSS, Vite |
| **AI/ML** | TensorFlow.js (MobileNet) — chạy trực tiếp trên trình duyệt |
| **Auth** | JWT (access token + refresh token) |
| **Cache / Queue nhẹ** | Redis |
| **Chatbot** | N8N Webhook (gợi ý công thức nấu ăn) |
| **Observability** | Prometheus metrics, dashboard admin |
| **Animation** | Framer Motion |
| **HTTP Client** | Axios |

---

## 3. Mục đích chính

Cho phép người dùng mua thực phẩm tươi online, **chụp ảnh sản phẩm sau khi nhận hàng** để AI đánh giá độ tươi, từ đó được thưởng điểm tích lũy hoặc khiếu nại hoàn tiền/đổi hàng nếu sản phẩm không đạt chất lượng.

---

## 4. Cấu trúc thư mục

```
test1/
├── backend/                    ← Máy chủ API (Python/FastAPI)
│   ├── main.py                 ← ENTRY POINT: Khởi động server, đăng ký routes
│   ├── models.py               ← Cấu trúc bảng database (User, Product, Order...)
│   ├── schemas.py              ← Định nghĩa dữ liệu vào/ra của API (Pydantic)
│   ├── database.py             ← Kết nối database
│   ├── config.py               ← Hằng số cấu hình (thuế, phí ship, điểm thưởng...)
│   ├── observability.py        ← Thu thập metrics (số lần scan, kết quả AI...)
│   ├── api/                    ← Các nhóm API endpoint
│   │   ├── auth.py             ← Đăng ký, đăng nhập, quên mật khẩu
│   │   ├── products.py         ← Danh sách sản phẩm, đánh giá
│   │   ├── orders.py           ← Đặt hàng, xác nhận độ tươi, khiếu nại
│   │   ├── scans.py            ← AI quét ảnh phân tích độ tươi
│   │   ├── admin.py            ← Quản trị viên (user, sản phẩm, kho)
│   │   ├── notifications.py    ← Thông báo trong ứng dụng
│   │   ├── rewards.py          ← Voucher, điểm tích lũy
│   │   └── delivery_profiles.py← Quản lý địa chỉ giao hàng
│   └── utils/                  ← Các hàm tiện ích dùng chung
│       ├── auth.py             ← hash_password, create_access_token, verify_token
│       ├── freshness.py        ← Logic đánh giá độ tươi, reward points, notify
│       ├── freshness_standards.py ← Chấm điểm theo tiêu chuẩn nông sản
│       ├── visual_spoilage.py  ← Phát hiện hư hỏng qua phân tích ảnh
│       ├── inventory.py        ← apply_stock_delta, record_stock_transaction
│       ├── file_validation.py  ← Kiểm tra extension, magic bytes, kích thước ảnh
│       ├── email.py            ← Gửi email reset mật khẩu
│       ├── cache.py            ← Caching tiện ích
│       └── ai_support.py       ← Danh sách tên class AI hỗ trợ
│
├── frontend/                   ← Giao diện người dùng (React)
│   └── src/
│       ├── pages/              ← Các trang chính (mỗi file = 1 route)
│       │   ├── Home.jsx        ← Trang chủ, sản phẩm nổi bật
│       │   ├── Auth.jsx        ← Đăng nhập / Đăng ký
│       │   ├── Products.jsx    ← Danh sách & tìm kiếm sản phẩm
│       │   ├── Favorites.jsx   ← Danh sách sản phẩm yêu thích
│       │   ├── Cart.jsx        ← Giỏ hàng & thanh toán
│       │   ├── Profile.jsx     ← Hồ sơ cá nhân, địa chỉ, lịch sử đơn
│       │   ├── FreshnessConfirm.jsx ← Xác nhận độ tươi sau nhận hàng
│       │   └── AdminDashboard.jsx   ← Bảng điều khiển quản trị
│       ├── components/         ← Các component tái sử dụng
│       │   ├── ProductDetail.jsx    ← Modal chi tiết sản phẩm
│       │   ├── admin/
│       │   │   ├── AIFeedbackPanel.jsx     ← Dashboard phản hồi AI
│       │   │   ├── FreshnessVerificationReportsPanel.jsx ← Báo cáo xác minh sau giao hàng
│       │   │   └── OrderManagementPanel.jsx← Quản lý đơn hàng
│       │   ├── profile/        ← Các tab hồ sơ, địa chỉ, lịch sử đơn, cài đặt
│       │   └── freshness/
│       │       └── ManualFreshnessReview.jsx ← Đánh giá thủ công
│       ├── services/           ← Gọi API và xử lý AI
│       │   ├── api.js          ← Tất cả hàm gọi backend + token refresh tự động
│       │   ├── chatbot.js      ← Chatbot gợi ý công thức (N8N webhook)
│       │   └── freshnessAnalysis.js ← Pipeline AI phân tích ảnh độ tươi
│       └── context/            ← State toàn cục (React Context)
│           ├── AuthContext.jsx  ← Thông tin người dùng đang đăng nhập
│           ├── CartContext.jsx  ← Giỏ hàng
│           └── FavoritesContext.jsx ← Danh sách yêu thích lưu theo từng tài khoản
│
└── model_training/             ← Scripts huấn luyện mô hình ML
```

**Entry points:**
- Backend: `backend/main.py` — chạy `uvicorn main:app`
- Frontend: `frontend/src/main.jsx` → `App.jsx` — chạy `npm run dev`

---

## 5. Danh sách chức năng

### Chức năng người dùng thường

| Chức năng | Mục đích | File thực thi |
|-----------|----------|---------------|
| Đăng ký / Đăng nhập | Tạo tài khoản, lấy JWT token | `backend/api/auth.py`, `frontend/src/pages/Auth.jsx` |
| Quên mật khẩu | Gửi link reset qua email (hết hạn 15 phút) | `backend/api/auth.py` |
| Hồ sơ cá nhân | Cập nhật thông tin, đổi mật khẩu, xem điểm và voucher | `frontend/src/pages/Profile.jsx`, `backend/api/auth.py`, `backend/api/rewards.py` |
| Duyệt sản phẩm | Lọc theo danh mục, tìm kiếm, sắp xếp | `backend/api/products.py`, `frontend/src/pages/Products.jsx` |
| Yêu thích sản phẩm | Lưu sản phẩm yêu thích theo từng tài khoản | `frontend/src/pages/Favorites.jsx`, `frontend/src/context/FavoritesContext.jsx` |
| Giỏ hàng | Thêm/xóa sản phẩm, tính tổng tiền | `frontend/src/context/CartContext.jsx`, `frontend/src/pages/Cart.jsx` |
| Đặt hàng | Tạo đơn, trừ tồn kho, áp dụng voucher/điểm, hỗ trợ QR chuyển khoản | `frontend/src/pages/Cart.jsx`, `backend/api/orders.py`, `backend/api/rewards.py` |
| Lịch sử đơn hàng | Xem, chỉnh sửa khi còn `pending`, hủy đơn và hoàn kho | `frontend/src/components/profile/OrdersTab.jsx`, `backend/api/orders.py` |
| Sổ địa chỉ giao hàng | Lưu nhiều địa chỉ và chọn địa chỉ mặc định | `backend/api/delivery_profiles.py`, `frontend/src/pages/Cart.jsx` |
| Xác nhận độ tươi | Chụp ảnh, AI đánh giá, nhận điểm thưởng và có thể sinh voucher xin lỗi | `frontend/src/pages/FreshnessConfirm.jsx`, `backend/api/orders.py`, `backend/api/rewards.py` |
| Khiếu nại chất lượng | Yêu cầu hoàn tiền (30%) hoặc đổi hàng miễn phí | `backend/api/orders.py` → `/freshness-complaints` |
| Điểm tích lũy | Dùng điểm để giảm giá khi thanh toán (1 điểm = 1đ) | `frontend/src/pages/Cart.jsx`, `backend/api/rewards.py` |
| Voucher | Xem voucher của tôi, áp dụng voucher khi checkout | `frontend/src/pages/Cart.jsx`, `backend/api/rewards.py` |
| Chatbot công thức | Gợi ý món ăn từ sản phẩm đang có sẵn | `frontend/src/services/chatbot.js` |
| Thông báo | Xem thông báo về đơn hàng, điểm thưởng | `backend/api/notifications.py` |

### Chức năng Admin

| Chức năng | Mục đích | File thực thi |
|-----------|----------|---------------|
| Quản lý người dùng | Xem, xóa, đổi vai trò (staff/admin...) | `backend/api/admin.py` |
| Quản lý đơn hàng | Cập nhật trạng thái, xem chi tiết, bulk update | `frontend/src/components/admin/OrderManagementPanel.jsx` |
| Quản lý sản phẩm | Thêm/sửa/xóa sản phẩm, upload ảnh | `backend/api/admin.py` |
| Quản lý kho | Nhập/xuất kho, lịch sử giao dịch, Excel import/export | `backend/utils/inventory.py` |
| AI Feedback Dashboard | Xem phản hồi của user về dự đoán AI | `frontend/src/components/admin/AIFeedbackPanel.jsx` |
| Báo cáo xác minh độ tươi | Lọc và export Excel toàn bộ xác nhận sau giao hàng | `frontend/src/components/admin/FreshnessVerificationReportsPanel.jsx`, `backend/api/admin.py` |
| Duyệt khiếu nại | Duyệt/từ chối hoàn tiền cho đơn có hàng hỏng | `backend/api/admin.py` |
| Cài đặt QR thanh toán | Upload mã QR cho chuyển khoản | `backend/api/admin.py` |

---

## 6. Database — Các bảng chính

| Bảng | Lưu gì |
|------|--------|
| `users` | Tài khoản, profile, điểm tích lũy, voucher_balance, token_version |
| `products` | Catalog, giá, tồn kho, AI support flag, ảnh |
| `categories` | Phân loại sản phẩm |
| `orders` | Đơn hàng với trạng thái, phương thức thanh toán |
| `order_items` | Từng dòng sản phẩm trong đơn, price_at_purchase |
| `reviews` | Đánh giá sản phẩm sau mua hàng |
| `freshness_reviews` | Kết quả xác nhận độ tươi (AI label + ảnh) |
| `freshness_complaints` | Khiếu nại hoàn tiền/đổi hàng |
| `scan_results` | Lịch sử quét AI |
| `scan_feedback_events` | Phản hồi người dùng về dự đoán AI (data để retrain) |
| `verification_reports` | Báo cáo admin tổng hợp các ca AI đúng/sai cần theo dõi |
| `generated_vouchers` | Voucher tích lũy cho người dùng |
| `user_notifications` | Thông báo trong app |
| `delivery_profiles` | Sổ địa chỉ giao hàng |
| `stock_transactions` | Nhật ký nhập/xuất kho |
| `payment_qr_settings` | Mã QR chuyển khoản do admin cấu hình |
| `ood_logs` | Nhật ký các lần AI rơi vào trạng thái không chắc chắn |
| `audit_logs` | Log hành động cho compliance |

---

## 7. Các khái niệm kỹ thuật quan trọng

### JWT (JSON Web Token)
Hệ thống xác thực không lưu session trên server. Mỗi lần đăng nhập, server tạo 2 token:
- **Access token** (15 phút): Gắn vào mọi request (`Authorization: Bearer ...`)
- **Refresh token** (dài hạn): Dùng để lấy access token mới khi hết hạn

Khi đổi mật khẩu, **token_version** trong DB tăng lên 1 → tất cả refresh token cũ bị vô hiệu hóa ngay lập tức.

### ORM (SQLAlchemy)
Thay vì viết SQL thuần, code dùng Python class để đại diện cho bảng database:
```python
# Thay vì: SELECT * FROM users WHERE id = 1
user = db.query(User).filter(User.id == 1).first()
```

### Atomic Stock Deduction
Khi 2 người mua cùng lúc sản phẩm còn 1 cái, chỉ 1 người thành công:
```sql
UPDATE products SET quantity = quantity - X
WHERE id = ? AND quantity >= X
```
Nếu `quantity >= X` sai → câu lệnh không cập nhật → đơn hàng thất bại. Không có race condition.

### TensorFlow.js (AI chạy trên Browser)
Mô hình MobileNet được tải về browser một lần, sau đó phân tích ảnh **hoàn toàn offline** trên máy client. Backend chỉ làm bước kiểm tra lại (double-check).

```
Ảnh → TF.js MobileNet → Xác suất từng nhãn → Nhãn cao nhất → Đánh giá độ tươi
```

### OOD Detection (Out-of-Distribution)
Khi AI không chắc chắn (xác suất cao nhất < 60%) — ví dụ chụp ảnh không phải thực phẩm — hệ thống **không đưa ra kết quả sai** mà yêu cầu đánh giá thủ công.

### Pydantic Schemas
FastAPI dùng Pydantic để **tự động validate dữ liệu** đầu vào. Nếu client gửi thiếu field hoặc sai kiểu dữ liệu, server trả lỗi 422 ngay lập tức.

### React Context
`AuthContext`, `CartContext` và `FavoritesContext` là "kho chứa dữ liệu toàn cục". Bất kỳ component nào cũng đọc/ghi vào đây mà không cần truyền props qua nhiều tầng.

### Magic Bytes Validation
Backend không chỉ kiểm tra đuôi file `.png/.jpg` mà còn đọc **magic bytes** của file ảnh để phát hiện file giả mạo đổi extension. Điều này chặn các trường hợp upload file không phải ảnh nhưng đổi tên thành `.png`.

### Stock Transaction Ledger
Mọi thay đổi tồn kho quan trọng đều đi qua `apply_stock_delta()` và được ghi thành `stock_transactions`:
- Đặt hàng → ghi `EXPORT`
- Hủy đơn → ghi `IMPORT`
- Admin nhập/xuất tay hoặc import Excel → đều có nhật ký

### Voucher Tự Sinh
Khi người dùng xác nhận rằng AI dự đoán sai và thực tế sản phẩm bị hỏng, hệ thống có thể **tự sinh voucher xin lỗi** (`generated_vouchers`) với thời hạn ngắn để bù trải nghiệm.

### N8N Webhook
Chatbot không có logic AI trong code — nó gửi tin nhắn + ngữ cảnh sản phẩm tới N8N (workflow automation tool), N8N xử lý và trả kết quả về.

---

## 8. Cấu hình môi trường

### Frontend (`.env`)
| Biến | Mặc định | Mô tả |
|------|----------|-------|
| `VITE_API_BASE_URL` | `http://localhost:8001` | URL backend API |
| `VITE_N8N_CHAT_WEBHOOK_URL` | — | URL webhook chatbot N8N |

### Backend (`.env`)
| Biến | Mặc định | Mô tả |
|------|----------|-------|
| `REDIS_URL` | `redis://localhost:6379/0` | Redis cho cache và tác vụ nhẹ |
| `ENVIRONMENT` | `development` | Bật/tắt Swagger UI |
| `ENABLE_METRICS` | `true` | Bật endpoint metrics cho giám sát |
| `ALLOW_PROVISIONAL_FRESHNESS_THRESHOLDS` | `false` | Cho phép dùng ngưỡng tươi tạm thời khi cần demo/dev |
| `OOD_THRESHOLD` | `0.60` | Ngưỡng confidence để phát hiện OOD |
| `FRONTEND_URL` | `http://localhost:3000` | URL frontend dùng cho reset password/email |
| `TESTING` | `false` | Tắt rate limiting khi chạy test |

### Hằng số trong `config.py`
| Hằng số | Giá trị | Ý nghĩa |
|---------|---------|---------|
| `TAX_RATE` | `0.10` | Thuế 10% |
| `FRESHNESS_REFUND_RATE` | `0.30` | Hoàn tiền 30% khi khiếu nại |
| `FRESHNESS_REWARD_POINTS` | `100` | Điểm nền khi hoàn thành xác nhận độ tươi |
| `FRESHNESS_CORRECT_BONUS_POINTS` | `50` | Điểm cộng thêm khi người dùng xác nhận AI đúng |
| `FRESHNESS_INCORRECT_BONUS_POINTS` | `100` | Điểm cộng thêm khi người dùng giúp sửa kết quả AI |
| `VOUCHER_VALID_DAYS` | `3` | Hạn dùng mặc định của voucher tự sinh |
| `SPOILED_AI_LABELS` | `[...]` | Danh sách nhãn AI bị coi là hỏng |
| `BAD_MANUAL_RATINGS` | `["bad","poor","spoiled"]` | Đánh giá thủ công bị coi là kém |
