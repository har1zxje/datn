# FreshFood AI Workflow - No-code n8n Guide

Mục tiêu: nâng workflow hiện tại từ ảnh `Webhook -> AI Agent -> Respond to Webhook` thành workflow có rẽ nhánh intent, lấy công thức, lấy sản phẩm, so khớp sản phẩm, lưu lịch sử chat và trả JSON cho frontend mà không dùng Function/Code Node.

> Lưu ý kỹ thuật: n8n làm matching "contains" giữa 2 danh sách động không mạnh bằng Code Node. Cách no-code ổn định nhất là yêu cầu AI Agent trả ra `ingredient_keywords` đã chuẩn hóa, dùng database node lọc sản phẩm theo keyword hoặc dùng Merge khi cả hai phía có cùng field chuẩn hóa như `match_key`.

## Sơ đồ no-code đề xuất

```text
Webhook
  -> Edit Fields: Normalize Input
  -> Database: Insert User Message
  -> AI Agent: Intent Classifier
       + Groq Chat Model
       + Structured Output Parser
  -> Switch: intent_type

Nhánh recipe:
  -> HTTP Request: Recipe API
  -> Edit Fields: Recipe Fields
  -> Database: Get Products
  -> Item Lists / Split Out: Ingredients
  -> Edit Fields: Ingredient Match Key
  -> Edit Fields: Product Match Key
  -> Merge: Keep Matches / Enrich Input Data
  -> AI Agent: Compose Answer
  -> Database: Insert Assistant Message
  -> Respond to Webhook

Nhánh order:
  -> Database/API: Get Orders
  -> AI Agent: Compose Order Answer
  -> Database: Insert Assistant Message
  -> Respond to Webhook

Nhánh shipping_policy:
  -> Edit Fields: Policy Answer
  -> Database: Insert Assistant Message
  -> Respond to Webhook

Nhánh general:
  -> AI Agent: General FreshFood Answer
  -> Database: Insert Assistant Message
  -> Respond to Webhook
```

## 1. Cấu hình AI Agent để trả output cố định

### 1.1. Mở AI Agent hiện tại

1. Click node `AI Agent` trong canvas.
2. Ở phần `Prompt`, chọn `Define below`.
3. Trong ô `Prompt/User Message`, kéo biến từ node `Webhook`:
   - Mở panel bên trái `Input`.
   - Mở `Webhook > body > message`.
   - Kéo `message` vào ô prompt.
4. Bật tùy chọn `Require Specific Output Format`.
5. Click dấu `+` ở cổng parser/output parser của AI Agent.
6. Chọn node `Structured Output Parser`.

### 1.2. Cấu hình Structured Output Parser

1. Click node `Structured Output Parser`.
2. `Schema Type`: chọn `Generate from JSON Example`.
3. Dán JSON example này:

```json
{
  "intent_type": "recipe",
  "user_message": "Cách nấu thịt kho tàu",
  "dish_name": "thịt kho tàu",
  "recipe_query": "thịt kho tàu",
  "ingredient_keywords": ["thịt heo", "trứng", "nước mắm", "đường", "tiêu", "hành", "tỏi"],
  "answer_brief": "Người dùng muốn công thức nấu ăn.",
  "needs_recipe_source": true
}
```

4. Quay lại node `AI Agent`.
5. Trong `System Message`, nhập:

```text
Bạn là bộ phân loại intent cho FreshFood AI.

Chỉ trả về dữ liệu theo Structured Output Parser.

intent_type chỉ được là một trong 4 giá trị:
- recipe: khách hỏi cách nấu, món ăn, nguyên liệu, thực đơn.
- order: khách hỏi đơn hàng, trạng thái đơn, hủy/sửa đơn.
- shipping_policy: khách hỏi vận chuyển, phí ship, freeship, thời gian giao.
- general: các câu hỏi còn lại về FreshFood.

Nếu intent_type = recipe:
- dish_name là tên món nếu có.
- recipe_query là từ khóa dùng để tìm công thức.
- ingredient_keywords là danh sách nguyên liệu chính, viết thường, ngắn gọn.
- needs_recipe_source = true.

Không giải thích dài ở bước này. Không trả Markdown ở bước này.
```

### 1.3. Kiểm tra output

1. Click `Execute step` trên Webhook hoặc chạy thử bằng frontend.
2. Mở output của `AI Agent`.
3. Bạn cần thấy field:
   - `intent_type`
   - `dish_name`
   - `recipe_query`
   - `ingredient_keywords`
   - `needs_recipe_source`

Nếu output vẫn là text dài, kiểm tra lại `Require Specific Output Format` và dây nối tới `Structured Output Parser`.

## 2. Dùng Switch để rẽ 4 nhánh intent

1. Click dấu `+` sau `AI Agent`.
2. Tìm node `Switch`.
3. Kết nối `AI Agent -> Switch`.
4. Mở node `Switch`.
5. `Mode`: chọn `Rules`.
6. Ở `Routing Rules`, tạo 4 rule:

### Rule 1: recipe

- Value 1: kéo thả field `intent_type` từ output AI Agent vào.
- Operation: `Equals`
- Value 2: `recipe`
- Rename output nếu n8n cho phép: `recipe`

### Rule 2: order

- Value 1: `intent_type`
- Operation: `Equals`
- Value 2: `order`

### Rule 3: shipping_policy

- Value 1: `intent_type`
- Operation: `Equals`
- Value 2: `shipping_policy`

### Rule 4: general

- Value 1: `intent_type`
- Operation: `Equals`
- Value 2: `general`

7. Bật `Fallback Output` nếu có. Fallback nối về nhánh `general`.
8. Sau khi save, node Switch sẽ có nhiều output. Kéo từng output sang node tương ứng.

## 3. Lấy công thức không dùng Code Node

### 3.1. Thêm HTTP Request cho Recipe API

1. Từ output `recipe` của Switch, click dấu `+`.
2. Chọn `HTTP Request`.
3. Đặt tên node: `Get Recipe`.
4. `Method`: `GET`.
5. `URL`: nhập endpoint API công thức bạn dùng.
6. Với query param:
   - Click `Add Parameter`.
   - Name: `q`.
   - Value: kéo `recipe_query` từ output AI Agent vào.

Ví dụ nếu API có dạng:

```text
https://your-recipe-api.com/search
```

Thì `Query Parameters`:

```text
q = {{$json.recipe_query}}
```

7. `Response Format`: chọn `JSON`.
8. Click `Execute step` để xem API trả field gì.

### 3.2. Trích xuất nguyên liệu và source bằng Edit Fields

1. Sau `Get Recipe`, click dấu `+`.
2. Chọn `Edit Fields (Set)`.
3. Đặt tên node: `Recipe Fields`.
4. `Mode`: `Manual Mapping`.
5. Click `Add Field` và tạo các field:

| Field name | Value cách kéo-thả |
|---|---|
| `recipe_title` | kéo title/name từ output `Get Recipe` |
| `source_url` | kéo source/url từ output `Get Recipe` |
| `ingredients` | kéo mảng ingredients từ output `Get Recipe` |
| `steps` | kéo steps/instructions từ output `Get Recipe` |

6. Bật `Keep Only Set Fields` nếu bạn muốn output sạch.
7. Click `Execute step`.

Nếu API trả nhiều công thức, thêm node `Limit` sau HTTP Request:

1. Click `+` sau `Get Recipe`.
2. Chọn `Limit`.
3. `Max Items`: `1`.
4. Sau đó nối `Limit -> Recipe Fields`.

## 4. Lấy sản phẩm từ MySQL/PostgreSQL bằng giao diện

### 4.1. Tạo Database node

1. Từ nhánh recipe, sau `Recipe Fields`, click dấu `+`.
2. Chọn `Postgres` hoặc `MySQL`.
3. Đặt tên node: `Get Products`.
4. Chọn credential database.

### 4.2. Cách dùng chế độ trực quan

Với Postgres/MySQL node:

1. `Operation`: chọn `Select`.
2. `Table`: chọn `products`.
3. `Return All`: bật `true`, hoặc đặt `Limit` = `100`.
4. Trong phần `Options/Columns`, chọn các cột:
   - `id`
   - `name`
   - `price`
   - `unit`
   - `image_url`
   - `stock_status`
   - `quantity`
5. Nếu có filter trực quan:
   - Field: `is_active`
   - Operation: `Equal`
   - Value: `true`
6. Thêm filter kho:
   - Field: `stock_status`
   - Operation: `Not Equal`
   - Value: `out_of_stock`

Nếu node database của bạn không hiện chế độ Select trực quan hoặc không hỗ trợ filter phức tạp, dùng `HTTP Request` gọi API backend:

```text
GET http://localhost:8001/api/products?limit=100
```

Cách này vẫn no-code và dễ cấu hình hơn.

## 5. Chuẩn bị dữ liệu để Merge không cần Code

Merge chỉ match tốt khi hai bên có field cùng kiểu. Vì vậy cần tạo `match_key`.

### 5.1. Tách ingredients thành từng item

1. Sau `Recipe Fields`, click dấu `+`.
2. Tìm node `Item Lists` hoặc `Split Out`.
3. Chọn operation kiểu `Split Out Items`.
4. Field to split: chọn `ingredients`.
5. Output mong muốn: mỗi item là một ingredient.

Nếu API recipe trả ingredients là object, dùng Edit Fields trước để kéo đúng field text, ví dụ `ingredient_name`.

### 5.2. Tạo match_key cho ingredients bằng Edit Fields

1. Sau node Split ingredients, thêm `Edit Fields`.
2. Đặt tên: `Ingredient Match Key`.
3. `Mode`: `Manual Mapping`.
4. Add fields:
   - `ingredient_name`: kéo giá trị ingredient hiện tại.
   - `match_key`: kéo cùng giá trị ingredient hiện tại.
5. Vì không dùng code, bạn nên yêu cầu recipe API hoặc AI Agent trả `ingredient_keywords` đã chuẩn hóa ngắn gọn như:
   - `nước mắm`
   - `trứng`
   - `thịt heo`
   - `tiêu`
   - `tỏi`

### 5.3. Tạo match_key cho products bằng Edit Fields

1. Sau `Get Products`, thêm `Edit Fields`.
2. Đặt tên: `Product Match Key`.
3. Add fields:
   - `product_id`: kéo `id`
   - `product_name`: kéo `name`
   - `product_price`: kéo `price`
   - `product_unit`: kéo `unit`
   - `product_image_url`: kéo `image_url`
   - `product_url`: nhập `/shop?q=` rồi kéo `name` vào sau, hoặc dùng frontend trả sẵn `url`.
   - `match_key`: kéo field `name`

Quan trọng: nếu muốn Merge match chính xác, product `match_key` nên là keyword ngắn. Có 2 cách no-code:

- Cách tốt nhất: thêm cột `match_key` hoặc `tags` trong database sản phẩm, ví dụ `nuoc mam`, `trung`, `thit heo`.
- Cách tạm: dùng tên sản phẩm làm `match_key`, nhưng Merge exact match sẽ khó trúng nếu ingredient là `nước mắm` còn product là `Nước mắm Nam Ngư cá cơm 500ml`.

## 6. So khớp sản phẩm bằng Merge

### 6.1. Merge kiểu Keep Matches

1. Click dấu `+` trên canvas.
2. Chọn node `Merge`.
3. Kết nối:
   - `Ingredient Match Key -> Merge Input 1`
   - `Product Match Key -> Merge Input 2`
4. Mở node `Merge`.
5. `Mode`: `Combine`.
6. `Combine By`: `Matching Fields`.
7. `Input 1 Field`: `match_key`.
8. `Input 2 Field`: `match_key`.
9. `Output Type`: `Keep Matches`.
10. `Multiple Matches`: chọn `Include All Matches` nếu muốn nhiều sản phẩm cho một nguyên liệu.
11. `Clash Handling`: ưu tiên Input 2 hoặc luôn thêm số input vào field nếu bị trùng tên.

### 6.2. Merge kiểu Enrich Input Data

Dùng khi bạn muốn giữ danh sách nguyên liệu và thêm sản phẩm tương ứng:

1. Trong `Merge`, giữ:
   - `Mode`: `Combine`
   - `Combine By`: `Matching Fields`
2. `Output Type`: chọn `Enrich Input 1`.
3. `Input 1`: ingredients.
4. `Input 2`: products.

### 6.3. Điều kiện Contains không dùng Code

Merge node mặc định mạnh nhất với matching field bằng nhau. Nếu bạn cần kiểu "product.name contains ingredient":

Phương án A - No-code sạch nhất:

1. Thêm cột `match_key` hoặc `tags` vào products.
2. Khi seed sản phẩm, gán:
   - Nước mắm Nam Ngư -> `nuoc mam`
   - Trứng gà ta -> `trung`
   - Ba chỉ heo -> `thit heo`
3. AI Agent trả `ingredient_keywords` cũng theo cùng key.
4. Merge dùng exact match trên `match_key`.

Phương án B - Dùng Filter trước Merge:

1. Sau `Get Products`, thêm node `Filter`.
2. Điều kiện:
   - Left value: kéo `product_name`.
   - Operation: `Contains`.
   - Right value: kéo `ingredient_name`.
3. Cách này dễ làm với một ingredient/item hiện tại, nhưng khi có nhiều ingredient, bạn cần Split ingredients và xử lý từng item.

Phương án C - Dùng AI Agent làm matcher:

1. Sau `Recipe Fields` và `Get Products`, thêm một `AI Agent` mới tên `Product Matcher`.
2. Prompt: yêu cầu chọn sản phẩm phù hợp từ danh sách sản phẩm, trả structured output `products`.
3. Vẫn không dùng Function Node, nhưng tốn token hơn.

Khuyến nghị cho FreshFood: dùng Phương án A bằng cột `match_key/tags`, vì ổn định và dễ kiểm soát.

## 7. Lưu lịch sử chat bằng Database Insert

### 7.1. Tạo bảng chat_messages

Dùng database client của bạn tạo bảng một lần. Không cần làm trong n8n.

Cột tối thiểu:

```text
id
session_id
role
content
products
created_at
```

### 7.2. Insert user_message

1. Sau `Edit Fields: Normalize Input`, thêm node `Postgres/MySQL`.
2. Đặt tên: `Save User Message`.
3. `Operation`: `Insert`.
4. `Table`: `chat_messages`.
5. Mapping fields:
   - `session_id`: kéo từ `Normalize Input > session_id`.
   - `role`: chọn `Fixed`, nhập `user`.
   - `content`: kéo từ `Normalize Input > message`.
   - `products`: chọn `Fixed`, nhập `[]`.
   - `created_at`: nếu DB tự tạo timestamp thì bỏ qua.

### 7.3. Insert ai_response

1. Trước `Respond to Webhook`, thêm node `Postgres/MySQL`.
2. Đặt tên: `Save Assistant Message`.
3. `Operation`: `Insert`.
4. `Table`: `chat_messages`.
5. Mapping fields:
   - `session_id`: kéo từ `Normalize Input > session_id`.
   - `role`: chọn `Fixed`, nhập `assistant`.
   - `content`: kéo từ node tạo câu trả lời cuối.
   - `products`: kéo từ output Merge/Product Matcher.

Nếu cột `products` là JSON/JSONB, dùng kiểu dữ liệu JSON nếu n8n cho chọn. Nếu không, lưu dạng text trước.

## 8. Tạo response JSON bằng Respond to Webhook

1. Click node `Respond to Webhook`.
2. `Respond With`: chọn `JSON`.
3. Ở `Response Body`, chọn chế độ object/key-value nếu giao diện có.
4. Add fields:

| Field | Kéo-thả giá trị |
|---|---|
| `content` | kéo câu trả lời cuối từ `AI Agent: Compose Answer` hoặc `Edit Fields: Policy Answer` |
| `products` | kéo output products từ `Merge` hoặc `Product Matcher` |
| `intent` | kéo `intent_type` từ `AI Agent: Intent Classifier` |
| `source_url` | kéo `source_url` từ `Recipe Fields`, nếu có |
| `session_id` | kéo `session_id` từ `Normalize Input` |

5. Nếu dùng expression object, dùng biểu tượng kéo-thả từ panel input để tạo expression, không cần viết JS.
6. Click `Execute step` và kiểm tra response có dạng:

```json
{
  "content": "Markdown trả lời khách",
  "products": [],
  "intent": "recipe",
  "source_url": "https://...",
  "session_id": "1"
}
```

## 9. Gợi ý layout canvas từ ảnh hiện tại

Từ workflow trong ảnh, làm theo thứ tự:

1. Giữ node `Webhook`.
2. Chèn `Edit Fields: Normalize Input` ngay sau `Webhook`.
3. Chèn `Database: Save User Message`.
4. Đổi node `AI Agent` hiện tại thành `Intent Classifier`.
5. Gắn thêm `Structured Output Parser` vào AI Agent.
6. Thêm `Switch` sau AI Agent.
7. Kéo output `recipe` sang cụm:
   - `Get Recipe`
   - `Recipe Fields`
   - `Get Products`
   - `Split Ingredients`
   - `Ingredient Match Key`
   - `Product Match Key`
   - `Merge`
   - `Compose Answer`
8. Kéo output `order` sang cụm order.
9. Kéo output `shipping_policy` sang cụm policy.
10. Kéo output `general` sang cụm general.
11. Các nhánh cuối cùng đều nối về:
   - `Save Assistant Message`
   - `Respond to Webhook`

## 10. Checklist test

Test 4 câu:

```text
Cách nấu thịt kho tàu
Tôi muốn kiểm tra đơn hàng gần đây
Chính sách vận chuyển thế nào?
FreshFood có bán nước mắm không?
```

Kỳ vọng:

- `Cách nấu thịt kho tàu` đi nhánh `recipe`.
- Response có `source_url`.
- Response có `products` chứa trứng, nước mắm, đường, tiêu hoặc thịt heo nếu có trong DB.
- Câu đơn hàng đi nhánh `order`.
- Câu vận chuyển đi nhánh `shipping_policy`.
- Lịch sử được insert vào bảng `chat_messages`.
