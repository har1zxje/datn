# BÁO CÁO CẬP NHẬT HOÀN CHỈNH DỰ ÁN FRESHFOOD AI

## 1. Giới thiệu đề tài

FreshFood AI là một hệ thống thương mại điện tử chuyên bán thực phẩm tươi sống, được phát triển theo định hướng kết hợp giữa nghiệp vụ bán hàng trực tuyến và khả năng kiểm tra, xác minh độ tươi sau giao hàng bằng trí tuệ nhân tạo. Khác với mô hình website bán thực phẩm thông thường chỉ dừng ở khâu trưng bày sản phẩm, đặt hàng và giao hàng, dự án này mở rộng thêm một vòng phản hồi chất lượng sau giao hàng, trong đó người dùng có thể tải ảnh thực tế của từng sản phẩm đã nhận để hệ thống hỗ trợ đánh giá độ tươi, xác nhận AI đúng hay sai, từ đó tạo dữ liệu phản hồi phục vụ cải thiện mô hình, đồng thời kích hoạt cơ chế thưởng điểm, sinh voucher hoặc khiếu nại chất lượng khi cần thiết.

Mục tiêu cốt lõi của hệ thống là tăng độ tin cậy cho hành vi mua thực phẩm online. Với các mặt hàng như rau, củ, quả, thịt, cá, khách hàng thường không thể kiểm chứng chất lượng thật của sản phẩm trước khi nhận hàng. Vì vậy, bài toán của FreshFood AI không chỉ là làm ra một website đặt hàng, mà là xây dựng được một quy trình số hóa đầy đủ từ mua hàng, giao hàng, xác minh chất lượng, phản hồi người dùng đến theo dõi vận hành và xử lý hậu mãi.

Tính đến ngày 19/06/2026, source code hiện tại cho thấy hệ thống đã hình thành tương đối đầy đủ các lớp chức năng từ phía khách hàng, phía nhân viên vận hành và phía quản trị viên. Đồng thời, hệ thống cũng đã được hỗ trợ bằng một lớp tài liệu kỹ thuật, tài liệu quan trắc, tài liệu huấn luyện mô hình và bộ kiểm thử backend tương đối hoàn chỉnh.

## 2. Mục tiêu và phạm vi hệ thống

Về mặt nghiệp vụ, hệ thống cho phép khách hàng đăng ký tài khoản, đăng nhập, duyệt danh mục sản phẩm, tìm kiếm và lọc hàng hóa, quản lý giỏ hàng, tạo đơn hàng, sử dụng voucher và điểm tích lũy, theo dõi lịch sử đơn hàng, quản lý nhiều địa chỉ giao hàng, xem thông báo, tương tác với chatbot và thực hiện xác minh độ tươi sau khi đơn hàng đã được giao. Nếu phát hiện sản phẩm không đạt chất lượng, khách hàng có thể tạo khiếu nại để yêu cầu hoàn tiền một phần hoặc đổi hàng miễn phí.

Về phía nhân viên vận hành, hệ thống hỗ trợ quản lý đơn hàng, sản phẩm và kho hàng. Vai trò `staff` được phép truy cập các tab vận hành thiết yếu của dashboard như đơn hàng, sản phẩm và kho. Về phía quản trị viên, hệ thống mở rộng thêm các quyền quản lý người dùng, phân quyền, theo dõi số liệu tổng quan, theo dõi phản hồi AI, xem báo cáo xác minh độ tươi và cấu hình mã QR thanh toán dùng cho khách hàng.

Phạm vi kỹ thuật của dự án bao gồm frontend React, backend FastAPI, ORM SQLAlchemy, cơ sở dữ liệu quan hệ, cache Redis với cơ chế graceful fallback, AI chạy trên trình duyệt bằng TensorFlow.js, một lớp quick scan ở backend, chatbot tích hợp webhook n8n, cùng với hạ tầng quan trắc dựa trên Prometheus, Grafana, Loki và Promtail.

## 3. Kiến trúc tổng thể của hệ thống

Kiến trúc hiện tại của FreshFood AI là kiến trúc web tách lớp giữa giao diện người dùng, lớp xử lý nghiệp vụ và lớp dữ liệu. Frontend được xây dựng bằng React 19 kết hợp Vite, React Router và Tailwind CSS. Backend được xây dựng bằng FastAPI, tổ chức mã nguồn theo các nhóm router độc lập như xác thực, sản phẩm, đơn hàng, quét AI, phần thưởng, địa chỉ giao hàng, thông báo và quản trị. Dữ liệu nghiệp vụ được lưu trữ bằng SQLAlchemy ORM, với khả năng dùng PostgreSQL trong môi trường chính và SQLite làm phương án fallback hoặc phục vụ môi trường cục bộ, kiểm thử.

Ở tầng giao diện, `App.jsx` định nghĩa các route công khai và route bảo vệ. Người dùng truy cập các trang chính như trang chủ, cửa hàng, yêu thích, xác thực, giỏ hàng, hồ sơ cá nhân, xác minh độ tươi và dashboard quản trị. Các context như `AuthContext`, `CartContext`, `FavoritesContext`, `AppSettingsContext` và `SessionNavigationContext` được dùng để quản lý trạng thái dùng chung toàn ứng dụng. Cách tổ chức này giúp giao diện tách biệt khá rõ giữa phần hiển thị, phần quản lý phiên người dùng và phần giao tiếp với backend.

Ở tầng backend, `main.py` chịu trách nhiệm khởi tạo ứng dụng FastAPI, cấu hình CORS, mount thư mục upload tĩnh, bật middleware metrics khi cần, đăng ký router và cung cấp các endpoint gốc như `/`, `/health` và `/metrics`. Một điểm đáng chú ý là `main.py` còn chứa nhiều hàm đảm bảo tương thích schema, tự backfill các bảng hoặc cột cũ khi ứng dụng khởi động. Điều này cho thấy dự án không chỉ phát triển tính năng mới mà còn quan tâm đến bài toán tương thích ngược với dữ liệu cũ.

Về dữ liệu, `database.py` cho phép sử dụng PostgreSQL như lựa chọn ưu tiên, đồng thời hỗ trợ SQLite fallback. Điều này phản ánh định hướng vừa thuận tiện cho phát triển cục bộ, vừa sẵn sàng cho môi trường triển khai thực tế hơn. Ngoài ra, `utils/cache.py` cho thấy Redis chỉ đóng vai trò hỗ trợ tăng tốc; nếu Redis không kết nối được, hệ thống vẫn vận hành bình thường bằng cách đọc trực tiếp từ cơ sở dữ liệu.

## 4. Công nghệ sử dụng

Phía frontend sử dụng React 19, Vite, Axios, Tailwind CSS, Framer Motion, Lucide React và TensorFlow.js. Đây là lựa chọn phù hợp cho một hệ thống cần giao diện giàu tương tác, cần xử lý ảnh trực tiếp trên trình duyệt và có nhiều trạng thái giao diện thay đổi theo vai trò người dùng.

Phía backend sử dụng Python, FastAPI, SQLAlchemy, Pydantic, Alembic, SlowAPI, Prometheus Client và OpenPyXL. FastAPI phù hợp với yêu cầu xây dựng API rõ ràng, kiểm tra dữ liệu đầu vào nghiêm ngặt và sinh tài liệu API thuận tiện trong môi trường phát triển. SQLAlchemy và Alembic phục vụ mô hình dữ liệu và tiến hóa schema. SlowAPI được dùng cho rate limiting các endpoint nhạy cảm. OpenPyXL phục vụ export và import Excel trong quản trị kho và báo cáo xác minh độ tươi.

Phần AI phía trình duyệt dựa trên TensorFlow.js và model trong `frontend/public/tfjs_model`. Phần backend scan hiện tại chưa nên mô tả như một pipeline model production độc lập, bởi trong `backend/api/scans.py` mã nguồn vẫn ghi rõ có các nhánh dựa trên đánh giá tiêu chuẩn, phân tích hư hỏng trực quan và fallback/mock cho Phase 1. Do đó, mô hình AI của hệ thống hiện nên được hiểu là một cấu trúc lai, trong đó frontend AI đóng vai trò quan trọng ở trải nghiệm người dùng, còn backend đóng vai trò kiểm tra bổ sung, đánh giá nhanh và kiểm soát rủi ro.

## 5. Phân tích chức năng theo vai trò người dùng

Đối với khách hàng, hệ thống hỗ trợ toàn bộ luồng mua sắm trực tuyến từ tạo tài khoản đến hậu mãi. Người dùng có thể đăng ký, đăng nhập, làm mới token tự động khi phiên hết hạn, đổi mật khẩu, quên mật khẩu và đặt lại mật khẩu qua email. Trong khu vực mua sắm, người dùng có thể duyệt danh mục, tìm kiếm theo từ khóa, lọc theo khoảng giá, xem sản phẩm nổi bật, mở modal chi tiết sản phẩm, xem đánh giá và tóm tắt lịch sử độ tươi công khai của sản phẩm. Hệ thống còn có trang yêu thích để lưu sản phẩm theo từng tài khoản, với cơ chế migrate từ guest sang user khi đăng nhập.

Trong giỏ hàng, người dùng không chỉ thêm hoặc xóa sản phẩm, mà còn có thể chọn từng sản phẩm cụ thể để thanh toán, dùng địa chỉ giao hàng mặc định hoặc tạo địa chỉ mới ngay trên luồng checkout, chọn phương thức thanh toán COD hoặc chuyển khoản, xem mã QR thanh toán công khai do admin cấu hình, dùng voucher hợp lệ và quy đổi điểm tích lũy theo cơ chế một điểm tương đương một đồng.

Ở khu vực hồ sơ cá nhân, người dùng có thể cập nhật thông tin cá nhân, avatar, bio, địa chỉ, số điện thoại, ngày sinh, giới tính, quản lý sổ địa chỉ giao hàng, theo dõi lịch sử đơn hàng, chỉnh sửa đơn ở trạng thái `pending`, hủy đơn khi còn đủ điều kiện, xem thống kê số đơn và truy cập luồng xác minh độ tươi sau giao hàng.

Đối với nhân viên vận hành `staff`, dashboard mở ra các quyền phục vụ vận hành thực tế gồm quản lý đơn hàng, quản lý sản phẩm và quản lý kho. Nhân viên có thể xem danh sách đơn theo bộ lọc, xem chi tiết đơn, cập nhật trạng thái, xem và cập nhật danh sách sản phẩm, theo dõi tồn kho hiện tại, tạo giao dịch nhập xuất kho thủ công, import Excel và export Excel.

Đối với quản trị viên `admin`, hệ thống cung cấp toàn bộ quyền của `staff` và mở rộng thêm dashboard tổng quan, quản lý người dùng, đổi vai trò, xóa tài khoản không phải admin, theo dõi phản hồi AI, xem báo cáo xác minh sau giao hàng, đánh dấu phản hồi đã đọc, cấu hình QR thanh toán và khai thác các số liệu hỗ trợ vận hành. Đây là lớp chức năng cho thấy hệ thống đã tiến gần hơn tới một sản phẩm có khả năng quản trị nội bộ chứ không chỉ là giao diện demo.

## 6. Luồng nghiệp vụ cốt lõi

Luồng đầu tiên là xác thực người dùng. Backend `auth.py` hỗ trợ đăng ký, đăng nhập bằng email hoặc username, refresh token, lấy thông tin cá nhân, cập nhật hồ sơ, đổi mật khẩu, quên mật khẩu và đặt lại mật khẩu. Cặp access token và refresh token được phát hành theo JWT. Một chi tiết kỹ thuật quan trọng là token chứa `ver`, tương ứng với `token_version` trong bảng `users`. Khi người dùng đổi hoặc đặt lại mật khẩu, `token_version` tăng lên, khiến refresh token cũ không còn hợp lệ. Đây là cơ chế tăng độ an toàn cho quản lý phiên đăng nhập.

Luồng thứ hai là đặt hàng. Khi người dùng gửi yêu cầu tạo đơn, backend kiểm tra từng sản phẩm còn hoạt động hay không, sau đó trừ tồn kho bằng câu lệnh atomic update có điều kiện `quantity >= requested`. Cơ chế này ngăn tình trạng bán vượt số lượng trong trường hợp nhiều request đồng thời. Sau khi trừ kho, hệ thống tạo `OrderItem`, ghi `stock_transactions`, tính tổng tạm, thuế, phí vận chuyển, trừ voucher và điểm tích lũy, rồi lưu đơn hàng với trạng thái khởi tạo là `pending`.

Luồng thứ ba là quản trị đơn hàng. Nhân viên hoặc quản trị viên có thể cập nhật trạng thái đơn từ `pending` sang `confirmed`, `shipped`, `delivered` hoặc các trạng thái khác theo quy tắc hiện hành. Khi đơn hàng được đánh dấu `delivered`, hệ thống bắt đầu cho phép người dùng truy cập luồng xác minh độ tươi trong một khoảng thời gian xác định.

Luồng thứ tư là xác minh độ tươi sau giao hàng. Đây là phần nghiệp vụ đặc trưng nhất của dự án. Khi mở route `/orders/:orderId/confirm-freshness`, frontend trước hết gọi API kiểm tra điều kiện xác minh để biết đơn đã giao chưa, đã quá hạn chưa, đã xác minh trước đó chưa và mỗi `order_item` có đủ điều kiện không. Sau đó, frontend tải model xác minh, cho phép người dùng chọn hoặc chụp ảnh cho từng sản phẩm trong đơn, thực hiện phân tích AI, rồi yêu cầu người dùng xác nhận dự đoán đúng hay sai. Nếu AI sai, người dùng phải cung cấp nhãn hoặc kết quả đúng để backend lưu lại.

Backend `orders.py` sau đó nhận payload dạng `multipart/form-data`, kiểm tra sự khớp giữa `order_item`, `product_id` và ảnh tải lên, lưu từng bản ghi `FreshnessReview`, tính điểm thưởng, cộng điểm vào tài khoản người dùng, tạo thông báo trong ứng dụng, và trong trường hợp có ít nhất một kết quả xác nhận là hàng hỏng, hệ thống có thể sinh voucher xin lỗi. Nếu dữ liệu xác minh cho thấy đủ điều kiện khiếu nại, frontend tiếp tục cho phép người dùng tạo yêu cầu hoàn tiền hoặc đổi hàng.

Luồng thứ năm là khiếu nại chất lượng. Hệ thống hiện hỗ trợ hai kiểu khiếu nại. Với nhánh hoàn tiền, backend tạo bản ghi `freshness_complaints` với `refund_amount` bằng 30% giá trị đơn và chuyển sang trạng thái chờ duyệt. Với nhánh đổi hàng, backend tạo một đơn hàng thay thế với `payment_status = WAIVED`, liên kết về đơn gốc qua `replacement_parent_order_id`, đồng thời trừ kho tương ứng cho đơn thay thế.

## 7. Chức năng AI và trạng thái triển khai

Từ góc nhìn hiện trạng mã nguồn, AI trong FreshFood AI nên được mô tả theo ba lớp khác nhau thay vì một khối thống nhất. Lớp thứ nhất là AI xác minh trên frontend, dùng TensorFlow.js và model trong `tfjs_model` để phân tích ảnh người dùng tải lên. Lớp này phục vụ trải nghiệm tương tác nhanh và đang là phần AI rõ ràng nhất trong sản phẩm chạy thực tế.

Lớp thứ hai là quick scan ở backend. `backend/api/scans.py` cho thấy quick scan có thể nhận ảnh tải lên hoặc URL ảnh, kết hợp kết quả TFJS gửi lên từ phía client và xử lý thêm các kiểm tra như OOD threshold. Nếu độ tự tin của mô hình phía client thấp hơn ngưỡng quy định, backend sẽ trả về trạng thái yêu cầu kiểm tra thủ công và ghi log OOD. Nếu dữ liệu đủ điều kiện, backend có thể đánh giá nhanh dựa trên chuẩn đánh giá và phân tích trực quan.

Lớp thứ ba là scanner độc lập. Dự án có `frontend/src/pages/Scanner.jsx`, `ScannerService.js` và `ScannerCard.jsx`, tức là đã có một màn quét riêng phục vụ thử nghiệm hoặc mở rộng. Tuy nhiên, route này hiện chưa được mount trong `App.jsx`, nên xét theo trạng thái sản phẩm phát hành, đây là tính năng có code nhưng chưa xuất hiện công khai trong luồng điều hướng chính. Báo cáo mới vì vậy phân loại nó vào nhóm chức năng đang phát triển hoặc chưa publish chính thức.

Nhìn chung, AI của dự án đã có giá trị thực tế rõ ràng ở luồng xác minh sau giao hàng, nhưng phần scan backend vẫn cần được mô tả trung thực là đang ở trạng thái lai giữa logic đánh giá thực tế và nhánh fallback/Phase 1.

## 8. Nhóm API hiện có

Về mặt tổ chức backend, hệ thống hiện có tám nhóm API chính. Nhóm `auth` phục vụ xác thực và hồ sơ người dùng. Nhóm `products` phục vụ danh mục, danh sách sản phẩm, chi tiết sản phẩm, review và tóm tắt lịch sử độ tươi công khai. Nhóm `orders` phục vụ tạo đơn, xem đơn, cập nhật đơn, hủy đơn, kiểm tra điều kiện xác minh độ tươi, nộp xác minh và tạo khiếu nại. Nhóm `delivery_profiles` quản lý sổ địa chỉ giao hàng. Nhóm `scans` phục vụ quick scan, lưu scan, lấy lịch sử scan và ghi nhận feedback scan. Nhóm `rewards` phục vụ cộng điểm và quản lý voucher của người dùng. Nhóm `notifications` cho phép lấy danh sách thông báo và đánh dấu đã đọc. Cuối cùng, nhóm `admin` cung cấp phần lớn năng lực quản trị của hệ thống, từ số liệu tổng quan, người dùng, đơn hàng, kho, feedback AI, báo cáo xác minh đến QR thanh toán.

Tổ chức API theo router độc lập giúp báo cáo có thể trình bày rõ kiến trúc phân tầng: route nhận request, schema Pydantic kiểm tra dữ liệu, ORM truy cập dữ liệu, utilities xử lý nghiệp vụ dùng lại, và frontend gọi qua `services/api.js` với cơ chế interceptor tự làm mới access token.

## 9. Cơ sở dữ liệu và các bảng chính

Lược đồ dữ liệu hiện tại của hệ thống được định nghĩa chủ yếu trong `backend/models.py`. Các bảng trung tâm gồm `users`, `categories`, `products`, `orders`, `order_items` và `reviews`. Đây là lớp dữ liệu cốt lõi cho các chức năng thương mại điện tử cơ bản.

Bên cạnh đó, dự án đã bổ sung một lớp bảng phục vụ các nghiệp vụ hậu mãi và AI. `scan_results` lưu các lần quét có xác thực. `scan_feedback_events` lưu phản hồi của người dùng về dự đoán AI. `freshness_reviews` lưu xác minh độ tươi theo từng `order_item`, bao gồm ảnh, nhãn dự đoán, kết quả đúng, điểm thưởng và liên kết voucher nếu có. `freshness_complaints` lưu khiếu nại chất lượng. `verification_reports` lưu các bản ghi phản hồi phục vụ quản trị và tổng hợp. `generated_vouchers` lưu voucher được sinh cho người dùng. `user_notifications` lưu thông báo nội bộ. `ood_logs` lưu các trường hợp ngoài phân phối. `stock_transactions` lưu nhật ký nhập xuất kho. `payment_qr_settings` lưu QR thanh toán do admin cấu hình. `audit_logs` phục vụ lưu vết thao tác quản trị.

Điểm cần ghi rõ trong báo cáo là source code hiện tại chứa schema chuẩn, nhưng file `freshfood_test.db` đi kèm repo chưa phản ánh đầy đủ toàn bộ bảng và cột mới ở trạng thái tĩnh. Tuy nhiên, `main.py` có cơ chế backfill hoặc bổ sung cột khi khởi động, và repo cũng chứa migration Alembic cho các thay đổi mới. Vì vậy, khi mô tả cơ sở dữ liệu trong báo cáo học thuật, cần lấy ORM và migration làm nguồn sự thật thay vì chỉ dựa vào file database mẫu.

## 10. Giao diện người dùng và các màn hình chính

Trang chủ `Home.jsx` hiện đóng vai trò dẫn hướng vào hành vi mua sắm, hiển thị nhóm sản phẩm nổi bật và các nhóm sản phẩm được đề xuất. Trang cửa hàng `Products.jsx` hỗ trợ lọc, tìm kiếm, phân trang và làm mới danh mục sản phẩm theo chu kỳ. Chi tiết sản phẩm được mở bằng modal, trong đó người dùng có thể xem mô tả, hình ảnh, đánh giá và thông tin độ tươi công khai.

Trang `Cart.jsx` được triển khai khá đầy đủ so với một giỏ hàng cơ bản. Người dùng có thể chọn riêng từng sản phẩm để thanh toán, lựa chọn hoặc tạo mới địa chỉ giao hàng, dùng voucher, quy đổi điểm, chọn phương thức thanh toán và xem QR chuyển khoản nếu cần. Đây là một điểm cho thấy giao diện không chỉ minh họa nghiệp vụ mà đã mô hình hóa khá sát một trải nghiệm mua hàng thực tế.

Trang `Profile.jsx` đóng vai trò là trung tâm quản lý tài khoản. Tại đây, người dùng theo dõi thông tin cá nhân, sổ địa chỉ, lịch sử đơn hàng, trạng thái đơn, khu vực yêu thích và cài đặt tài khoản. Riêng khu vực đơn hàng kết nối trực tiếp với luồng xác minh độ tươi, vì từ đây người dùng có thể truy cập sang màn hình xác minh nếu đơn đã giao và còn trong cửa sổ cho phép.

Trang `FreshnessConfirm.jsx` là giao diện nổi bật nhất về mặt đề tài. Tại đây, mỗi mặt hàng trong đơn được xem như một đối tượng xác minh riêng, người dùng phải cung cấp ảnh và phản hồi tương ứng. Giao diện này thể hiện rất rõ tinh thần của hệ thống: AI hỗ trợ đánh giá nhưng phản hồi cuối cùng vẫn dựa trên người dùng thật và dữ liệu đơn hàng thật.

Dashboard quản trị `AdminDashboard.jsx` hiện bao gồm các nhóm nội dung tổng quan, người dùng, đơn hàng, sản phẩm, kho hàng, báo cáo xác minh sau giao hàng và cài đặt. Với vai trò `staff`, giao diện chỉ mở các tab vận hành cần thiết. Với vai trò `admin`, dashboard mở rộng thêm dữ liệu tổng quan và cấu hình hệ thống. Việc này phản ánh một kiến trúc giao diện đã chú ý đến phân quyền thay vì chỉ dựng một dashboard đồng nhất cho mọi người quản trị.

## 11. Bảo mật, kiểm soát dữ liệu và độ tin cậy

Hệ thống áp dụng nhiều cơ chế bảo vệ đáng chú ý. Thứ nhất là xác thực JWT với refresh token và `token_version`, cho phép vô hiệu hóa phiên cũ khi đổi mật khẩu. Thứ hai là rate limiting cho các endpoint nhạy cảm như đăng ký, đăng nhập, quên mật khẩu và đặt lại mật khẩu. Thứ ba là kiểm tra ảnh upload không chỉ bằng phần mở rộng mà còn bằng magic bytes và giới hạn kích thước, nhằm tránh nhận file giả mạo.

Ở tầng nghiệp vụ, độ tin cậy còn được nâng bởi cơ chế atomic stock deduction và bảng `stock_transactions`, giúp mọi thay đổi tồn kho quan trọng đều có log. Trong AI, hệ thống không cố trả lời mọi trường hợp bằng một dự đoán chắc chắn, mà có cơ chế OOD và manual review khi confidence thấp. Ở tầng hạ tầng, `/health` và `/metrics` cho phép theo dõi tình trạng dịch vụ và số liệu HTTP hoặc scan event. Redis cache được dùng theo kiểu tăng tốc nhưng không làm hệ thống phụ thuộc cứng, vì khi Redis mất kết nối thì ứng dụng vẫn có thể tiếp tục hoạt động.

## 12. Kiểm thử và trạng thái hiện tại của dự án

Tại thời điểm rà soát, dự án có một bộ kiểm thử backend tương đối đầy đủ trong `backend/tests`. Các test bao phủ nhiều nhóm chức năng quan trọng như tiện ích xác thực, cập nhật hồ sơ, upload ảnh, tồn kho, order flow, quick scan, freshness confirmation, dashboard feedback, health và metrics. Việc chạy `pytest backend/tests -q` vào ngày 19/06/2026 cho kết quả `92 passed, 1 skipped`. Kết quả này không đồng nghĩa toàn bộ dự án đã hoàn toàn hoàn thiện, nhưng là một bằng chứng quan trọng cho thấy lớp nghiệp vụ backend cốt lõi đang có mức ổn định tốt.

Mặt khác, hệ thống vẫn tồn tại những giới hạn cần được nêu trung thực trong báo cáo. Thứ nhất, backend scan chưa nên được trình bày như một mô hình học sâu production hoàn chỉnh cho mọi trường hợp, bởi code vẫn còn nhánh mock/fallback của Phase 1. Thứ hai, chất lượng AI phụ thuộc mạnh vào chất lượng ảnh đầu vào, góc chụp, ánh sáng và phạm vi nhãn đã được huấn luyện. Thứ ba, trang scanner độc lập chưa được mount chính thức. Thứ tư, chatbot phụ thuộc webhook n8n để có câu trả lời đầy đủ từ nguồn ngoài, dù đã có fallback gợi ý sản phẩm local.

## 13. Kết quả đạt được

Xét trên trạng thái mã nguồn hiện tại, FreshFood AI đã vượt ra ngoài mức một đề tài chỉ trình diễn công nghệ riêng lẻ. Hệ thống đã kết hợp được ba lớp giá trị: lớp thương mại điện tử với catalog, giỏ hàng, đơn hàng và thanh toán; lớp hậu mãi với xác minh sau giao hàng, điểm thưởng, voucher và khiếu nại; và lớp quản trị nội bộ với dashboard, kho, phản hồi AI, báo cáo và quan trắc.

Điểm có ý nghĩa nhất về mặt đề tài là việc dữ liệu phản hồi sau giao hàng đã được gắn trực tiếp vào đơn hàng thật và người dùng thật. Điều này biến AI từ một công cụ trình diễn sang một thành phần có vai trò trong quy trình nghiệp vụ. Người dùng không chỉ nhận một kết quả dự đoán, mà còn cung cấp phản hồi đúng sai, từ đó góp phần tạo dữ liệu cho quản trị và mở đường cho cải tiến mô hình sau này.

## 14. Hạn chế và hướng phát triển

Dù đã đạt được nhiều thành phần quan trọng, hệ thống vẫn còn các giới hạn kỹ thuật và phạm vi cần tiếp tục phát triển. Hiện tại, AI chủ yếu đánh giá qua hình ảnh và chưa thể phản ánh các yếu tố như mùi, điều kiện bảo quản hay chất lượng bên trong sản phẩm. Phạm vi nhãn huấn luyện vẫn chỉ bao phủ một số nhóm thực phẩm tiêu biểu. Backend scan cũng chưa đạt đến mức một pipeline inference production đồng nhất cho mọi tình huống. Ngoài ra, một số thành phần như scanner độc lập hoặc tích hợp chatbot bên ngoài vẫn chưa ở mức triển khai công khai hoàn toàn.

Trong giai đoạn tiếp theo, dự án nên mở rộng tập dữ liệu huấn luyện thực tế, tận dụng phản hồi người dùng từ `freshness_reviews` và `scan_feedback_events` để retrain định kỳ, hoàn thiện hơn pipeline backend AI, bổ sung quy trình admin duyệt thủ công cho các ca confidence thấp, mở route công khai cho scanner nếu đây là tính năng chiến lược, và tiếp tục đồng bộ hóa database mẫu với schema mới để giảm độ lệch giữa dữ liệu minh họa và mô hình nguồn.

## 15. Kết luận

Phiên bản source code hiện tại cho thấy FreshFood AI đã phát triển thành một hệ thống web có chiều sâu hơn đáng kể so với một báo cáo cũ chỉ mô tả website bán hàng cơ bản. Trọng tâm của dự án nằm ở việc kết hợp thương mại điện tử với xác minh chất lượng sau giao hàng bằng AI và dữ liệu phản hồi người dùng. Kiến trúc hiện tại đủ rõ ràng để tiếp tục mở rộng, các luồng nghiệp vụ chính đã được hiện thực hóa trong code, lớp quản trị đã có khả năng quan sát và khai thác dữ liệu, còn backend đã được hậu thuẫn bởi một bộ kiểm thử có độ bao phủ tương đối tốt.

Vì vậy, nếu sử dụng source code làm nguồn sự thật, có thể kết luận rằng dự án hiện không nên được mô tả như một website bán hàng đơn thuần, mà nên được trình bày như một nền tảng thương mại điện tử thực phẩm tươi có tích hợp vòng xác minh sau giao hàng, AI hỗ trợ đánh giá, cơ chế thưởng và khiếu nại, cùng với lớp quản trị vận hành phục vụ theo dõi chất lượng dịch vụ và cải tiến hệ thống.
