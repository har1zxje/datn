# KỊCH BẢN THUYẾT TRÌNH 10 PHÚT

Ghi chú phạm vi: kịch bản này được tổng hợp từ README, tài liệu trong `docs/`, source code backend/frontend, schema trong `backend/models.py`, cấu hình môi trường dạng tên biến, tài liệu `model_training`, `n8n`, `ops`, và nội dung text trích từ `slide_doan.pptx`. Không sử dụng giá trị bí mật trong file `.env`.

## Slide 1. Website bán thực phẩm với AI xác minh độ tươi sau khi nhận hàng

### Nội dung nói:

Kính chào hội đồng và thầy cô. Em là Đào Hoàng Hải, hôm nay em xin trình bày đề tài xây dựng website bán thực phẩm có tích hợp AI xác minh độ tươi sau khi người dùng nhận hàng, kèm chatbot hỗ trợ khách hàng.

Bối cảnh của đề tài đến từ nhu cầu mua thực phẩm online. Khi mua rau, củ, thịt, cá qua website, người dùng thường gặp một vấn đề rất thực tế: họ không trực tiếp chọn sản phẩm, nên khó biết thực phẩm nhận được có còn tươi, đúng chất lượng hay không. Nếu chỉ dựa vào hình ảnh quảng cáo hoặc mô tả sản phẩm thì độ tin cậy chưa cao.

Vì vậy, dự án FreshFood AI được xây dựng theo hướng kết hợp thương mại điện tử với một luồng kiểm tra sau giao hàng. Người dùng vẫn có thể xem sản phẩm, thêm giỏ hàng, đặt hàng như một website bán thực phẩm thông thường. Điểm khác biệt là sau khi đơn đã được giao, người dùng có thể chụp hoặc tải ảnh từng sản phẩm lên để hệ thống AI hỗ trợ đánh giá độ tươi, sau đó nhận điểm thưởng hoặc gửi khiếu nại nếu sản phẩm không đạt.

## Slide 2. Nội dung thuyết trình

### Nội dung nói:

Phần trình bày của em gồm năm nội dung chính.

Thứ nhất là nội dung đề tài, gồm bài toán, lý do chọn đề tài, mục tiêu và điểm mới.

Thứ hai là công nghệ và công cụ được sử dụng trong dự án.

Thứ ba là kiến trúc hệ thống, gồm frontend, backend, cơ sở dữ liệu, AI, chatbot và các thành phần hỗ trợ vận hành.

Thứ tư là kế hoạch triển khai và demo luồng nghiệp vụ chính từ góc nhìn khách hàng, nhân viên và quản trị viên.

Cuối cùng là kết quả đạt được, các điểm nổi bật, hạn chế hiện tại và hướng phát triển tiếp theo.

## Slide 3. Bài toán và lý do chọn đề tài

### Nội dung nói:

Bài toán chính của dự án là làm sao để tăng độ tin cậy trong quá trình mua thực phẩm tươi qua website.

Với thực phẩm tươi, chất lượng không chỉ nằm ở giá bán hay tên sản phẩm, mà còn nằm ở trạng thái thực tế khi người dùng nhận hàng. Một quả táo, bó rau, miếng thịt hoặc con cá có thể nhìn tốt trên ảnh sản phẩm, nhưng sau quá trình bảo quản và vận chuyển thì chất lượng có thể thay đổi.

Trong source code, hệ thống giải quyết vấn đề này bằng cách gắn luồng xác minh độ tươi vào đơn hàng thật. Cụ thể, chỉ khi đơn hàng ở trạng thái `delivered`, người dùng mới có thể vào trang xác nhận độ tươi trong vòng 24 giờ. Hệ thống yêu cầu người dùng gửi ảnh cho từng sản phẩm trong đơn, sau đó ghi nhận kết quả AI, phản hồi đúng sai từ người dùng và xử lý phần thưởng hoặc khiếu nại.

Như vậy, dự án không chỉ là một website bán hàng, cũng không chỉ là một demo AI riêng lẻ. Điểm chính là kết hợp hai phần này thành một quy trình hoàn chỉnh: mua hàng, nhận hàng, kiểm tra chất lượng và phản hồi sau giao hàng.

## Slide 4. Mục tiêu và điểm mới của đề tài

### Nội dung nói:

Mục tiêu đầu tiên của dự án là xây dựng một website bán thực phẩm tươi có đầy đủ các chức năng cơ bản: đăng ký, đăng nhập, xem sản phẩm, lọc sản phẩm, thêm giỏ hàng, thanh toán, quản lý đơn hàng và quản lý hồ sơ.

Mục tiêu thứ hai là bổ sung luồng xác minh độ tươi sau khi nhận hàng. Ở luồng này, frontend sử dụng TensorFlow.js để phân tích ảnh thực phẩm trên trình duyệt. Người dùng không chỉ nhận kết quả từ AI, mà còn phải xác nhận AI dự đoán đúng hay sai. Nếu AI sai, người dùng chọn lại nhãn hoặc kết quả đúng. Dữ liệu này được gửi về backend để lưu lại thành phản hồi phục vụ kiểm tra và huấn luyện lại sau này.

Mục tiêu thứ ba là hỗ trợ vận hành cho nhân viên và quản trị viên. Admin có thể quản lý sản phẩm, đơn hàng, người dùng, kho hàng, phản hồi AI, báo cáo xác minh độ tươi và cấu hình QR thanh toán.

Đối tượng sử dụng chính của hệ thống gồm khách hàng mua thực phẩm, nhân viên xử lý đơn hàng và kho, cùng quản trị viên quản lý toàn bộ hệ thống. Giá trị mang lại là tăng niềm tin cho khách hàng, đồng thời giúp cửa hàng có dữ liệu sau giao hàng để xử lý chất lượng minh bạch hơn.

## Slide 5. Công nghệ và công cụ

### Nội dung nói:

Về công nghệ, hệ thống được chia thành hai phần chính là frontend và backend.

Frontend sử dụng React 19, Vite 8, React Router 7, Tailwind CSS 4, Axios, Framer Motion, Lucide React và TensorFlow.js 4. Trong source, các route chính gồm trang chủ, cửa hàng, yêu thích, đăng nhập, giỏ hàng, hồ sơ cá nhân, trang xác nhận độ tươi sau giao hàng và dashboard admin.

Backend sử dụng Python với FastAPI, SQLAlchemy, Pydantic, Alembic, PostgreSQL hoặc SQLite tùy cấu hình, Redis cho cache và rate limit, JWT cho xác thực, bcrypt để băm mật khẩu, fastapi-mail cho email, Pillow và NumPy cho xử lý ảnh, OpenPyXL để xuất nhập Excel, Prometheus client và SlowAPI cho metric và giới hạn tần suất.

Cơ sở dữ liệu trong code được định nghĩa bằng SQLAlchemy. Các bảng chính gồm `users`, `categories`, `products`, `orders`, `order_items`, `reviews`, `scan_results`, `scan_feedback_events`, `delivery_profiles`, `freshness_reviews`, `freshness_complaints`, `verification_reports`, `generated_vouchers`, `user_notifications`, `ood_logs`, `stock_transactions`, `payment_qr_settings` và `audit_logs`.

Về cấu hình môi trường, backend dùng các biến như `DATABASE_URL`, `REDIS_URL`, `SECRET_KEY`, thời hạn access token và refresh token, CORS, email SMTP, AI scan API, metrics và cấu hình ngưỡng AI. Frontend dùng `VITE_API_BASE_URL` để gọi backend và `VITE_N8N_CHAT_WEBHOOK_URL` để kết nối chatbot n8n.

## Slide 6. Kiến trúc hệ thống

### Nội dung nói:

Kiến trúc hiện tại là một kiến trúc web app tách frontend và backend.

Ở tầng giao diện, React đảm nhiệm toàn bộ trải nghiệm người dùng. Các context như AuthContext, CartContext, FavoritesContext và AppSettingsContext quản lý phiên đăng nhập, giỏ hàng, yêu thích, ngôn ngữ và theme. Dữ liệu được gọi về thông qua service Axios trong `frontend/src/services/api.js`.

Ở tầng backend, FastAPI cung cấp các nhóm API chính: `/api/auth` cho xác thực, `/api/products` cho sản phẩm, `/api/orders` cho đơn hàng, `/api/delivery-profiles` cho địa chỉ giao hàng, `/api/scans` cho phân tích ảnh, các API rewards cho điểm và voucher, API admin cho quản trị và `/api/notifications` cho thông báo.

Tầng dữ liệu sử dụng SQLAlchemy ORM. Khi chạy thực tế có thể dùng PostgreSQL, còn code cũng có cấu hình SQLite fallback cho môi trường local hoặc test. Redis được dùng cho cache, ví dụ cache danh mục sản phẩm và thống kê admin, đồng thời có cơ chế graceful fallback nếu cache lỗi.

Phần AI có hai vai trò. Một là model TensorFlow.js ở frontend, đọc từ `frontend/public/tfjs_model/model.json` và `labels.json`, phục vụ phân loại ảnh thực phẩm. Hai là backend quick scan, trong code hiện tại có nhánh chấm điểm theo tiêu chuẩn, nhánh phân tích vùng hỏng bằng ảnh và nhánh fallback mock khi không đủ dữ liệu. Ngoài ra, backend có cơ chế OOD, nếu độ tự tin từ phía client thấp hơn ngưỡng mặc định 0.60 thì hệ thống trả kết quả cần kiểm tra thủ công và ghi log OOD.

Ngoài ra dự án còn có tài liệu cho chatbot n8n và stack quan trắc Prometheus, Grafana, Loki, Promtail. Điều này cho thấy hệ thống đã được thiết kế không chỉ cho chức năng bán hàng, mà còn có hướng theo dõi vận hành.

## Slide 7. Các tính năng chính theo vai trò người dùng

### Nội dung nói:

Với khách hàng, hệ thống hỗ trợ truy cập website, xem sản phẩm, lọc theo danh mục, xem chi tiết, thêm vào giỏ hàng và đặt hàng. Khi thanh toán, người dùng chọn địa chỉ giao hàng, phương thức thanh toán COD hoặc QR, có thể dùng voucher và điểm tích lũy nếu có.

Sau khi đơn hàng được giao, khách hàng có thêm một luồng riêng là xác nhận độ tươi sau giao hàng. Người dùng vào đơn hàng, tải ảnh từng sản phẩm, xem kết quả AI, xác nhận dự đoán đúng hoặc sai, sau đó nhận điểm thưởng. Nếu sản phẩm bị xác nhận là hỏng, hệ thống có thể tạo voucher xin lỗi và mở luồng khiếu nại hoàn tiền hoặc đổi hàng.

Với nhân viên, hệ thống cho phép quản lý đơn hàng, cập nhật trạng thái xử lý, quản lý sản phẩm và quản lý kho. Phần kho có nhập kho, xuất kho, lịch sử giao dịch kho, import Excel và export Excel.

Với quản trị viên, ngoài các quyền của nhân viên, admin còn có dashboard thống kê, quản lý người dùng và phân quyền role, theo dõi phản hồi AI, báo cáo xác minh độ tươi, quản lý QR thanh toán và xem các dữ liệu hỗ trợ vận hành.

Một điểm quan trọng trong code là phân quyền được kiểm tra ở backend. Admin dùng các dependency riêng, còn staff được phép vào một số chức năng vận hành như đơn hàng, sản phẩm và kho.

## Slide 8. Train mô hình xác nhận độ tươi

### Nội dung nói:

Phần AI trong dự án tập trung vào bài toán phân loại trạng thái thực phẩm qua ảnh. Theo nội dung trong slide, dữ liệu sau khi làm sạch gồm 19.219 ảnh train, 4.470 ảnh validation và 2.245 ảnh test. Mô hình sử dụng MobileNetV2 pretrained ImageNet, input 128 x 128.

Quy trình huấn luyện được thiết kế theo hai giai đoạn. Giai đoạn đầu đóng băng backbone và chỉ huấn luyện phần head phân loại. Giai đoạn sau fine-tune, mở một số block sâu hơn để mô hình học tốt hơn các đặc trưng phân biệt giữa thực phẩm tươi, kém tươi và hỏng.

Trong source `model_training/train_freshness.py`, script cũng thể hiện đúng hướng này: dùng MobileNetV2, có tham số `epochs-head`, `epochs-ft`, `unfreeze-layers`, tính `class_weight` để cân bằng lớp, lưu `best_model.keras`, xuất `saved_model`, đồng thời xuất `labels.json` để đồng bộ nhãn với frontend.

Kết quả trong slide ghi nhận Phase 1 đạt accuracy 87,93%, loss 0,3167. Sau fine-tune, accuracy đạt 89,13%, loss 0,2942, cải thiện 1,2%. Các nhãn hiện tại trong `labels.json` gồm nhóm thịt gà, cá, thịt heo và một số rau củ quả như táo, chuối, cà rốt, dưa leo, xoài, cam, khoai tây, ớt chuông, xà lách, với trạng thái tươi, kém tươi, hỏng hoặc thối tùy loại.

## Slide 9. Demo luồng nghiệp vụ từ đầu đến cuối

### Nội dung nói:

Em xin mô tả luồng nghiệp vụ chính từ góc nhìn một khách hàng.

Bước đầu tiên là đăng ký hoặc đăng nhập. Backend có các API register, login, refresh token, quên mật khẩu, đặt lại mật khẩu, đổi mật khẩu và lấy thông tin cá nhân. Khi đăng nhập thành công, hệ thống trả access token và refresh token. Mật khẩu được băm bằng bcrypt, token có `token_version` để vô hiệu hóa refresh token cũ khi người dùng đổi mật khẩu.

Bước thứ hai là mua hàng. Người dùng vào trang cửa hàng, tìm kiếm hoặc lọc sản phẩm, xem chi tiết và thêm sản phẩm vào giỏ. Giỏ hàng được lưu theo từng user trong localStorage. Khi checkout, frontend gửi danh sách sản phẩm, địa chỉ, số điện thoại, phương thức thanh toán, voucher và điểm muốn dùng lên API tạo đơn.

Bước thứ ba là backend xử lý đơn hàng. Trong `create_order`, hệ thống kiểm tra sản phẩm còn hoạt động, kiểm tra số lượng tồn kho và trừ kho bằng câu lệnh atomic update để tránh bán vượt số lượng. Sau đó hệ thống tính tạm tính, thuế 10%, phí ship 30.000 đồng nếu chưa đạt ngưỡng miễn phí 500.000 đồng, trừ voucher và điểm nếu hợp lệ, rồi tạo `Order`, `OrderItem` và ghi `StockTransaction`.

Bước thứ tư là nhân viên hoặc admin xử lý đơn. Trong dashboard, trạng thái đơn có thể được cập nhật từ pending sang confirmed, shipped, delivered hoặc các trạng thái khác. Khi đơn chuyển sang delivered, hệ thống có thông báo để người dùng xác nhận độ tươi trong thời hạn 24 giờ.

Bước thứ năm là xác nhận độ tươi sau giao hàng. Người dùng mở trang `/orders/:orderId/confirm-freshness`, tải ảnh cho từng sản phẩm. Frontend phân tích bằng model TensorFlow.js, trả nhãn dự đoán và độ tự tin. Người dùng phải xác nhận AI đúng hay sai. Nếu sai, người dùng chọn nhãn đúng hoặc kết quả đúng. Backend lưu vào `freshness_reviews`, cộng điểm thưởng và tạo thông báo.

Kết quả đầu ra của luồng này có ba trường hợp. Nếu mọi thứ ổn, người dùng nhận điểm thưởng. Nếu có dự đoán AI sai, người dùng nhận thêm bonus tri ân và dữ liệu được lưu để cải thiện AI. Nếu sản phẩm thực tế bị xác nhận là hỏng, hệ thống tạo voucher 15% có thời hạn 3 ngày và cho phép khách gửi khiếu nại hoàn tiền hoặc đổi hàng.

## Slide 10. Workflow chatbot

### Nội dung nói:

Ngoài luồng bán hàng và xác nhận độ tươi, dự án còn có chatbot hỗ trợ khách hàng.

Ở frontend, `ChatWidget` xuất hiện trên các trang public và gọi service `chatbot.js`. Nếu có biến `VITE_N8N_CHAT_WEBHOOK_URL`, frontend gửi message, thông tin người dùng, sản phẩm hiện có, gợi ý sản phẩm local và correlation id sang webhook n8n. Nếu chưa cấu hình webhook, frontend có fallback trả lời rằng chatbot chưa được cấu hình và vẫn có thể gợi ý sản phẩm local.

Tài liệu n8n mô tả workflow gồm Webhook, Normalize Input, Load Chat History, Load Products, AI Agent, Groq Chat Model, Simple Memory, HTTP Request Tool cho nguồn công thức, Match Products, Save Assistant Message và Respond to Webhook.

Mục tiêu của chatbot không chỉ là trả lời chung chung. Khi người dùng hỏi món ăn hoặc nguyên liệu, chatbot có thể tư vấn ngắn gọn và đối chiếu nguyên liệu với sản phẩm đang có trong FreshFood, sau đó trả về danh sách sản phẩm gợi ý để frontend hiển thị.

Như vậy, chatbot đóng vai trò hỗ trợ trải nghiệm mua sắm: người dùng hỏi món ăn, hệ thống gợi ý nguyên liệu, rồi liên kết ngược về sản phẩm trong cửa hàng.

## Slide 11. Kết quả giao diện trang chủ và giỏ hàng

### Nội dung nói:

Về kết quả giao diện phía khách hàng, hệ thống đã có trang chủ, cửa hàng, sản phẩm yêu thích, trang đăng nhập, giỏ hàng, hồ sơ cá nhân và luồng xác nhận độ tươi sau giao hàng.

Trang chủ hiển thị các nhóm sản phẩm nổi bật và nút điều hướng vào cửa hàng hoặc phần đơn cần xác minh. Trang cửa hàng có tìm kiếm, lọc, sắp xếp, phân trang và modal chi tiết sản phẩm. Người dùng có thể thêm sản phẩm vào giỏ hoặc lưu yêu thích.

Ở giỏ hàng, người dùng có thể chọn từng sản phẩm để thanh toán, tăng giảm số lượng, chọn hoặc thêm địa chỉ giao hàng, chọn COD hoặc QR. Mã QR thanh toán được lấy từ API public `/api/payment-qr`, còn admin có thể cập nhật QR trong dashboard.

Sau khi đặt hàng thành công, hệ thống đưa người dùng về phần đơn hàng trong profile. Tại đây người dùng có thể xem lịch sử đơn, chỉnh sửa hoặc hủy đơn khi đơn còn pending, và khi đơn đã delivered thì có nút xác nhận độ tươi.

## Slide 12. Kết quả dashboard và xác minh độ tươi

### Nội dung nói:

Về phía quản trị, dashboard admin có các khu vực chính: tổng quan, người dùng, đơn hàng, sản phẩm, kho hàng, AI feedback, báo cáo xác minh độ tươi và cài đặt thanh toán.

Admin có thể xem thống kê doanh thu, số đơn hàng, số sản phẩm, scan, tồn kho thấp và phản hồi chưa đọc. Ở phần đơn hàng, admin hoặc staff có thể lọc, xem chi tiết, cập nhật trạng thái từng đơn hoặc cập nhật hàng loạt. Ở phần kho, hệ thống có lịch sử nhập xuất, tạo giao dịch kho thủ công, import Excel và export Excel.

Phần xác minh độ tươi là điểm nổi bật nhất. Mỗi sản phẩm trong đơn cần có ảnh và kết quả phân tích. Người dùng xác nhận AI đúng hoặc sai, backend lưu kết quả kèm ảnh, điểm tin cậy, nhãn dự đoán, nhãn đúng nếu có, ghi chú thủ công và trạng thái tươi hoặc hỏng.

Admin có thể xem phản hồi AI và báo cáo xác minh độ tươi, đánh dấu đã đọc, lọc dữ liệu và export Excel. Đây là dữ liệu quan trọng vì nó giúp hệ thống không chỉ phản hồi cho khách hàng, mà còn có cơ sở kiểm tra lại chất lượng AI và chất lượng giao hàng.

## Slide 13. Kết luận

### Nội dung nói:

Tổng kết lại, dự án FreshFood AI đã xây dựng được một hệ thống thương mại điện tử thực phẩm tươi với các chức năng cốt lõi: quản lý sản phẩm, giỏ hàng, đơn hàng, người dùng, địa chỉ giao hàng, điểm thưởng, voucher, thông báo, dashboard admin, quản lý kho và QR thanh toán.

Điểm khác biệt của đề tài là luồng xác minh độ tươi sau giao hàng bằng AI. Luồng này gắn trực tiếp với đơn hàng thực tế, có giới hạn thời gian 24 giờ, có cơ chế người dùng xác nhận đúng sai, có điểm thưởng, voucher và khiếu nại. Nhờ vậy, hệ thống tạo được vòng phản hồi giữa khách hàng, cửa hàng và AI.

Trong quá trình phát triển, các khó khăn chính nằm ở ba phần. Một là đảm bảo logic đơn hàng và tồn kho chính xác, dự án xử lý bằng atomic stock update và bảng `stock_transactions`. Hai là đảm bảo ảnh upload an toàn và kết quả AI có thể kiểm soát, dự án xử lý bằng kiểm tra magic bytes, giới hạn dung lượng, confidence threshold, OOD log và phản hồi người dùng. Ba là quản trị dữ liệu sau giao hàng, dự án xử lý bằng báo cáo xác minh, feedback dashboard và export Excel.

Hướng phát triển tiếp theo dựa trên chính tài liệu trong repo là tiếp tục mở rộng dữ liệu và pipeline huấn luyện model, dùng phản hồi người dùng để retrain định kỳ, hoàn thiện kết nối chatbot n8n khi có webhook, và nâng cấp các phần triển khai, quan trắc theo tài liệu CI/CD và observability.

Riêng với chức năng xác minh độ tươi, hệ thống hiện tại vẫn có một số hạn chế. Thứ nhất, kết quả AI phụ thuộc nhiều vào chất lượng ảnh người dùng tải lên, như ánh sáng, góc chụp, độ rõ nét, nền ảnh và việc sản phẩm có bị che khuất hay không. Thứ hai, phạm vi nhận diện của model còn phụ thuộc vào tập dữ liệu huấn luyện, nên mới phù hợp với một số nhóm sản phẩm đã có nhãn như thịt, cá, rau củ và trái cây phổ biến, chưa bao phủ hết mọi loại thực phẩm. Thứ ba, AI mới đánh giá chủ yếu qua hình ảnh bên ngoài, chưa kiểm tra được các yếu tố như mùi, nhiệt độ bảo quản, hạn sử dụng, chất lượng bên trong hoặc điều kiện vận chuyển. Vì vậy kết quả AI không nên xem là quyết định tuyệt đối, mà cần kết hợp với xác nhận của người dùng và theo dõi lại từ admin.

Hướng phát triển cho chức năng xác minh là mở rộng dữ liệu ảnh thực tế sau giao hàng, bổ sung nhiều loại thực phẩm và nhiều điều kiện chụp khác nhau để model ổn định hơn. Hệ thống cũng có thể tận dụng dữ liệu người dùng xác nhận đúng sai để huấn luyện lại model định kỳ, bổ sung cơ chế kiểm tra ảnh kém chất lượng trước khi phân tích, cải thiện OOD để phát hiện ảnh không hợp lệ, và xây dựng quy trình admin duyệt thủ công đối với các trường hợp độ tin cậy thấp. Về lâu dài, chức năng xác minh có thể kết hợp thêm dữ liệu vận chuyển, thời gian giao hàng, nhiệt độ bảo quản hoặc lịch sử khiếu nại để đánh giá chất lượng sản phẩm toàn diện hơn, thay vì chỉ dựa vào ảnh.

Em xin cảm ơn hội đồng và thầy cô đã lắng nghe. Em sẵn sàng trả lời câu hỏi.

### Tổng kết ngắn gọn để chốt bài:

Nếu cần tổng kết ngắn ở cuối phần trình bày, em có thể nói:

Tóm lại, đề tài FreshFood AI tập trung giải quyết một vấn đề thực tế khi mua thực phẩm online: khách hàng khó kiểm chứng chất lượng sản phẩm sau khi nhận hàng. Dự án đã xây dựng được một hệ thống thương mại điện tử tương đối đầy đủ, từ đăng ký, đăng nhập, xem sản phẩm, đặt hàng, thanh toán, quản lý đơn, quản lý kho cho đến dashboard dành cho nhân viên và quản trị viên.

Điểm nổi bật nhất của hệ thống là luồng xác minh độ tươi sau giao hàng bằng AI. Thay vì chỉ dừng ở việc bán hàng, hệ thống cho phép khách hàng tải ảnh từng sản phẩm trong đơn đã giao, nhận kết quả dự đoán từ model, xác nhận đúng sai, sau đó nhận điểm thưởng hoặc gửi khiếu nại nếu sản phẩm không đạt chất lượng. Nhờ vậy, quy trình sau giao hàng trở nên minh bạch hơn và tạo được dữ liệu phản hồi thực tế cho cửa hàng.

Về mặt kỹ thuật, dự án kết hợp frontend React, backend FastAPI, cơ sở dữ liệu SQLAlchemy, xác thực JWT, Redis cache, TensorFlow.js cho AI trên trình duyệt, cùng các thành phần hỗ trợ như chatbot n8n, báo cáo Excel và quan trắc vận hành. Qua đó, hệ thống không chỉ thể hiện các chức năng của một website bán hàng, mà còn có quy trình nghiệp vụ, phân quyền, kiểm soát dữ liệu và khả năng mở rộng.

Trong tương lai, hệ thống có thể tiếp tục phát triển theo hướng mở rộng tập dữ liệu, dùng phản hồi người dùng để huấn luyện lại model định kỳ, hoàn thiện chatbot, bổ sung pipeline triển khai và tăng cường quan trắc. Đây cũng là cơ sở để đề tài có thể tiến gần hơn tới một sản phẩm ứng dụng thực tế trong lĩnh vực bán thực phẩm tươi trực tuyến.

# DANH SÁCH CÂU HỎI PHẢN BIỆN CÓ THỂ GẶP

## Câu 1. Dự án giải quyết bài toán gì?

**Trả lời gợi ý:** Dự án giải quyết bài toán tăng độ tin cậy khi mua thực phẩm tươi online. Ngoài luồng mua hàng thông thường, hệ thống có luồng xác minh độ tươi sau khi nhận hàng bằng ảnh và AI, sau đó lưu phản hồi, cộng điểm, tạo voucher hoặc mở khiếu nại nếu sản phẩm hỏng.

## Câu 2. Đối tượng người dùng của hệ thống là ai?

**Trả lời gợi ý:** Có ba nhóm chính. Khách hàng dùng để xem sản phẩm, đặt hàng, quản lý hồ sơ và xác nhận độ tươi. Nhân viên xử lý đơn, sản phẩm và kho. Quản trị viên có toàn quyền, gồm quản lý người dùng, dashboard, phản hồi AI, báo cáo xác minh và cài đặt QR thanh toán.

## Câu 3. Điểm mới của đề tài so với website bán hàng thông thường là gì?

**Trả lời gợi ý:** Điểm mới là luồng xác minh độ tươi sau giao hàng. Hệ thống không chỉ bán sản phẩm, mà còn cho người dùng upload ảnh từng sản phẩm trong đơn đã giao, chạy AI ở frontend, yêu cầu người dùng xác nhận đúng sai và xử lý điểm thưởng, voucher hoặc khiếu nại dựa trên kết quả đó.

## Câu 4. Kiến trúc tổng thể của hệ thống gồm những phần nào?

**Trả lời gợi ý:** Hệ thống gồm frontend React/Vite, backend FastAPI, database SQLAlchemy với PostgreSQL hoặc SQLite, Redis cache, thư mục upload ảnh, model TensorFlow.js ở frontend, chatbot n8n qua webhook và stack quan trắc Prometheus, Grafana, Loki, Promtail theo tài liệu ops.

## Câu 5. Backend có những nhóm API chính nào?

**Trả lời gợi ý:** Backend có `/api/auth`, `/api/products`, `/api/orders`, `/api/delivery-profiles`, `/api/scans`, API rewards như `/user/points` và `/vouchers`, API admin, `/api/notifications`, cùng API public/admin cho QR thanh toán.

## Câu 6. Hệ thống xác thực người dùng như thế nào?

**Trả lời gợi ý:** Backend dùng JWT access token và refresh token. Mật khẩu được băm bằng bcrypt. Token chứa `sub` và `ver`; `ver` tương ứng với `token_version` trong bảng user. Khi người dùng đổi hoặc reset mật khẩu, `token_version` tăng lên, giúp refresh token cũ không còn hợp lệ.

## Câu 7. Hệ thống có bảo vệ endpoint auth khỏi gọi quá nhiều lần không?

**Trả lời gợi ý:** Có. Trong `main.py` hệ thống dùng SlowAPI với giới hạn mặc định, còn các endpoint nhạy cảm như register, login, forgot password, reset password có rate limit riêng trong `api/auth.py`.

## Câu 8. Cơ sở dữ liệu có những bảng quan trọng nào?

**Trả lời gợi ý:** Các bảng quan trọng gồm `users`, `categories`, `products`, `orders`, `order_items`, `reviews`, `scan_results`, `scan_feedback_events`, `delivery_profiles`, `freshness_reviews`, `freshness_complaints`, `verification_reports`, `generated_vouchers`, `user_notifications`, `ood_logs`, `stock_transactions`, `payment_qr_settings` và `audit_logs`.

## Câu 9. Khi checkout, hệ thống xử lý tồn kho như thế nào?

**Trả lời gợi ý:** Trong API tạo đơn, backend kiểm tra sản phẩm đang hoạt động và trừ tồn kho bằng atomic update với điều kiện `quantity >= số lượng đặt`. Nếu không đủ hàng thì rollback và báo lỗi. Sau khi trừ kho, hệ thống ghi `StockTransaction` loại export để có lịch sử kho.

## Câu 10. Hệ thống tính tiền đơn hàng ra sao?

**Trả lời gợi ý:** Backend tính subtotal từ order items, thuế 10%, phí ship cố định 30.000 đồng nếu chưa đạt ngưỡng miễn phí 500.000 đồng, sau đó trừ voucher và điểm tích lũy nếu hợp lệ. Tổng cuối cùng được lưu vào bảng `orders`.

## Câu 11. Người dùng có thể sửa hoặc hủy đơn khi nào?

**Trả lời gợi ý:** Theo code, người dùng có thể cập nhật một số thông tin đơn và hủy đơn khi đơn còn trạng thái `pending`. Khi hủy, backend khôi phục số lượng sản phẩm bằng `apply_stock_delta` và ghi giao dịch kho import.

## Câu 12. Khi nào người dùng được xác nhận độ tươi sau giao hàng?

**Trả lời gợi ý:** Điều kiện là đơn phải ở trạng thái `delivered`, chưa hoàn thành xác nhận và còn trong thời hạn 24 giờ sau khi giao. Thời hạn này được cấu hình bằng `FRESHNESS_CONFIRMATION_HOURS = 24`.

## Câu 13. Luồng AI xác minh độ tươi hoạt động như thế nào?

**Trả lời gợi ý:** Ở trang xác nhận độ tươi, người dùng upload ảnh từng sản phẩm. Frontend nạp model TensorFlow.js và `labels.json`, resize ảnh theo input model, dự đoán nhãn và confidence. Người dùng xác nhận AI đúng hoặc sai. Backend nhận payload multipart gồm ảnh và kết quả, sau đó lưu vào `freshness_reviews`.

## Câu 14. Model AI hiện hỗ trợ những nhóm sản phẩm nào?

**Trả lời gợi ý:** Theo `labels.json`, model có các nhãn cho gà, cá, thịt heo và một số rau củ quả như táo, chuối, ớt chuông, cà rốt, dưa leo, xoài, cam, khoai tây, xà lách. Trạng thái gồm tươi, kém tươi, hỏng hoặc thối tùy từng sản phẩm.

## Câu 15. Backend AI có phải hoàn toàn là model thật không?

**Trả lời gợi ý:** Cần trả lời trung thực theo source. Frontend có model TensorFlow.js thật được nạp từ `model.json` và `labels.json`. Backend scan hiện có nhánh chấm điểm theo chỉ tiêu tiêu chuẩn, nhánh phân tích vùng hỏng bằng ảnh và nhánh fallback mock khi không đủ dữ liệu. Tài liệu ops cũng ghi endpoint scan backend chưa nạp model `.h5` trực tiếp từ notebook.

## Câu 16. OOD detection trong hệ thống là gì?

**Trả lời gợi ý:** OOD là phát hiện ảnh nằm ngoài phân phối dữ liệu model, ví dụ ảnh không giống thực phẩm được hỗ trợ. Trong quick scan, nếu confidence lớn nhất từ TFJS thấp hơn ngưỡng mặc định 0.60, backend trả status `ood`, đánh dấu cần duyệt thủ công và ghi log vào `ood_logs`.

## Câu 17. Nếu AI dự đoán sai thì hệ thống xử lý thế nào?

**Trả lời gợi ý:** Người dùng bắt buộc chọn AI đúng hoặc sai. Nếu sai, người dùng phải cung cấp nhãn hoặc kết quả đúng. Backend lưu thông tin này vào bản ghi xác nhận độ tươi hoặc feedback event, cộng bonus tri ân cao hơn và admin có thể xem lại trong dashboard phản hồi AI.

## Câu 18. Điểm thưởng sau xác nhận độ tươi được tính thế nào?

**Trả lời gợi ý:** Config backend có điểm cơ bản 100. Nếu tất cả dự đoán AI được xác nhận đúng, cộng bonus 50, tổng 150. Nếu có ít nhất một dự đoán sai, cộng bonus tri ân 100, tổng 200.

## Câu 19. Khi nào hệ thống tạo voucher cho khách hàng?

**Trả lời gợi ý:** Trong luồng xác nhận độ tươi, nếu kết quả đúng sau xác nhận cho thấy có sản phẩm hỏng, backend tạo voucher lý do `freshness_spoiled_confirmation`, giảm 15% và có thời hạn 3 ngày.

## Câu 20. Khiếu nại hoàn tiền hoạt động ra sao?

**Trả lời gợi ý:** Nếu đơn có review đủ điều kiện cho thấy sản phẩm hỏng, người dùng có thể tạo complaint loại refund. Backend tính số tiền hoàn dự kiến bằng 30% tổng đơn, nhưng trạng thái là chờ admin duyệt. Khi admin approve, số tiền này được cộng vào `voucher_balance` của user.

## Câu 21. Khiếu nại đổi hàng hoạt động ra sao?

**Trả lời gợi ý:** Với complaint loại replacement, backend tạo một đơn thay thế miễn phí, `total = 0`, `payment_status = waived`, liên kết với đơn gốc, trừ tồn kho cho sản phẩm thay thế và gửi thông báo cho người dùng.

## Câu 22. Hệ thống kiểm tra file ảnh upload như thế nào?

**Trả lời gợi ý:** Backend kiểm tra phần mở rộng file, giới hạn dung lượng tối đa 10 MB và kiểm tra magic bytes cho các định dạng ảnh như jpg, png, webp, gif, bmp. Điều này giúp tránh trường hợp đổi tên file độc hại thành ảnh.

## Câu 23. Admin có những chức năng chính nào?

**Trả lời gợi ý:** Admin có dashboard thống kê, quản lý user và role, thêm sửa xóa sản phẩm, quản lý đơn hàng và cập nhật trạng thái, quản lý kho nhập xuất, import/export Excel, xem phản hồi AI, xem báo cáo xác minh độ tươi, duyệt hoặc từ chối complaint và cập nhật QR thanh toán.

## Câu 24. Staff khác admin như thế nào?

**Trả lời gợi ý:** Theo UI spec và backend dependency, staff được phép vào các chức năng vận hành như đơn hàng, sản phẩm và kho. Admin có quyền rộng hơn, gồm quản lý người dùng, thống kê tổng quan, AI feedback, báo cáo xác minh và cài đặt.

## Câu 25. Chatbot trong hệ thống dùng để làm gì?

**Trả lời gợi ý:** Chatbot hỗ trợ khách hàng hỏi về món ăn, nguyên liệu hoặc thông tin mua sắm. Frontend gửi message và danh sách sản phẩm sang n8n webhook nếu được cấu hình. Workflow n8n có AI Agent, memory, load products và match products để trả câu trả lời cùng sản phẩm gợi ý.

## Câu 26. Nếu Redis lỗi thì hệ thống có dừng không?

**Trả lời gợi ý:** Không nhất thiết. Trong utility cache, khi Redis không khả dụng, các hàm cache log warning và trả về giá trị rỗng để hệ thống tiếp tục lấy dữ liệu từ database. Đây là cách fallback mềm cho cache.

## Câu 27. Hệ thống có quan trắc vận hành không?

**Trả lời gợi ý:** Có. Backend có thể expose `/metrics` khi `ENABLE_METRICS=True`. Tài liệu ops mô tả Prometheus để thu thập metrics, Grafana để dashboard/cảnh báo, Loki và Promtail để gom log. Các metric chính gồm HTTP request total, duration, in-progress và scan events.

## Câu 28. Dự án có kiểm thử không?

**Trả lời gợi ý:** Có test backend trong `backend/tests`, gồm kiểm thử auth utils, cập nhật profile, health và metrics, validate upload ảnh, freshness standards, visual spoilage, quick scan OOD, order flow, tồn kho, xác nhận độ tươi, dashboard feedback và export báo cáo.

## Câu 29. Hiện tại hệ thống có hạn chế nào đã thấy trong source hoặc tài liệu?

**Trả lời gợi ý:** Có một số hạn chế rõ trong repo. Trang `Scanner.jsx` tồn tại nhưng trong `App.jsx` chưa có route `/scanner`; luồng chắc chắn đang được mount là xác nhận độ tươi sau giao hàng. Tài liệu ops cũng ghi backend scan chưa nạp trực tiếp model `.h5` từ notebook mà dùng standards-based scoring, visual spoilage và mock fallback. Ngoài ra tài liệu UI ghi có điểm chưa thống nhất brand giữa FreshFood AI và NutriGro.

## Câu 30. Hướng phát triển tiếp theo là gì?

**Trả lời gợi ý:** Hướng phát triển dựa trên tài liệu repo là mở rộng dữ liệu và pipeline huấn luyện model, dùng feedback người dùng để retrain định kỳ, hoàn thiện kết nối chatbot n8n khi có webhook, bổ sung pipeline riêng cho model training và nâng cấp triển khai/quan trắc theo tài liệu CI/CD và observability.

## Câu 31. Chức năng xác minh độ tươi hiện có hạn chế gì?

**Trả lời gợi ý:** Hạn chế chính là kết quả AI phụ thuộc vào ảnh người dùng cung cấp, ví dụ ánh sáng, góc chụp, độ rõ nét hoặc ảnh có nhiều vật thể gây nhiễu. Model cũng chỉ nhận diện tốt trong phạm vi các nhóm sản phẩm đã được huấn luyện, chưa bao phủ toàn bộ thực phẩm tươi. Ngoài ra, AI hiện đánh giá qua hình ảnh bên ngoài nên chưa kiểm tra được mùi, nhiệt độ bảo quản, hạn sử dụng hoặc chất lượng bên trong sản phẩm. Vì vậy hệ thống vẫn cần bước người dùng xác nhận đúng sai, lưu feedback và cho admin kiểm tra lại các trường hợp bất thường.

## Câu 32. Hướng phát triển riêng cho chức năng xác minh độ tươi là gì?

**Trả lời gợi ý:** Hướng phát triển là mở rộng tập dữ liệu ảnh thực tế sau giao hàng, bổ sung thêm nhiều loại thực phẩm và nhiều điều kiện chụp khác nhau, sau đó dùng feedback của người dùng để retrain model định kỳ. Hệ thống cũng có thể thêm kiểm tra chất lượng ảnh trước khi phân tích, cải thiện OOD để phát hiện ảnh không hợp lệ, bổ sung dashboard duyệt thủ công cho trường hợp confidence thấp, và kết hợp thêm dữ liệu vận chuyển như thời gian giao hàng, nhiệt độ bảo quản hoặc lịch sử khiếu nại để đánh giá chất lượng toàn diện hơn.
