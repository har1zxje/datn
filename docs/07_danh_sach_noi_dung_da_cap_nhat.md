# Danh sách nội dung đã được cập nhật

Tài liệu này ghi nhận các nhóm nội dung đã được làm mới để đồng bộ với source code tính đến ngày 19/06/2026. Mục tiêu của danh sách không phải để lặp lại toàn bộ báo cáo, mà để chỉ ra rõ những phần nào đã được chỉnh sửa, bổ sung hoặc viết lại hoàn toàn.

## 1. Các phần được viết lại ở mức hệ thống

Phần giới thiệu dự án đã được viết lại để phản ánh đúng bản chất hiện tại của FreshFood AI: đây không chỉ là một website bán thực phẩm, mà là một nền tảng thương mại điện tử có tích hợp quy trình xác minh độ tươi sau giao hàng. Phần kiến trúc tổng thể cũng đã được cập nhật để mô tả đúng các lớp frontend React, backend FastAPI, cơ sở dữ liệu qua SQLAlchemy, thành phần AI phía trình duyệt, chatbot n8n, Redis cache và hệ thống observability.

Phần phạm vi người dùng đã được chỉnh lại theo ba nhóm chính là khách hàng, nhân viên vận hành `staff` và quản trị viên `admin`. Những điểm khác biệt về quyền truy cập giữa `staff` và `admin` trong dashboard hiện nay đã được mô tả rõ ràng hơn so với các mô tả cũ vốn thường chỉ chia thành người dùng thường và quản trị viên.

## 2. Các phần nghiệp vụ đã được bổ sung

Luồng đặt hàng đã được cập nhật theo logic thực tế trong `backend/api/orders.py`, bao gồm trừ kho bằng câu lệnh atomic update, tính thuế 10%, miễn phí vận chuyển theo ngưỡng, áp dụng voucher, quy đổi điểm thưởng và ghi sổ giao dịch kho. Đây là phần thay đổi quan trọng vì mô tả cũ chưa làm rõ cơ chế chống bán vượt tồn kho.

Luồng xác minh độ tươi sau giao hàng đã được bổ sung thành một phần trung tâm của báo cáo. Nội dung cập nhật hiện mô tả điều kiện mở cửa sổ xác minh 24 giờ sau khi giao hàng, cách người dùng tải ảnh theo từng `order_item`, việc AI đưa ra dự đoán ban đầu, bước người dùng xác nhận đúng sai, việc backend lưu `freshness_reviews`, cộng điểm thưởng, sinh voucher xin lỗi trong trường hợp phù hợp và mở luồng khiếu nại khi phát hiện hàng hỏng.

Phần khiếu nại chất lượng cũng đã được viết mới để phản ánh đúng hai nhánh xử lý hiện có là hoàn tiền một phần và đổi hàng miễn phí. Báo cáo hiện mô tả rõ rằng đây không phải thao tác tách rời, mà phát sinh từ dữ liệu xác minh độ tươi sau giao hàng.

## 3. Các phần chức năng frontend đã được cập nhật

Phần giao diện đã được cập nhật lại theo các route và page thực tế gồm trang chủ, cửa hàng, yêu thích, xác thực, giỏ hàng, hồ sơ cá nhân, xác minh độ tươi và dashboard quản trị. Trang chi tiết sản phẩm dạng modal, sổ địa chỉ giao hàng trong hồ sơ, trang yêu thích, hệ thống chat widget, cấu hình QR thanh toán trong giỏ hàng và các panel quản trị mới đều đã được bổ sung vào báo cáo mới.

Một cập nhật quan trọng khác là báo cáo hiện tách biệt rõ giữa chức năng đã mount chính thức và chức năng đang tồn tại ở mức code nhưng chưa được publish. Cụ thể, trang `Scanner.jsx` đã được ghi nhận là đã có code triển khai nhưng chưa được mount route trong `App.jsx`, do đó được xếp vào nhóm đang phát triển hoặc chưa đưa vào sử dụng chính thức.

## 4. Các phần backend và API đã được cập nhật

Phần API đã được làm mới theo đúng nhóm router hiện tại: `auth`, `products`, `orders`, `delivery_profiles`, `scans`, `rewards`, `admin` và `notifications`. Báo cáo mới không còn mô tả Google OAuth như một tính năng hoàn chỉnh, vì source code hiện tại chưa hiện thực luồng đó.

Phần bảo mật đã được cập nhật với các nội dung mới gồm access token và refresh token, cơ chế `token_version` để vô hiệu hóa refresh token cũ khi đổi mật khẩu, rate limit cho các endpoint nhạy cảm, và xác thực upload ảnh bằng magic bytes. Những nội dung này phản ánh chính xác hơn mức độ hoàn thiện thực tế của hệ thống.

Phần quản trị đã được bổ sung các nhóm chức năng mới như bảng phản hồi AI, báo cáo xác minh sau giao hàng, xuất Excel, cấu hình mã QR thanh toán, quản lý giao dịch kho và dashboard tổng quan có số liệu tổng hợp, cảnh báo tồn kho thấp và phản hồi chưa đọc.

## 5. Phần cơ sở dữ liệu đã được cập nhật

Chương cơ sở dữ liệu đã được mở rộng để đưa vào toàn bộ các bảng quan trọng hiện có trong ORM, thay vì chỉ dừng ở các bảng bán hàng cơ bản. Các bảng mới hoặc có ý nghĩa nghiệp vụ mới như `delivery_profiles`, `freshness_reviews`, `freshness_complaints`, `verification_reports`, `generated_vouchers`, `user_notifications`, `payment_qr_settings`, `ood_logs` và `audit_logs` đều đã được bổ sung.

Ngoài ra, báo cáo mới cũng ghi rõ rằng source code là nguồn định nghĩa schema chuẩn, còn file `freshfood_test.db` đi kèm repo chỉ là dữ liệu mẫu và chưa phản ánh đầy đủ tất cả bảng, cột mới ở trạng thái tĩnh.

## 6. Phần AI, chatbot và quan trắc đã được cập nhật

Phần AI đã được viết lại theo hướng trung thực hơn. Báo cáo mới nêu rõ frontend có model TensorFlow.js hoạt động thực tế cho các luồng xác minh bằng ảnh, trong khi backend quick scan hiện kết hợp đánh giá theo tiêu chuẩn, phân tích hư hỏng trực quan và nhánh fallback/mock cho một số tình huống. Điều này giúp báo cáo tránh mô tả quá mức rằng toàn bộ backend AI đã ở mức production model hoàn chỉnh.

Phần chatbot đã được cập nhật để phản ánh đúng việc `ChatWidget` đã hiện diện trong giao diện public, có thể gọi webhook n8n khi được cấu hình, và có cơ chế fallback gợi ý sản phẩm local khi webhook chưa sẵn sàng.

Phần vận hành hệ thống đã được bổ sung các nội dung về `/health`, `/metrics`, Prometheus, Grafana, Loki, Promtail và cache Redis với cơ chế graceful fallback khi môi trường phát triển không có Redis.

## 7. Phần kết quả đạt được và đánh giá hiện trạng đã được cập nhật

Báo cáo mới đã thêm trạng thái kiểm chứng kỹ thuật thông qua bộ test backend. Nội dung hiện ghi nhận rằng vào ngày 19/06/2026, bộ test backend chạy thành công với `92 passed, 1 skipped`, qua đó tăng giá trị thuyết phục cho phần kết quả đạt được.

Đồng thời, phần hạn chế hiện tại cũng đã được viết lại để phản ánh đúng thực trạng: chất lượng AI còn phụ thuộc ảnh đầu vào, phạm vi nhãn model chưa bao phủ toàn bộ thực phẩm tươi, trang scanner độc lập chưa mount, backend scan vẫn còn nhánh Phase 1/fallback, và chatbot n8n chỉ đầy đủ khi webhook bên ngoài được cấu hình.
