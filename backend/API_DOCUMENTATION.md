# FreshFood Backend - API Documentation (Phase 1 MVP)

**Base URL**: `http://localhost:8001/api`  
**Authentication**: Bearer Token (JWT)  
**Date**: May 1, 2026

---

## 📋 Table of Contents

1. [Authentication APIs](#authentication-apis)
2. [Product APIs](#product-apis)
3. [Order APIs](#order-apis)
4. [Scan APIs (AI Freshness Detection)](#scan-apis)
5. [Admin APIs](#admin-apis)
6. [Error Responses](#error-responses)

---

## Authentication APIs

### 1. Register User
```
POST /auth/register
Content-Type: application/json

Request:
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "securepass123",
  "full_name": "John Doe",
  "phone": "+84912345678"
}

Response (200):
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "expires_in": 1800
}
```

### 2. Login
```
POST /auth/login
Content-Type: application/json

Request:
{
  "email": "john@example.com",
  "password": "securepass123"
}

Response (200):
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "expires_in": 1800
}
```

### 3. Refresh Token
```
POST /auth/refresh
Content-Type: application/json

Request:
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}

Response (200):
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "expires_in": 1800
}
```

### 4. Get Current User
```
GET /auth/me
Authorization: Bearer <access_token>

Response (200):
{
  "id": 1,
  "username": "john_doe",
  "email": "john@example.com",
  "full_name": "John Doe",
  "phone": "+84912345678",
  "role": "customer",
  "is_active": true,
  "avatar_url": null,
  "bio": null,
  "address": null,
  "city": null,
  "created_at": "2026-05-01T10:00:00",
  "last_login": "2026-05-01T10:15:00"
}
```

### 5. Update Profile
```
PUT /auth/me
Authorization: Bearer <access_token>
Content-Type: application/json

Request (all optional):
{
  "full_name": "John Doe Jr",
  "phone": "+84987654321",
  "avatar_url": "https://...",
  "bio": "Fresh food lover",
  "address": "123 Main St",
  "city": "Ho Chi Minh City",
  "postal_code": "70000"
}

Response (200): Updated user profile
```

### 6. Logout
```
POST /auth/logout
Authorization: Bearer <access_token>

Response (200):
{
  "success": true,
  "message": "Logged out successfully. Please delete tokens on client side."
}
```

---

## Product APIs

### 1. List Products
```
GET /products?skip=0&limit=20&category_id=1&search=tomato&min_price=10000&max_price=100000&in_stock=true&sort_by=price

Query Parameters:
- skip: int (default 0)
- limit: int (default 20, max 100)
- category_id: int (optional)
- search: string (searches name & description)
- min_price: float (optional)
- max_price: float (optional)
- in_stock: boolean (optional)
- sort_by: "created_at" | "price" | "rating" (default: created_at)

Response (200):
{
  "total": 150,
  "skip": 0,
  "limit": 20,
  "items": [
    {
      "id": 1,
      "name": "Organic Tomatoes",
      "slug": "organic-tomatoes",
      "description": "Fresh red tomatoes from local farms",
      "category_id": 2,
      "price": 45000.00,
      "discount_price": null,
      "quantity": 100,
      "sku": "TOMATO-001",
      "image_url": "https://...",
      "rating": 4.8,
      "review_count": 25,
      "is_active": true,
      "is_featured": true,
      "origin": "Da Lat, Vietnam",
      "harvest_date": "2026-05-01T00:00:00",
      "expiry_date": "2026-05-10T00:00:00",
      "created_at": "2026-01-01T10:00:00"
    }
  ]
}
```

### 2. Get Product Details
```
GET /products/{product_id}

Response (200):
{
  "id": 1,
  "name": "Organic Tomatoes",
  ...product details...,
  "category": {
    "id": 2,
    "name": "Vegetables",
    "slug": "vegetables",
    "description": "Fresh vegetables",
    "image_url": "https://...",
    "is_active": true,
    "order": 1,
    "created_at": "2026-01-01T10:00:00"
  }
}
```

### 3. List Categories
```
GET /products/categories?skip=0&limit=20

Response (200):
[
  {
    "id": 1,
    "name": "Fruits",
    "slug": "fruits",
    "description": "Fresh fruits",
    "image_url": "https://...",
    "is_active": true,
    "order": 1,
    "created_at": "2026-01-01T10:00:00"
  }
]
```

### 4. List Reviews for Product
```
GET /products/{product_id}/reviews?skip=0&limit=10

Response (200):
{
  "total": 25,
  "skip": 0,
  "limit": 10,
  "items": [
    {
      "id": 1,
      "product_id": 1,
      "user_id": 5,
      "rating": 5,
      "title": "Excellent quality!",
      "comment": "Very fresh and delivered quickly",
      "author": {
        "id": 5,
        "username": "jane_doe",
        "email": "jane@example.com",
        ...
      },
      "is_approved": true,
      "helpful_count": 12,
      "created_at": "2026-04-20T10:00:00"
    }
  ]
}
```

### 5. Create Review
```
POST /products/{product_id}/reviews
Authorization: Bearer <access_token>
Content-Type: application/json

Request:
{
  "rating": 5,
  "title": "Great quality",
  "comment": "Fresh vegetables, perfect!"
}

Response (201):
{
  "id": 1,
  "product_id": 1,
  "user_id": 1,
  "rating": 5,
  "title": "Great quality",
  "comment": "Fresh vegetables, perfect!",
  "author": {...},
  "is_approved": false,
  "helpful_count": 0,
  "created_at": "2026-05-01T10:00:00"
}
```

---

## Order APIs

### 1. Create Order
```
POST /orders
Authorization: Bearer <access_token>
Content-Type: application/json

Request:
{
  "items": [
    {"product_id": 1, "quantity": 2},
    {"product_id": 3, "quantity": 1}
  ],
  "shipping_address": "123 Main Street",
  "shipping_city": "Ho Chi Minh City",
  "shipping_phone": "+84912345678",
  "payment_method": "cod",
  "notes": "Please deliver in the afternoon"
}

Response (201):
{
  "id": 101,
  "order_number": "ORD-20260501101530-ABC4",
  "user_id": 1,
  "subtotal": 135000.00,
  "tax": 13500.00,
  "shipping_fee": 0,
  "discount": 0,
  "total": 148500.00,
  "status": "pending",
  "payment_method": "cod",
  "payment_status": "pending",
  "created_at": "2026-05-01T10:15:30",
  "shipped_at": null,
  "delivered_at": null,
  "owner": {...},
  "items": [
    {
      "id": 1,
      "product_id": 1,
      "product": {...},
      "quantity": 2,
      "price_at_purchase": 45000.00,
      "subtotal": 90000.00
    }
  ],
  "notes": "Please deliver in the afternoon"
}
```

### 2. List User Orders
```
GET /orders?skip=0&limit=20&status=pending
Authorization: Bearer <access_token>

Query Parameters:
- skip: int
- limit: int
- status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled"

Response (200):
{
  "total": 5,
  "skip": 0,
  "limit": 20,
  "items": [...orders...]
}
```

### 3. Get Order Details
```
GET /orders/{order_id}
Authorization: Bearer <access_token>

Response (200): Full order details with items
```

### 4. Update Order
```
PUT /orders/{order_id}
Authorization: Bearer <access_token>
Content-Type: application/json

Request (can only update notes for pending orders):
{
  "notes": "Updated delivery instructions"
}

Response (200): Updated order
```

### 5. Cancel Order
```
POST /orders/{order_id}/cancel
Authorization: Bearer <access_token>

Response (200):
{
  "success": true,
  "message": "Order cancelled successfully",
  "order_id": 101,
  "status": "cancelled"
}
```

---

## Scan APIs

### 1. Create Scan (AI Freshness Detection)
```
POST /scans
Authorization: Bearer <access_token>
Content-Type: application/json

Request:
{
  "image_url": "https://example.com/image.jpg",
  "product_id": 1,
  "scan_method": "image"
}

Response (201):
{
  "id": 50,
  "user_id": 1,
  "product_id": 1,
  "freshness_score": 82.5,
  "freshness_level": "fresh",
  "detected_issues": [],
  "ai_confidence": 94.2,
  "status": "completed",
  "created_at": "2026-05-01T10:20:00",
  "processing_time": 1.2
}

Note: Phase 1 returns mock results.
Phase 2 will call external AI API async via Celery.
```

### 2. List User Scans
```
GET /scans?skip=0&limit=20&status=completed
Authorization: Bearer <access_token>

Query Parameters:
- skip: int
- limit: int
- status: "pending" | "processing" | "completed" | "failed"

Response (200):
{
  "total": 10,
  "skip": 0,
  "limit": 20,
  "items": [...scans...]
}
```

### 3. Get Scan Result
```
GET /scans/{scan_id}
Authorization: Bearer <access_token>

Response (200):
{
  "id": 50,
  "user_id": 1,
  "product_id": 1,
  "freshness_score": 82.5,
  "freshness_level": "fresh",
  "detected_issues": ["minor_discoloration"],
  "ai_confidence": 94.2,
  "status": "completed",
  "created_at": "2026-05-01T10:20:00",
  "processing_time": 1.2
}
```

### 4. Submit Scan Feedback
```
POST /scans/{scan_id}/feedback
Authorization: Bearer <access_token>
Content-Type: application/json

Request:
{
  "is_accurate": true,
  "actual_freshness": "fresh",
  "notes": "The scan was very accurate"
}

Response (200):
{
  "success": true,
  "message": "Thank you for your feedback. This helps us improve accuracy.",
  "scan_id": 50
}
```

### 5. Get Product Scan Statistics
```
GET /products/{product_id}/scans?skip=0&limit=10

Response (200):
{
  "total": 12,
  "skip": 0,
  "limit": 10,
  "items": [...scans...],
  "statistics": {
    "product_id": 1,
    "total_scans": 12,
    "average_freshness_score": 78.5,
    "average_ai_confidence": 91.3
  }
}
```

---

## Admin APIs

### 1. Dashboard Statistics
```
GET /admin/dashboard
Authorization: Bearer <admin_token>

Response (200):
{
  "orders": {
    "total_orders": 156,
    "pending_orders": 12,
    "completed_orders": 140,
    "total_revenue": 15000000.00,
    "average_order_value": 96000.00
  },
  "users": {
    "total_users": 420,
    "active_users": 380,
    "verified_users": 350,
    "last_7_days_new_users": 23
  },
  "products_count": 150,
  "total_scans": 2340
}
```

---

## Error Responses

### Standard Error Response
```
{
  "success": false,
  "message": "Human-readable error message",
  "error_code": "ERROR_CODE",
  "details": {
    "field": "Additional error details"
  }
}
```

### Common Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (auth required) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 409 | Conflict (resource already exists) |
| 422 | Validation Error |
| 500 | Server Error |

### Example Error Response

```
Status: 400
{
  "success": false,
  "message": "User with this email already exists",
  "error_code": "USER_EXISTS",
  "details": {
    "email": "john@example.com"
  }
}
```

---

## Request/Response Format

### All Requests Must Include

```
Content-Type: application/json
Authorization: Bearer <access_token>  (for protected endpoints)
```

### Pagination

Default: `skip=0&limit=20`  
Max limit: 100

```
GET /products?skip=40&limit=20

Response includes:
{
  "total": 150,
  "skip": 40,
  "limit": 20,
  "items": [...]
}
```

---

## Phase 1 Status

✅ **Implemented:**
- Auth (register, login, refresh, profile)
- Products (list, filter, details)
- Reviews (list, create)
- Orders (create, list, update, cancel)
- Scans (mock AI detection)
- Categories
- Admin (basic dashboard)

🔄 **Phase 2 (Async):**
- Real AI API integration
- Celery + RabbitMQ
- WebSocket support
- Payment processing
- Email notifications

---

**Last Updated**: May 1, 2026  
**Version**: 1.0.0 (Phase 1 MVP)
