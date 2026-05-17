# 🚀 FreshFood Backend API Usage Guide

## 📝 Các thay đổi chính

### 1. ✅ JWT Token Authentication
Tất cả admin routes bây giờ yêu cầu JWT Bearer Token trong header `Authorization`

### 2. ✅ Admin Authorization
Middleware kiểm tra token + quyền admin trước khi cho phép truy cập

### 3. ✅ Order Management
7 endpoints mới để quản lý đơn hàng

---

## 🔐 Authentication Flow

### Step 1: Đăng nhập lấy Token

**Request:**
```bash
POST http://localhost:8000/api/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

**Response (200 OK):**
```json
{
  "message": "Đăng nhập thành công",
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "username": "admin",
    "full_name": "Quản trị viên",
    "is_admin": true
  }
}
```

⚠️ **Lưu `access_token` này!**

### Step 2: Sử dụng Token cho các API requests

Thêm vào header `Authorization`:
```
Authorization: Bearer <access_token>
```

**Ví dụ với curl:**
```bash
curl -X GET http://localhost:8000/api/admin/users \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 📋 API Endpoints (Chi tiết)

### 👤 Authentication Routes

#### POST /api/register
Đăng ký tài khoản mới
```json
{
  "username": "newuser",
  "email": "user@example.com",
  "password": "secure123",
  "full_name": "Tên Người Dùng"
}
```

#### POST /api/login
Đăng nhập (trả về JWT token)
```json
{
  "username": "admin",
  "password": "admin123"
}
```

#### GET /api/me
Lấy thông tin người dùng hiện tại
```
Header: Authorization: Bearer <token>
```

#### PUT /api/users/{user_id}
Cập nhật thông tin user
```json
{
  "full_name": "Tên mới",
  "password": "password_mới"  // optional
}
```

---

### 🛒 Product Routes

#### GET /api/products
Lấy danh sách sản phẩm (có thể lọc theo category)
```
GET /api/products?category=Rau%20xanh
```

#### GET /api/products/featured
Lấy sản phẩm nổi bật (rating >= 4.8)

#### POST /api/products (Admin)
Thêm sản phẩm mới
```
Header: Authorization: Bearer <admin_token>
```
```json
{
  "name": "Sản phẩm mới",
  "price": "50.000đ",
  "rating": 5.0,
  "category": "Rau xanh",
  "img": "https://...",
  "description": "Mô tả..."
}
```

#### DELETE /api/products/{product_id} (Admin)
Xóa sản phẩm
```
Header: Authorization: Bearer <admin_token>
```

---

### 👥 Admin Routes (User Management)

#### GET /api/admin/users (Admin Only)
Danh sách tất cả users
```
Header: Authorization: Bearer <admin_token>
```

#### DELETE /api/admin/users/{user_id} (Admin Only)
Xóa một user (không thể xóa admin accounts)
```
Header: Authorization: Bearer <admin_token>
```

#### GET /api/admin/stats (Admin Only)
Lấy thống kê:
- total_users
- total_products
- total_orders
- system_status

```
Header: Authorization: Bearer <admin_token>
```

---

### 📦 Order Management Routes (NEW)

#### POST /api/orders
Tạo đơn hàng mới (Không cần token)
```json
{
  "user_id": 1,
  "total_price": "150.000đ",
  "status": "Chờ xác nhận"  // optional, default = "Chờ xác nhận"
}
```

#### GET /api/users/{user_id}/orders
Lấy tất cả đơn hàng của user (Không cần token)
```
GET /api/users/1/orders
```

#### GET /api/admin/orders (Admin Only)
Danh sách tất cả đơn hàng
```
Header: Authorization: Bearer <admin_token>
```

#### GET /api/admin/orders/{order_id} (Admin Only)
Chi tiết một đơn hàng
```
Header: Authorization: Bearer <admin_token>
```

#### PUT /api/admin/orders/{order_id}/status (Admin Only)
Cập nhật trạng thái đơn hàng
```
Header: Authorization: Bearer <admin_token>
Content-Type: application/json
```
```json
{
  "new_status": "Đang giao"
}
```

Valid statuses:
- "Chờ xác nhận" (default)
- "Đã xác nhận"
- "Đang giao"
- "Đã giao"
- "Đã hủy"

#### DELETE /api/admin/orders/{order_id} (Admin Only)
Xóa một đơn hàng
```
Header: Authorization: Bearer <admin_token>
```

#### GET /api/admin/orders/user/{user_id} (Admin Only)
Lấy tất cả đơn hàng của user (admin view)
```
Header: Authorization: Bearer <admin_token>
```

---

## 🧪 Test Accounts (từ seed.py)

| Username | Password | Email | Role |
|----------|----------|-------|------|
| admin | admin123 | admin@freshfood.com | Admin |
| user1 | 123456 | user1@gmail.com | User |

---

## 🐛 Error Responses

### 401 Unauthorized
```json
{
  "detail": "Thiếu Token hoặc sai định dạng"
}
```
**Nguyên nhân**: Token không được cung cấp hoặc hết hạn (30 phút)

### 403 Forbidden
```json
{
  "detail": "Bạn không có quyền truy cập tài nguyên Admin"
}
```
**Nguyên nhân**: User không phải admin

### 404 Not Found
```json
{
  "detail": "Không tìm thấy người dùng"
}
```
**Nguyên nhân**: Resource không tồn tại

### 400 Bad Request
```json
{
  "detail": "Trạng thái không hợp lệ. Hãy chọn từ: ..."
}
```
**Nguyên nhân**: Dữ liệu không hợp lệ

---

## 📌 Important Notes

1. **SECRET_KEY** trong auth.py và admin.py là `"freshfood-secret-key-2024-change-in-production"`
   - ⚠️ **NHẤT ĐỊNH phải thay đổi** trước khi deploy to production!

2. **Token expiry**: 30 phút
   - Sau 30 phút token sẽ hết hạn, cần đăng nhập lại

3. **Admin Routes** yêu cầu:
   - JWT Token hợp lệ
   - User phải có `is_admin = True`

4. **Password hashing**: SHA256 (pbkdf2_sha256)
   - Tương thích giữa auth.py và seed.py

---

## 🚀 Setup & Run

1. **Install dependencies:**
```bash
pip install -r requirements.txt
```

2. **Initialize database (seed data):**
```bash
python seed.py
```

3. **Run server:**
```bash
uvicorn main:app --reload
```

Server sẽ chạy tại `http://localhost:8000`

API docs: `http://localhost:8000/docs`

