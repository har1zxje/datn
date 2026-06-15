# FreshFood Backend - Phase 1 (MVP)

## Project Overview

FreshFood AI is an e-commerce platform for fresh produce with **integrated AI freshness detection**. This backend implements:

- ✅ **User Authentication**: JWT + Refresh Token + OAuth2 ready
- ✅ **Product Management**: Categories, filtering, search, reviews
- ✅ **Order Processing**: Cart → Checkout → Payment → Shipping
- ✅ **AI Scans**: Freshness detection with mock implementation
- ✅ **Admin Dashboard**: User/Product/Order management (Phase 1 basic)

**Tech Stack:**
- FastAPI (Python web framework)
- PostgreSQL (production database)
- SQLite (dev fallback)
- Redis (caching, sessions - Phase 2)
- Pydantic (data validation)

---

## Quick Start

### 1️⃣ Prerequisites

```bash
# Python 3.9+
python --version

# PostgreSQL & Redis (via Docker Compose)
docker-compose up -d
```

### 2️⃣ Install Dependencies

```bash
# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate

# Activate (Mac/Linux)
source venv/bin/activate

# Install packages
pip install -r requirements.txt
```

Use `python -m ...` for project commands after activation. That avoids picking up a global `uvicorn` executable from a different Python installation.

### 3️⃣ Setup Environment

```bash
# Copy example config
cp .env.example .env

# Edit .env with your settings
# Default for local dev should work as-is
```

### 4️⃣ Run Server

```bash
# Development (auto-reload)
python -m uvicorn main:app --reload --port 8001

# Production
python -m uvicorn main:app --host 0.0.0.0 --port 8001
```

Server running at: **http://localhost:8001**
- API Docs: http://localhost:8001/docs
- ReDoc: http://localhost:8001/redoc

---

## Database Setup

### Option A: PostgreSQL (Production)

```bash
# Start PostgreSQL via docker-compose
docker-compose up -d postgres

# Wait for health check (~10 seconds)
# Tables auto-created on first server run
```

### Option B: SQLite (Dev, SQLite fallback via .env)

```bash
# Just works! No setup needed
# Auto-creates freshfood.db
```

---

## API Endpoints

### Authentication
```
POST   /api/auth/register        - Register new user
POST   /api/auth/login           - Login with email + password
POST   /api/auth/refresh         - Refresh access token
GET    /api/auth/me              - Get current user profile
PUT    /api/auth/me              - Update profile
POST   /api/auth/logout          - Logout (client-side)
```

### Products
```
GET    /api/products              - List products (with filters)
GET    /api/products/{id}         - Get product details
GET    /api/products/categories   - List categories
GET    /api/products/{id}/reviews - List reviews
POST   /api/products/{id}/reviews - Create review (auth required)
```

### Orders
```
POST   /api/orders                - Create order (auth required)
GET    /api/orders                - List user's orders (auth required)
GET    /api/orders/{id}           - Get order details (auth required)
PUT    /api/orders/{id}           - Update order (auth required)
POST   /api/orders/{id}/cancel    - Cancel pending order (auth required)
```

### Scans (AI Freshness Detection)
```
POST   /api/scans                 - Create scan (auth required, standards + visual v2)
POST   /api/scans/quick-analyze   - Quick upload/url scan (no auth, FE-friendly)
GET    /api/scans                 - List user's scans (auth required)
GET    /api/scans/{id}            - Get scan result (auth required)
POST   /api/scans/{id}/feedback   - Submit feedback (auth required)
GET    /api/products/{id}/scans   - Public stats for product
```

### Admin (Phase 1 basic)
```
GET    /api/admin/dashboard       - Admin statistics
GET    /api/admin/users           - List all users
GET    /api/admin/orders          - List all orders
```

---

## Testing APIs

### Using cURL

```bash
# Register
curl -X POST "http://localhost:8001/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe",
    "email": "john@example.com",
    "password": "password123",
    "full_name": "John Doe",
    "phone": "+84912345678"
  }'

# Login
curl -X POST "http://localhost:8001/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'

# Get products
curl "http://localhost:8001/api/products?skip=0&limit=20"

# Create order (requires auth)
curl -X POST "http://localhost:8001/api/orders" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [{"product_id": 1, "quantity": 2}],
    "shipping_address": "123 Main St",
    "shipping_city": "Ho Chi Minh City",
    "shipping_phone": "+84912345678",
    "payment_method": "cod"
  }'
```

### Using Swagger UI

1. Go to http://localhost:8001/docs
2. Click "Try it out" on any endpoint
3. Fill in parameters
4. Click "Execute"

---

## Project Structure

```
backend/
├── main.py                  # FastAPI app initialization
├── models.py                # SQLAlchemy ORM models (10 tables)
├── schemas.py               # Pydantic request/response schemas
├── database.py              # Database connection & session
├── requirements.txt         # Dependencies
├── .env                     # Development config (git ignored)
├── .env.example             # Config template
├── docker-compose.yml       # PostgreSQL + Redis setup
│
├── api/                     # API routes
│   ├── __init__.py
│   ├── auth.py              # Auth APIs (register, login, refresh)
│   ├── products.py          # Product & review APIs
│   ├── orders.py            # Order management APIs
│   ├── scans.py             # AI scan APIs (mock Phase 1)
│   └── admin.py             # Admin dashboard APIs
│
├── utils/                   # Utilities
│   ├── __init__.py
│   └── auth.py              # JWT, password hashing
│
└── migrations/              # (Phase 2: Alembic database migrations)
```

---

## Phase 1 Implementation Roadmap

### Week 1: Database & Auth ✅
- [x] PostgreSQL setup
- [x] 10 database tables designed
- [x] User registration & login
- [x] JWT token generation & refresh
- [x] Password hashing (bcrypt)

### Week 2: Products & Orders 🔄
- [ ] Product listing & filtering
- [ ] Product reviews system
- [ ] Order creation & management
- [ ] Order status tracking
- [ ] Inventory management

### Week 3: Scans & Admin
- [ ] AI scan API (mock backend → real Phase 2)
- [x] Visual spoilage quantification v2 (`A_hong/A_tong`) with manual-review gate
- [ ] Scan history & results
- [ ] Admin dashboard endpoints
- [ ] User/order/product administration
- [ ] Audit logging

### Week 4: Testing & Optimization
- [ ] Unit tests (pytest)
- [ ] Integration tests
- [ ] Performance optimization
- [ ] API documentation completeness
- [ ] Error handling & validation

---

## Development Guidelines

### Adding New Endpoints

1. Define Pydantic schema in `schemas.py`
2. Implement SQLAlchemy model in `models.py` (if needed)
3. Create route in `api/module.py`
4. Include router in `main.py`
5. Test in Swagger UI at `/docs`

### Database Queries

```python
from sqlalchemy.orm import Session
import models

# Get user by email
user = db.query(models.User).filter(models.User.email == "john@example.com").first()

# Get active products with filtering
products = db.query(models.Product).filter(
    models.Product.is_active == True,
    models.Product.quantity > 0
).order_by(models.Product.created_at.desc()).limit(20).all()

# Paginated query
total = db.query(models.Product).count()
products = db.query(models.Product).offset(skip).limit(limit).all()
```

### Authentication

```python
from api.auth import get_current_user
from fastapi import Depends

@router.get("/protected")
def protected_endpoint(current_user: models.User = Depends(get_current_user)):
    return {"user_id": current_user.id, "email": current_user.email}
```

---

## Common Issues & Fixes

### PostgreSQL Connection Error

```
Error: could not connect to server: Connection refused

Fix:
1. Check docker: docker ps
2. Start services: docker-compose up -d
3. Verify connection: psql -U freshfood_user -d freshfood_db -h localhost
```

### Port 8001 Already in Use

```bash
# Find process
lsof -i :8001

# Kill process
kill -9 <PID>

# Or use different port
uvicorn main:app --port 8002
```

### Token Expired Error

```
Error: Invalid or expired token

Fix:
1. Use refresh_token to get new access_token
2. POST /api/auth/refresh with your refresh_token
```

### `ModuleNotFoundError` for `slowapi` or other backend packages

```text
ModuleNotFoundError: No module named 'slowapi'
```

Fix:
1. Activate the backend virtualenv: `venv\Scripts\activate`
2. Reinstall dependencies: `python -m pip install -r requirements.txt`
3. Start the server with the same interpreter: `python -m uvicorn main:app --reload --port 8001`

---

## Next Steps (Phase 2)

- [ ] Real AI API integration (external service)
- [ ] Celery + RabbitMQ for async tasks
- [ ] WebSocket support for real-time scans
- [ ] Redis caching layer
- [ ] S3/MinIO for image storage
- [ ] Payment gateway integration
- [ ] Email notifications
- [ ] Monitoring & logging (ELK Stack)

---

## Support & Documentation

- **API Docs**: http://localhost:8001/docs
- **ReDoc**: http://localhost:8001/redoc
- **Architecture**: See `../BACKEND_ARCHITECTURE.md`
- **Database Schema**: See `../BACKEND_ARCHITECTURE.md` (Appendix A)

---

**Last Updated**: May 1, 2026  
**Backend Version**: 1.0.0 (Phase 1 MVP)
