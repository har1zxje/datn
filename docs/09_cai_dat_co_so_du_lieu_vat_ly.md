# Cài đặt cơ sở dữ liệu vật lý

Phần này mô tả phiên bản rút gọn của cơ sở dữ liệu vật lý, chỉ giữ lại 9 bảng chính của hệ thống FreshFood AI để thuận tiện chèn vào báo cáo. Nội dung được tổng hợp từ `backend/models.py`.

Trong tài liệu này, kiểu dữ liệu được ghi theo cách biểu diễn của SQLAlchemy ORM. Các trường `Enum(...)` được lưu dưới dạng chuỗi trong cơ sở dữ liệu. Cột `Ràng buộc` dùng các ký hiệu như `PK`, `FK`, `Unique`, `Not Null`, `Null`, `Default`, `Index`.

Sao chép từng khối dưới đây vào Word, sau đó chọn `Insert -> Table -> Convert Text to Table` và chọn dấu phân tách là `Other: |`.

## 1. Bảng `users`

Lưu thông tin tài khoản, hồ sơ cá nhân và trạng thái xác thực của người dùng.

```text
STT|Tên trường|Kiểu dữ liệu|Ràng buộc|Mô tả
1|id|Integer|PK|Định danh người dùng
2|username|String(50)|Unique, Not Null|Tên đăng nhập
3|email|String(100)|Unique, Not Null|Email tài khoản
4|hashed_password|String(255)|Not Null|Mật khẩu đã băm
5|full_name|String(100)|Null|Họ và tên
6|phone|String(20)|Null|Số điện thoại
7|role|Enum(UserRole)|Default customer|Vai trò hệ thống
8|loyalty_points|Integer|Default 0|Điểm thưởng tích lũy
9|voucher_balance|DECIMAL(12,2)|Default 0|Số dư voucher hoặc bồi hoàn
10|avatar_url|Text|Null|Ảnh đại diện hoặc dữ liệu ảnh
11|bio|Text|Null|Mô tả ngắn hồ sơ người dùng
12|address|Text|Null|Địa chỉ chi tiết
13|city|String(50)|Null|Tỉnh hoặc thành phố
14|postal_code|String(20)|Null|Mã bưu chính
15|gender|String(20)|Null|Giới tính
16|date_of_birth|String(10)|Null|Ngày sinh theo định dạng YYYY-MM-DD
17|is_active|Boolean|Default True|Trạng thái kích hoạt tài khoản
18|is_verified|Boolean|Default False|Trạng thái xác minh tài khoản
19|verification_token|String(255)|Null|Mã xác minh tài khoản
20|password_reset_token|String(255)|Null|Mã đặt lại mật khẩu
21|password_reset_expires_at|DateTime|Null|Thời điểm hết hạn mã đặt lại mật khẩu
22|token_version|Integer|Not Null, Default 0|Phiên bản token để vô hiệu hóa token cũ
23|created_at|DateTime|Default utcnow|Thời điểm tạo bản ghi
24|updated_at|DateTime|Default utcnow, Auto Update|Thời điểm cập nhật gần nhất
25|last_login|DateTime|Null|Lần đăng nhập gần nhất
```

## 2. Bảng `categories`

Lưu danh mục dùng để phân loại các sản phẩm trong hệ thống.

```text
STT|Tên trường|Kiểu dữ liệu|Ràng buộc|Mô tả
1|id|Integer|PK|Định danh danh mục
2|name|String(100)|Unique, Not Null|Tên danh mục sản phẩm
3|slug|String(100)|Unique, Null|Chuỗi thân thiện cho URL
4|description|Text|Null|Mô tả danh mục
5|image_url|String(255)|Null|Ảnh đại diện danh mục
6|is_active|Boolean|Default True|Trạng thái sử dụng
7|order|Integer|Default 0|Thứ tự hiển thị
8|created_at|DateTime|Default utcnow|Thời điểm tạo bản ghi
9|updated_at|DateTime|Default utcnow, Auto Update|Thời điểm cập nhật gần nhất
```

## 3. Bảng `products`

Lưu thông tin chi tiết sản phẩm, giá bán, tồn kho và dữ liệu hỗ trợ AI.

```text
STT|Tên trường|Kiểu dữ liệu|Ràng buộc|Mô tả
1|id|Integer|PK|Định danh sản phẩm
2|name|String(200)|Not Null|Tên sản phẩm
3|slug|String(200)|Unique, Null|Chuỗi thân thiện cho URL sản phẩm
4|description|Text|Null|Mô tả chi tiết sản phẩm
5|category_id|Integer|FK -> categories.id, Not Null|Danh mục của sản phẩm
6|price|DECIMAL(10,2)|Not Null|Giá gốc
7|discount_price|DECIMAL(10,2)|Null|Giá giảm
8|promotion_type|String(20)|Default none|Loại khuyến mãi
9|promotion_value|DECIMAL(10,2)|Default 0|Giá trị khuyến mãi
10|promotion_label|String(120)|Null|Nhãn khuyến mãi hiển thị
11|quantity|Integer|Default 0|Số lượng tồn kho
12|low_stock_threshold|Integer|Default 5|Ngưỡng cảnh báo sắp hết hàng
13|unit|String(30)|Default kg|Đơn vị tính
14|stock_status|String(30)|Default in_stock|Trạng thái kho
15|sku|String(50)|Unique, Null|Mã nội bộ sản phẩm
16|image_url|String(255)|Null|Ảnh đại diện
17|images|JSON|Null|Danh sách ảnh chi tiết
18|rating|Float|Default 5.0|Điểm đánh giá trung bình
19|review_count|Integer|Default 0|Số lượt đánh giá
20|origin|String(100)|Null|Xuất xứ sản phẩm
21|harvest_date|DateTime|Null|Ngày thu hoạch
22|expiry_date|DateTime|Null|Ngày hết hạn
23|is_active|Boolean|Default True|Trạng thái kinh doanh
24|is_featured|Boolean|Default False|Đánh dấu sản phẩm nổi bật
25|ai_supported|Boolean|Default False|Có hỗ trợ AI nhận diện hay không
26|ai_class_name|String(50)|Null|Tên lớp AI ánh xạ
27|created_at|DateTime|Default utcnow|Thời điểm tạo bản ghi
28|updated_at|DateTime|Default utcnow, Auto Update|Thời điểm cập nhật gần nhất
```

## 4. Bảng `orders`

Lưu thông tin đơn hàng, thanh toán, giao hàng và trạng thái xử lý đơn.

```text
STT|Tên trường|Kiểu dữ liệu|Ràng buộc|Mô tả
1|id|Integer|PK|Định danh đơn hàng
2|order_number|String(50)|Unique, Not Null|Mã đơn hàng duy nhất
3|user_id|Integer|FK -> users.id, Not Null|Người dùng đặt hàng
4|subtotal|DECIMAL(12,2)|Not Null|Tổng tiền hàng trước phí và thuế
5|tax|DECIMAL(10,2)|Default 0|Thuế
6|shipping_fee|DECIMAL(10,2)|Default 0|Phí giao hàng
7|discount|DECIMAL(10,2)|Default 0|Số tiền giảm giá
8|total|DECIMAL(12,2)|Not Null|Tổng tiền thanh toán cuối cùng
9|shipping_address|Text|Null|Địa chỉ giao hàng
10|shipping_city|String(100)|Null|Thành phố giao hàng
11|shipping_phone|String(20)|Null|Số điện thoại nhận hàng
12|status|Enum(OrderStatus)|Default pending|Trạng thái đơn hàng
13|payment_method|String(50)|Null|Phương thức thanh toán
14|payment_status|Enum(PaymentStatus)|Default pending|Trạng thái thanh toán
15|order_type|String(30)|Default normal|Loại đơn hàng
16|replacement_parent_order_id|Integer|FK -> orders.id, Null|Đơn gốc nếu đây là đơn thay thế
17|voucher_code|String(60)|Null|Mã voucher áp dụng
18|points_redeemed|Integer|Default 0|Điểm thưởng đã sử dụng
19|notes|Text|Null|Ghi chú của người dùng
20|admin_notes|Text|Null|Ghi chú quản trị
21|created_at|DateTime|Default utcnow|Thời điểm tạo đơn
22|updated_at|DateTime|Default utcnow, Auto Update|Thời điểm cập nhật gần nhất
23|shipped_at|DateTime|Null|Thời điểm giao cho đơn vị vận chuyển
24|delivered_at|DateTime|Null|Thời điểm giao thành công
```

## 5. Bảng `order_items`

Lưu từng sản phẩm cụ thể thuộc một đơn hàng.

```text
STT|Tên trường|Kiểu dữ liệu|Ràng buộc|Mô tả
1|id|Integer|PK|Định danh dòng đơn hàng
2|order_id|Integer|FK -> orders.id, Not Null|Đơn hàng cha
3|product_id|Integer|FK -> products.id, Not Null|Sản phẩm được mua
4|quantity|Integer|Not Null|Số lượng mua
5|price_at_purchase|DECIMAL(10,2)|Not Null|Đơn giá tại thời điểm mua
6|subtotal|DECIMAL(12,2)|Not Null|Thành tiền của dòng hàng
7|created_at|DateTime|Default utcnow|Thời điểm tạo bản ghi
```

## 6. Bảng `reviews`

Lưu đánh giá của người dùng dành cho sản phẩm sau khi mua hàng.

```text
STT|Tên trường|Kiểu dữ liệu|Ràng buộc|Mô tả
1|id|Integer|PK|Định danh đánh giá
2|product_id|Integer|FK -> products.id, Not Null|Sản phẩm được đánh giá
3|user_id|Integer|FK -> users.id, Not Null|Người viết đánh giá
4|rating|Integer|Not Null|Số sao từ 1 đến 5
5|title|String(200)|Null|Tiêu đề đánh giá
6|comment|Text|Null|Nội dung đánh giá
7|is_verified_purchase|Boolean|Default False|Có phải người mua thật hay không
8|is_approved|Boolean|Default False|Trạng thái duyệt hiển thị
9|helpful_count|Integer|Default 0|Số lượt đánh giá hữu ích
10|created_at|DateTime|Default utcnow|Thời điểm tạo đánh giá
11|updated_at|DateTime|Default utcnow, Auto Update|Thời điểm cập nhật gần nhất
```

## 7. Bảng `delivery_profiles`

Lưu danh sách địa chỉ giao hàng của người dùng.

```text
STT|Tên trường|Kiểu dữ liệu|Ràng buộc|Mô tả
1|id|Integer|PK|Định danh địa chỉ giao hàng
2|user_id|Integer|FK -> users.id, Not Null|Chủ sở hữu địa chỉ
3|full_name|String(100)|Not Null|Tên người nhận
4|phone|String(20)|Not Null|Số điện thoại nhận hàng
5|address|Text|Not Null|Địa chỉ chi tiết
6|city|String(100)|Not Null|Tỉnh hoặc thành phố
7|is_default|Boolean|Default False|Đánh dấu địa chỉ mặc định
8|created_at|DateTime|Default utcnow|Thời điểm tạo bản ghi
9|updated_at|DateTime|Default utcnow, Auto Update|Thời điểm cập nhật gần nhất
```

## 8. Bảng `freshness_reviews`

Lưu kết quả người dùng xác minh độ tươi sản phẩm sau khi nhận hàng.

```text
STT|Tên trường|Kiểu dữ liệu|Ràng buộc|Mô tả
1|id|Integer|PK|Định danh lượt xác minh độ tươi
2|order_id|Integer|FK -> orders.id, Not Null, Index|Đơn hàng liên quan
3|order_item_id|Integer|FK -> order_items.id, Not Null, Index|Dòng sản phẩm trong đơn
4|user_id|Integer|FK -> users.id, Not Null, Index|Người xác minh
5|product_id|Integer|FK -> products.id, Not Null, Index|Sản phẩm được xác minh
6|image_url|Text|Not Null|Ảnh sau giao hàng
7|ai_label|String(20)|Null|Nhãn AI nhận diện
8|ai_confidence|Float|Null|Độ tin cậy AI
9|freshness_score|Integer|Null|Điểm độ tươi
10|predicted_label|String(120)|Null|Nhãn AI dự đoán để so sánh
11|predicted_result|String(40)|Null|Kết quả AI dự đoán
12|is_prediction_correct|Boolean|Null|Người dùng xác nhận dự đoán đúng hay sai
13|correct_label|String(120)|Null|Nhãn đúng do người dùng chỉnh
14|correct_result|String(40)|Null|Kết quả đúng do người dùng chỉnh
15|reward_points|Integer|Default 0|Điểm thưởng cho lượt xác minh
16|voucher_id|Integer|FK -> generated_vouchers.id, Null, Index|Voucher phát sinh nếu có
17|manual_rating|String(20)|Null|Đánh giá thủ công
18|manual_note|Text|Null|Ghi chú thủ công
19|is_public|Boolean|Default True|Có cho phép hiển thị công khai hay không
20|created_at|DateTime|Default utcnow, Index|Thời điểm tạo bản ghi
```

Ràng buộc đặc biệt: bảng `freshness_reviews` có unique constraint `uq_freshness_reviews_order_item_user` trên cặp trường `order_item_id` và `user_id`, bảo đảm mỗi người dùng chỉ xác minh một lần cho mỗi dòng sản phẩm.

## 9. Bảng `freshness_complaints`

Lưu các khiếu nại liên quan đến chất lượng sản phẩm sau giao hàng.

```text
STT|Tên trường|Kiểu dữ liệu|Ràng buộc|Mô tả
1|id|Integer|PK|Định danh khiếu nại
2|order_id|Integer|FK -> orders.id, Not Null, Index|Đơn hàng bị khiếu nại
3|user_id|Integer|FK -> users.id, Not Null, Index|Người gửi khiếu nại
4|complaint_type|Enum(ComplaintType)|Not Null|Loại khiếu nại
5|refund_amount|DECIMAL(12,2)|Default 0|Số tiền hoàn đề xuất
6|replacement_order_id|Integer|FK -> orders.id, Null|Đơn thay thế nếu có
7|resolution_status|Enum(ComplaintResolutionStatus)|Default created|Trạng thái xử lý khiếu nại
8|notes|Text|Null|Ghi chú xử lý
9|created_at|DateTime|Default utcnow, Index|Thời điểm tạo khiếu nại
```
