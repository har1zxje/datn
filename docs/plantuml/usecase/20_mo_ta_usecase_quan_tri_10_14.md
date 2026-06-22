# Mô tả use case chi tiết cho khối quản trị (files 10-14)

## 1. Admin Dashboard Thống Kê

Tác nhân: Quản trị viên

Mô tả: Quản trị viên theo dõi bộ chỉ số tổng quan của hệ thống, doanh thu gần đây, đơn hàng mới, sản phẩm sắp hết hàng và feedback mới để ra quyết định vận hành nhanh.

Sự kiện kích hoạt: Admin truy cập khu vực `Dashboard` trong trang quản trị.

Tiền điều kiện: Đã đăng nhập với vai trò admin và hệ thống có dữ liệu thống kê cần thiết.

Luồng sự kiện chính:
1. Admin mở màn hình dashboard thống kê.
2. Frontend gọi API lấy KPI tổng quan, doanh thu 7 ngày, đơn mới, tồn kho thấp và feedback gần đây.
3. Backend tổng hợp dữ liệu từ users, orders, products, stock transactions và feedback.
4. Hệ thống hiển thị các thẻ thống kê, biểu đồ và danh sách cảnh báo.
5. Admin nhấn vào từng khu vực để điều hướng nhanh sang quản lý đơn hàng, kho hoặc feedback khi cần xử lý sâu.

Luồng sự kiện rẽ nhánh:
1. Không có dữ liệu trong một nhóm thống kê thì hệ thống vẫn hiển thị giá trị 0 hoặc trạng thái rỗng.
2. Lỗi tải dữ liệu hoặc hết phiên đăng nhập thì hiển thị thông báo lỗi và yêu cầu tải lại.
3. Tab điều hướng không hợp lệ thì hệ thống giữ nguyên màn hình hiện tại.

Kết quả: Admin nắm được tình hình vận hành tổng quan và có thể chuyển nhanh sang khu vực cần xử lý.

## 2. Quản Lý Người Dùng Và Phân Quyền

Tác nhân: Quản trị viên

Mô tả: Quản trị viên xem danh sách tài khoản, tìm kiếm và lọc người dùng, cập nhật vai trò, xóa tài khoản không phải admin và theo dõi đơn hàng của từng người dùng.

Sự kiện kích hoạt: Admin mở tab `Users` trong khu vực quản trị.

Tiền điều kiện: Đã đăng nhập với vai trò admin và có quyền quản lý người dùng.

Luồng sự kiện chính:
1. Admin truy cập màn hình quản lý người dùng.
2. Frontend gọi API lấy danh sách người dùng theo trang.
3. Admin tìm kiếm, lọc theo vai trò hoặc chuyển trang để xác định tài khoản cần xử lý.
4. Admin có thể đổi vai trò customer, staff, admin cho tài khoản mục tiêu.
5. Admin có thể xóa tài khoản không phải admin nếu cần.
6. Admin có thể xem nhanh lịch sử đơn hàng liên quan đến từng người dùng để đối chiếu nghiệp vụ.

Luồng sự kiện rẽ nhánh:
1. Không có user phù hợp bộ lọc thì hiển thị trạng thái rỗng.
2. Cố gắng tự hạ quyền admin của chính mình hoặc cấp role không hợp lệ thì backend từ chối.
3. Cố gắng xóa tài khoản admin hoặc tài khoản không tồn tại thì hệ thống báo lỗi.
4. User chưa có đơn hàng thì màn hình lịch sử đơn hiển thị không có dữ liệu.

Kết quả: Thông tin tài khoản và phân quyền được cập nhật đúng, danh sách người dùng được quản lý tập trung.

## 3. Quản Lý Đơn Hàng

Tác nhân: Nhân viên vận hành, Quản trị viên

Mô tả: Nhân viên vận hành và quản trị viên theo dõi danh sách đơn hàng, xem chi tiết, lọc tìm kiếm, cập nhật trạng thái từng đơn hoặc hàng loạt; riêng admin có thêm quyền xóa đơn.

Sự kiện kích hoạt: Staff hoặc admin mở tab `Orders` trong trang quản trị.

Tiền điều kiện: Đã đăng nhập với vai trò staff hoặc admin, đơn hàng tồn tại trong hệ thống.

Luồng sự kiện chính:
1. Người dùng truy cập màn hình quản lý đơn hàng.
2. Frontend gọi API lấy danh sách đơn hàng theo trang và các bộ lọc.
3. Người dùng tìm kiếm, lọc theo trạng thái, thanh toán, ngày tạo hoặc chuyển trang.
4. Người dùng mở chi tiết một đơn để xem sản phẩm, khách hàng, địa chỉ và thông tin thanh toán.
5. Người dùng cập nhật trạng thái một đơn hoặc chọn nhiều đơn để cập nhật hàng loạt.
6. Nếu là admin, người dùng có thể xóa đơn hàng khỏi hệ thống quản trị.

Luồng sự kiện rẽ nhánh:
1. Không có đơn phù hợp bộ lọc thì hiển thị empty state.
2. Trạng thái mới không hợp lệ hoặc một số id đơn không tồn tại thì backend từ chối hoặc chỉ cập nhật các đơn hợp lệ.
3. Không chọn đơn nào khi cập nhật hàng loạt thì frontend chặn thao tác.
4. Cố gắng xóa đơn không tồn tại thì backend trả về lỗi.

Kết quả: Danh sách đơn hàng được theo dõi và xử lý nhất quán, trạng thái đơn hàng được cập nhật kịp thời.

## 4. Quản Lý Sản Phẩm

Tác nhân: Nhân viên vận hành, Quản trị viên

Mô tả: Nhân viên vận hành và quản trị viên quản lý danh mục sản phẩm, bao gồm xem danh sách, tạo mới, cập nhật, xóa, tải ảnh và cấu hình badge, khuyến mãi hoặc sản phẩm nổi bật.

Sự kiện kích hoạt: Staff hoặc admin mở tab `Products` trong trang quản trị.

Tiền điều kiện: Đã đăng nhập với vai trò staff hoặc admin, danh mục và dữ liệu sản phẩm có sẵn trong hệ thống.

Luồng sự kiện chính:
1. Người dùng vào màn hình quản lý sản phẩm và xem danh sách hiện tại.
2. Người dùng chọn tạo mới hoặc cập nhật một sản phẩm đã có.
3. Hệ thống hiển thị form để nhập tên, giá, danh mục, tồn kho, đơn vị, mô tả và các thông tin bán hàng.
4. Người dùng có thể tải ảnh sản phẩm và cấu hình badge, khuyến mãi, featured nếu cần.
5. Frontend gửi request tạo mới, cập nhật hoặc xóa sản phẩm.
6. Backend validate dữ liệu, lưu thay đổi và đồng bộ lại danh sách hiển thị.

Luồng sự kiện rẽ nhánh:
1. Thiếu trường bắt buộc, giá không hợp lệ hoặc dữ liệu promotion sai thì backend từ chối lưu.
2. Ảnh upload sai định dạng, quá lớn hoặc hỏng thì hiển thị báo lỗi upload.
3. Sản phẩm không tồn tại khi sửa hoặc xóa thì trả về lỗi 404.
4. Vượt quá giới hạn sản phẩm nổi bật thì backend từ chối cập nhật.

Kết quả: Danh mục sản phẩm được cập nhật đúng nghiệp vụ và sản phẩm hiển thị chính xác trên hệ thống.

## 5. Quản Lý Kho Hàng

Tác nhân: Nhân viên vận hành, Quản trị viên

Mô tả: Nhân viên vận hành và quản trị viên theo dõi tồn kho, xem lịch sử giao dịch, nhập xuất kho thủ công, import export Excel và kiểm tra tồn kho trước khi thực hiện giao dịch xuất.

Sự kiện kích hoạt: Staff hoặc admin mở tab `Warehouse` trong trang quản trị.

Tiền điều kiện: Đã đăng nhập với vai trò staff hoặc admin, sản phẩm và dữ liệu tồn kho đã tồn tại trong hệ thống.

Luồng sự kiện chính:
1. Người dùng truy cập khu vực kho hàng và xem tồn kho hiện tại của từng sản phẩm.
2. Người dùng chuyển sang lịch sử giao dịch để xem các lần nhập xuất kho.
3. Người dùng có thể tạo giao dịch nhập kho hoặc xuất kho thủ công.
4. Người dùng có thể import giao dịch kho bằng file Excel hoặc export dữ liệu giao dịch ra Excel.
5. Trước mỗi giao dịch xuất, backend kiểm tra tồn kho hiện tại để đảm bảo không xuất vượt số lượng cho phép.
6. Hệ thống cập nhật tồn kho, ghi log giao dịch và đồng bộ lại danh sách hiển thị.

Luồng sự kiện rẽ nhánh:
1. Không có dữ liệu tồn kho hoặc giao dịch phù hợp bộ lọc thì hiển thị trạng thái rỗng.
2. Số lượng xuất lớn hơn tồn kho hoặc sản phẩm không tồn tại thì backend từ chối giao dịch.
3. File import không đúng định dạng, thiếu cột bắt buộc hoặc có dòng dữ liệu sai thì backend báo lỗi chi tiết.
4. Không có dữ liệu khi export thì hệ thống tạo file rỗng hoặc hiển thị cảnh báo tùy trường hợp.

Kết quả: Tồn kho được kiểm soát chính xác, lịch sử giao dịch được lưu vết đầy đủ và hệ thống tránh được tình trạng xuất âm kho.

## 6. Quản Lý Feedback Từ Chức Năng Quét AI Của Người Dùng

Tác nhân: Quản trị viên

Mô tả: Sau khi người dùng thực hiện chức năng quét nhanh độ tươi bằng AI và gửi phản hồi về kết quả dự đoán, quản trị viên theo dõi danh sách feedback này, lọc theo trạng thái hoặc kết luận, xem chi tiết ảnh scan và dự đoán AI, đồng thời đánh dấu các feedback đã được kiểm tra.

Sự kiện kích hoạt: Người dùng đã thực hiện quét AI và gửi feedback; sau đó admin mở tab quản lý `Feedback AI Scan` trong trang quản trị.

Tiền điều kiện: Đã đăng nhập với vai trò admin và hệ thống đã có dữ liệu feedback phát sinh từ chức năng quét AI phía người dùng.

Luồng sự kiện chính:
1. Admin truy cập màn hình quản lý feedback AI scan.
2. Frontend gọi API lấy danh sách feedback do người dùng gửi sau khi quét AI.
3. Admin tìm kiếm, lọc theo trạng thái, verdict hoặc từ khóa liên quan.
4. Admin mở chi tiết một feedback để xem ảnh người dùng đã quét, kết quả AI dự đoán và nội dung phản hồi từ người dùng.
5. Admin đánh giá nhanh xem kết quả AI có cần theo dõi thêm hay không.
6. Admin đánh dấu feedback là đã đọc sau khi kiểm tra xong.
7. Hệ thống cập nhật trạng thái đọc và đồng bộ lại danh sách hiển thị.

Luồng sự kiện rẽ nhánh:
1. Không có feedback phù hợp bộ lọc thì hệ thống hiển thị trạng thái rỗng.
2. Người dùng chưa gửi feedback sau quét AI thì danh sách chưa phát sinh dữ liệu.
3. Feedback không còn tồn tại hoặc dữ liệu ảnh lỗi thì hệ thống báo lỗi khi mở chi tiết.
4. Thao tác đánh dấu đã đọc thất bại thì frontend hiển thị thông báo lỗi và giữ nguyên trạng thái cũ.

Kết quả: Quản trị viên theo dõi được các phản hồi phát sinh từ chức năng quét AI của người dùng và kiểm soát được trạng thái kiểm tra của từng feedback.

## 7. Báo Cáo Xác Minh Bằng AI Sau Giao Từ Người Dùng

Tác nhân: Quản trị viên

Mô tả: Sau khi người dùng nhận hàng và thực hiện bước xác minh sản phẩm bằng AI, quản trị viên xem danh sách các bản ghi xác minh này, lọc theo ngày, độ chính xác, voucher và kết quả đúng sai, đồng thời xem chi tiết ảnh xác minh và thông tin thưởng liên quan.

Sự kiện kích hoạt: Người dùng đã gửi dữ liệu xác minh bằng AI sau giao hàng; sau đó admin mở tab `Báo cáo xác minh sau giao` trong trang quản trị.

Tiền điều kiện: Đã đăng nhập với vai trò admin và hệ thống đã có dữ liệu xác minh sau giao hàng do người dùng thực hiện.

Luồng sự kiện chính:
1. Admin truy cập màn hình báo cáo xác minh sau giao.
2. Frontend gọi API lấy danh sách các bản ghi xác minh bằng AI do người dùng gửi lên.
3. Admin lọc dữ liệu theo ngày, độ chính xác AI, trạng thái voucher hoặc kết quả đúng sai.
4. Admin mở chi tiết một báo cáo để xem ảnh người dùng dùng để xác minh, kết quả AI, thông tin reward, voucher và dữ liệu đối chiếu.
5. Admin đánh giá nhanh mức độ tin cậy hoặc các trường hợp cần kiểm tra thêm.
6. Khi cần lưu trữ hoặc tổng hợp, admin thực hiện export báo cáo ra Excel.
7. Hệ thống tạo file export và trả về cho admin tải xuống.

Luồng sự kiện rẽ nhánh:
1. Không có báo cáo phù hợp điều kiện lọc thì hệ thống hiển thị danh sách rỗng.
2. Người dùng chưa thực hiện xác minh sau giao thì chưa có dữ liệu báo cáo.
3. Báo cáo không còn tồn tại hoặc ảnh xác minh lỗi thì hệ thống báo lỗi khi xem chi tiết.
4. Không có dữ liệu để export thì hệ thống tạo file rỗng hoặc hiển thị cảnh báo tùy trường hợp.

Kết quả: Quản trị viên theo dõi được dữ liệu xác minh bằng AI do người dùng gửi sau giao hàng và có cơ sở để đối chiếu, thống kê hoặc xuất báo cáo.

## 8. Cài Đặt Và Thay QR Thanh Toán

Tác nhân: Quản trị viên

Mô tả: Quản trị viên xem QR thanh toán hiện tại, tải ảnh QR mới, cập nhật tên nhà cung cấp hoặc kênh thanh toán, sau đó lưu lại cấu hình QR đang sử dụng trong hệ thống.

Sự kiện kích hoạt: Admin mở tab `Cài đặt QR thanh toán` trong trang quản trị.

Tiền điều kiện: Đã đăng nhập với vai trò admin và có quyền cập nhật cấu hình thanh toán.

Luồng sự kiện chính:
1. Admin truy cập màn hình cài đặt QR thanh toán.
2. Hệ thống hiển thị QR hiện tại và các thông tin cấu hình liên quan.
3. Admin chọn tải ảnh QR mới nếu cần thay QR thanh toán.
4. Admin cập nhật tên nhà cung cấp hoặc kênh thanh toán tương ứng.
5. Admin nhấn lưu cấu hình QR thanh toán.
6. Backend kiểm tra dữ liệu, lưu ảnh và cập nhật cấu hình mới trong hệ thống.

Luồng sự kiện rẽ nhánh:
1. Ảnh QR tải lên sai định dạng, quá lớn hoặc bị lỗi thì hệ thống từ chối lưu.
2. Thiếu thông tin nhà cung cấp hoặc cấu hình không hợp lệ thì backend báo lỗi xác thực.
3. Admin không thay ảnh mới mà chỉ cập nhật thông tin kênh thanh toán thì hệ thống vẫn cho phép lưu cấu hình.

Kết quả: QR thanh toán và thông tin cấu hình liên quan được cập nhật thành công để sử dụng trên hệ thống.
