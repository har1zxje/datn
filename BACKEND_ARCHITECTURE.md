# 🏗️ FreshFood AI - Backend Architecture Design

**Tác giả**: Backend Architecture Team  
**Ngày**: May 1, 2026  
**Trạng thái**: Draft v1.0  
**Phạm vi**: Hệ thống e-commerce bán thực phẩm sạch với tích hợp AI quét độ sạch

---

## 1. TỔNG QUAN HỆ THỐNG

### 1.1 Vision
FreshFood AI là nền tảng e-commerce bán thực phẩm tươi sạch tích hợp công nghệ **AI quét độ sạch thực phẩm** để:
- Giúp khách hàng xác minh độ an toàn sản phẩm trước khi mua
- Cung cấp cho admin công cụ quản lý sản phẩm theo chỉ số sạch/độ tươi
- Tạo lịch sử quét và báo cáo độ tin cậy

### 1.2 Các thành phần chính
```
┌─────────────────────────────────────────────────┐
│         FreshFood AI - Kiến Trúc Hệ Thống       │
├─────────────────────────────────────────────────┤
│                                                  │
│  ┌──────────────┐  ┌──────────────┐            │
│  │   Frontend   │  │   Admin UI   │            │
│  │  (React 18)  │  │  (Dashboard) │            │
│  └──────┬───────┘  └──────┬───────┘            │
│         │                  │                    │
│         └──────────────────┼─────────────────┐  │
│                            │                 │  │
│  ┌──────────────────────────▼──────────────┐ │  │
│  │    API Gateway / Load Balancer          │ │  │
│  │  (Auth, CORS, Rate Limiting, Logging)   │ │  │
│  └────────┬─────────────────────────────────┘ │  │
│           │                                    │  │
│  ┌────────▼────────────────────────────────┐  │  │
│  │       FastAPI / Node.js Backend         │  │  │
│  ├────────────────────────────────────────┤  │  │
│  │  ┌──────────────────────────────────┐  │  │  │
│  │  │  Core Services                   │  │  │  │
│  │  │  - Auth Service (JWT + OAuth2)   │  │  │  │
│  │  │  - User Service                  │  │  │  │
│  │  │  - Product Service               │  │  │  │
│  │  │  - Order Service                 │  │  │  │
│  │  │  - Scan Service (AI Integration) │  │  │  │
│  │  │  - Admin Service                 │  │  │  │
│  │  └──────────────────────────────────┘  │  │  │
│  │                                        │  │  │
│  │  ┌──────────────────────────────────┐  │  │  │
│  │  │  External Integrations           │  │  │  │
│  │  │  - AI Freshness Detection API    │  │  │  │
│  │  │  - Payment Gateway (Stripe/VNPay)│ │  │  │
│  │  │  - Email Service (SendGrid)      │  │  │  │
│  │  └──────────────────────────────────┘  │  │  │
│  └────────┬─────────────────────────────┬──┘  │  │
│           │                             │     │  │
│  ┌────────▼──────────────┐  ┌──────────▼──┐  │  │
│  │   Database Layer      │  │  Cache Layer │  │  │
│  │  - PostgreSQL/MySQL   │  │ - Redis      │  │  │
│  │  - SQLAlchemy ORM     │  │ - Caching    │  │  │
│  └───────────────────────┘  └──────────────┘  │  │
│                                                │  │
│  ┌─────────────────────────────────────────┐  │  │
│  │  Message Queue / Event Bus              │  │  │
│  │  - RabbitMQ / Kafka (for orders, scans)│  │  │
│  └─────────────────────────────────────────┘  │  │
│                                                │  │
│  ┌─────────────────────────────────────────┐  │  │
│  │  File Storage                           │  │  │
│  │  - AWS S3 / MinIO (product images)      │  │  │
│  └─────────────────────────────────────────┘  │  │
│                                                 │  │
└────────────────────────────────────────────────────┘
```

---

## 2. ĐỀ XUẤT KIẾN TRÚC

### 2.1 Monolith vs Microservices

**Quyết định: MONOLITH (với Domain-Driven Design)**

#### Lý do:
| Yếu tố | Monolith | Microservices |
|--------|----------|---------------|
| Độ phức tạp ban đầu | ✅ Thấp | ❌ Cao |
| Quy mô team | ✅ 5-10 người | ❌ 20+ người |
| Deploy | ✅ 1 lần | ❌ N lần |
| Debugging | ✅ Dễ | ❌ Khó (distributed) |
| Performance | ✅ Tốt (in-process calls) | ⚠️ Network latency |
| Scalability ngay | ⚠️ Vertical | ❌ Horizontal (phức tạp) |
| **Phù hợp giai đoạn** | **✅ MVP → V1** | ⚠️ V2+ nếu cần |

**Chiến lược**: 
- Phase 1 (hiện tại): **Monolith** với các module rõ ràng
- Phase 2 (sau 12 tháng): Refactor thành Microservices nếu cần scale (Order, Scan, Analytics)

### 2.2 Tech Stack Được Khuyến Nghị

```
┌─────────────────────────────────────────┐
│  Layer              │  Technology        │
├─────────────────────┼────────────────────┤
│ Web Framework       │ FastAPI / Node.js  │
│ Language            │ Python / TypeScript│
│ Database            │ PostgreSQL         │
│ ORM                 │ SQLAlchemy / Prisma│
│ Cache               │ Redis              │
│ Message Queue       │ RabbitMQ / Celery  │
│ Authentication      │ JWT + OAuth2       │
│ File Storage        │ AWS S3 / MinIO     │
│ Payment             │ Stripe / VNPay     │
│ API Documentation   │ OpenAPI (Swagger)  │
│ Monitoring          │ Prometheus + Grafana
│ Logging             │ ELK Stack          │
│ Testing             │ Pytest / Jest      │
│ CI/CD               │ GitHub Actions     │
│ Container           │ Docker + Docker    │
│                     │ Compose            │
└─────────────────────┴────────────────────┘
```

**Lựa chọn cụ thể: FastAPI (Python) + PostgreSQL**
- ✅ Type-safe, async/await
- ✅ Automatic API documentation
- ✅ Built-in validation (Pydantic)
- ✅ Easy integration with ML/AI models
- ✅ Great for Vietnamese team (Python friendly)

---

## 3. THIẾT KẾ DATABASE

### 3.1 Entity Relationship Diagram (ERD)

```
┌───────────────────┐
│      USERS        │
├───────────────────┤
│ id (PK)           │
│ username (UNIQUE) │
│ email (UNIQUE)    │
│ password_hash     │
│ full_name         │
│ phone             │
│ address           │
│ is_admin          │
│ is_active         │
│ created_at        │
│ updated_at        │
└───────┬───────────┘
        │ 1
        │ └─── n ┌─────────────────┐
        │        │    ORDERS       │
        │        ├─────────────────┤
        │        │ id (PK)         │
        │        │ user_id (FK)    │
        │        │ total_price     │
        │        │ status          │
        │        │ payment_method  │
        │        │ shipping_addr   │
        │        │ created_at      │
        │        │ updated_at      │
        │        └────┬────────────┘
        │             │ 1
        │             │ └──── n ┌──────────────────┐
        │             │         │  ORDER_ITEMS     │
        │             │         ├──────────────────┤
        │             │         │ id (PK)          │
        │             │         │ order_id (FK)    │
        │             │         │ product_id (FK)  │
        │             │         │ quantity         │
        │             │         │ unit_price       │
        │             │         │ subtotal         │
        │             │         └────────┬─────────┘
        │             │                  │
        └─────────────┼──────────────────┤
                      │                  │
        ┌─────────────┴──────────┐       │
        │                        │       │
    ┌───▼───────────────┐   ┌────▼──────────────┐
    │    PRODUCTS       │   │   SCAN_RESULTS    │
    ├───────────────────┤   ├───────────────────┤
    │ id (PK)           │   │ id (PK)           │
    │ name              │   │ product_id (FK)   │
    │ description       │   │ user_id (FK)      │
    │ price             │   │ freshness_score   │
    │ category          │   │ (0-100%)          │
    │ stock             │   │ quality_metrics   │
    │ image_url         │   │ (JSON)            │
    │ avg_freshness     │   │ ai_model_version  │
    │ (from scans)      │   │ device_info       │
    │ last_scan_date    │   │ created_at        │
    │ created_at        │   │ confidence        │
    │ updated_at        │   │ (0-1.0)           │
    └───────────────────┘   └───────────────────┘
         │ 1
         │ └──── n ┌─────────────────────┐
         │         │ PRODUCT_CATEGORIES  │
         │         ├─────────────────────┤
         │         │ id (PK)             │
         │         │ product_id (FK)     │
         │         │ category_id (FK)    │
         │         │ display_order       │
         │         └─────────────────────┘
         │
         │ └──── n ┌─────────────────────┐
         │         │ REVIEWS             │
         │         ├─────────────────────┤
         │         │ id (PK)             │
         │         │ product_id (FK)     │
         │         │ user_id (FK)        │
         │         │ rating (1-5)        │
         │         │ comment             │
         │         │ verified_purchase   │
         │         │ created_at          │
         │         └─────────────────────┘

┌──────────────────────┐
│   CATEGORIES         │
├──────────────────────┤
│ id (PK)              │
│ name                 │
│ description          │
│ icon_url             │
│ created_at           │
└──────────────────────┘

┌──────────────────────────┐
│   AUDIT_LOGS             │
├──────────────────────────┤
│ id (PK)                  │
│ user_id (FK, nullable)   │
│ action                   │
│ entity_type              │
│ entity_id                │
│ old_values (JSON)        │
│ new_values (JSON)        │
│ timestamp                │
└──────────────────────────┘

┌──────────────────────────┐
│   NOTIFICATIONS          │
├──────────────────────────┤
│ id (PK)                  │
│ user_id (FK)             │
│ type (order, scan, etc)  │
│ title                    │
│ message                  │
│ is_read                  │
│ created_at               │
│ read_at                  │
└──────────────────────────┘
```

### 3.2 Bảng Chi Tiết

#### **USERS**
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    phone VARCHAR(20),
    address TEXT,
    is_admin BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes
    CONSTRAINT check_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'),
    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_is_admin (is_admin)
);
```

#### **PRODUCTS**
```sql
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    category_id INTEGER NOT NULL,
    stock INTEGER DEFAULT 0,
    image_url VARCHAR(500),
    avg_freshness DECIMAL(3, 1) DEFAULT 0.0,  -- 0-100%
    last_scan_date TIMESTAMP,
    sku VARCHAR(100) UNIQUE,
    origin VARCHAR(100),  -- Xuất xứ (Đà Lạt, Hà Nội,...)
    expiry_date DATE,
    supplier_id INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (category_id) REFERENCES categories(id),
    CONSTRAINT check_price CHECK (price > 0),
    CONSTRAINT check_freshness CHECK (avg_freshness >= 0 AND avg_freshness <= 100),
    INDEX idx_category_id (category_id),
    INDEX idx_sku (sku),
    INDEX idx_is_active (is_active)
);
```

#### **ORDERS**
```sql
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',  -- pending, confirmed, shipped, delivered, cancelled
    payment_method VARCHAR(50),  -- card, bank_transfer, cash_on_delivery
    payment_status VARCHAR(20) DEFAULT 'unpaid',  -- unpaid, paid, refunded
    shipping_address TEXT,
    shipping_phone VARCHAR(20),
    tracking_number VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    shipped_at TIMESTAMP,
    delivered_at TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT check_total CHECK (total_price > 0),
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),
    UNIQUE INDEX idx_tracking (tracking_number)
);
```

#### **ORDER_ITEMS**
```sql
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id),
    CONSTRAINT check_quantity CHECK (quantity > 0),
    INDEX idx_order_id (order_id),
    INDEX idx_product_id (product_id)
);
```

#### **SCAN_RESULTS**
```sql
CREATE TABLE scan_results (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL,
    user_id INTEGER,  -- NULL if scanned in store
    freshness_score DECIMAL(3, 1) NOT NULL,  -- 0-100%
    quality_metrics JSONB,  -- {color, firmness, smell, weight, temperature,...}
    confidence DECIMAL(3, 2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),  -- 0-1.0
    ai_model_version VARCHAR(50),  -- v1.0, v2.0,...
    device_info JSONB,  -- {device_type, os, location, camera_quality}
    scan_image_url VARCHAR(500),  -- Lưu ảnh quét
    status VARCHAR(20) DEFAULT 'valid',  -- valid, invalid, expired, uncertain
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT check_score CHECK (freshness_score >= 0 AND freshness_score <= 100),
    INDEX idx_product_id (product_id),
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at),
    INDEX idx_confidence (confidence)
);
```

#### **CATEGORIES**
```sql
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon_url VARCHAR(500),
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_display_order (display_order)
);
```

#### **AUDIT_LOGS**
```sql
CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER,  -- NULL if system action
    action VARCHAR(50) NOT NULL,  -- create, update, delete, approve, reject
    entity_type VARCHAR(50) NOT NULL,  -- user, product, order, scan
    entity_id INTEGER NOT NULL,
    old_values JSONB,  -- Previous values before change
    new_values JSONB,  -- New values after change
    ip_address VARCHAR(45),
    user_agent TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_entity (entity_type, entity_id),
    INDEX idx_timestamp (timestamp)
);
```

---

## 4. API DESIGN (RESTful)

### 4.1 API Base Path & Versioning
```
Base URL: https://api.freshfood.local
API Version: v1
Prefix: /api/v1
```

### 4.2 Core APIs

#### **A. AUTHENTICATION**

```
POST /api/v1/auth/register
├─ Req: { username, email, password, full_name }
├─ Res: { user_id, token, refresh_token }
└─ Status: 201

POST /api/v1/auth/login
├─ Req: { email, password }
├─ Res: { user_id, token, refresh_token, user }
└─ Status: 200

POST /api/v1/auth/refresh-token
├─ Req: { refresh_token }
├─ Res: { token }
└─ Status: 200

POST /api/v1/auth/logout
├─ Headers: { Authorization: Bearer <token> }
├─ Res: { message: "Logged out successfully" }
└─ Status: 200

GET /api/v1/auth/me
├─ Headers: { Authorization: Bearer <token> }
├─ Res: { user: { id, username, email, is_admin, ... } }
└─ Status: 200

POST /api/v1/auth/oauth/google
├─ Req: { google_token }
├─ Res: { user_id, token, user }
└─ Status: 200
```

#### **B. USERS (Customer)**

```
GET /api/v1/users/:id
├─ Headers: { Authorization: Bearer <token> }
├─ Res: { user: { id, username, email, phone, address, ... } }
└─ Status: 200

PUT /api/v1/users/:id
├─ Headers: { Authorization: Bearer <token> }
├─ Req: { full_name, phone, address, avatar_url }
├─ Res: { user: { ... } }
└─ Status: 200

PUT /api/v1/users/:id/password
├─ Headers: { Authorization: Bearer <token> }
├─ Req: { old_password, new_password }
├─ Res: { message: "Password updated" }
└─ Status: 200

GET /api/v1/users/:id/orders
├─ Headers: { Authorization: Bearer <token> }
├─ Query: { limit=20, offset=0, status=pending }
├─ Res: { orders: [...], total, page }
└─ Status: 200

GET /api/v1/users/:id/scans
├─ Headers: { Authorization: Bearer <token> }
├─ Query: { limit=20, offset=0 }
├─ Res: { scans: [...], total }
└─ Status: 200

DELETE /api/v1/users/:id
├─ Headers: { Authorization: Bearer <token> }
├─ Req: { password } (confirm password)
├─ Res: { message: "Account deleted" }
└─ Status: 200
```

#### **C. PRODUCTS**

```
GET /api/v1/products
├─ Query: { 
│   limit=20, 
│   offset=0, 
│   category_id=null,
│   search=null,
│   min_price=0,
│   max_price=999999,
│   sort_by=created_at (or price, freshness, rating),
│   order=desc
│ }
├─ Res: { 
│   products: [
│     { id, name, price, image_url, avg_freshness, ... }
│   ], 
│   total, 
│   page 
│ }
└─ Status: 200

GET /api/v1/products/:id
├─ Res: { 
│   product: { 
│     id, name, description, price, category, stock, 
│     image_url, avg_freshness, last_scan, reviews, ...
│   },
│   recent_scans: [{ id, freshness_score, date, confidence }]
│ }
└─ Status: 200

GET /api/v1/products/:id/reviews
├─ Query: { limit=10, offset=0 }
├─ Res: { 
│   reviews: [
│     { id, user_id, rating, comment, verified_purchase, created_at }
│   ], 
│   total 
│ }
└─ Status: 200

POST /api/v1/products/:id/reviews
├─ Headers: { Authorization: Bearer <token> }
├─ Req: { rating, comment }
├─ Res: { review: { ... } }
└─ Status: 201

GET /api/v1/categories
├─ Res: { 
│   categories: [
│     { id, name, description, icon_url }
│   ]
│ }
└─ Status: 200
```

#### **D. ORDERS**

```
POST /api/v1/orders
├─ Headers: { Authorization: Bearer <token> }
├─ Req: {
│   items: [
│     { product_id, quantity }
│   ],
│   shipping_address,
│   shipping_phone,
│   payment_method,
│   notes
│ }
├─ Res: { 
│   order: { 
│     id, user_id, items, total_price, status, 
│     created_at, payment_url (if need payment)
│   }
│ }
└─ Status: 201

GET /api/v1/orders/:id
├─ Headers: { Authorization: Bearer <token> }
├─ Res: { 
│   order: { 
│     id, user_id, items, total_price, status, 
│     payment_status, shipping_address, tracking_number, ...
│   }
│ }
└─ Status: 200

PUT /api/v1/orders/:id/cancel
├─ Headers: { Authorization: Bearer <token> }
├─ Req: { reason }
├─ Res: { order: { ..., status: 'cancelled' } }
└─ Status: 200
  
POST /api/v1/orders/:id/payment
├─ Headers: { Authorization: Bearer <token> }
├─ Req: { payment_method, payment_details }
├─ Res: { 
│   payment: { 
│     transaction_id, status, payment_url (if redirect needed)
│   }
│ }
└─ Status: 200

POST /api/v1/orders/webhook/stripe
├─ Req: { event: "charge.succeeded", ... }
├─ Res: { message: "Webhook processed" }
└─ Status: 200
```

#### **E. SCANS (AI Freshness Detection)**

```
POST /api/v1/scans
├─ Headers: { Authorization: Bearer <token> (optional) }
├─ Req: {
│   product_id,
│   image_base64 (hoặc multipart file upload),
│   device_info: { device_type, os, location }
│ }
├─ Res: { 
│   scan: {
│     id,
│     product_id,
│     freshness_score (0-100),
│     quality_metrics: {
│       color: { rgb, saturation },
│       firmness: 0-10,
│       smell: 0-10,
│       expected_shelf_life: "5 days"
│     },
│     confidence: 0.95,
│     status: 'valid',
│     recommendation: "Still fresh, good to buy"
│   }
│ }
└─ Status: 201

GET /api/v1/products/:id/scan-history
├─ Query: { limit=30, offset=0 }
├─ Res: { 
│   scans: [
│     { 
│       id, product_id, freshness_score, confidence, 
│       created_at, average_trend
│     }
│   ],
│   trend: {
│     avg_freshness: 85.5,
│     trend_direction: 'down',
│     scans_last_7_days: 15
│   }
│ }
└─ Status: 200

POST /api/v1/scans/:id/feedback
├─ Headers: { Authorization: Bearer <token> }
├─ Req: { feedback: 'accurate' | 'inaccurate', details }
├─ Res: { feedback: { id, status: 'recorded' } }
└─ Status: 201
```

#### **F. ADMIN ENDPOINTS**

```
# User Management
GET /api/v1/admin/users
├─ Headers: { Authorization: Bearer <admin_token> }
├─ Query: { limit=50, offset=0, search, is_admin }
├─ Res: { users: [...], total }
└─ Status: 200

PUT /api/v1/admin/users/:id
├─ Headers: { Authorization: Bearer <admin_token> }
├─ Req: { is_admin, is_active, ... }
├─ Res: { user: { ... } }
└─ Status: 200

DELETE /api/v1/admin/users/:id
├─ Headers: { Authorization: Bearer <admin_token> }
├─ Res: { message: "User deleted" }
└─ Status: 200

# Product Management
POST /api/v1/admin/products
├─ Headers: { Authorization: Bearer <admin_token> }
├─ Req: { name, description, price, category_id, stock, ... }
├─ Res: { product: { ... } }
└─ Status: 201

PUT /api/v1/admin/products/:id
├─ Headers: { Authorization: Bearer <admin_token> }
├─ Req: { name, price, stock, ... }
├─ Res: { product: { ... } }
└─ Status: 200

DELETE /api/v1/admin/products/:id
├─ Headers: { Authorization: Bearer <admin_token> }
├─ Res: { message: "Product deleted" }
└─ Status: 200

POST /api/v1/admin/products/:id/image
├─ Headers: { Authorization: Bearer <admin_token>, Content-Type: multipart/form-data }
├─ Req: { file: <image> }
├─ Res: { image_url: "..." }
└─ Status: 200

# Order Management
GET /api/v1/admin/orders
├─ Headers: { Authorization: Bearer <admin_token> }
├─ Query: { limit=50, offset=0, status, user_id, date_from, date_to }
├─ Res: { orders: [...], total }
└─ Status: 200

PUT /api/v1/admin/orders/:id/status
├─ Headers: { Authorization: Bearer <admin_token> }
├─ Req: { status: 'confirmed|shipped|delivered|cancelled', notes }
├─ Res: { order: { ..., status } }
└─ Status: 200

# Statistics & Reports
GET /api/v1/admin/dashboard
├─ Headers: { Authorization: Bearer <admin_token> }
├─ Query: { date_from, date_to }
├─ Res: {
│   stats: {
│     total_users,
│     total_orders,
│     total_revenue,
│     avg_order_value,
│     conversion_rate,
│     top_products,
│     user_growth,
│     order_trend,
│     top_regions
│   }
│ }
└─ Status: 200

GET /api/v1/admin/reports/scans
├─ Headers: { Authorization: Bearer <admin_token> }
├─ Query: { date_from, date_to, product_id }
├─ Res: {
│   report: {
│     total_scans,
│     avg_freshness_by_product,
│     scan_accuracy,
│     user_engagement,
│     ai_model_performance
│   }
│ }
└─ Status: 200
```

---

## 5. XÁC THỰC & PHÂN QUYỀN

### 5.1 Authentication Flow

```
┌─────────────────────────────────────────────────────┐
│         Authentication Flow (JWT + Refresh)         │
├─────────────────────────────────────────────────────┤
│                                                      │
│  1. User Login                                      │
│  ┌──────────────────────┐                          │
│  │ POST /auth/login     │                          │
│  │ { email, password }  │                          │
│  └──────────┬───────────┘                          │
│             │                                       │
│  2. Server Validate & Generate Tokens              │
│  ┌──────────────────────────────────────┐          │
│  │ Verify password (bcrypt)             │          │
│  │ Generate JWT (short-lived, 15min)    │          │
│  │ Generate Refresh Token (long-lived,  │          │
│  │   30 days, stored in Redis/DB)       │          │
│  └──────────┬───────────────────────────┘          │
│             │                                       │
│  3. Response                                       │
│  ┌──────────────────────────────────────┐          │
│  │ {                                    │          │
│  │   "token": "<JWT>",                  │          │
│  │   "refresh_token": "<refresh>",      │          │
│  │   "expires_in": 900,  (in seconds)   │          │
│  │   "user": { ... }                    │          │
│  │ }                                    │          │
│  └──────────┬───────────────────────────┘          │
│             │                                       │
│  4. Client Store Tokens                            │
│  ┌──────────────────────────────────────┐          │
│  │ token → localStorage                 │          │
│  │ refresh_token → secure httpOnly       │          │
│  │   cookie                             │          │
│  └──────────┬───────────────────────────┘          │
│             │                                       │
│  5. Each Request                                   │
│  ┌──────────────────────────────────────┐          │
│  │ Header: Authorization: Bearer <JWT>  │          │
│  └──────────┬───────────────────────────┘          │
│             │                                       │
│  6. Token Expired?                                 │
│  ┌──────────────────────────────────────┐          │
│  │ YES: POST /auth/refresh-token        │          │
│  │ ├─ Cookie: refresh_token             │          │
│  │ └─ Response: new JWT                 │          │
│  │                                      │          │
│  │ NO: Continue (request succeeds)      │          │
│  └──────────────────────────────────────┘          │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### 5.2 JWT Payload Structure

```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "sub": "user_id_123",
    "username": "nguyen_van_a",
    "email": "a@example.com",
    "is_admin": false,
    "roles": ["customer"],
    "iat": 1704067200,
    "exp": 1704070800,
    "aud": "freshfood-app"
  },
  "signature": "..."
}
```

### 5.3 Authorization (Role-Based Access Control)

```python
# Roles & Permissions Matrix
┌────────────────┬──────────┬──────────┬──────────┬──────────┐
│ Resource       │ Customer │ Moderator│ Manager  │ Admin    │
├────────────────┼──────────┼──────────┼──────────┼──────────┤
│ View Products  │ ✅       │ ✅       │ ✅       │ ✅       │
│ Create Order   │ ✅       │ ✅       │ ✅       │ ✅       │
│ View My Orders │ ✅       │ ✅       │ ✅       │ ✅       │
│ View All Orders│ ❌       │ ✅       │ ✅       │ ✅       │
│ Update Order   │ ❌       │ ✅       │ ✅       │ ✅       │
│ Scan Product   │ ✅       │ ✅       │ ✅       │ ✅       │
│ Manage Products│ ❌       │ ❌       │ ✅       │ ✅       │
│ Manage Users   │ ❌       │ ❌       │ ❌       │ ✅       │
│ View Analytics │ ❌       │ ❌       │ ✅       │ ✅       │
│ System Config  │ ❌       │ ❌       │ ❌       │ ✅       │
└────────────────┴──────────┴──────────┴──────────┴──────────┘
```

### 5.4 Security Best Practices

```
1. Password Hashing
   - Algorithm: bcrypt (cost factor: 12)
   - Never store plain passwords
   - Example: $2b$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUm

2. JWT Secret
   - Use environment variable (not hardcoded)
   - Min 32 characters
   - Rotate annually
   - SECRET_KEY = os.getenv("JWT_SECRET_KEY")

3. CORS Configuration
   - Allow only trusted domains
   - Allowed: http://localhost:3001, https://freshfood.vn
   - Denied: http://malicious.com

4. Rate Limiting
   - 100 requests/minute per IP for login
   - 1000 requests/hour per user for API calls
   - Use Redis for tracking

5. Input Validation
   - Sanitize all user inputs (XSS prevention)
   - Validate email format
   - Validate phone number format
   - Limit string lengths
   - Use Pydantic for automatic validation

6. HTTPS Only
   - Enforce SSL/TLS
   - HSTS headers
   - Secure cookies (httpOnly, SameSite)

7. API Key for External Integrations
   - Generate unique API keys per client
   - Rotate every 90 days
   - Store hash, not plain key

8. Logging & Monitoring
   - Log all auth attempts
   - Alert on suspicious activity
   - Track failed login attempts
   - Lock account after 5 failed attempts (15 min)
```

---

## 6. LUỒNG XỬ LÝ CHÍNH

### 6.1 Luồng Đặt Hàng (Order Flow)

```
Customer Order Flow
────────────────────────────────────

┌─────────────────────────────────────┐
│  1. Customer Browse Products        │
│     GET /api/v1/products            │
│     (view product details, reviews) │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  2. Customer Add to Cart            │
│     (stored in frontend LocalStorage)
│     (or POST /api/v1/cart if using  │
│      server-side cart)              │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  3. Review Cart & Checkout          │
│     - Validate quantities           │
│     - Calculate total               │
│     - Verify stock availability     │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  4. Create Order                    │
│     POST /api/v1/orders             │
│     Request: {                      │
│       items: [{product_id,qty},...],│
│       shipping_address,             │
│       payment_method                │
│     }                               │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  5. Server-side Processing:         │
│     a) Validate stock               │
│     b) Lock inventory               │
│     c) Create ORDER record          │
│     d) Create ORDER_ITEMS records   │
│     e) Calculate discounts (if any) │
│     f) Generate invoice             │
│     g) Reserve items (stock -= qty) │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  6. Initiate Payment                │
│     POST /api/v1/orders/:id/payment │
│     - Stripe redirect (if card)     │
│     - Bank transfer (if bank)       │
│     - COD (cash on delivery)        │
└──────────────┬──────────────────────┘
               │
        ┌──────┴──────┐
        │             │
┌───────▼────────┐  ┌─▼───────────────┐
│  Payment OK    │  │ Payment Failed  │
├────────────────┤  ├─────────────────┤
│ status: paid   │  │ Release stock   │
│ Confirm order  │  │ Notify customer │
│ Send email     │  │ Retry payment   │
└────────┬───────┘  └─────────────────┘
         │
┌────────▼────────────────────────────┐
│  7. Queue Order Event               │
│     - Emit event: "order.created"   │
│     - Message Queue: {              │
│       order_id, user_id, items, ... │
│     }                               │
└────────┬────────────────────────────┘
         │
┌────────▼────────────────────────────┐
│  8. Order Confirmation              │
│     - Send email to customer        │
│     - Send SMS (optional)           │
│     - Notify admin dashboard        │
│     - Update order status: confirmed│
└────────┬────────────────────────────┘
         │
┌────────▼────────────────────────────┐
│  9. Fulfillment (Admin/Warehouse)   │
│     - Pick items from warehouse     │
│     - Pack items                    │
│     - Generate shipping label       │
│     - Update order: "shipped"       │
│     - Send tracking number          │
└────────┬────────────────────────────┘
         │
┌────────▼────────────────────────────┐
│ 10. Delivery                        │
│     - Courier updates tracking      │
│     - Order status: "delivered"     │
│     - Send delivery confirmation    │
│     - Allow customer reviews        │
└────────┬────────────────────────────┘
         │
┌────────▼────────────────────────────┐
│ 11. Post-Order                      │
│     - Request review & feedback     │
│     - Process returns/refunds       │
│     - Collect customer data         │
└─────────────────────────────────────┘
```

### 6.2 Luồng Quét Thực Phẩm (Scan Flow)

```
AI Freshness Scan Flow
──────────────────────

┌───────────────────────────────────┐
│ 1. Customer Initiates Scan        │
│    Frontend: Open camera or        │
│    upload image                    │
└──────────────┬────────────────────┘
               │
┌──────────────▼────────────────────┐
│ 2. Capture/Upload Image           │
│    - Compress image (max 5MB)      │
│    - Convert to base64 or          │
│      multipart form data           │
└──────────────┬────────────────────┘
               │
┌──────────────▼────────────────────┐
│ 3. Send to Backend                │
│    POST /api/v1/scans             │
│    {                              │
│      product_id,                  │
│      image_base64,                │
│      device_info: {               │
│        device_type: "mobile",     │
│        os: "iOS",                 │
│        location: "36.XXX,105.YYY" │
│      }                            │
│    }                              │
└──────────────┬────────────────────┘
               │
┌──────────────▼────────────────────┐
│ 4. Server Validation              │
│    - Check if product exists       │
│    - Validate image format/size    │
│    - Rate limit check (per user)   │
│    - Check user tier (free users   │
│      limited to N scans/day)       │
└──────────────┬────────────────────┘
               │
┌──────────────▼────────────────────┐
│ 5. Save Image to S3/MinIO         │
│    storage/scans/{date}/{uuid}.jpg│
│    Return: scan_image_url         │
└──────────────┬────────────────────┘
               │
┌──────────────▼────────────────────┐
│ 6. Queue AI Processing Task       │
│    - Add to Celery queue          │
│    - Task: "process_scan"         │
│    - Parameters: scan_id,         │
│      image_url, product_id        │
└──────────────┬────────────────────┘
               │
│ Response (immediate):             │
│ {                                 │
│   scan_id: "scan_123",            │
│   status: "processing"            │
│ }                                 │
│                                   │
└──────────────┬────────────────────┘
               │
        ┌──────────────────────────┐
        │  Background Job (Celery) │
        └────────┬─────────────────┘
                 │
┌────────────────▼──────────────────┐
│ 7. Call AI Model (External API)   │
│    POST https://ai.freshfood.io   │
│        /v1/scan                   │
│    {                              │
│      image_url,                   │
│      model_version: "v2.1",       │
│      confidence_threshold: 0.85   │
│    }                              │
└────────────────┬─────────────────┘
                 │
┌────────────────▼──────────────────┐
│ 8. AI Model Returns Results       │
│    {                              │
│      freshness_score: 87.5 (0-100)│
│      confidence: 0.94 (0-1)       │
│      quality_metrics: {           │
│        color_saturation: 0.85,    │
│        firmness_index: 8.2/10,    │
│        smell_profile: "fresh",    │
│        expected_shelf_life: "5d"  │
│      },                           │
│      ai_model_version: "v2.1",    │
│      processing_time_ms: 450      │
│    }                              │
└────────────────┬─────────────────┘
                 │
┌────────────────▼──────────────────┐
│ 9. Store Results in Database      │
│    INSERT INTO scan_results:      │
│    - freshness_score: 87.5        │
│    - confidence: 0.94             │
│    - quality_metrics (JSON)       │
│    - status: "valid"              │
│    - created_at: now()            │
│    - ai_model_version: "v2.1"     │
│                                   │
│    UPDATE products:               │
│    - avg_freshness = avg of       │
│      last 10 scans                │
│    - last_scan_date = now()       │
└────────────────┬─────────────────┘
                 │
┌────────────────▼──────────────────┐
│ 10. Send WebSocket Update to      │
│     Connected Frontend            │
│     Event: "scan_complete"        │
│     Data: {                       │
│       scan_id,                    │
│       freshness_score: 87.5,      │
│       recommendation: "Fresh...", │
│       confidence: 0.94,           │
│       quality_metrics             │
│     }                             │
└────────────────┬─────────────────┘
                 │
┌────────────────▼──────────────────┐
│ 11. Frontend Displays Results     │
│     - Show freshness score (%)    │
│     - Display quality breakdown   │
│     - Show shelf life estimate    │
│     - Recommendation text         │
│     - "Add to Cart" button        │
│                                   │
│     Color Coding:                 │
│     90-100: ✅ Excellent (Green)  │
│     70-89:  ⚠️  Good (Yellow)     │
│     50-69:  ⚠️  Fair (Orange)     │
│     <50:   ❌ Poor (Red)          │
└────────────────┬─────────────────┘
                 │
┌────────────────▼──────────────────┐
│ 12. Optional: Save Scan History   │
│     - User can view past scans    │
│     - Track product trends        │
│     - Compare scans over time     │
│     - Get smart recommendations   │
└─────────────────────────────────┘
```

### 6.3 Luồng Quản Lý Admin (Admin Dashboard)

```
Admin Management Flow
──────────────────────

┌──────────────────────────────┐
│ 1. Admin Dashboard           │
│    GET /api/v1/admin/       │
│    dashboard                 │
│    Shows:                    │
│    - Overview cards (KPIs)   │
│    - Charts (revenue, orders)│
│    - Alerts                  │
│    - Quick actions           │
└──────────────┬───────────────┘
               │
     ┌─────────┼─────────────┬────────────┐
     │         │             │            │
     ▼         ▼             ▼            ▼
┌────────┐ ┌────────┐  ┌─────────┐  ┌────────┐
│ Users  │ │Products│  │ Orders  │  │ Analytics
│ Manage │ │Manage  │  │ Manage  │  │& Reports
└───┬────┘ └───┬────┘  └────┬────┘  └────┬───┘
    │          │            │             │
┌───▼──────────▼────────────▼─────────────▼─┐
│                                            │
│  USER MANAGEMENT                           │
│  ├─ GET /admin/users (list with filters)   │
│  ├─ PUT /admin/users/:id (edit: role,     │
│  │  is_active, permissions)               │
│  ├─ DELETE /admin/users/:id (soft delete) │
│  └─ POST /admin/users/:id/send-message    │
│     (notify user)                         │
│                                            │
│  PRODUCT MANAGEMENT                        │
│  ├─ POST /admin/products (create)         │
│  │  ├─ name, description, price, stock    │
│  │  ├─ category_id, image_url             │
│  │  ├─ origin, expiry_date                │
│  │  └─ auto-generate SKU                  │
│  ├─ PUT /admin/products/:id (edit)        │
│  │  ├─ Can update price/stock (live)      │
│  │  ├─ Upload new image                   │
│  │  └─ History tracking (audit log)       │
│  ├─ DELETE /admin/products/:id (soft del) │
│  ├─ POST /admin/products/:id/image        │
│  │  └─ Upload & crop preview              │
│  └─ GET /admin/products (with analytics)  │
│     ├─ Views/clicks, conversion rate      │
│     └─ Avg freshness from scans           │
│                                            │
│  ORDER MANAGEMENT                          │
│  ├─ GET /admin/orders (filter by status)  │
│  ├─ GET /admin/orders/:id (full details)  │
│  ├─ PUT /admin/orders/:id/status (update) │
│  │  ├─ confirmed → shipped → delivered    │
│  │  ├─ Send notifications at each step    │
│  │  └─ Generate shipping labels           │
│  ├─ PUT /admin/orders/:id/cancel          │
│  │  ├─ Release inventory                  │
│  │  ├─ Process refund                     │
│  │  └─ Send cancellation email            │
│  └─ POST /admin/orders/:id/refund         │
│     ├─ Initiate refund to payment method  │
│     ├─ Reason: damaged, lost, etc         │
│     └─ Audit trail for disputes           │
│                                            │
│  ANALYTICS & REPORTS                       │
│  ├─ GET /admin/dashboard/stats            │
│  │  ├─ Total revenue, AVG order value     │
│  │  ├─ Conversion rate, retention         │
│  │  ├─ Customer growth, churn rate        │
│  │  ├─ Top products, categories           │
│  │  └─ Geographic distribution            │
│  ├─ GET /admin/reports/scans              │
│  │  ├─ Total scans, AI accuracy           │
│  │  ├─ Freshness trends by product        │
│  │  ├─ User engagement metrics            │
│  │  └─ Device/platform breakdown          │
│  └─ GET /admin/reports/export             │
│     ├─ PDF, CSV, Excel export             │
│     ├─ Custom date ranges                 │
│     └─ Schedule recurring reports         │
│                                            │
│  AUDIT & COMPLIANCE                        │
│  ├─ GET /admin/audit-logs (all actions)   │
│  ├─ Track who changed what, when          │
│  ├─ Rollback capability (limited)         │
│  └─ Compliance reports (GDPR, etc)        │
│                                            │
└────────────────────────────────────────────┘
```

---

## 7. TÍCH HỢP THIẾT BỊ/API QUÉT THỰC PHẨM

### 7.1 Architecture Integration

```
┌─────────────────────────────────────────┐
│     FreshFood Backend                    │
│  ┌────────────────────────────────────┐  │
│  │  Scan Service (FastAPI)            │  │
│  │                                    │  │
│  │  1. Image Processing Module        │  │
│  │     ├─ Image resize/normalize      │  │
│  │     ├─ Format conversion (JPEG)    │  │
│  │     ├─ Quality check               │  │
│  │     └─ Compression                 │  │
│  │                                    │  │
│  │  2. Queue Manager (Celery)         │  │
│  │     ├─ Add tasks to queue          │  │
│  │     ├─ Track task status           │  │
│  │     └─ Retry logic                 │  │
│  │                                    │  │
│  │  3. API Client                     │  │
│  │     ├─ Call external AI service    │  │
│  │     ├─ Handle timeouts (30s)       │  │
│  │     ├─ Retry with backoff          │  │
│  │     └─ Error handling              │  │
│  │                                    │  │
│  │  4. Result Parser & Validator      │  │
│  │     ├─ Parse AI response           │  │
│  │     ├─ Validate scores (0-100)     │  │
│  │     ├─ Check confidence (0-1)      │  │
│  │     └─ Generate recommendations    │  │
│  │                                    │  │
│  │  5. Storage Manager                │  │
│  │     ├─ Save to S3/MinIO            │  │
│  │     ├─ Save metadata to DB         │  │
│  │     └─ Index for search            │  │
│  │                                    │  │
│  │  6. WebSocket Notifier             │  │
│  │     ├─ Push results to frontend    │  │
│  │     ├─ Real-time updates           │  │
│  │     └─ Connection management       │  │
│  └────────────────────────────────────┘  │
└─────────────┬──────────────────────────────┘
              │
              │ HTTP (TLS 1.3)
              │
     ┌────────▼────────┐
     │                 │
┌────▼──────────┐  ┌───▼──────────────┐
│ External AI   │  │  Mobile Device   │
│ API Provider  │  │  (Camera Input)  │
│               │  │                  │
│ Endpoint:     │  │ - iOS/Android    │
│ https://ai.   │  │ - Device info    │
│ freshfood.io/ │  │ - Location       │
│ v1/scan       │  │ - Camera quality │
│               │  └──────────────────┘
│ Expected      │
│ Response:     │
│ {             │
│   freshness   │
│   _score,     │
│   confidence, │
│   metrics,    │
│   version     │
│ }             │
└───────────────┘
```

### 7.2 External AI API Integration

```python
# Example: Integration với AI API Service

class FreshnessDetectionService:
    def __init__(self):
        self.api_endpoint = os.getenv("AI_API_ENDPOINT")
        self.api_key = os.getenv("AI_API_KEY")
        self.timeout = 30  # seconds
        self.model_version = "v2.1"
    
    async def scan_product(
        self,
        image_url: str,
        product_id: int,
        device_info: dict
    ) -> dict:
        """
        Call external AI API to analyze product freshness
        
        Returns:
        {
            "freshness_score": 87.5,  # 0-100
            "confidence": 0.94,        # 0-1.0
            "quality_metrics": {
                "color_saturation": 0.85,
                "firmness": 8.2,
                "smell_profile": "fresh",
                "expected_shelf_life": "5 days",
                "ripeness_level": 2.5  # 1-4 scale
            },
            "ai_model_version": "v2.1",
            "processing_time_ms": 450,
            "recommendation": "Fresh, good to buy"
        }
        """
        
        try:
            # Prepare request
            payload = {
                "image_url": image_url,
                "product_id": product_id,
                "device_info": device_info,
                "model_version": self.model_version,
                "confidence_threshold": 0.85
            }
            
            # Call external API
            async with aiohttp.ClientSession() as session:
                response = await session.post(
                    f"{self.api_endpoint}/v1/scan",
                    json=payload,
                    headers={"Authorization": f"Bearer {self.api_key}"},
                    timeout=aiohttp.ClientTimeout(total=self.timeout)
                )
                
                if response.status != 200:
                    raise Exception(f"API Error: {response.status}")
                
                result = await response.json()
            
            # Validate result
            self._validate_result(result)
            
            # Enrich with local data
            product = await self.db.get_product(product_id)
            result["product_name"] = product.name
            result["origin"] = product.origin
            
            # Generate recommendation text
            result["recommendation"] = self._generate_recommendation(
                result["freshness_score"],
                result["confidence"],
                product
            )
            
            return result
            
        except asyncio.TimeoutError:
            return {
                "error": "API timeout",
                "status": "error",
                "message": "Quét quá lâu, vui lòng thử lại"
            }
        except Exception as e:
            logger.error(f"Scan error: {str(e)}")
            return {
                "error": str(e),
                "status": "error",
                "message": "Lỗi khi quét sản phẩm"
            }
    
    def _validate_result(self, result: dict):
        """Validate AI response"""
        assert "freshness_score" in result
        assert 0 <= result["freshness_score"] <= 100
        assert 0 <= result["confidence"] <= 1.0
        assert "quality_metrics" in result
    
    def _generate_recommendation(
        self,
        freshness: float,
        confidence: float,
        product
    ) -> str:
        """Generate user-friendly recommendation"""
        
        if freshness >= 90 and confidence >= 0.9:
            return f"✅ Tuyệt vời! Sản phẩm rất sạch và tươi, bạn nên mua ngay"
        elif freshness >= 75 and confidence >= 0.85:
            return f"✅ Tốt! Sản phẩm sạch, thích hợp để sử dụng"
        elif freshness >= 60 and confidence >= 0.8:
            return f"⚠️  Trung bình. Sản phẩm còn dùng được nhưng gần hết hạn sử dụng"
        else:
            return f"❌ Không khuyến khích. Sản phẩm có thể đã bị ảnh hưởng, nên chọn sản phẩm khác"


# Usage in endpoint
@router.post("/api/v1/scans")
async def create_scan(
    request: ScanRequest,
    db: Database = Depends(get_db),
    user: User = Depends(verify_token)
):
    # Save image to S3
    image_url = await s3_service.upload(request.image_data)
    
    # Create DB record
    scan = await db.create_scan(
        product_id=request.product_id,
        user_id=user.id,
        image_url=image_url,
        device_info=request.device_info,
        status="processing"
    )
    
    # Queue async task
    task = celery_app.send_task(
        "tasks.process_scan",
        args=[scan.id, image_url, request.product_id],
        queue="scans"
    )
    
    return {
        "scan_id": scan.id,
        "status": "processing",
        "task_id": task.id
    }


# Background Celery Task
@celery_app.task(name="tasks.process_scan")
def process_scan(scan_id: int, image_url: str, product_id: int):
    """Background job to call AI API"""
    
    try:
        # Call AI service
        ai_result = asyncio.run(
            freshness_service.scan_product(
                image_url=image_url,
                product_id=product_id,
                device_info={...}
            )
        )
        
        # Save results to DB
        db.update_scan(
            scan_id=scan_id,
            freshness_score=ai_result["freshness_score"],
            confidence=ai_result["confidence"],
            quality_metrics=ai_result["quality_metrics"],
            status="completed"
        )
        
        # Update product average
        db.update_product_average_freshness(product_id)
        
        # Notify via WebSocket
        ws_manager.broadcast(
            event="scan_complete",
            data={
                "scan_id": scan_id,
                "result": ai_result
            }
        )
        
    except Exception as e:
        db.update_scan(scan_id=scan_id, status="error", error_msg=str(e))
        logger.error(f"Scan processing failed: {e}")
```

### 7.3 Fallback & Error Handling

```python
class ScanService:
    async def scan_with_fallback(self, image_url, product_id):
        """Scan with fallback logic"""
        
        try:
            # Try primary AI API
            result = await self.call_ai_api(image_url, product_id)
            return result
            
        except requests.Timeout:
            # Try backup API endpoint
            try:
                result = await self.call_backup_ai_api(image_url, product_id)
                return result
            except:
                pass
        
        # Fallback: Use heuristic scoring
        return self.fallback_heuristic_score(product_id)
    
    def fallback_heuristic_score(self, product_id):
        """Generate score based on DB history"""
        # Get last 10 scans of this product
        recent_scans = self.db.get_recent_scans(product_id, limit=10)
        avg_score = sum(s.score for s in recent_scans) / len(recent_scans)
        
        return {
            "freshness_score": avg_score,
            "confidence": 0.5,  # Lower confidence
            "status": "estimated",
            "note": "Giá trị dự báo dựa trên lịch sử. Quét lại để cập nhật"
        }
```

---

## 8. PERFORMANCE & SCALABILITY

### 8.1 Caching Strategy

```python
# Redis Caching Tiers

Cache Layer Hierarchy:
├─ L1: Browser Cache (frontend)
│  ├─ Products list: 5 min
│  ├─ Product details: 10 min
│  └─ User profile: 15 min
│
├─ L2: CDN Cache (CloudFlare)
│  ├─ Static images: 1 year
│  ├─ API responses: 1 min
│  └─ Large JSON: 5 min
│
└─ L3: Redis Cache (backend)
   ├─ Products: 1 hour
   │  └─ Key: "products:{id}"
   ├─ Categories: 24 hours
   │  └─ Key: "categories:list"
   ├─ User sessions: 30 days
   │  └─ Key: "session:{token}"
   ├─ Auth tokens: 15 min
   │  └─ Key: "token:{user_id}"
   ├─ Recent scans: 1 hour
   │  └─ Key: "scans:{product_id}:recent"
   └─ Admin stats: 5 min
      └─ Key: "admin:dashboard"

Cache Invalidation:
├─ Time-based: Auto expire
├─ Event-based: Invalidate on update
└─ Manual: Admin purge cache button
```

### 8.2 Database Indexing

```sql
-- Products table
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_price ON products(price);
CREATE INDEX idx_products_avg_freshness ON products(avg_freshness);
CREATE INDEX idx_products_sku ON products(sku);

-- Orders table
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);

-- Order items table
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);

-- Scans table
CREATE INDEX idx_scans_product_id ON scan_results(product_id);
CREATE INDEX idx_scans_freshness ON scan_results(freshness_score);
CREATE INDEX idx_scans_created_at ON scan_results(created_at DESC);
CREATE INDEX idx_scans_confidence ON scan_results(confidence);
CREATE COMPOSITE INDEX idx_scans_product_date ON scan_results(product_id, created_at DESC);

-- Audit logs (for fast filtering)
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
```

### 8.3 Load Balancing & Horizontal Scaling

```
                    ┌─────────────────────┐
                    │  Client Requests    │
                    └──────────────┬──────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │  Nginx Load Balancer        │
                    │  (Round-robin, Sticky)      │
                    └──────┬──────────────┬───────┘
                           │              │
                 ┌─────────▼──┐    ┌──────▼──────┐
                 │ FastAPI    │    │  FastAPI    │
                 │ Instance 1 │    │ Instance 2  │
                 │ :8001      │    │ :8002       │
                 └─────┬──────┘    └──────┬──────┘
                       │                 │
                       └────────┬────────┘
                                │
                    ┌───────────▼────────────┐
                    │  Redis (Cache)         │
                    │  PostgreSQL (DB)       │
                    │  S3 (Storage)          │
                    └────────────────────────┘

Deployment:
├─ Docker Compose (Dev): 1 instance
├─ Kubernetes (Prod):
│  ├─ 3-5 API replicas
│  ├─ Horizontal Pod Autoscaler
│  │  └─ CPU: 70%, Memory: 80%
│  ├─ Resource limits
│  │  └─ CPU: 1000m, Memory: 1Gi
│  └─ Health checks (liveness, readiness)
└─ Service mesh (optional): Istio for observability
```

---

## 9. MONITORING & LOGGING

### 9.1 Key Metrics to Track

```
Application Metrics:
├─ API Response Time (p50, p95, p99)
├─ Request Rate (req/sec)
├─ Error Rate (5xx, 4xx)
├─ Database Query Time
├─ Cache Hit Rate
├─ Queue Length (Celery)
├─ Scan Success Rate
├─ AI API Latency
└─ Payment Processing Rate

Business Metrics:
├─ Orders Created/Day
├─ Conversion Rate
├─ Average Order Value
├─ Customer Lifetime Value
├─ Churn Rate
├─ Total Scans
├─ User Retention
└─ Revenue per Day

Infrastructure Metrics:
├─ CPU Usage (%)
├─ Memory Usage (%)
├─ Disk Space (%)
├─ Network Bandwidth
├─ Database Connection Pool
└─ Redis Memory Usage
```

### 9.2 Logging Strategy

```python
import logging
from pythonjsonlogger import jsonlogger

# JSON Logging untuk ELK Stack
logger = logging.getLogger()
handler = logging.StreamHandler()
formatter = jsonlogger.JsonFormatter()
handler.setFormatter(formatter)
logger.addHandler(handler)

# Log Levels:
# DEBUG: Detailed diagnostic info
# INFO: General informational messages
# WARNING: Warning messages (unusual but not error)
# ERROR: Error events (serious problem)
# CRITICAL: Critical error (system unusable)

# Usage:
logger.info("Order created", extra={
    "order_id": 123,
    "user_id": 456,
    "total": 250000,
    "payment_method": "card"
})

logger.error("Payment failed", extra={
    "order_id": 123,
    "error_code": "PAYMENT_DECLINED",
    "error_message": "Insufficient funds",
    "status_code": 400
})

# Centralized logging (ELK Stack):
# Filebeat → Elasticsearch ← Kibana
```

---

## 10. DEPLOYMENT & CI/CD

### 10.1 CI/CD Pipeline

```yaml
# GitHub Actions Workflow (.github/workflows/deploy.yml)

name: Deploy FreshFood Backend

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: test
      redis:
        image: redis:7
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          pip install pytest pytest-cov
      
      - name: Run tests
        run: pytest --cov=app tests/
      
      - name: Lint code
        run: |
          flake8 app --max-line-length=100
          black --check app
      
      - name: Type checking
        run: mypy app
  
  build:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Build Docker image
        run: |
          docker build -t freshfood-api:${{ github.sha }} .
          docker tag freshfood-api:${{ github.sha }} freshfood-api:latest
      
      - name: Push to Docker Hub
        run: |
          docker login -u ${{ secrets.DOCKER_USER }} -p ${{ secrets.DOCKER_PASS }}
          docker push freshfood-api:${{ github.sha }}
          docker push freshfood-api:latest
  
  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - name: Deploy to Kubernetes
        run: |
          kubectl set image deployment/freshfood-api \
            freshfood-api=freshfood-api:${{ github.sha }} \
            --record
      
      - name: Verify deployment
        run: |
          kubectl rollout status deployment/freshfood-api
      
      - name: Smoke tests
        run: |
          curl -X GET https://api.freshfood.local/health
```

### 10.2 Docker & Kubernetes

```dockerfile
# Dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

```yaml
# Kubernetes Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: freshfood-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: freshfood-api
  template:
    metadata:
      labels:
        app: freshfood-api
    spec:
      containers:
      - name: freshfood-api
        image: freshfood-api:latest
        ports:
        - containerPort: 8000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-secrets
              key: url
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: api-secrets
              key: jwt-secret
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8000
          initialDelaySeconds: 5
          periodSeconds: 5
```

---

## 11. BẢNG TÓM TẮT KIẾN TRÚC

```
┌────────────────────────────────────────────────────────────┐
│                   ARCHITECTURE SUMMARY                       │
├────────────────────────────────────────────────────────────┤
│                                                              │
│  Approach:          MONOLITH (phân tách Domain rõ ràng)     │
│  Framework:         FastAPI (Python)                         │
│  Database:          PostgreSQL 14+                           │
│  Cache:             Redis 7+                                 │
│  Queue:             RabbitMQ + Celery                        │
│  Message:           WebSocket (real-time updates)            │
│  File Storage:      S3-compatible (MinIO/AWS)                │
│  Authentication:    JWT + OAuth2 (optional)                  │
│  Payment:           Stripe / VNPay                           │
│  Email:             SendGrid / AWS SES                       │
│  External APIs:     AI Scanning Service                      │
│  Containerization:  Docker + Docker Compose (dev)            │
│  Orchestration:     Kubernetes (prod)                        │
│  CI/CD:             GitHub Actions                           │
│  Monitoring:        Prometheus + Grafana                     │
│  Logging:           ELK Stack (Elasticsearch, Kibana)        │
│  API Docs:          OpenAPI 3.0 (Swagger UI)                 │
│                                                              │
└────────────────────────────────────────────────────────────┘
```

---

## 12. NEXT STEPS & TIMELINE

**Phase 1 (0-4 weeks): MVP**
- ✅ Database schema & migrations
- ✅ User authentication (JWT)
- ✅ Product CRUD APIs
- ✅ Order creation & management
- ✅ Basic admin dashboard
- ⚠️ Scan integration (mock initially)

**Phase 2 (4-8 weeks): Real Scan Integration**
- [ ] AI API integration (real)
- [ ] Background job processing (Celery)
- [ ] WebSocket real-time updates
- [ ] Image upload & storage (S3)
- [ ] Advanced analytics

**Phase 3 (8-12 weeks): Scale & Polish**
- [ ] Performance optimization
- [ ] Caching strategy (Redis)
- [ ] Kubernetes deployment
- [ ] Load testing & optimization
- [ ] Admin reporting

**Phase 4 (12+ months): Microservices (if needed)**
- [ ] Extract Scan Service
- [ ] Extract Order Service
- [ ] Extract Analytics Service
- [ ] Service mesh (Istio)

---

**Tài liệu này sẽ được cập nhật theo tiến độ phát triển.**

