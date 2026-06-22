# Kịch bản thuyết trình: Kiến trúc hệ thống FreshFood AI

## 1. Mục tiêu phần trình bày

Phần này dùng để thuyết trình khoảng 4 đến 6 phút về kiến trúc hệ thống của đồ án `FreshFood AI`.

Có thể trình bày theo 6 ý chính:

1. Tổng quan kiến trúc
2. Kiến trúc frontend
3. Kiến trúc backend
4. Luồng AI kiểm tra độ tươi
5. Dữ liệu và các hệ tích hợp ngoài
6. Điểm mạnh của kiến trúc

---

## 2. Kịch bản thuyết trình hoàn chỉnh

### Mở đầu

"Tiếp theo, em xin trình bày phần kiến trúc hệ thống của đồ án FreshFood AI.

Hệ thống của nhóm được xây dựng theo mô hình web nhiều tầng, gồm ba khối chính: frontend, backend và cơ sở dữ liệu. Ngoài ra, hệ thống còn tích hợp thêm AI nhận diện độ tươi thực phẩm, Redis để hỗ trợ cache và các tác vụ nhẹ, cùng với n8n để xử lý chatbot gợi ý món ăn."

### Ý 1: Tổng quan kiến trúc

"Nếu nhìn ở mức tổng quát, người dùng sẽ tương tác với giao diện web ở phía frontend. Frontend gửi request đến backend thông qua các API REST. Backend tiếp nhận yêu cầu, xử lý nghiệp vụ, xác thực người dùng, làm việc với cơ sở dữ liệu, sau đó trả kết quả lại cho frontend để hiển thị.

Điểm khác biệt của hệ thống này nằm ở module AI. Khi người dùng chụp hoặc tải ảnh thực phẩm lên, hệ thống sẽ phân tích độ tươi theo hai bước: bước đầu chạy ngay trên trình duyệt để phản hồi nhanh, sau đó backend kiểm tra lại để đưa ra kết quả ổn định hơn. Nhờ vậy, hệ thống vừa tăng trải nghiệm người dùng, vừa đảm bảo tính kiểm soát ở phía server."

### Ý 2: Kiến trúc frontend

"Ở tầng frontend, nhóm sử dụng React 19 kết hợp Vite và Tailwind CSS để xây dựng giao diện.

Frontend được tổ chức theo hướng component-based, nghĩa là giao diện được chia thành các trang và các component tái sử dụng. Ví dụ, hệ thống có các trang chính như trang chủ, trang sản phẩm, giỏ hàng, hồ sơ cá nhân, trang xác nhận độ tươi sau giao hàng và trang quản trị admin.

Về quản lý trạng thái, hệ thống dùng React Context cho các dữ liệu dùng chung như thông tin đăng nhập, giỏ hàng và danh sách yêu thích. Cách tổ chức này giúp frontend tách biệt rõ giữa phần hiển thị giao diện, phần điều hướng và phần gọi API, từ đó dễ bảo trì và mở rộng."

### Ý 3: Kiến trúc backend

"Ở tầng backend, nhóm sử dụng FastAPI viết bằng Python. Đây là nơi xử lý toàn bộ logic nghiệp vụ của hệ thống.

Backend được chia thành các nhóm API rõ ràng như: xác thực người dùng, sản phẩm, đơn hàng, quét AI, phần thưởng, thông báo, địa chỉ giao hàng và quản trị hệ thống. Cách chia module như vậy giúp mã nguồn gọn hơn, dễ kiểm thử hơn và mỗi nhóm chức năng có trách nhiệm riêng.

Phía dưới lớp API là tầng xử lý nghiệp vụ và tiện ích dùng chung, ví dụ như tạo JWT, kiểm tra file ảnh, chấm điểm độ tươi, xử lý tồn kho, ghi log và thu thập metrics. Sau cùng là tầng truy cập dữ liệu thông qua SQLAlchemy ORM để làm việc với cơ sở dữ liệu."

### Ý 4: Luồng AI kiểm tra độ tươi

"Luồng AI là phần quan trọng nhất của hệ thống.

Khi người dùng tải ảnh thực phẩm lên, trước tiên frontend sử dụng TensorFlow.js để chạy mô hình ngay trên trình duyệt. Mục tiêu của bước này là tạo phản hồi nhanh, giảm cảm giác chờ đợi và hỗ trợ trải nghiệm quét trực tiếp.

Sau đó, frontend gửi ảnh cùng kết quả dự đoán ban đầu lên backend. Backend sẽ thực hiện bước phân tích nhanh, đánh giá mức độ tươi, độ tự tin của mô hình, tỷ lệ hư hỏng ước lượng và quyết định xem ảnh đó có cần đánh giá thủ công hay không.

Nếu AI đủ tự tin, hệ thống trả về kết quả như tươi tốt, nên dùng sớm hoặc kém tươi. Nếu AI không đủ chắc chắn, hệ thống không ép đưa ra kết luận sai mà chuyển sang cơ chế đánh giá thủ công. Đây là điểm quan trọng vì nó giúp tăng độ an toàn và độ tin cậy của sản phẩm."

### Ý 5: Cơ sở dữ liệu và tích hợp ngoài

"Về lưu trữ dữ liệu, hệ thống sử dụng PostgreSQL trong môi trường chính và có thể dùng SQLite làm phương án fallback khi phát triển hoặc demo.

Dữ liệu được tổ chức thành nhiều bảng phục vụ các nhóm nghiệp vụ khác nhau như người dùng, sản phẩm, danh mục, đơn hàng, chi tiết đơn hàng, kết quả quét AI, xác nhận độ tươi, khiếu nại chất lượng, voucher, thông báo và lịch sử biến động tồn kho.

Ngoài ra, hệ thống còn tích hợp Redis để hỗ trợ cache và một số tác vụ nhẹ. Chatbot không xử lý trực tiếp trong code frontend hay backend, mà sẽ gửi webhook sang n8n để gọi workflow gợi ý công thức nấu ăn. Bên cạnh đó, hệ thống cũng có phần observability với endpoint metrics để phục vụ giám sát."

### Ý 6: Bảo mật và độ tin cậy

"Về bảo mật, hệ thống sử dụng cơ chế JWT gồm access token và refresh token để xác thực người dùng. Backend cũng có kiểm tra dữ liệu đầu vào bằng Pydantic, giới hạn tần suất gọi API bằng rate limiting, và kiểm tra file ảnh bằng cả phần mở rộng lẫn magic bytes để hạn chế upload file giả mạo.

Về độ tin cậy, hệ thống có cơ chế quản lý tồn kho theo hướng tránh xung đột khi nhiều người cùng mua, có ghi nhận log, có metrics quan sát hệ thống, và có cơ chế fallback từ AI sang đánh giá thủ công khi độ tin cậy thấp."

### Kết thúc

"Tóm lại, kiến trúc của FreshFood AI được thiết kế theo hướng tách lớp rõ ràng giữa giao diện, xử lý nghiệp vụ và dữ liệu. Điểm nổi bật nhất là việc kết hợp giữa thương mại điện tử và AI kiểm tra độ tươi thực phẩm, đồng thời vẫn giữ được tính an toàn thông qua cơ chế xác minh lại ở backend và fallback sang đánh giá thủ công.

Với kiến trúc này, hệ thống có thể tiếp tục mở rộng thêm mô hình AI, thêm dịch vụ thanh toán, hoặc triển khai thực tế trên quy mô lớn hơn trong tương lai."

---

## 3. Bản nói ngắn gọn nếu thầy cô yêu cầu trình bày nhanh

"Kiến trúc hệ thống FreshFood AI gồm 3 tầng chính: frontend, backend và database. Frontend được xây dựng bằng React để hiển thị giao diện và nhận thao tác từ người dùng. Backend dùng FastAPI để xử lý các nghiệp vụ như xác thực, quản lý sản phẩm, đơn hàng, quét AI và phần thưởng. Dữ liệu được lưu trong PostgreSQL, có thể dùng SQLite khi phát triển.

Điểm đặc biệt của hệ thống là module AI kiểm tra độ tươi. Ảnh sẽ được phân tích trước ở frontend bằng TensorFlow.js để phản hồi nhanh, sau đó backend kiểm tra lại để đưa ra kết quả cuối cùng hoặc yêu cầu đánh giá thủ công nếu AI chưa đủ chắc chắn. Ngoài ra hệ thống còn tích hợp Redis, n8n chatbot và metrics để hỗ trợ vận hành."

---

## 4. Phiên bản gói gọn trong 2 slide

### Slide 1: Tổng quan kiến trúc hệ thống

**Tiêu đề slide:** Kiến trúc tổng quan FreshFood AI

**Nội dung nên đặt trên slide:**

- `Frontend`: React 19, Vite, Tailwind CSS
- `Backend`: FastAPI, SQLAlchemy, REST API
- `Database`: PostgreSQL, SQLite fallback
- `Tích hợp hỗ trợ`: Redis, n8n chatbot, metrics
- `Điểm nổi bật`: AI kiểm tra độ tươi thực phẩm

**Câu nói thuyết trình:**

"Ở slide này, em trình bày kiến trúc tổng quan của hệ thống FreshFood AI. Hệ thống được chia thành 3 tầng chính gồm frontend, backend và cơ sở dữ liệu. Frontend xây dựng bằng React để người dùng thao tác mua hàng, quét ảnh và theo dõi đơn hàng. Backend dùng FastAPI để xử lý nghiệp vụ như xác thực, sản phẩm, đơn hàng, phần thưởng và quản trị. Dữ liệu được lưu chủ yếu ở PostgreSQL, ngoài ra có thể dùng SQLite khi phát triển hoặc demo. Bên cạnh đó, hệ thống còn tích hợp Redis để hỗ trợ cache, n8n để xử lý chatbot và metrics để giám sát vận hành." 

### Slide 2: Luồng AI và giá trị của kiến trúc

**Tiêu đề slide:** Luồng AI kiểm tra độ tươi

**Nội dung nên đặt trên slide:**

1. Người dùng chụp hoặc upload ảnh thực phẩm
2. Frontend dùng TensorFlow.js để phân tích nhanh trên trình duyệt
3. Backend nhận ảnh và kết quả dự đoán để xác minh lại
4. Trả về kết quả độ tươi hoặc chuyển sang đánh giá thủ công
5. Lưu lịch sử quét, phản hồi AI và hỗ trợ khiếu nại sau giao hàng

**Câu nói thuyết trình:**

"Điểm khác biệt lớn nhất của hệ thống nằm ở luồng AI kiểm tra độ tươi. Khi người dùng tải ảnh lên, frontend sẽ chạy TensorFlow.js ngay trên trình duyệt để phản hồi nhanh. Sau đó backend nhận ảnh và kết quả ban đầu để kiểm tra lại, từ đó trả về mức độ tươi hoặc yêu cầu đánh giá thủ công nếu AI chưa đủ chắc chắn. Cách thiết kế hai bước này giúp hệ thống vừa nhanh ở phía người dùng, vừa an toàn và đáng tin cậy ở phía server. Đồng thời toàn bộ kết quả quét, phản hồi của người dùng và các trường hợp khiếu nại đều được lưu lại để phục vụ quản lý và cải thiện hệ thống về sau."

### Câu chốt sau 2 slide

"Tóm lại, kiến trúc của FreshFood AI không chỉ đáp ứng bài toán thương mại điện tử mà còn tích hợp AI theo hướng thực tế, có kiểm soát và dễ mở rộng trong tương lai."

---

## 5. Gợi ý chia theo slide

### Slide 1: Sơ đồ tổng quan

Nói:
"Slide này mô tả bức tranh tổng thể của hệ thống. Người dùng thao tác trên web, frontend gửi dữ liệu đến backend, backend xử lý nghiệp vụ và truy xuất cơ sở dữ liệu. Song song với đó là các thành phần hỗ trợ như AI, Redis, n8n và hệ giám sát."

### Slide 2: Frontend

Nói:
"Frontend đóng vai trò là lớp tương tác trực tiếp với người dùng. Nhóm dùng React để chia giao diện thành nhiều trang và component, đồng thời dùng Context để quản lý trạng thái dùng chung như đăng nhập, giỏ hàng và sản phẩm yêu thích."

### Slide 3: Backend

Nói:
"Backend là trung tâm xử lý của hệ thống. FastAPI tiếp nhận request, gọi các module nghiệp vụ tương ứng, kiểm tra dữ liệu đầu vào, xử lý quyền truy cập và trả phản hồi chuẩn JSON cho frontend."

### Slide 4: AI freshness workflow

Nói:
"Đây là luồng quan trọng nhất. Ảnh được phân tích trước trên trình duyệt để tăng tốc độ phản hồi, sau đó backend kiểm tra lại để đánh giá độ tươi và quyết định có cần đánh giá thủ công hay không."

### Slide 5: Database và tích hợp

Nói:
"Dữ liệu chính được lưu ở PostgreSQL. Redis hỗ trợ cache, n8n hỗ trợ chatbot, còn metrics giúp giám sát hệ thống trong quá trình vận hành."

### Slide 6: Kết luận

Nói:
"Kiến trúc này vừa đáp ứng các chức năng thương mại điện tử, vừa tích hợp được AI theo cách an toàn và có khả năng mở rộng về sau."

---

## 6. Mẹo trình bày để dễ ghi điểm

- Nhấn mạnh đây không phải web bán hàng thông thường, mà có thêm lớp AI hậu giao hàng.
- Khi nói về AI, nên nhấn vào cụm "hai bước: client phân tích nhanh, backend xác minh lại".
- Khi nói về độ tin cậy, nhấn mạnh cơ chế "AI không chắc thì chuyển sang đánh giá thủ công".
- Khi kết luận, chốt bằng hai ý: "tách lớp rõ ràng" và "dễ mở rộng trong tương lai".
