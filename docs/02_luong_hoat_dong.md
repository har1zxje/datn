# Luồng hoạt động chi tiết — FreshFood AI

> Mỗi luồng có số dòng code chính xác để bạn có thể tự trace theo từng bước.

---

## LUỒNG 1: Đăng ký tài khoản

**Bắt đầu từ:** `frontend/src/pages/Auth.jsx`

**Sơ đồ:**
```
[Auth.jsx - Form đăng ký]
        │  POST {username, email, password, full_name, phone}
        ▼
[api.js - hàm register()]
        │  axios.post("/api/auth/register", payload)
        ▼
[backend/api/auth.py:183 - hàm register()]
        │
        ├─ Kiểm tra email/username trùng (dòng 198-206)
        │       └── Nếu trùng → raise 400 "Email hoặc tên đăng nhập đã tồn tại"
        │
        ├─ hash_password(user.password) → bcrypt hash
        │
        ├─ Tạo models.User với role=CUSTOMER (dòng 209-221)
        │
        ├─ db.add() → db.commit() → db.refresh()
        │
        └─ create_access_token + create_refresh_token (dòng 224-226)
                │  Cả hai token đều chứa {"sub": user.id, "ver": token_version}
                ▼
[Auth.jsx nhận {access_token, refresh_token, user}]
        │
        └─ saveAuthSession() → lưu vào localStorage (api.js:36-40)
                └─ AuthContext.setUser(user) → toàn app biết đã đăng nhập
```

**Kết thúc tại:** Người dùng tự động đăng nhập, redirect về trang Home

**Dữ liệu truyền qua:**
- Request body: `schemas.UserRegister` (`username`, `email`, `password`, `full_name`, `phone`)
- Response: `schemas.TokenData` = `{access_token, refresh_token, token_type, expires_in, user}`
- localStorage keys: `access_token`, `refresh_token`, `user`

---

## LUỒNG 2: Đăng nhập & Tự động làm mới token

**Bắt đầu từ:** `frontend/src/pages/Auth.jsx`

**Sơ đồ:**
```
[Auth.jsx - Form login]
        │  Gửi {email hoặc username, password}
        ▼
[api.js - hàm login()]
        │  axios.post("/api/auth/login", credentials)
        ▼
[backend/api/auth.py:236 - hàm login()]
        │
        ├─ parse_login_credentials() (dòng 38-61)
        │   Phân tích Content-Type: JSON / form-data / OAuth2 form
        │   Nếu identifier có "@" → đặt vào field "email", ngược lại → "username"
        │
        ├─ Tìm user theo email hoặc username (dòng 262-267)
        │
        ├─ verify_password(input, hashed) (dòng 275)
        │       └── Nếu sai → raise 401
        │
        ├─ Cập nhật last_login = utcnow() (dòng 281)
        │
        └─ Tạo cặp token với token_version hiện tại (dòng 285-287)
                ▼
[Frontend nhận response]
        │
        └─ saveAuthSession() → localStorage → AuthContext update

─────── TOKEN HẾT HẠN (15 phút sau) ───────

[api.js interceptors.response (dòng 97-130)]
        │  Khi nhận lỗi 401 từ bất kỳ request nào
        │
        ├─ originalRequest._retry = true (chỉ retry 1 lần, tránh vòng lặp)
        │
        ├─ refreshPromise chạy refreshAuthToken() (dòng 115-116)
        │   Chỉ 1 promise duy nhất dù nhiều request cùng bị 401 đồng thời
        │
        ├─ POST /api/auth/refresh với refresh_token
        │       backend/api/auth.py:297
        │       Kiểm tra token_version khớp không (dòng 329-335)
        │       Trả về cặp token mới
        │
        ├─ Cập nhật Authorization header của request gốc
        └─ Retry request gốc tự động, người dùng không biết gì

        Nếu refresh thất bại → clearAuthSession({redirect:true}) → /auth
```

**Kết thúc tại:** Access token mới được lưu, request gốc được retry trong suốt

**Dữ liệu truyền qua:**
- `credentials.email` hoặc `credentials.username` + `credentials.password`
- `token_version` — số nguyên trong DB, nhúng vào JWT để vô hiệu hóa khi đổi mật khẩu

---

## LUỒNG 3: Duyệt & Tìm kiếm sản phẩm

**Bắt đầu từ:** `frontend/src/pages/Products.jsx`

**Sơ đồ:**
```
[Products.jsx mount]
        │
        ├─ GET /api/products/categories → Hiển thị sidebar danh mục
        │   backend/api/products.py → Có cache (20 item mặc định)
        │
        └─ GET /api/products?category=&search=&min_price=&max_price=&sort_by=
                │
                ▼
        [backend/api/products.py - list_products()]
                │
                ├─ Filter theo: category_id, search (LIKE), giá, stock_status
                │
                ├─ Subquery đếm sold_count
                │   (chỉ đếm normal orders ở trạng thái active)
                │
                ├─ Aggregation rating trung bình từ bảng reviews
                │
                └─ Paginate (mặc định 20/trang)
                        ▼
        [Products.jsx nhận mảng products]
                │
                ├─ normalizeProduct() cho mỗi item (api.js:162)
                │   Chuẩn hóa price, image_url, stock, sold_count
                │
                ├─ Render ProductCardGrid (tự động refresh mỗi 15 giây)
                │
                └─ Click sản phẩm → Mở modal ProductDetail.jsx
                        │
                        ├─ GET /api/products/{id}             → Chi tiết sản phẩm
                        ├─ GET /api/products/{id}/reviews     → Đánh giá (ẩn tên khách)
                        └─ GET /api/products/{id}/freshness-reviews → Lịch sử độ tươi
```

**Kết thúc tại:** Modal hiển thị sản phẩm, người dùng click "Thêm vào giỏ"

**Dữ liệu truyền qua:**
- Query params: `category`, `search`, `min_price`, `max_price`, `sort_by`, `page`, `limit`
- State: `products[]`, `categories[]`, `selectedProduct`, `filters`
- CartContext: `addItem({product_id, quantity, price, name, image})`

---

## LUỒNG 4: Đặt hàng (Checkout)

**Bắt đầu từ:** `frontend/src/pages/Cart.jsx`

**Sơ đồ:**
```
[Cart.jsx]
        │
        ├─ Hiển thị items từ CartContext
        ├─ Chọn địa chỉ giao hàng (DeliveryProfile hoặc nhập tay)
        ├─ Chọn phương thức: COD / Card / Bank Transfer
        ├─ Nếu chọn Bank Transfer → GET /api/payment-qr để hiển thị mã QR công khai
        ├─ [Tùy chọn] Nhập voucher code → validate
        ├─ [Tùy chọn] Dùng loyalty points (1 điểm = 1đ)
        │
        └─ Click "Đặt hàng" → POST /api/orders
                │
                ▼
[backend/api/orders.py:139 - create_order()]
                │
                ├─ ensure_customer_can_order() (dòng 54-60)
                │   Admin không được đặt hàng → raise 403
                │
                ├─ Vòng lặp từng item trong order_create.items:
                │   │
                │   ├─ Kiểm tra product tồn tại & is_active (dòng 174-183)
                │   │
                │   ├─ [C7] ATOMIC stock deduction (dòng 188-205):
                │   │   UPDATE products SET quantity = quantity - X
                │   │   WHERE id=? AND is_active=True AND quantity >= X
                │   │   rowcount == 0 → rollback → raise 400 "Tồn kho không đủ"
                │   │
                │   ├─ Tạo OrderItem với price_at_purchase = giá hiện tại
                │   │
                │   └─ record_stock_transaction() → Ghi log EXPORT vào kho
                │
                ├─ Tính tiền (dòng 236-262):
                │   subtotal      = Σ(price × qty)
                │   tax           = subtotal × TAX_RATE (10%)
                │   shipping_fee  = 0 nếu subtotal >= ngưỡng, ngược lại = phí chuẩn
                │   voucher_disc  = resolve_active_voucher()
                │   points_disc   = points_to_redeem (tối đa = tổng sau voucher)
                │   total         = subtotal + tax + shipping - voucher - points
                │
                ├─ Trừ loyalty_points nếu người dùng dùng điểm (dòng 286)
                │
                ├─ Tạo models.Order với status=PENDING, payment_status=PENDING
                │
                └─ db.commit() → Trả về OrderDetail
                        │
                        ▼
[Cart.jsx nhận response]
        │
        ├─ Nếu response.owner.loyalty_points có giá trị → update AuthContext
        ├─ CartContext.clearCart()
        └─ Redirect sang trang lịch sử đơn hàng
```

**Kết thúc tại:** Đơn hàng tạo thành công với `status=pending`, kho đã bị trừ ngay

**Dữ liệu truyền qua:**
```
Request: schemas.OrderCreate {
  items: [{product_id, quantity}],
  shipping_address, shipping_city, shipping_phone,
  payment_method,           // "cod" | "card" | "bank_transfer"
  voucher_code?,
  points_to_redeem?
}

Response: schemas.OrderDetail {
  id, order_number, subtotal, tax, shipping_fee,
  discount, total, status, items[], owner{}
}
```

---

## LUỒNG 5: Xác nhận độ tươi sau giao hàng ⭐

**Bắt đầu từ:** `frontend/src/pages/FreshnessConfirm.jsx` (route `/orders/:orderId/confirm-freshness`)

**Điều kiện tiên quyết:** Admin đã đổi `order.status = "delivered"` → kích hoạt cửa sổ 24 giờ

**Sơ đồ tổng thể:**
```
[FreshnessConfirm.jsx mount]
        │
        ├─ GET /api/orders/{id}/freshness-confirmation
        │   backend/api/orders.py:674
        │   Kiểm tra: đã giao chưa? đã xác nhận chưa? còn trong 24h không?
        │   → {is_available, is_expired, already_confirmed, reward_points, correct_bonus_points, incorrect_bonus_points, items[]}
        │
        └─ loadVerificationModel() → Tải TensorFlow.js MobileNet vào browser
```

**Sơ đồ chi tiết — Phân tích ảnh từng sản phẩm:**
```
─── Với từng sản phẩm (AI-supported) ───────────────────────────

[Người dùng chọn ảnh từ máy]
        │
        └─ analyzeFreshnessImage() [freshnessAnalysis.js:167]
                │
                ├─ BƯỚC 1: predictFreshness(model, imageElement)
                │   TF.js MobileNet chạy trực tiếp trong browser (offline)
                │   → tfjsPrediction = {rawLabel, confidence, probabilities[], isUncertain}
                │
                ├─ BƯỚC 2: quickAnalyzeScan() → POST /api/scans/quick-analyze
                │   Gửi: imageFile + tfjsPredictions[] + commodityGroup + orderId
                │           │
                │           ▼ [backend/api/scans.py:342]
                │           │
                │           ├─ [H2] validate_image_upload() (dòng 365-366)
                │           │   Extension whitelist + magic bytes + 10MB limit
                │           │
                │           ├─ Kiểm tra OOD (dòng 372-400):
                │           │   max(tfjsPredictions) < 0.60?
                │           │   → Có: lưu OOD log → trả về {status: "ood"}
                │           │
                │           └─ Không OOD → mock_ai_scan() (dòng 132):
                │               ├─ evaluate_freshness_with_standards() → chuẩn hóa
                │               ├─ evaluate_visual_spoilage() → phân tích ảnh
                │               └─ Fallback: random score 40-95 (chỉ dev/demo)
                │
                ├─ backendResult.status == "ood"
                │   → buildOodResult() → màu amber, yêu cầu đánh giá thủ công
                │
                ├─ Thành công → buildBackendResult()
                │   freshnessScore, aiLabel ("fresh"/"stale"), tone (green/amber/rose)
                │
                └─ Lỗi backend → buildLocalFallbackResult()
                    Dùng kết quả TF.js local làm dự phòng

─── Người dùng xác nhận toàn bộ đơn hàng ──────────────────────

[Click "Xác nhận"]
        │
        └─ POST /api/orders/{id}/freshness-confirmation (multipart/form-data)
                │
                ▼ [backend/api/orders.py:702]
                │
                ├─ Kiểm tra điều kiện lần cuối, chặn submit trùng theo order_item_id + user_id
                │
                ├─ Vòng lặp từng review trong payload:
                │   │
                │   ├─ Mode AI:
                │   │   ├─ Lưu ảnh vào /uploads/freshness_reviews/
                │   │   ├─ [C1] Chỉ tin ai_label từ client, KHÔNG tin freshness_score
                │   │   │   (score chỉ để hiển thị, không dùng cho business logic)
                │   │   └─ ai_label ∈ SPOILED_AI_LABELS → has_low_score = True
                │   │
                │   └─ Mode Thủ công (sản phẩm ngoài dataset AI):
                │       ├─ Lưu manual_rating (good/normal/poor)
                │       └─ manual_rating ∈ BAD_MANUAL_RATINGS → has_low_score = True
                │
                ├─ db.flush() → unique constraint vi phạm → 409 (chống duplicate)
                │
                ├─ Tính điểm thưởng động:
                │   base_reward = 100đ
                │   AI đúng      → +50đ
                │   AI sai nhưng user sửa lại giúp hệ thống → +100đ
                │
                ├─ Nếu `correct_result == "spoiled"` và AI đoán sai:
                │   ├─ create_generated_voucher()
                │   └─ Gắn voucher vào review + trả về cho frontend
                │
                ├─ Cộng tổng điểm vào loyalty_points
                │
                ├─ create_user_notification() → Thông báo nhận điểm / voucher
                │
                └─ db.commit()
                        │
                        ▼
[FreshnessConfirm.jsx nhận response]
        │
        ├─ complaint_available == True → Hiển thị nút "Khiếu nại chất lượng"
        ├─ voucher != null             → Hiển thị mã voucher + hạn dùng
        └─ Hiển thị tổng điểm vừa nhận
```

**Kết thúc tại:** Điểm thưởng được cộng vào tài khoản. Nếu AI sai và hàng thực tế bị hỏng, hệ thống còn sinh voucher xin lỗi. Nếu phát hiện hàng hỏng → mở Luồng 6

**Dữ liệu truyền qua:**
```
POST multipart/form-data:
  payload: JSON string {
    reviews: [{
      order_item_id, product_id,
      review_mode: "ai" | "manual",
      ai_label?, ai_confidence?, freshness_score?,
      manual_rating?, manual_note?,
      image_field: "image_0",   ← tên field ảnh tương ứng
      skipped_ai: boolean,
      is_public: boolean
    }]
  }
  image_0: File    ← ảnh sản phẩm 1
  image_1: File    ← ảnh sản phẩm 2
  ...

Response: {
  success, awarded_points, loyalty_points,
  all_predictions_correct,
  complaint_available,
  voucher?,
  reviews[]
}
```

---

## LUỒNG 6: Khiếu nại chất lượng

**Bắt đầu từ:** `frontend/src/pages/FreshnessConfirm.jsx` (sau khi hoàn thành Luồng 5 với hàng hỏng)

**Sơ đồ:**
```
[FreshnessConfirm.jsx - complaint_available == true]
        │
        ├─ Người dùng chọn loại khiếu nại:
        │   A) Hoàn tiền 30%
        │   B) Đổi hàng miễn phí
        │
        └─ POST /api/orders/{id}/freshness-complaints
                │  {complaint_type: "refund"|"replacement", notes?}
                ▼
[backend/api/orders.py:610]
                │
                ├─ [C1] Kiểm tra có qualifying_reviews không (dòng 623-643):
                │   ai_label ∈ SPOILED_AI_LABELS HOẶC manual_rating ∈ BAD_MANUAL_RATINGS
                │   Nếu không có → raise 400 "Không có đánh giá hỏng"
                │
                ├─ Kiểm tra đã khiếu nại rồi chưa → raise 409 nếu có
                │
                ├─ [Nhánh A] complaint_type == "refund" (dòng 665-681):
                │   ├─ refund_amount = order.total × 0.30
                │   ├─ complaint.resolution_status = PENDING_REVIEW
                │   │   (KHÔNG tự cộng tiền — admin phải duyệt thủ công)
                │   └─ Thông báo "Đang xem xét, 1-3 ngày làm việc"
                │
                └─ [Nhánh B] complaint_type == "replacement" (dòng 682-743):
                    ├─ Kiểm tra tồn kho từng sản phẩm (dòng 691-695)
                    │
                    ├─ Tạo replacement Order mới (dòng 713-730):
                    │   total = 0đ, shipping_fee = 0đ
                    │   payment_method = "replacement"
                    │   payment_status = WAIVED
                    │   order_type = "replacement"
                    │   replacement_parent_order_id = order_id gốc
                    │
                    ├─ apply_stock_delta() trừ kho cho đơn mới (dòng 705-711)
                    │
                    └─ Thông báo "Đơn đổi hàng #{number} đã tạo"
```

**Kết thúc tại:**
- **Hoàn tiền:** Khiếu nại ở `pending_review`, chờ admin duyệt → cộng voucher_balance
- **Đổi hàng:** Đơn hàng mới tạo tự động `status=pending`, miễn phí hoàn toàn

---

## LUỒNG 7: Admin xử lý đơn hàng

**Bắt đầu từ:** `frontend/src/pages/AdminDashboard.jsx` → Tab "Orders"

**Sơ đồ:**
```
[AdminDashboard.jsx]
        │
        └─ GET /api/admin/orders?page=&status=&search=
                → OrderManagementPanel.jsx hiển thị danh sách

Admin chọn đơn hàng → Cập nhật trạng thái:

pending ──→ confirmed ──→ shipped ──→ delivered
    │                                     │
    └──→ cancelled                        └─ delivered_at = utcnow()
         (hoàn kho lại)                      expires_at = delivered_at + 24h
                                             → Kích hoạt cửa sổ xác nhận độ tươi

        PUT /api/admin/orders/{id}/status {status: "..."}
```

**Transition trạng thái đơn hàng:**
```
pending     → Vừa tạo, chờ admin xác nhận
confirmed   → Admin đã xác nhận, đang chuẩn bị hàng
shipped     → Đã giao cho đơn vị vận chuyển
delivered   → Đã giao tới người dùng (kích hoạt 24h freshness window)
cancelled   → Hủy (hoàn kho)
returned    → Trả hàng
```

---

## LUỒNG 8: AI Quick Scan (quét ảnh độc lập)

**Bắt đầu từ:** Bất kỳ component nào gọi `quickAnalyzeScan()` trong `services/api.js`

**Sơ đồ:**
```
[Browser - TensorFlow.js đã load model]
        │
        ├─ predictFreshness(model, imgElement) [ScannerService.js]
        │   model.classify(imgElement) → [{className, probability}] top-3
        │   → {rawLabel, confidence, probabilities[], isUncertain, foodName}
        │
        └─ quickAnalyzeScan({imageFile, tfjsPredictions[], commodityGroup})
                │  POST /api/scans/quick-analyze (multipart, không cần auth)
                ▼
[backend/api/scans.py:342]
                │
        ┌───────┴────────┐
        │                │
   max(pred) < 0.60   max(pred) >= 0.60
        │                │
   [OOD Path]        [Normal Path]
        │                │
        ├─ Ghi OOD log   └─ mock_ai_scan() (dòng 132-204):
        │                    ├─ evaluate_freshness_with_standards()
        │                    │   Nếu có indicators (moisture, color...) → chấm chuẩn
        │                    ├─ evaluate_visual_spoilage()
        │                    │   Phân tích ảnh tìm hư hỏng
        │                    └─ Fallback: random 40-95 (chỉ dev/demo)
        │                    
        ▼                    ▼
{status:"ood"}      {freshness_score, freshness_level,
                     detected_issues, ai_confidence,
                     needs_manual_review, ...}

─── Frontend xử lý kết quả ───────────────────────────────────

        ├─ status == "ood"  → buildOodResult()         → màu amber, yêu cầu manual
        ├─ Thành công       → buildBackendResult()      → màu green/amber/rose
        └─ Lỗi backend      → buildLocalFallbackResult()→ dùng TF.js local thay thế
```

**Ngưỡng điểm hiển thị:**
```
>= 75  → Tươi tốt   (green)  → Bảo quản lạnh, dùng trong ngày
50-74  → Dùng sớm   (amber)  → Dùng trong 12-24 giờ
< 50   → Kém tươi   (rose)   → Khuyến nghị ngừng sử dụng
```

---

## LUỒNG 9: Cập nhật hồ sơ cá nhân & đổi mật khẩu an toàn

**Bắt đầu từ:** `frontend/src/pages/Profile.jsx` → tab "Thông tin" hoặc "Cài đặt tài khoản"

**Sơ đồ:**
```
[Profile.jsx mount]
        │
        ├─ GET /api/auth/me
        │   → nạp full_name, phone, avatar_url, bio, address, city, loyalty_points...
        │
        └─ Render các tab:
            ProfileInfoTab / AddressesTab / OrdersTab / AccountSettingsTab

Người dùng sửa hồ sơ:

[ProfileInfoTab]
        │
        └─ PUT /api/auth/me
                │
                ▼ [backend/api/auth.py:445]
                │
                ├─ Chỉ cập nhật các field được gửi lên
                ├─ Không bắt buộc nhập mật khẩu nếu chỉ sửa profile thường
                └─ Trả về UserProfile mới → AuthContext đồng bộ lại

Người dùng đổi mật khẩu:

[AccountSettingsTab]
        │
        └─ PUT /api/auth/me {password, current_password}
                │
                ├─ Thiếu current_password → 400
                ├─ Sai current_password   → 400
                ├─ Đúng → hash mật khẩu mới
                ├─ token_version += 1
                └─ Mọi refresh token cũ bị vô hiệu hóa
```

**Kết thúc tại:** Hồ sơ được cập nhật an toàn; đổi mật khẩu sẽ buộc toàn bộ token cũ hết hiệu lực.

---

## LUỒNG 10: Người dùng quản lý đơn hàng trong Profile

**Bắt đầu từ:** `frontend/src/components/profile/OrdersTab.jsx`

**Sơ đồ:**
```
[OrdersTab mount]
        │
        └─ GET /api/orders/paginated?page=&limit=
                │
                ▼ [backend/api/orders.py:549]
                │
                ├─ Trả về items[], total, total_pages, status_counts
                └─ Mỗi order đã được annotate:
                    freshness_confirmation_available
                    freshness_confirmation_expires_at
                    freshness_reward_points

Người dùng sửa đơn pending:

[Click "Chỉnh sửa"]
        │
        └─ PUT /api/orders/{id}
                │
                ▼ [backend/api/orders.py:624]
                │
                ├─ Chỉ cho phép khi order.status == pending
                ├─ Cập nhật phone / address / city / notes
                └─ Trả OrderDetail mới cho UI

Người dùng hủy đơn:

[Click "Hủy đơn"]
        │
        └─ POST /api/orders/{id}/cancel
                │
                ▼ [backend/api/orders.py:994]
                │
                ├─ Đổi status → cancelled
                ├─ apply_stock_delta() hoàn kho từng sản phẩm
                └─ record_stock_transaction() ghi IMPORT theo order_number
```

**Kết thúc tại:** Người dùng tự quản lý được đơn chưa xác nhận; dữ liệu kho luôn quay về đúng trạng thái khi hủy đơn.

---

## LUỒNG 11: Admin theo dõi báo cáo xác minh độ tươi

**Bắt đầu từ:** `frontend/src/pages/AdminDashboard.jsx` → tab "Freshness Reports"

**Sơ đồ:**
```
[AdminDashboard.jsx]
        │
        └─ GET /api/admin/freshness-verification-reports
                │  filter: date_from, date_to, prediction_correct,
                │          correct_result, has_voucher, page, limit
                ▼
[backend/api/admin.py:1452]
                │
                ├─ Join freshness_reviews + orders + users + vouchers
                ├─ Lọc theo AI đúng/sai, kết quả thật, có voucher hay không
                └─ Trả về danh sách phân trang để render table

Admin muốn xuất Excel:

[Click "Xuất Excel"]
        │
        └─ GET /api/admin/freshness-verification-reports/export-excel
                │
                ▼ [backend/api/admin.py:1522]
                │
                └─ Stream file .xlsx chứa toàn bộ báo cáo theo bộ lọc hiện tại
```

**Kết thúc tại:** Admin có thể rà soát các case AI đúng/sai sau giao hàng và export dữ liệu để kiểm tra vận hành hoặc làm dữ liệu cải tiến model.

---

## Bảng tổng hợp: File → Vai trò trong flow

```
┌─────────────────────────────────┬──────────────────────────────────────────────┐
│ File                            │ Vai trò trong flow                           │
├─────────────────────────────────┼──────────────────────────────────────────────┤
│ frontend/src/pages/Auth.jsx     │ UI form đăng nhập/đăng ký                   │
│ frontend/src/services/api.js    │ Tất cả HTTP calls + token refresh tự động    │
│ frontend/src/context/           │                                              │
│   AuthContext.jsx               │ State user toàn cục                          │
│   CartContext.jsx               │ State giỏ hàng toàn cục                     │
│   FavoritesContext.jsx          │ State yêu thích theo từng tài khoản          │
│ frontend/src/services/          │                                              │
│   freshnessAnalysis.js          │ Pipeline AI: TF.js → Backend → Fallback      │
│ frontend/src/components/profile/│ Hồ sơ cá nhân, địa chỉ, lịch sử đơn          │
│ frontend/src/pages/Profile.jsx  │ Màn hình profile nhiều tab                   │
│ frontend/src/pages/Favorites.jsx│ Danh sách sản phẩm yêu thích                 │
│ backend/api/auth.py             │ Xác thực, JWT, token versioning              │
│ backend/api/orders.py           │ Đặt hàng, atomic stock, freshness confirm    │
│ backend/api/scans.py            │ OOD detection, multi-path AI scan            │
│ backend/api/rewards.py          │ Voucher, loyalty points, validate voucher    │
│ backend/api/delivery_profiles.py│ CRUD sổ địa chỉ giao hàng                    │
│ backend/api/admin.py            │ Dashboard admin, feedback, báo cáo xác minh  │
│ backend/models.py               │ Schema database (SQLAlchemy ORM)             │
│ backend/schemas.py              │ Validate dữ liệu vào/ra (Pydantic)          │
│ backend/utils/freshness.py      │ Logic tính độ tươi, reward points, notify    │
│ backend/utils/file_validation.py│ Whitelist extension + magic bytes ảnh        │
│ backend/utils/inventory.py      │ apply_stock_delta, record_stock_transaction  │
│ backend/config.py               │ TAX_RATE, SPOILED_AI_LABELS, reward points   │
└─────────────────────────────────┴──────────────────────────────────────────────┘
```

---

## Điểm mấu chốt để trace code

| Vị trí | Ý nghĩa |
|--------|---------|
| `api.js:97-130` | Interceptor tự động refresh token — mọi request 401 đều qua đây |
| `auth.py:85-121` | `get_current_user()` — dependency inject vào mọi endpoint cần auth |
| `orders.py:188-205` | Atomic stock deduction — trái tim của chống oversell |
| `orders.py:539-550` | `[C1]` Chỉ tin `ai_label`, không tin `freshness_score` từ client |
| `scans.py:372-400` | OOD check — gate bảo vệ trước khi chạy AI inference |
| `auth.py:113-119` | Token version check — vô hiệu hóa token cũ sau đổi mật khẩu |
| `orders.py:569-577` | `db.flush()` trước khi cộng điểm — chống duplicate submission |
| `file_validation.py` | Chặn file giả ảnh bằng magic bytes, không chỉ dựa vào extension |
| `rewards.py` | Voucher có hạn dùng, chống dùng lại, tính discount theo phần trăm |
