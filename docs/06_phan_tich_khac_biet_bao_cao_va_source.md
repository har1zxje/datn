# Phân tích khác biệt giữa tài liệu cũ và source code hiện tại

## 1. Phạm vi và ghi chú kiểm chứng

Trong workspace hiện tại không tồn tại file báo cáo Word dạng `.doc` hoặc `.docx`. Vì vậy, việc đối chiếu trực tiếp với “báo cáo Word cũ” theo yêu cầu không thể thực hiện một cách tuyệt đối ở mức từng câu chữ. Để vẫn bảo đảm tiến độ và độ chính xác theo source code, phần phân tích này được lập trên cơ sở các tài liệu cũ hiện còn trong repo, bao gồm `README.md`, `backend/README.md`, `backend/API_DOCUMENTATION.md`, cùng với các dấu vết mô tả nghiệp vụ đã lỗi thời nằm rải rác trong tài liệu dự án. Trong toàn bộ quá trình đối chiếu, source code hiện tại được xem là nguồn sự thật cuối cùng.

Việc kiểm chứng được thực hiện bằng cách đọc mã nguồn backend, frontend, model cơ sở dữ liệu, tài liệu kỹ thuật trong `docs/`, `ops/`, `model_training/`, `n8n/`, đồng thời chạy bộ kiểm thử backend bằng lệnh `pytest backend/tests -q` vào ngày 19/06/2026. Kết quả kiểm thử ghi nhận `92 passed, 1 skipped`, cho thấy các luồng backend cốt lõi đang ở trạng thái ổn định.

## 2. Nhận định tổng quát

So với lớp tài liệu cũ còn lại trong repo, dự án hiện tại đã phát triển vượt xa một website thương mại điện tử cơ bản. Điểm thay đổi lớn nhất không chỉ nằm ở giao diện hay số lượng endpoint, mà nằm ở việc hệ thống đã hình thành một chuỗi nghiệp vụ sau giao hàng tương đối hoàn chỉnh: đơn hàng được giao, người dùng xác minh độ tươi theo từng mặt hàng bằng ảnh, AI dự đoán và người dùng phản hồi đúng sai, hệ thống cộng điểm, sinh voucher xin lỗi trong một số trường hợp, mở luồng khiếu nại hoàn tiền hoặc đổi hàng, đồng thời đẩy dữ liệu sang dashboard quản trị để theo dõi và export báo cáo.

Một số tài liệu cũ vẫn mô tả hệ thống ở mức “Phase 1”, hoặc ghi nhận các tính năng chưa còn đúng với code hiện tại, điển hình là Google OAuth. Ngược lại, nhiều tính năng thực tế đã có trong source code hiện nay lại chưa được phản ánh đầy đủ trong lớp mô tả cũ, đặc biệt là các bảng dữ liệu mới, các báo cáo quản trị, phân quyền `staff`, QR thanh toán, sổ địa chỉ giao hàng, hệ thống yêu thích, và các luồng dữ liệu phản hồi AI.

## 3. Bảng đối chiếu khác biệt

| Nội dung | Trong tài liệu cũ | Trong source code hiện tại | Cần cập nhật |
| --- | --- | --- | --- |
| File báo cáo Word gốc | Không tìm thấy trong workspace nên không thể đối chiếu trực tiếp theo từng đoạn | Chỉ có các tài liệu Markdown và kỹ thuật nội bộ | Cần thay bằng một bản báo cáo mới hoàn chỉnh, đồng bộ theo source code |
| Xác thực người dùng | Một số mô tả cũ ghi nhận có Google OAuth | Backend `auth.py` chỉ hiện thực JWT, refresh token, quên mật khẩu, đặt lại mật khẩu và đổi mật khẩu; không có luồng Google OAuth hoàn chỉnh | Loại bỏ mô tả Google OAuth khỏi báo cáo mới |
| Phạm vi vai trò người dùng | Tài liệu cũ thường mô tả người dùng và admin ở mức khái quát | `models.UserRole` định nghĩa `customer`, `staff`, `moderator`, `manager`, `admin`; frontend thực tế dùng `customer`, `staff`, `admin`; `staff` có vùng quản trị vận hành riêng | Cập nhật lại mô hình phân quyền và use case theo vai trò |
| Danh mục tính năng khách hàng | Chủ yếu xoay quanh xem sản phẩm, giỏ hàng và đặt hàng | Đã có thêm yêu thích, sổ địa chỉ giao hàng, voucher, điểm thưởng, QR thanh toán, thông báo, xác minh độ tươi sau giao hàng | Bổ sung toàn bộ các tính năng mới vào báo cáo |
| Luồng đơn hàng | Mô tả cũ thiên về checkout thông thường | `orders.py` dùng atomic stock deduction, ghi `stock_transactions`, hỗ trợ voucher, điểm, QR chuyển khoản và hoàn kho khi hủy đơn | Cập nhật quy trình nghiệp vụ đặt hàng và kiểm soát tồn kho |
| Luồng sau giao hàng | Nhiều tài liệu cũ chưa có hoặc chỉ nhắc ở mức ý tưởng | Đã có endpoint kiểm tra điều kiện xác minh, trang `FreshnessConfirm.jsx`, lưu `freshness_reviews`, cộng điểm, sinh voucher, mở khiếu nại | Bổ sung thành một chương nghiệp vụ riêng |
| Khiếu nại chất lượng | Chưa được mô tả đầy đủ | Hệ thống hỗ trợ hai dạng `refund` và `replacement`, có bảng `freshness_complaints`, trạng thái xử lý và liên kết đơn đổi hàng | Bổ sung mô tả mục đích, luồng và bảng dữ liệu liên quan |
| Hệ thống phản hồi AI | Tài liệu cũ mô tả AI scan khá đơn giản | Đã có `scan_feedback_events`, `verification_reports`, dashboard đọc/chưa đọc, đánh dấu đã xem, tổng hợp phản hồi tranh chấp | Cập nhật phần AI feedback và quản trị dữ liệu phản hồi |
| Báo cáo xác minh độ tươi | Chưa có hoặc chưa đầy đủ | Admin có màn `FreshnessVerificationReportsPanel`, API lọc theo ngày, đúng/sai, có voucher, và export Excel | Bổ sung module báo cáo quản trị mới |
| QR thanh toán | Hầu như chưa có trong mô tả cũ | Có API public `/api/payment-qr`, API admin cập nhật QR, panel cấu hình trên dashboard | Bổ sung kiến trúc và giao diện thanh toán bằng QR |
| Kho hàng | Tài liệu cũ mô tả ở mức cơ bản | Đã có ledger `stock_transactions`, nhập xuất thủ công, import Excel, export Excel, lọc lịch sử và cảnh báo tồn kho thấp | Cập nhật chương quản trị kho và lược đồ dữ liệu |
| Thông báo người dùng | Ít được mô tả | Có bảng `user_notifications`, API lấy danh sách và đánh dấu đã đọc, thông báo về thưởng điểm, voucher và đơn hàng | Bổ sung chức năng thông báo nội bộ |
| Chatbot | Mô tả cũ có thể coi như một thành phần ý tưởng | `ChatWidget` đã xuất hiện trên giao diện public; `chatbot.js` tích hợp webhook n8n và có fallback gợi ý sản phẩm local khi webhook chưa cấu hình | Mô tả đúng là tính năng có giao diện, có fallback, phụ thuộc webhook bên ngoài để đầy đủ |
| AI scan backend | Một số mô tả cũ có xu hướng diễn giải như model backend hoàn chỉnh | `backend/api/scans.py` ghi rõ scan inference endpoint hiện vẫn có nhánh mock/fallback cho Phase 1; quick scan và đánh giá trực quan đã thực tế hơn nhưng chưa phải pipeline model production hoàn chỉnh | Viết lại phần AI theo hướng trung thực, tách “đã triển khai” và “đang hoàn thiện” |
| Scanner độc lập | Có code giao diện scanner | `frontend/src/pages/Scanner.jsx` tồn tại nhưng `App.jsx` chưa mount route `/scanner` | Đánh dấu đây là chức năng đang phát triển hoặc chưa publish chính thức |
| Cơ sở dữ liệu | Tài liệu cũ chưa đầy đủ các bảng mới | ORM hiện có thêm `delivery_profiles`, `freshness_reviews`, `freshness_complaints`, `verification_reports`, `generated_vouchers`, `user_notifications`, `payment_qr_settings`, `ood_logs`, `audit_logs` | Cập nhật chương cơ sở dữ liệu và ERD logic |
| Quan trắc vận hành | Không phải lúc nào cũng được mô tả | Có `observability.py`, endpoint `/metrics`, tài liệu Prometheus, Grafana, Loki, Promtail trong `ops/observability` | Bổ sung phần kiến trúc giám sát hệ thống |
| Chất lượng triển khai | Tài liệu cũ ít phản ánh mức độ kiểm thử | Repo có bộ test backend khá đầy đủ cho auth, order flow, stock, freshness confirmation, feedback dashboard, health và metrics | Bổ sung chương đánh giá kết quả đạt được và độ tin cậy hiện tại |
| Database mẫu đi kèm repo | Có thể bị hiểu là schema hiện hành | `freshfood_test.db` đang chưa phản ánh đầy đủ toàn bộ bảng và cột mới trong ORM; backend dùng cơ chế backfill/migration khi khởi động | Cần ghi rõ source code mới là nguồn sự thật, file DB mẫu chỉ mang tính dữ liệu minh họa |

## 4. Các tính năng mới nổi bật chưa nên bỏ sót trong báo cáo mới

Nếu xem source code hiện tại như phiên bản chính thức mới nhất của dự án, thì những nội dung chắc chắn phải xuất hiện trong báo cáo mới gồm sổ địa chỉ giao hàng, điểm thưởng và voucher, xác minh độ tươi sau giao hàng, khiếu nại hoàn tiền hoặc đổi hàng, dashboard AI feedback, báo cáo xác minh sau giao hàng, QR thanh toán do admin cấu hình, quan trắc Prometheus, hệ thống thông báo nội bộ, phân quyền `staff`, cơ chế atomic stock update, và chiến lược fallback cho Redis, chatbot n8n cũng như AI backend.

Trong số đó, luồng xác minh sau giao hàng là thay đổi có giá trị học thuật và nghiệp vụ lớn nhất, vì nó kết nối nhiều lớp công nghệ cùng lúc: giao diện React, mô hình TensorFlow.js ở frontend, API FastAPI, bảng `freshness_reviews`, `generated_vouchers`, `freshness_complaints`, `verification_reports`, logic cộng điểm, và dashboard quản trị.

## 5. Kết luận đối chiếu

Kết quả phân tích cho thấy lớp tài liệu cũ hiện không còn đủ để đại diện cho trạng thái dự án hiện tại. Nhiều nội dung quan trọng đã xuất hiện sau này nhưng chưa được mô tả, trong khi một số mô tả cũ lại không còn đúng với source code, tiêu biểu là Google OAuth và mức độ hoàn thiện của backend AI scan. Vì vậy, phương án phù hợp nhất không phải là vá nhỏ từng đoạn, mà là phát hành một bản báo cáo mới hoàn chỉnh, trong đó dùng source code hiện tại làm nguồn chuẩn, đồng thời nêu rõ các hạng mục đã hoàn thiện, các thành phần đang ở mức fallback hoặc đang phát triển, và các giới hạn kỹ thuật còn tồn tại.
