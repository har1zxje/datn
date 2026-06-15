# Danh sách chức năng — FreshFood AI

> Tổng cộng: **51 chức năng** — 8 Auth · 5 Sản phẩm · 6 Đặt hàng · 5 Độ tươi · 3 AI · 4 Rewards · 1 Địa chỉ · 2 Thông báo · 1 Chatbot · 15 Admin

---

## NHÓM 1: XÁC THỰC & TÀI KHOẢN

---

**Tên chức năng:** Đăng ký tài khoản
**Người dùng thấy gì:** Form nhập username, email, mật khẩu, họ tên, số điện thoại
**Code thực thi ở đâu:** `backend/api/auth.py:183` — `register()` / `frontend/src/pages/Auth.jsx`
**Dữ liệu đầu vào:** `{username, email, password, full_name, phone?}`
**Dữ liệu đầu ra / tác dụng:** Tạo bản ghi `User` trong DB với `role=CUSTOMER`, trả về `{access_token, refresh_token, user}`
**Có gọi API/DB không:** `POST /api/auth/register` → bảng `users`

---

**Tên chức năng:** Đăng nhập
**Người dùng thấy gì:** Form nhập email/username và mật khẩu
**Code thực thi ở đâu:** `backend/api/auth.py:236` — `login()` / `frontend/src/pages/Auth.jsx`
**Dữ liệu đầu vào:** `{email hoặc username, password}` — chấp nhận JSON, form-data, OAuth2 form
**Dữ liệu đầu ra / tác dụng:** Cập nhật `last_login`, trả về `{access_token, refresh_token, user}`, lưu vào localStorage
**Có gọi API/DB không:** `POST /api/auth/login` → bảng `users`

---

**Tên chức năng:** Tự động làm mới token (Silent Refresh)
**Người dùng thấy gì:** Không thấy gì — hoạt động ngầm khi access token hết hạn sau 15 phút
**Code thực thi ở đâu:** `frontend/src/services/api.js:97-130` — `interceptors.response`
**Dữ liệu đầu vào:** `refresh_token` từ localStorage
**Dữ liệu đầu ra / tác dụng:** Access token mới được lưu, request gốc được retry tự động. Nếu thất bại → redirect `/auth`
**Có gọi API/DB không:** `POST /api/auth/refresh` → bảng `users` (kiểm tra `token_version`)

---

**Tên chức năng:** Quên mật khẩu
**Người dùng thấy gì:** Nhập email → nhận link reset qua email
**Code thực thi ở đâu:** `backend/api/auth.py:350` — `forgot_password()`
**Dữ liệu đầu vào:** `{email}`
**Dữ liệu đầu ra / tác dụng:** Lưu `password_reset_token` + `expires_at = utcnow + 15 phút` vào DB, gửi email. Luôn trả về thành công dù email có tồn tại hay không (chống user enumeration)
**Có gọi API/DB không:** `POST /api/auth/forgot-password` → bảng `users`, gọi `utils/email.py`

---

**Tên chức năng:** Đặt lại mật khẩu
**Người dùng thấy gì:** Form nhập mật khẩu mới (vào từ link trong email)
**Code thực thi ở đâu:** `backend/api/auth.py:375` — `reset_password()`
**Dữ liệu đầu vào:** `{token, new_password}`
**Dữ liệu đầu ra / tác dụng:** Hash mật khẩu mới, xóa token (one-time use), tăng `token_version` → vô hiệu hóa tất cả refresh token cũ
**Có gọi API/DB không:** `POST /api/auth/reset-password` → bảng `users`

---

**Tên chức năng:** Đổi mật khẩu (khi đang đăng nhập)
**Người dùng thấy gì:** Form nhập mật khẩu hiện tại và mật khẩu mới trong trang profile
**Code thực thi ở đâu:** `backend/api/auth.py:416` — `change_password()` → `apply_password_change():162`
**Dữ liệu đầu vào:** `{current_password, new_password}`
**Dữ liệu đầu ra / tác dụng:** Kiểm tra mật khẩu cũ → hash mật khẩu mới → tăng `token_version`
**Có gọi API/DB không:** `POST /api/auth/change-password` → bảng `users`

---

**Tên chức năng:** Xem & cập nhật hồ sơ cá nhân
**Người dùng thấy gì:** Trang profile với avatar, bio, địa chỉ, số điện thoại, ngày sinh, giới tính
**Code thực thi ở đâu:** `backend/api/auth.py:436/445` — `get_current_user_info()` / `update_current_user()`
**Dữ liệu đầu vào:** (GET) không có / (PUT) các trường muốn cập nhật (đều optional)
**Dữ liệu đầu ra / tác dụng:** Trả về hoặc cập nhật `UserProfile`
**Có gọi API/DB không:** `GET/PUT /api/auth/me` → bảng `users`

---

**Tên chức năng:** Đăng xuất
**Người dùng thấy gì:** Nút đăng xuất → redirect về trang chủ
**Code thực thi ở đâu:** `backend/api/auth.py:496` — `logout()` / `frontend/src/services/api.js` — `clearAuthSession()`
**Dữ liệu đầu vào:** Bearer token trong header
**Dữ liệu đầu ra / tác dụng:** Xóa `access_token`, `refresh_token`, `user` khỏi localStorage. Server không lưu session nên chỉ cần xóa client-side
**Có gọi API/DB không:** `POST /api/auth/logout` (token invalidation chỉ xảy ra khi đổi mật khẩu)

---

## NHÓM 2: SẢN PHẨM & DANH MỤC

---

**Tên chức năng:** Duyệt danh sách sản phẩm
**Người dùng thấy gì:** Grid sản phẩm với bộ lọc danh mục, tìm kiếm, khoảng giá, sắp xếp — tự refresh mỗi 15 giây
**Code thực thi ở đâu:** `backend/api/products.py` — `list_products()` / `frontend/src/pages/Products.jsx`
**Dữ liệu đầu vào:** Query params: `category`, `search`, `min_price`, `max_price`, `sort_by`, `page`, `limit`
**Dữ liệu đầu ra / tác dụng:** Danh sách sản phẩm phân trang kèm `sold_count`, `rating` tổng hợp, qua `normalizeProduct()`
**Có gọi API/DB không:** `GET /api/products` → bảng `products`, `categories`, `reviews` (subquery)

---

**Tên chức năng:** Xem chi tiết sản phẩm
**Người dùng thấy gì:** Modal với ảnh, giá, mô tả, tồn kho, rating, đánh giá khách hàng, lịch sử độ tươi
**Code thực thi ở đâu:** `frontend/src/components/ProductDetail.jsx` / `backend/api/products.py`
**Dữ liệu đầu vào:** `product_id`
**Dữ liệu đầu ra / tác dụng:** Chi tiết sản phẩm + reviews (tên khách bị ẩn một phần) + freshness reviews tổng hợp
**Có gọi API/DB không:** `GET /api/products/{id}`, `GET /api/products/{id}/reviews`, `GET /api/products/{id}/freshness-reviews`

---

**Tên chức năng:** Xem danh mục sản phẩm
**Người dùng thấy gì:** Sidebar danh mục để lọc sản phẩm
**Code thực thi ở đâu:** `backend/api/products.py` — `list_categories()`
**Dữ liệu đầu vào:** Không
**Dữ liệu đầu ra / tác dụng:** Danh sách danh mục active — có cache 20 item
**Có gọi API/DB không:** `GET /api/products/categories` → bảng `categories`

---

**Tên chức năng:** Đánh giá sản phẩm
**Người dùng thấy gì:** Form viết review (sau khi mua hàng)
**Code thực thi ở đâu:** `backend/api/products.py` — `create_review()`
**Dữ liệu đầu vào:** `{rating, comment, product_id}`
**Dữ liệu đầu ra / tác dụng:** Tạo bản ghi `Review`, mỗi user chỉ được đánh giá 1 lần/sản phẩm
**Có gọi API/DB không:** `POST /api/products/{id}/reviews` → bảng `reviews`

---

**Tên chức năng:** Yêu thích sản phẩm
**Người dùng thấy gì:** Icon tim trên thẻ sản phẩm, trang `/favorites` để xem lại danh sách đã lưu
**Code thực thi ở đâu:** `frontend/src/context/FavoritesContext.jsx` / `frontend/src/pages/Favorites.jsx`
**Dữ liệu đầu vào:** `product_id`
**Dữ liệu đầu ra / tác dụng:** Lưu danh sách yêu thích theo từng tài khoản trong localStorage, tự migrate từ guest sang user khi đăng nhập
**Có gọi API/DB không:** Không gọi DB riêng, chỉ `GET /api/products` để render danh sách chi tiết

---

## NHÓM 3: GIỎ HÀNG & ĐẶT HÀNG

---

**Tên chức năng:** Thêm/xóa sản phẩm khỏi giỏ hàng
**Người dùng thấy gì:** Icon giỏ hàng với badge số lượng, trang giỏ hàng
**Code thực thi ở đâu:** `frontend/src/context/CartContext.jsx` — `addItem()`, `removeItem()`, `updateQuantity()`
**Dữ liệu đầu vào:** `{product_id, quantity, price, name, image}`
**Dữ liệu đầu ra / tác dụng:** State trong React Context — không gọi API, chỉ lưu trong bộ nhớ trình duyệt
**Có gọi API/DB không:** Không (client-only state)

---

**Tên chức năng:** Đặt hàng (Checkout)
**Người dùng thấy gì:** Trang giỏ hàng với địa chỉ, phương thức thanh toán, voucher, điểm tích lũy, tổng tiền
**Code thực thi ở đâu:** `backend/api/orders.py:139` — `create_order()` / `frontend/src/pages/Cart.jsx`
**Dữ liệu đầu vào:** `{items[], shipping_address, shipping_city, shipping_phone, payment_method, voucher_code?, points_to_redeem?}`
**Dữ liệu đầu ra / tác dụng:** Trừ kho atomic, tính subtotal+tax+shipping-discount, tạo `Order` + `OrderItem[]`, trừ loyalty_points nếu dùng điểm
**Có gọi API/DB không:** `POST /api/orders` → bảng `orders`, `order_items`, `products` (UPDATE stock)

---

**Tên chức năng:** Xem lịch sử đơn hàng
**Người dùng thấy gì:** Danh sách đơn hàng phân trang với trạng thái, tổng tiền, ngày đặt, nút xem chi tiết và xác nhận độ tươi
**Code thực thi ở đâu:** `backend/api/orders.py:549` — `list_orders_paginated()` / `frontend/src/components/profile/OrdersTab.jsx`
**Dữ liệu đầu vào:** `page`, `limit`
**Dữ liệu đầu ra / tác dụng:** Trả về `items[]`, `total`, `total_pages`, `status_counts`, đồng thời annotate cửa sổ xác nhận độ tươi cho từng đơn
**Có gọi API/DB không:** `GET /api/orders/paginated` → bảng `orders`, `order_items`, `freshness_reviews`

---

**Tên chức năng:** Chỉnh sửa đơn hàng khi còn chờ xác nhận
**Người dùng thấy gì:** Nút "Chỉnh sửa" chỉ xuất hiện với đơn `pending`, sửa trực tiếp địa chỉ/số điện thoại/ghi chú
**Code thực thi ở đâu:** `backend/api/orders.py:624` — `update_order()` / `frontend/src/components/profile/OrdersTab.jsx`
**Dữ liệu đầu vào:** `{shipping_address?, shipping_city?, shipping_phone?, notes?}`
**Dữ liệu đầu ra / tác dụng:** Cập nhật `Order` mà không tạo đơn mới; đơn đã `confirmed` trở lên sẽ bị khóa sửa
**Có gọi API/DB không:** `PUT /api/orders/{id}` → bảng `orders`

---

**Tên chức năng:** Hủy đơn hàng
**Người dùng thấy gì:** Nút "Hủy đơn" (chỉ hiện khi đơn ở trạng thái `pending`)
**Code thực thi ở đâu:** `backend/api/orders.py:749` — `cancel_order()`
**Dữ liệu đầu vào:** `order_id`
**Dữ liệu đầu ra / tác dụng:** Đổi status → `cancelled`, hoàn lại tồn kho qua `apply_stock_delta()`
**Có gọi API/DB không:** `POST /api/orders/{id}/cancel` → bảng `orders`, `products`

---

**Tên chức năng:** Xem mã QR chuyển khoản khi thanh toán
**Người dùng thấy gì:** Khi chọn `Bank Transfer`, trang Cart hiển thị ảnh QR công khai do admin cấu hình
**Code thực thi ở đâu:** `backend/api/admin.py:1272` — `get_public_payment_qr_setting()` / `frontend/src/pages/Cart.jsx`
**Dữ liệu đầu vào:** Không
**Dữ liệu đầu ra / tác dụng:** Trả về `{provider_name, image_url}` để người dùng quét thanh toán
**Có gọi API/DB không:** `GET /api/payment-qr` → bảng `payment_qr_settings`

---

## NHÓM 4: XÁC NHẬN ĐỘ TƯƠI

---

**Tên chức năng:** Kiểm tra điều kiện xác nhận độ tươi
**Người dùng thấy gì:** Nút "Xác nhận độ tươi" xuất hiện trên đơn đã giao, hiển thị đếm ngược 24h
**Code thực thi ở đâu:** `backend/api/orders.py:674` — `get_freshness_confirmation_eligibility()`
**Dữ liệu đầu vào:** `order_id`
**Dữ liệu đầu ra / tác dụng:** `{is_available, is_expired, already_confirmed, expires_at, reward_points, correct_bonus_points, incorrect_bonus_points, items[]}`
**Có gọi API/DB không:** `GET /api/orders/{id}/freshness-confirmation` → bảng `orders`, `freshness_reviews`

---

**Tên chức năng:** Phân tích ảnh độ tươi (AI Pipeline)
**Người dùng thấy gì:** Upload ảnh sản phẩm → thanh tiến trình → kết quả màu xanh/vàng/đỏ với điểm và hướng dẫn bảo quản
**Code thực thi ở đâu:** `frontend/src/services/freshnessAnalysis.js:167` — `analyzeFreshnessImage()`
**Dữ liệu đầu vào:** `{model, imageElement, imageFile, spoilageProfile, orderId}`
**Dữ liệu đầu ra / tác dụng:** 3 nhánh kết quả: `buildBackendResult()` (bình thường) / `buildOodResult()` (AI không chắc) / `buildLocalFallbackResult()` (lỗi mạng)
**Có gọi API/DB không:** Nội bộ TF.js (offline) + `POST /api/scans/quick-analyze`

---

**Tên chức năng:** Nộp xác nhận độ tươi
**Người dùng thấy gì:** Màn hình tổng kết với điểm thưởng nhận được
**Code thực thi ở đâu:** `backend/api/orders.py:702` — `submit_freshness_confirmation()`
**Dữ liệu đầu vào:** `multipart/form-data`: JSON `payload` + file ảnh từng sản phẩm
**Dữ liệu đầu ra / tác dụng:** Tạo `FreshnessReview[]`, cộng điểm động vào `loyalty_points`, có thể tự sinh voucher khi AI đoán sai và hàng thực tế bị hỏng, tạo `UserNotification`, trả về `complaint_available`
**Có gọi API/DB không:** `POST /api/orders/{id}/freshness-confirmation` → bảng `freshness_reviews`, `users`, `user_notifications`

---

**Tên chức năng:** Khiếu nại chất lượng — Hoàn tiền 30%
**Người dùng thấy gì:** Nút "Yêu cầu hoàn tiền" sau khi xác nhận có hàng hỏng → thông báo đang chờ admin duyệt
**Code thực thi ở đâu:** `backend/api/orders.py:610` — `create_freshness_complaint()` nhánh `refund`
**Dữ liệu đầu vào:** `{complaint_type: "refund", notes?}`
**Dữ liệu đầu ra / tác dụng:** Tạo `FreshnessComplaint` với `resolution_status=PENDING_REVIEW`, `refund_amount = total × 30%` — KHÔNG cộng tiền ngay, chờ admin duyệt
**Có gọi API/DB không:** `POST /api/orders/{id}/freshness-complaints` → bảng `freshness_complaints`, `user_notifications`

---

**Tên chức năng:** Khiếu nại chất lượng — Đổi hàng miễn phí
**Người dùng thấy gì:** Nút "Yêu cầu đổi hàng" → thông báo đơn đổi đã được tạo tự động
**Code thực thi ở đâu:** `backend/api/orders.py:682` — `create_freshness_complaint()` nhánh `replacement`
**Dữ liệu đầu vào:** `{complaint_type: "replacement", notes?}`
**Dữ liệu đầu ra / tác dụng:** Tự động tạo `Order` mới `total=0, payment_status=WAIVED`, trừ kho, liên kết `replacement_parent_order_id`
**Có gọi API/DB không:** `POST /api/orders/{id}/freshness-complaints` → bảng `orders`, `order_items`, `products`, `freshness_complaints`

---

## NHÓM 5: AI QUÉT ẢNH

---

**Tên chức năng:** Quét ảnh độ tươi nhanh (Quick Scan — không cần đăng nhập)
**Người dùng thấy gì:** Upload ảnh → nhận kết quả điểm tươi, issues phát hiện, hướng dẫn bảo quản
**Code thực thi ở đâu:** `backend/api/scans.py:342` — `quick_analyze_scan()`
**Dữ liệu đầu vào:** `image_file` (upload) hoặc `image_url` + `tfjs_predictions_json[]`, `commodity_group`, `order_id?`
**Dữ liệu đầu ra / tác dụng:** OOD check → nếu vượt ngưỡng chạy `mock_ai_scan()` (standards → visual → fallback random)
**Có gọi API/DB không:** `POST /api/scans/quick-analyze` → bảng `ood_logs` (nếu OOD)

---

**Tên chức năng:** Quét ảnh có xác thực (lưu lịch sử)
**Người dùng thấy gì:** Tương tự quick scan nhưng kết quả được lưu vào lịch sử quét của tài khoản
**Code thực thi ở đâu:** `backend/api/scans.py:233` — `create_scan()`
**Dữ liệu đầu vào:** `{image_url, product_id?, scan_method?, inspection_indicators?, commodity_group?}`
**Dữ liệu đầu ra / tác dụng:** Tạo `ScanResult` trong DB với `status=completed/failed`, ghi observability metric
**Có gọi API/DB không:** `POST /api/scans` → bảng `scan_results`

---

**Tên chức năng:** Gửi phản hồi về dự đoán AI (Scanner Feedback)
**Người dùng thấy gì:** Sau khi scan: "AI đoán đúng không?" → chọn đúng/sai + sửa nhãn nếu sai
**Code thực thi ở đâu:** `backend/api/scans.py:207` — `_create_feedback_event()` / `POST /api/scans/feedback-events`
**Dữ liệu đầu vào:** `{predicted_label, predicted_confidence, is_correct, corrected_label?, notes?, source}`
**Dữ liệu đầu ra / tác dụng:** Tạo `ScanFeedbackEvent` làm dataset để retrain model AI
**Có gọi API/DB không:** `POST /api/scans/feedback-events` → bảng `scan_feedback_events`

---

## NHÓM 6: ĐIỂM THƯỞNG & VOUCHER

---

**Tên chức năng:** Dùng điểm tích lũy khi thanh toán
**Người dùng thấy gì:** Ô "Dùng điểm" trong trang Cart, hiển thị số điểm hiện có (1 điểm = 1đ)
**Code thực thi ở đâu:** `backend/api/orders.py:251-262` — inline trong `create_order()`
**Dữ liệu đầu vào:** `points_to_redeem` trong `OrderCreate`
**Dữ liệu đầu ra / tác dụng:** Trừ `loyalty_points` khỏi tài khoản, giảm tương ứng `total` của đơn hàng
**Có gọi API/DB không:** Inline trong `POST /api/orders` → bảng `users`, `orders`

---

**Tên chức năng:** Tạo voucher phần thưởng
**Người dùng thấy gì:** Nhận voucher sau khi hoàn thành xác minh sản phẩm hoặc khi admin cần tạo voucher tri ân
**Code thực thi ở đâu:** `backend/api/rewards.py:113` — `generate_voucher()`
**Dữ liệu đầu vào:** `{userId, reason}`
**Dữ liệu đầu ra / tác dụng:** Tạo `GeneratedVoucher` với code `TRIAN-XXXXXXXX`, hết hạn sau 3 ngày; giảm 10% hoặc 15% tùy reason
**Có gọi API/DB không:** `POST /api/vouchers/generate` → bảng `generated_vouchers`

---

**Tên chức năng:** Xem danh sách voucher của tôi
**Người dùng thấy gì:** Danh sách voucher với trạng thái: còn hạn / đã dùng / hết hạn
**Code thực thi ở đâu:** `backend/api/rewards.py:150` — `get_my_vouchers()`
**Dữ liệu đầu vào:** Token xác thực
**Dữ liệu đầu ra / tác dụng:** Danh sách voucher kèm `is_used`, `is_expired`, `expires_at`
**Có gọi API/DB không:** `GET /api/vouchers/mine` → bảng `generated_vouchers`, `orders`

---

**Tên chức năng:** Áp dụng voucher khi thanh toán
**Người dùng thấy gì:** Ô nhập mã voucher trong Cart
**Code thực thi ở đâu:** `backend/api/rewards.py:64` — `resolve_active_voucher()` (gọi từ `create_order`)
**Dữ liệu đầu vào:** `voucher_code`, `user_id`, `order_total`
**Dữ liệu đầu ra / tác dụng:** Kiểm tra hợp lệ (tồn tại, chưa dùng, chưa hết hạn) → tính `discount_amount`
**Có gọi API/DB không:** Inline trong `POST /api/orders` → bảng `generated_vouchers`, `orders`

---

## NHÓM 7: SỔ ĐỊA CHỈ GIAO HÀNG

---

**Tên chức năng:** Quản lý sổ địa chỉ giao hàng (CRUD)
**Người dùng thấy gì:** Trang địa chỉ trong Cart hoặc Profile: thêm, sửa, xóa, đặt làm mặc định
**Code thực thi ở đâu:** `backend/api/delivery_profiles.py` — `list/create/update/delete/set_default_delivery_profile()`
**Dữ liệu đầu vào:** `{full_name, phone, address, city, is_default?}`
**Dữ liệu đầu ra / tác dụng:** CRUD bảng `delivery_profiles`. Khi xóa địa chỉ mặc định → tự chuyển default cho địa chỉ kế tiếp
**Có gọi API/DB không:** `GET/POST/PUT/DELETE /api/delivery-profiles` → bảng `delivery_profiles`

---

## NHÓM 8: THÔNG BÁO

---

**Tên chức năng:** Xem thông báo trong ứng dụng
**Người dùng thấy gì:** Icon chuông với badge số chưa đọc, danh sách thông báo (điểm thưởng, đơn hàng, khiếu nại)
**Code thực thi ở đâu:** `backend/api/notifications.py` — `get_notifications()` / `mark_notification_read()`
**Dữ liệu đầu vào:** `limit?` (mặc định 20), `unread_only?`
**Dữ liệu đầu ra / tác dụng:** Danh sách thông báo — chưa đọc đứng trước, sắp xếp theo thời gian
**Có gọi API/DB không:** `GET /api/notifications`, `PUT /api/notifications/{id}/read` → bảng `user_notifications`

---

**Tên chức năng:** Đánh dấu thông báo đã đọc
**Người dùng thấy gì:** Click vào từng thông báo → badge giảm xuống và mục đó chuyển sang trạng thái đã đọc
**Code thực thi ở đâu:** `backend/api/notifications.py` — `mark_notification_as_read()`
**Dữ liệu đầu vào:** `notification_id`
**Dữ liệu đầu ra / tác dụng:** Set `is_read=True` cho đúng user hiện tại; thông báo không thuộc user sẽ trả 404
**Có gọi API/DB không:** `PUT /api/notifications/{id}/read` → bảng `user_notifications`

---

## NHÓM 9: CHATBOT GỢI Ý CÔNG THỨC

---

**Tên chức năng:** Chatbot gợi ý công thức nấu ăn
**Người dùng thấy gì:** Cửa sổ chat, gõ nguyên liệu → nhận gợi ý món ăn kèm link sản phẩm
**Code thực thi ở đâu:** `frontend/src/services/chatbot.js` — `sendChatMessage()`, `findMatchingProducts()`
**Dữ liệu đầu vào:** Tin nhắn text + danh sách 30 sản phẩm đang có (cache)
**Dữ liệu đầu ra / tác dụng:** Gửi lên N8N webhook → nhận gợi ý công thức. Nếu webhook lỗi → `findMatchingProducts()` local (match 30 aliases tiếng Việt)
**Có gọi API/DB không:** N8N Webhook (external) + `GET /api/products` để lấy context sản phẩm

---

## NHÓM 10: QUẢN TRỊ — ADMIN

---

**Tên chức năng:** Dashboard thống kê tổng quan
**Người dùng thấy gì:** Cards: tổng doanh thu, đơn hôm nay, user mới, tồn kho thấp + biểu đồ 7 ngày
**Code thực thi ở đâu:** `backend/api/admin.py:835` — `get_stats()`
**Dữ liệu đầu vào:** Không
**Dữ liệu đầu ra / tác dụng:** Aggregation SQL: doanh thu, đơn theo ngày, sản phẩm tồn kho thấp, phản hồi AI chưa đọc — cache 30 giây
**Có gọi API/DB không:** `GET /api/admin/stats` → bảng `orders`, `users`, `products`, `scan_feedback_events`

---

**Tên chức năng:** Quản lý người dùng (xem + xóa + đổi vai trò)
**Người dùng thấy gì:** Bảng danh sách user, filter theo role, tìm kiếm, nút đổi role / xóa
**Code thực thi ở đâu:** `backend/api/admin.py:771/803/1184` — `get_paginated_users()` / `update_user_role()` / `delete_user()`
**Dữ liệu đầu vào:** `page, limit, search?, role?` / `{role: "admin"|"staff"|"customer"}` / `user_id`
**Dữ liệu đầu ra / tác dụng:** Phân trang users / cập nhật role / xóa user. Mọi thao tác ghi `AuditLog`
**Có gọi API/DB không:** `GET /api/admin/users/paginated`, `PUT /api/admin/users/{id}/role`, `DELETE /api/admin/users/{id}` → bảng `users`, `audit_logs`

---

**Tên chức năng:** Thêm sản phẩm mới
**Người dùng thấy gì:** Form thêm sản phẩm với upload ảnh, tên, giá, danh mục, số lượng
**Code thực thi ở đâu:** `backend/api/admin.py:577` — `add_product()`
**Dữ liệu đầu vào:** `multipart/form-data` hoặc JSON: `{name, price, category?, image_file?, stock?, unit?}`
**Dữ liệu đầu ra / tác dụng:** Kiểm tra tên trùng (case-insensitive) → tạo `Product` → ghi `StockTransaction IMPORT` → xóa cache → ghi `AuditLog`
**Có gọi API/DB không:** `POST /products/add` → bảng `products`, `categories`, `stock_transactions`, `audit_logs`

---

**Tên chức năng:** Sửa sản phẩm
**Người dùng thấy gì:** Form chỉnh sửa sản phẩm inline (tên, giá, ảnh, số lượng, danh mục)
**Code thực thi ở đâu:** `backend/api/admin.py:656` — `update_product()`
**Dữ liệu đầu vào:** `product_id` + các trường muốn cập nhật (tất cả optional)
**Dữ liệu đầu ra / tác dụng:** Cập nhật product, nếu sửa số lượng → ghi `StockTransaction`, xóa cache
**Có gọi API/DB không:** `PUT /products/{id}` → bảng `products`, `stock_transactions`, `audit_logs`

---

**Tên chức năng:** Xóa (ẩn) sản phẩm
**Người dùng thấy gì:** Nút xóa → sản phẩm biến khỏi cửa hàng (soft delete)
**Code thực thi ở đâu:** `backend/api/admin.py:747` — `delete_product()`
**Dữ liệu đầu vào:** `product_id`
**Dữ liệu đầu ra / tác dụng:** Soft delete: `is_active = False` (không xóa khỏi DB), xóa cache
**Có gọi API/DB không:** `DELETE /products/{id}` → bảng `products`, `audit_logs`

---

**Tên chức năng:** Quản lý đơn hàng (xem + cập nhật trạng thái)
**Người dùng thấy gì:** Bảng đơn hàng với filter status/ngày/phương thức, xem chi tiết, nút đổi trạng thái
**Code thực thi ở đâu:** `backend/api/admin.py:1207/1283` — `get_paginated_admin_orders()` / `update_order_status()`
**Dữ liệu đầu vào:** Filter params / `{new_status}`
**Dữ liệu đầu ra / tác dụng:** Cập nhật trạng thái + timestamps (`shipped_at`, `delivered_at`) + gửi notification nếu delivered
**Có gọi API/DB không:** `GET /api/admin/orders/paginated`, `PUT /api/admin/orders/{id}/status` → bảng `orders`, `user_notifications`, `audit_logs`

---

**Tên chức năng:** Cập nhật trạng thái hàng loạt đơn hàng
**Người dùng thấy gì:** Checkbox chọn nhiều đơn → bulk action đổi trạng thái cùng lúc
**Code thực thi ở đâu:** `backend/api/admin.py:1309` — `bulk_update_order_status()`
**Dữ liệu đầu vào:** `{order_ids: [], new_status}`
**Dữ liệu đầu ra / tác dụng:** Cập nhật tất cả trong 1 lần, trả về danh sách updated/missing IDs
**Có gọi API/DB không:** `PUT /api/admin/orders/bulk-status` → bảng `orders`

---

**Tên chức năng:** Quản lý kho — Nhập/xuất thủ công
**Người dùng thấy gì:** Form chọn sản phẩm, số lượng, loại (import/export), ghi chú
**Code thực thi ở đâu:** `backend/api/admin.py:1534` — `add_stock_transaction()`
**Dữ liệu đầu vào:** `{product_id, type, quantity, note?, transaction_date?}`
**Dữ liệu đầu ra / tác dụng:** `apply_stock_delta()` → cập nhật `products.quantity` + `stock_status`, tạo `StockTransaction`
**Có gọi API/DB không:** `POST /api/admin/stock-transactions` → bảng `stock_transactions`, `products`

---

**Tên chức năng:** Xuất lịch sử kho ra Excel
**Người dùng thấy gì:** Nút "Xuất Excel" → tải file `.xlsx`
**Code thực thi ở đâu:** `backend/api/admin.py:1454` — `export_stock_transactions_excel()`
**Dữ liệu đầu vào:** `search?`, `type?`
**Dữ liệu đầu ra / tác dụng:** Stream file Excel với 9 cột (id, product, type, quantity, date, handler, note)
**Có gọi API/DB không:** `GET /api/admin/stock-transactions/export-excel` → bảng `stock_transactions`

---

**Tên chức năng:** Import lịch sử kho từ Excel
**Người dùng thấy gì:** Nút "Import Excel" → chọn file `.xlsx` → xem kết quả
**Code thực thi ở đâu:** `backend/api/admin.py:1568` — `import_stock_transactions_excel()`
**Dữ liệu đầu vào:** File `.xlsx` với cột: `product_id, type, quantity, transaction_date?, note?`
**Dữ liệu đầu ra / tác dụng:** Parse → validate toàn bộ (projection check tồn kho) trước khi commit → `apply_stock_delta()` từng dòng
**Có gọi API/DB không:** `POST /api/admin/stock-transactions/import-excel` → bảng `stock_transactions`, `products`

---

**Tên chức năng:** Duyệt/từ chối khiếu nại hoàn tiền
**Người dùng thấy gì:** Danh sách khiếu nại `pending_review` với nút Duyệt / Từ chối
**Code thực thi ở đâu:** `backend/api/admin.py:1753/1780` — `approve_freshness_complaint()` / `reject_freshness_complaint()`
**Dữ liệu đầu vào:** `complaint_id`
**Dữ liệu đầu ra / tác dụng:** Duyệt → cộng `refund_amount` vào `user.voucher_balance`. Từ chối → `resolution_status = REJECTED`
**Có gọi API/DB không:** `PUT /api/admin/freshness-complaints/{id}/approve|reject` → bảng `freshness_complaints`, `users`

---

**Tên chức năng:** AI Feedback Dashboard
**Người dùng thấy gì:** Bảng phản hồi AI với filter đọc/chưa đọc/đúng/sai, tìm kiếm, phân trang
**Code thực thi ở đâu:** `backend/api/admin.py:1064` — `get_admin_feedback_events()` / `frontend/src/components/admin/AIFeedbackPanel.jsx`
**Dữ liệu đầu vào:** `status (all/unread/read)`, `verdict (all/correct/disputed)`, `search?`, `page`
**Dữ liệu đầu ra / tác dụng:** Merge `scan_feedback_events` + `verification_reports`, sort chưa đọc trước, thống kê số lượng theo nhóm
**Có gọi API/DB không:** `GET /api/admin/feedback-events` → bảng `scan_feedback_events`, `verification_reports`

---

**Tên chức năng:** Đánh dấu phản hồi AI đã đọc
**Người dùng thấy gì:** Click vào feedback → badge chuyển sang "đã đọc"
**Code thực thi ở đâu:** `backend/api/admin.py:1137` — `mark_feedback_event_as_read()`
**Dữ liệu đầu vào:** `feedback_id` (số dương = scan_feedback_event, số âm = verification_report)
**Dữ liệu đầu ra / tác dụng:** Set `is_read=True`, `read_at=utcnow()`, xóa cache stats
**Có gọi API/DB không:** `PUT /api/admin/feedback-events/{id}/read` → bảng `scan_feedback_events` hoặc `verification_reports`

---

**Tên chức năng:** Báo cáo xác minh độ tươi sau giao hàng
**Người dùng thấy gì:** Bảng admin liệt kê từng lượt khách xác nhận độ tươi: AI đoán gì, khách sửa gì, có voucher hay không
**Code thực thi ở đâu:** `backend/api/admin.py:1452` — `get_admin_freshness_verification_reports()` / `frontend/src/components/admin/FreshnessVerificationReportsPanel.jsx`
**Dữ liệu đầu vào:** `date_from?`, `date_to?`, `prediction_correct?`, `correct_result?`, `has_voucher?`, `page`, `limit`
**Dữ liệu đầu ra / tác dụng:** Join `freshness_reviews` + `orders` + `users` + `generated_vouchers`, hỗ trợ lọc case AI đúng/sai và case có voucher
**Có gọi API/DB không:** `GET /api/admin/freshness-verification-reports` → bảng `freshness_reviews`, `orders`, `users`, `generated_vouchers`

---

**Tên chức năng:** Xuất Excel báo cáo xác minh độ tươi
**Người dùng thấy gì:** Nút "Xuất Excel" trong tab báo cáo xác minh
**Code thực thi ở đâu:** `backend/api/admin.py:1522` — `export_freshness_verification_reports_excel()`
**Dữ liệu đầu vào:** Cùng bộ lọc với màn báo cáo (`date_from`, `date_to`, `prediction_correct`, `correct_result`, `has_voucher`)
**Dữ liệu đầu ra / tác dụng:** Stream file `.xlsx` để admin kiểm tra vận hành hoặc lưu làm dữ liệu audit
**Có gọi API/DB không:** `GET /api/admin/freshness-verification-reports/export-excel` → bảng `freshness_reviews`, `orders`, `users`, `generated_vouchers`

---

**Tên chức năng:** Cài đặt mã QR thanh toán
**Người dùng thấy gì:** Upload ảnh QR → khách thấy khi chọn phương thức Bank Transfer
**Code thực thi ở đâu:** `backend/api/admin.py:1020` — `upsert_payment_qr_setting()`
**Dữ liệu đầu vào:** `multipart/form-data: {image_file, provider_name?}`
**Dữ liệu đầu ra / tác dụng:** Lưu ảnh QR vào `/uploads/payment_qr/`, upsert bảng `payment_qr_settings`
**Có gọi API/DB không:** `PUT /api/admin/payment-qr` → bảng `payment_qr_settings`

---

## Bảng tổng hợp

| # | Chức năng | Nhóm | Endpoint | Bảng DB chính |
|---|-----------|------|----------|---------------|
| 1 | Đăng ký | Auth | `POST /api/auth/register` | `users` |
| 2 | Đăng nhập | Auth | `POST /api/auth/login` | `users` |
| 3 | Tự động làm mới token | Auth | `POST /api/auth/refresh` | `users` |
| 4 | Quên mật khẩu | Auth | `POST /api/auth/forgot-password` | `users` |
| 5 | Đặt lại mật khẩu | Auth | `POST /api/auth/reset-password` | `users` |
| 6 | Đổi mật khẩu | Auth | `POST /api/auth/change-password` | `users` |
| 7 | Xem/cập nhật hồ sơ | Auth | `GET/PUT /api/auth/me` | `users` |
| 8 | Đăng xuất | Auth | `POST /api/auth/logout` | — |
| 9 | Duyệt sản phẩm | Sản phẩm | `GET /api/products` | `products` |
| 10 | Xem chi tiết sản phẩm | Sản phẩm | `GET /api/products/{id}` | `products`, `reviews` |
| 11 | Xem danh mục | Sản phẩm | `GET /api/products/categories` | `categories` |
| 12 | Đánh giá sản phẩm | Sản phẩm | `POST /api/products/{id}/reviews` | `reviews` |
| 13 | Yêu thích sản phẩm | Sản phẩm | Client-side + `GET /api/products` | — |
| 14 | Giỏ hàng (thêm/xóa) | Đặt hàng | Client-only (CartContext) | — |
| 15 | Đặt hàng | Đặt hàng | `POST /api/orders` | `orders`, `products` |
| 16 | Xem lịch sử đơn hàng | Đặt hàng | `GET /api/orders/paginated` | `orders` |
| 17 | Chỉnh sửa đơn pending | Đặt hàng | `PUT /api/orders/{id}` | `orders` |
| 18 | Hủy đơn hàng | Đặt hàng | `POST /api/orders/{id}/cancel` | `orders`, `products` |
| 19 | Xem QR chuyển khoản | Đặt hàng | `GET /api/payment-qr` | `payment_qr_settings` |
| 20 | Kiểm tra điều kiện tươi | Độ tươi | `GET /api/orders/{id}/freshness-confirmation` | `orders`, `freshness_reviews` |
| 21 | Phân tích ảnh AI | Độ tươi | TF.js + `POST /api/scans/quick-analyze` | `ood_logs` |
| 22 | Nộp xác nhận độ tươi | Độ tươi | `POST /api/orders/{id}/freshness-confirmation` | `freshness_reviews`, `users` |
| 23 | Khiếu nại — hoàn tiền | Độ tươi | `POST /api/orders/{id}/freshness-complaints` | `freshness_complaints` |
| 24 | Khiếu nại — đổi hàng | Độ tươi | `POST /api/orders/{id}/freshness-complaints` | `orders`, `freshness_complaints` |
| 25 | Quick scan | AI | `POST /api/scans/quick-analyze` | `ood_logs` |
| 26 | Scan có xác thực | AI | `POST /api/scans` | `scan_results` |
| 27 | Phản hồi dự đoán AI | AI | `POST /api/scans/feedback-events` | `scan_feedback_events` |
| 28 | Dùng điểm tích lũy | Rewards | inline trong `POST /api/orders` | `users`, `orders` |
| 29 | Tạo voucher | Rewards | `POST /api/vouchers/generate` | `generated_vouchers` |
| 30 | Xem voucher của tôi | Rewards | `GET /api/vouchers/mine` | `generated_vouchers` |
| 31 | Áp dụng voucher | Rewards | inline trong `POST /api/orders` | `generated_vouchers` |
| 32 | Sổ địa chỉ giao hàng | Địa chỉ | `GET/POST/PUT/DELETE /api/delivery-profiles` | `delivery_profiles` |
| 33 | Xem thông báo | Thông báo | `GET /api/notifications` | `user_notifications` |
| 34 | Đánh dấu thông báo đã đọc | Thông báo | `PUT /api/notifications/{id}/read` | `user_notifications` |
| 35 | Chatbot công thức | Chatbot | N8N Webhook | — |
| 36 | Dashboard thống kê | Admin | `GET /api/admin/stats` | `orders`, `users`, `products` |
| 37 | Quản lý người dùng | Admin | `GET/PUT/DELETE /api/admin/users/...` | `users` |
| 38 | Thêm sản phẩm | Admin | `POST /api/products/add` | `products`, `stock_transactions` |
| 39 | Sửa sản phẩm | Admin | `PUT /api/products/{id}` | `products` |
| 40 | Xóa (ẩn) sản phẩm | Admin | `DELETE /api/products/{id}` | `products` |
| 41 | Quản lý đơn hàng | Admin | `GET/PUT /api/admin/orders/...` | `orders` |
| 42 | Bulk update đơn hàng | Admin | `PUT /api/admin/orders/bulk-status` | `orders` |
| 43 | Nhập/xuất kho thủ công | Admin | `POST /api/admin/stock-transactions` | `stock_transactions`, `products` |
| 44 | Xuất Excel kho | Admin | `GET /api/admin/stock-transactions/export-excel` | `stock_transactions` |
| 45 | Import Excel kho | Admin | `POST /api/admin/stock-transactions/import-excel` | `stock_transactions`, `products` |
| 46 | Duyệt khiếu nại hoàn tiền | Admin | `PUT /api/admin/freshness-complaints/{id}/approve` | `freshness_complaints`, `users` |
| 47 | AI Feedback Dashboard | Admin | `GET /api/admin/feedback-events` | `scan_feedback_events`, `verification_reports` |
| 48 | Đánh dấu feedback đã đọc | Admin | `PUT /api/admin/feedback-events/{id}/read` | `scan_feedback_events`, `verification_reports` |
| 49 | Báo cáo xác minh độ tươi | Admin | `GET /api/admin/freshness-verification-reports` | `freshness_reviews`, `generated_vouchers` |
| 50 | Xuất Excel báo cáo xác minh | Admin | `GET /api/admin/freshness-verification-reports/export-excel` | `freshness_reviews`, `generated_vouchers` |
| 51 | Cài đặt QR thanh toán | Admin | `PUT /api/admin/payment-qr` | `payment_qr_settings` |
