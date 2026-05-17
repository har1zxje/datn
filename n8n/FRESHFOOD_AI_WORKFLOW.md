# FreshFood AI n8n Workflow

Mục tiêu: nâng workflow hiện tại từ `Webhook -> AI Agent -> Respond to Webhook` thành workflow có tư vấn nấu ăn, so khớp sản phẩm FreshFood và lưu lịch sử chat.

## Sơ đồ node đề xuất

```text
Webhook
  -> Normalize Input
  -> Load Chat History
  -> Load Products
  -> AI Agent
       - Groq Chat Model
       - Simple Memory
       - HTTP Request Tool: Trusted Recipe Search
  -> Match Products
  -> Save Assistant Message
  -> Respond to Webhook
```

## 1. Webhook

- Node type: `Webhook`
- Method: `POST`
- Path: `freshfood-ai-chat`
- Respond: `Using Respond to Webhook node`
- Payload frontend đang gửi:

```json
{
  "message": "Cách nấu thịt kho tàu",
  "user_context": {
    "user_id": 1,
    "username": "user1",
    "available_products": []
  },
  "local_product_suggestions": [],
  "persona": {}
}
```

## 2. Normalize Input

- Node type: `Code`
- Mode: `Run Once for Each Item`
- Code:

```js
const body = $json.body ?? $json;
const userContext = body.user_context ?? {};
const sessionId =
  userContext.user_id ||
  userContext.username ||
  body.session_id ||
  $execution.id;

return {
  json: {
    message: String(body.message || '').trim(),
    session_id: String(sessionId),
    user_context: userContext,
    frontend_products: userContext.available_products || [],
    local_product_suggestions: body.local_product_suggestions || [],
    requested_at: new Date().toISOString()
  }
};
```

## 3. Load Chat History

- Node type: `Postgres` hoặc `MySQL`
- Operation: `Execute Query`
- Query mẫu PostgreSQL:

```sql
SELECT role, content, products, created_at
FROM chat_messages
WHERE session_id = '{{ $json.session_id }}'
ORDER BY created_at DESC
LIMIT 10;
```

Bảng gợi ý:

```sql
CREATE TABLE IF NOT EXISTS chat_messages (
  id SERIAL PRIMARY KEY,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  products JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 4. Load Products

- Node type: `HTTP Request`
- Method: `GET`
- URL khi backend chạy ngoài Docker:

```text
http://localhost:8001/api/products?limit=100
```

- URL khi n8n chạy bằng Docker trên cùng máy:

```text
http://host.docker.internal:8001/api/products?limit=100
```

- Response Format: `JSON`
- Never Error: `true`

## 5. AI Agent

Giữ node `AI Agent` như ảnh, nhưng cập nhật prompt:

```text
Bạn là FreshFood AI, chuyên gia ẩm thực Việt Nam cho website thực phẩm sạch FreshFood.

Nhiệm vụ:
1. Nếu khách hỏi món ăn/cách nấu/nguyên liệu: chỉ trả lời dựa trên nguồn công thức uy tín từ HTTP Request Tool. Không tự bịa công thức.
2. Luôn trả lời bằng Markdown ngắn gọn: nguyên liệu, các bước chính, lưu ý an toàn thực phẩm, nguồn tham khảo.
3. Trích xuất danh sách nguyên liệu chính vào cuối output dưới dạng JSON block:
```json
{"ingredients":["thịt heo","trứng","nước mắm","đường","tiêu","hành","tỏi"]}
```
4. Nếu khách hỏi đơn hàng/chính sách: trả lời theo dữ liệu user_context, không gọi công thức.
5. Nếu không đủ dữ liệu, hỏi lại một câu ngắn.

Tin nhắn khách:
{{ $('Normalize Input').item.json.message }}

Context khách:
{{ JSON.stringify($('Normalize Input').item.json.user_context) }}

Lịch sử gần đây:
{{ JSON.stringify($('Load Chat History').all().map(i => i.json)) }}
```

## 6. Groq Chat Model

- Node type: `Groq Chat Model`
- Model gợi ý: `llama-3.3-70b-versatile` hoặc model Groq bạn đang dùng.
- Temperature: `0.3` cho tư vấn ổn định.
- Max tokens: `1000-1500`.

## 7. Simple Memory

- Node type: `Simple Memory`
- Session ID:

```text
{{ $('Normalize Input').item.json.session_id }}
```

- Context window length: `10`.

## 8. HTTP Request Tool: Trusted Recipe Search

Gắn node HTTP Request làm tool của AI Agent.

- Tool Description:

```text
Tìm công thức nấu ăn từ nguồn uy tín. Chỉ dùng khi người dùng hỏi cách nấu, món ăn hoặc nguyên liệu.
```

- Method: `GET`
- URL mẫu nếu dùng API công thức riêng:

```text
https://your-recipe-api.example.com/search?q={{ $fromAI('query', 'Tên món ăn hoặc nguyên liệu cần tìm', 'string') }}
```

Nếu chưa có API công thức, có thể thay bằng endpoint nội bộ của bạn, miễn là response trả về `title`, `ingredients`, `steps`, `source_url`.

## 9. Match Products

- Node type: `Code`
- Mode: `Run Once for All Items`
- Mục tiêu: lấy output AI, trích nguyên liệu, so với products từ backend và frontend.
- Code:

```js
const normalize = (value = '') =>
  String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();

const formatPrice = (value) => `${Number(value || 0).toLocaleString('vi-VN')}đ`;

const agentOutput = $('AI Agent').item.json.output || $('AI Agent').item.json.text || $('AI Agent').item.json.content || '';
const input = $('Normalize Input').item.json;
const apiProducts = $('Load Products').all().flatMap((item) => Array.isArray(item.json) ? item.json : [item.json]);
const products = [...(input.frontend_products || []), ...apiProducts].filter(Boolean);

const aliases = [
  { label: 'Thịt heo', terms: ['thit heo', 'heo', 'ba chi', 'suon non', 'pork'] },
  { label: 'Trứng', terms: ['trung', 'egg'] },
  { label: 'Nước mắm', terms: ['nuoc mam', 'mam'] },
  { label: 'Dầu ăn', terms: ['dau an', 'neptune', 'simply'] },
  { label: 'Xì dầu', terms: ['xi dau', 'nuoc tuong', 'soy sauce'] },
  { label: 'Dầu hào', terms: ['dau hao', 'oyster sauce'] },
  { label: 'Muối', terms: ['muoi', 'salt'] },
  { label: 'Đường', terms: ['duong', 'sugar'] },
  { label: 'Hạt nêm', terms: ['hat nem'] },
  { label: 'Tiêu', terms: ['tieu', 'pepper'] },
  { label: 'Hành khô', terms: ['hanh kho', 'hanh', 'shallot'] },
  { label: 'Tỏi', terms: ['toi', 'garlic'] },
  { label: 'Gừng', terms: ['gung', 'ginger'] },
  { label: 'Nấm hương', terms: ['nam huong', 'shiitake'] },
  { label: 'Mộc nhĩ', terms: ['moc nhi', 'wood ear'] }
];

const text = normalize(`${input.message}\n${agentOutput}`);
const labels = aliases
  .filter((alias) => alias.terms.some((term) => text.includes(term)))
  .map((alias) => alias.label);

const scoreProduct = (product, alias) => {
  const name = normalize(product.name || product.product_name || '');
  const category = normalize(product.category || product.category_name || '');
  const haystack = `${name} ${category}`;
  if (alias.terms.some((term) => name.includes(term))) return 4;
  if (alias.terms.some((term) => haystack.includes(term))) return 3;
  return 0;
};

const suggestions = [];

for (const label of labels) {
  const alias = aliases.find((item) => item.label === label);
  const match = products
    .map((product) => ({ product, score: scoreProduct(product, alias) }))
    .filter(({ score, product }) => score > 0 && product.stock_status !== 'out_of_stock')
    .sort((a, b) => b.score - a.score || Number(b.product.price || 0) - Number(a.product.price || 0))[0];

  if (match) {
    const product = match.product;
    const name = product.name || product.product_name;
    suggestions.push({
      id: product.id || product.product_id || name,
      name,
      price: Number(product.price || 0),
      priceText: product.priceText || product.price_text || formatPrice(product.price),
      unit: product.unit || '',
      image_url: product.image_url || product.img || 'https://placehold.co/160x160/f8fafc/166534?text=FreshFood',
      url: product.url || `http://localhost:5173/shop?q=${encodeURIComponent(name)}`,
      match_label: label,
      stock_status: product.stock_status || 'in_stock'
    });
  }
}

const unique = new Map();
suggestions.forEach((product) => unique.set(product.id, product));

return {
  json: {
    content: agentOutput,
    products: Array.from(unique.values()).slice(0, 6),
    intent: labels.length ? 'recipe_or_ingredient' : 'general',
    session_id: input.session_id,
    created_at: new Date().toISOString()
  }
};
```

## 10. Save Assistant Message

- Node type: `Postgres` hoặc `MySQL`
- Operation: `Execute Query`
- Query PostgreSQL:

```sql
INSERT INTO chat_messages (session_id, role, content, products)
VALUES (
  '{{ $json.session_id }}',
  'assistant',
  '{{ $json.content.replaceAll("'", "''") }}',
  '{{ JSON.stringify($json.products || []) }}'::jsonb
);
```

Nên có thêm một node lưu message của user ngay sau `Normalize Input`:

```sql
INSERT INTO chat_messages (session_id, role, content, products)
VALUES (
  '{{ $json.session_id }}',
  'user',
  '{{ $json.message.replaceAll("'", "''") }}',
  '[]'::jsonb
);
```

## 11. Respond to Webhook

- Node type: `Respond to Webhook`
- Respond With: `JSON`
- Response Body:

```json
{
  "content": "{{ $json.content }}",
  "products": "{{ $json.products }}",
  "intent": "{{ $json.intent }}",
  "session_id": "{{ $json.session_id }}"
}
```

Nếu n8n yêu cầu expression object, dùng:

```js
={{ {
  content: $json.content,
  products: $json.products,
  intent: $json.intent,
  session_id: $json.session_id
} }}
```

## Kết nối node trên canvas hiện tại

Giữ các node đang có trong ảnh:

- `Webhook`
- `AI Agent`
- `Groq Chat Model`
- `Simple Memory`
- `HTTP Request`
- `Respond to Webhook`

Thêm 5 node mới:

- `Normalize Input`
- `Load Chat History`
- `Save User Message`
- `Load Products`
- `Match Products`
- `Save Assistant Message`

Kết nối cuối cùng:

```text
Webhook -> Normalize Input -> Save User Message -> Load Chat History -> Load Products -> AI Agent -> Match Products -> Save Assistant Message -> Respond to Webhook
```

Kết nối phụ vào `AI Agent`:

```text
Groq Chat Model -> AI Agent Chat Model
Simple Memory -> AI Agent Memory
HTTP Request Tool -> AI Agent Tool
```

## Response contract cho frontend FreshFood

Frontend hiện đã đọc được response dạng:

```json
{
  "content": "Markdown answer",
  "products": [
    {
      "id": 1,
      "name": "Nước mắm Nam Ngư cá cơm 500ml",
      "price": 42000,
      "priceText": "42.000đ",
      "unit": "chai",
      "image_url": "https://placehold.co/...",
      "url": "http://localhost:5173/shop?q=Nước%20mắm%20Nam%20Ngư",
      "match_label": "Nước mắm"
    }
  ]
}
```
