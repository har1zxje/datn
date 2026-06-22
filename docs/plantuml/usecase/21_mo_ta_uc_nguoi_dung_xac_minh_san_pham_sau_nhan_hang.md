# Mô tả UC người dùng xác minh sản phẩm sau khi nhận hàng

## 1. Người Dùng Xác Minh Sản Phẩm Sau Khi Nhận Hàng

Tác nhân: Người dùng đã đăng nhập

Hệ thống liên quan: Mô hình AI

Mô tả: Sau khi nhận đơn hàng, người dùng thực hiện chức năng xác minh sản phẩm bằng AI để kiểm tra độ tươi hoặc tình trạng sản phẩm đã giao. Người dùng tải ảnh hoặc chụp ảnh từng sản phẩm trong đơn, xem kết quả AI dự đoán, xác nhận kết quả đúng hoặc khai báo lại nếu AI dự đoán sai, sau đó gửi xác minh cho toàn bộ đơn hàng.

Sự kiện kích hoạt: Người dùng mở đơn hàng đã giao và chọn chức năng `Xác minh sản phẩm sau khi nhận hàng`.

Tiền điều kiện:
1. Người dùng đã đăng nhập.
2. Đơn hàng đã ở trạng thái đã giao.
3. Đơn hàng còn trong thời gian cho phép xác minh sau giao.
4. Hệ thống có hỗ trợ chức năng phân tích ảnh bằng AI.

Luồng sự kiện chính:
1. Người dùng truy cập chi tiết đơn hàng đã nhận.
2. Hệ thống kiểm tra đơn hàng có đủ điều kiện xác minh sau giao hay không.
3. Người dùng chụp ảnh hoặc tải ảnh lên cho từng sản phẩm đã giao.
4. Hệ thống gửi ảnh sang mô hình AI để phân tích.
5. AI trả về kết quả dự đoán cho từng sản phẩm.
6. Người dùng xem kết quả AI và xác nhận dự đoán là đúng.
7. Nếu cần, người dùng có thể bổ sung ghi chú thủ công cho sản phẩm hoặc cho đơn hàng.
8. Người dùng gửi xác minh cho toàn bộ đơn hàng.
9. Hệ thống lưu kết quả xác minh, ghi nhận lịch sử và cập nhật dữ liệu báo cáo.
10. Nếu thỏa điều kiện, hệ thống cộng điểm thưởng xác minh cho người dùng.
11. Nếu phát hiện sản phẩm có vấn đề, hệ thống có thể phát sinh voucher xin lỗi hoặc cho phép khởi tạo yêu cầu hoàn tiền, đổi hàng.

Luồng sự kiện rẽ nhánh:
1. Đơn hàng không đủ điều kiện xác minh sau giao thì hệ thống không cho phép bắt đầu quy trình xác minh.
2. Người dùng chưa tải đủ ảnh hoặc ảnh bị mờ, sai định dạng, không đọc được thì hệ thống yêu cầu tải lại ảnh hợp lệ.
3. AI dự đoán sai thì người dùng chọn khai báo lại kết quả đúng thay vì xác nhận dự đoán AI.
4. AI không đủ độ tin cậy hoặc không phân tích được ảnh thì hệ thống thông báo để người dùng chụp lại ảnh hoặc bổ sung ghi chú thủ công.
5. Người dùng thoát giữa chừng trước khi gửi xác minh thì dữ liệu chưa được ghi nhận hoàn tất.
6. Không có sản phẩm hỏng hoặc bất thường thì hệ thống không tạo voucher và không phát sinh bước khiếu nại.

Kết quả: Kết quả xác minh sản phẩm sau khi nhận hàng được lưu vào hệ thống; người dùng hoàn tất bước hậu kiểm đơn hàng, có thể nhận điểm thưởng xác minh và có cơ sở để tiếp tục khiếu nại hoặc nhận hỗ trợ nếu phát hiện sản phẩm có vấn đề.
