# FreshFood AI — Nền tảng thực phẩm tươi thông minh

Hệ thống thương mại điện tử thực phẩm tươi sống tích hợp AI kiểm tra độ tươi, quản lý đơn hàng, theo dõi kho và bảng điều khiển admin. Backend xây dựng bằng FastAPI/Python, frontend bằng React/Vite, kết nối PostgreSQL và Redis.

---

## Mục lục

1. [Tổng quan](#1-tổng-quan)
2. [Yêu cầu hệ thống](#2-yêu-cầu-hệ-thống)
3. [Cài đặt](#3-cài-đặt)
4. [Cấu hình](#4-cấu-hình)
5. [Cách chạy](#5-cách-chạy)
6. [Cấu trúc thư mục](#6-cấu-trúc-thư-mục)
7. [API & Tài liệu](#7-api--tài-liệu)
8. [Lỗi thường gặp & cách xử lý](#8-lỗi-thường-gặp--cách-xử-lý)

---

## 1. Tổng quan

### Mô tả
FreshFood AI là ứng dụng web bán thực phẩm tươi sống với tính năng **kiểm tra độ tươi bằng AI** — người dùng chụp ảnh sản phẩm, hệ thống phân tích và xác nhận độ tươi. Ngoài ra còn có hệ thống thưởng khi xác nhận độ tươi sau khi nhận hàng.

### Tính năng chính
- Đăng ký / Đăng nhập (JWT) và đăng nhập Google OAuth
- Duyệt sản phẩm theo danh mục chợ
- Giỏ hàng, đặt hàng và theo dõi trạng thái
- **AI Freshness Scan** — quét ảnh để kiểm tra độ tươi sản phẩm
- Xác nhận độ tươi sau nhận hàng (FreshnessConfirm) kèm hệ thống điểm thưởng
- Quản lý địa chỉ giao hàng
- Bảng điều khiển Admin: quản lý sản phẩm, đơn hàng, người dùng, tồn kho, AI feedback
- Thông báo đẩy (push notifications)
- Chatbot tích hợp n8n workflow
- Giám sát hệ thống: Prometheus + Grafana + Loki

### Stack công nghệ

| Lớp | Công nghệ | Phiên bản |
|-----|-----------|-----------|
| Frontend | React + Vite | React 19, Vite 8 |
| Styling | TailwindCSS | 4.2 |
| Routing | React Router | 7.14 |
| HTTP Client | Axios | 1.15 |
| Backend | FastAPI + Uvicorn | 0.104.1 / 0.24.0 |
| ORM | SQLAlchemy + Alembic | 2.0.23 / 1.12.1 |
| Database | PostgreSQL | 15 |
| Cache | Redis | 7 |
| Auth | JWT (python-jose, PyJWT) + bcrypt | — |
| Email | fastapi-mail (SMTP) | 1.4.1 |
| ML/AI (frontend) | TensorFlow.js | 4.22 |
| Giám sát | Prometheus + Grafana + Loki | — |
| Workflow | n8n | — |

---

## 2. Yêu cầu hệ thống

### Phần mềm bắt buộc

| Phần mềm | Phiên bản tối thiểu | Kiểm tra |
|----------|---------------------|---------|
| Python | 3.10+ | `python --version` |
| Node.js | 20+ | `node --version` |
| npm | 9+ | `npm --version` |
| PostgreSQL | 15+ | `psql --version` |
| Redis | 7+ | `redis-server --version` |

### Phần mềm tuỳ chọn (cho Docker)

| Phần mềm | Ghi chú |
|----------|---------|
| Docker | 24+ |
| Docker Compose | 2.20+ |

> **Ghi chú:** PostgreSQL và Redis có thể chạy qua Docker thay vì cài trực tiếp — xem [mục 5.1](#51-chạy-dịch-vụ-phụ-thuộc-postgresql--redis).

---

## 3. Cài đặt

### Bước 1 — Clone repository

```bash
git clone <repository-url>
cd test1
```

### Bước 2 — Cài đặt Backend (Python)

```bash
cd backend

# Tạo môi trường ảo
python -m venv venv

# Kích hoạt môi trường ảo
# Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# Linux / macOS:
source venv/bin/activate

# Cài dependencies
pip install -r requirements.txt
```

### Bước 3 — Cài đặt Frontend (Node.js)

```bash
cd frontend
npm install
```

---

## 4. Cấu hình

### 4.1 Backend — file `backend/.env`

Tạo file `.env` trong thư mục `backend/` (copy từ `.env.example` nếu có):

```bash
cp backend/.env.example backend/.env
```

Chỉnh sửa nội dung file `backend/.env`:

```dotenv
# === Database ===
DATABASE_URL=postgresql://freshfood_user:freshfood_pass@localhost:5432/freshfood_db

# === Redis ===
REDIS_URL=redis://localhost:6379/0

# === JWT Authentication ===
SECRET_KEY=your_super_secret_key_change_in_production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# === Google OAuth (tuỳ chọn) ===
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# === Môi trường ===
ENVIRONMENT=development
DEBUG=True
LOG_LEVEL=INFO

# === Prometheus Metrics ===
ENABLE_METRICS=True

# === AI Freshness Scan (tuỳ chọn) ===
AI_SCAN_API_URL=https://api.example.com/scan
AI_SCAN_API_KEY=your_ai_api_key
ALLOW_PROVISIONAL_FRESHNESS_THRESHOLDS=False
OOD_THRESHOLD=0.60

# === Email SMTP (tuỳ chọn) ===
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USE_TLS=true
MAIL_USERNAME=your_email@gmail.com
MAIL_PASSWORD=your_app_password
MAIL_FROM=noreply@freshfood.ai
FRONTEND_URL=http://localhost:3000

# === CORS ===
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

#### Giải thích từng biến môi trường Backend

| Biến | Bắt buộc | Mô tả |
|------|----------|-------|
| `DATABASE_URL` | ✅ | Chuỗi kết nối PostgreSQL theo định dạng `postgresql://user:pass@host:port/db` |
| `REDIS_URL` | ✅ | Chuỗi kết nối Redis, dùng cho cache phiên và rate-limit |
| `SECRET_KEY` | ✅ | Khoá bí mật để ký JWT — **đổi thành chuỗi ngẫu nhiên dài trong production** |
| `ALGORITHM` | ✅ | Thuật toán ký JWT (mặc định `HS256`) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | ✅ | Thời gian hết hạn access token (phút) |
| `REFRESH_TOKEN_EXPIRE_DAYS` | ✅ | Thời gian hết hạn refresh token (ngày) |
| `GOOGLE_CLIENT_ID` | ❌ | Client ID từ Google Cloud Console (dùng đăng nhập Google) |
| `GOOGLE_CLIENT_SECRET` | ❌ | Client Secret từ Google Cloud Console |
| `ENVIRONMENT` | ✅ | Môi trường: `development` hoặc `production` |
| `DEBUG` | ✅ | `True` để bật SQL debug log, `False` trong production |
| `LOG_LEVEL` | ✅ | Mức log: `DEBUG`, `INFO`, `WARNING`, `ERROR` |
| `ENABLE_METRICS` | ❌ | `True` để bật endpoint `/metrics` cho Prometheus |
| `AI_SCAN_API_URL` | ❌ | URL API AI phân tích độ tươi bên ngoài |
| `AI_SCAN_API_KEY` | ❌ | API key để gọi dịch vụ AI |
| `ALLOW_PROVISIONAL_FRESHNESS_THRESHOLDS` | ❌ | `True` để cho phép dùng ngưỡng tươi tạm thời (chưa được kiểm chứng) |
| `OOD_THRESHOLD` | ❌ | Ngưỡng "out-of-distribution" của model AI (mặc định `0.60`) |
| `MAIL_SERVER` | ❌ | SMTP server (ví dụ `smtp.gmail.com`) |
| `MAIL_PORT` | ❌ | Cổng SMTP (thường `587` cho TLS) |
| `MAIL_USE_TLS` | ❌ | `true` để bật STARTTLS |
| `MAIL_USERNAME` | ❌ | Tài khoản email dùng để gửi |
| `MAIL_PASSWORD` | ❌ | Mật khẩu ứng dụng (App Password với Gmail) |
| `MAIL_FROM` | ❌ | Địa chỉ email hiển thị trong trường From |
| `FRONTEND_URL` | ❌ | URL frontend — dùng trong link email đặt lại mật khẩu |
| `CORS_ORIGINS` | ✅ | Danh sách origin được phép, cách nhau bằng dấu phẩy |

### 4.2 Frontend — file `frontend/.env`

Tạo file `.env` trong thư mục `frontend/`:

```dotenv
# URL của backend API
VITE_API_BASE_URL=http://localhost:8001

# Webhook URL của n8n chatbot (tuỳ chọn)
VITE_N8N_CHAT_WEBHOOK_URL=http://localhost:5678/webhook/your-webhook-id
```

#### Giải thích từng biến môi trường Frontend

| Biến | Bắt buộc | Mô tả |
|------|----------|-------|
| `VITE_API_BASE_URL` | ✅ | Địa chỉ backend FastAPI — toàn bộ API call đều dùng biến này |
| `VITE_N8N_CHAT_WEBHOOK_URL` | ❌ | Webhook URL của n8n để kích hoạt chatbot AI |

### 4.3 Tạo database và user PostgreSQL

```sql
-- Chạy trong psql với quyền superuser
CREATE USER freshfood_user WITH PASSWORD 'freshfood_pass';
CREATE DATABASE freshfood_db OWNER freshfood_user;
GRANT ALL PRIVILEGES ON DATABASE freshfood_db TO freshfood_user;
```

---

## 5. Cách chạy

### 5.1 Chạy dịch vụ phụ thuộc (PostgreSQL & Redis)

**Tuỳ chọn A — Docker Compose (khuyên dùng):**

```bash
docker-compose -f backend/docker-compose.yml up -d
```

Lệnh này khởi động PostgreSQL (port `5432`) và Redis (port `6379`) ở chế độ nền.

**Tuỳ chọn B — Cài đặt trực tiếp:**

```bash
# PostgreSQL (Windows — dùng Services hoặc pgAdmin)
# Linux:
sudo systemctl start postgresql

# Redis (Windows — dùng redis-server.exe)
# Linux:
sudo systemctl start redis
```

---

### 5.2 Chạy môi trường Development

#### Backend

```bash
cd backend

# Kích hoạt môi trường ảo (nếu chưa kích hoạt)
.\venv\Scripts\Activate.ps1        # Windows
# source venv/bin/activate          # Linux/macOS

# Khởi động server FastAPI với hot-reload
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

Server khởi động tại `http://localhost:8001`

> **Ghi chú:** Lần chạy đầu tiên, SQLAlchemy sẽ tự động tạo tất cả bảng trong database.

#### Frontend

Mở terminal mới:

```bash
cd frontend
npm run dev
```

Frontend khởi động tại `http://localhost:3000`

---

### 5.3 Chạy môi trường Production

#### Backend Production

```bash
cd backend
uvicorn main:app --host 0.0.0.0 --port 8001 --workers 4
```

#### Frontend Production

```bash
cd frontend

# Build tối ưu hoá
npm run build

# Xem trước bản build
npm run preview
```

Thư mục `frontend/dist/` chứa file tĩnh sẵn sàng deploy lên nginx, Vercel, hoặc Netlify.

---

### 5.4 Chạy bằng Docker (Toàn bộ stack)

```bash
# Build và chạy backend container
docker build -f backend/Dockerfile -t freshfood-backend ./backend
docker run -p 8001:8001 --env-file backend/.env freshfood-backend

# Build và chạy frontend container (phục vụ qua nginx)
docker build -f frontend/Dockerfile -t freshfood-frontend ./frontend
docker run -p 80:80 freshfood-frontend
```

---

### 5.5 Chạy stack giám sát (Prometheus + Grafana + Loki)

```bash
docker-compose -f ops/observability/docker-compose.yml up -d
```

| Dịch vụ | URL |
|---------|-----|
| Prometheus | `http://localhost:9090` |
| Grafana | `http://localhost:3001` |
| Loki | `http://localhost:3100` |

> Đảm bảo `ENABLE_METRICS=True` trong `backend/.env` để bật endpoint `/metrics`.

---

### 5.6 Chạy Tests

```bash
cd backend

# Kích hoạt môi trường ảo
.\venv\Scripts\Activate.ps1

# Chạy toàn bộ test suite
pytest

# Chạy kèm output chi tiết
pytest -v

# Chạy một file test cụ thể
pytest tests/test_stock_inventory.py -v
```

---

## 6. Cấu trúc thư mục

```
test1/
│
├── backend/                        # Python FastAPI server
│   ├── main.py                     # Điểm khởi động app, đăng ký router, cấu hình CORS
│   ├── database.py                 # Kết nối SQLAlchemy, tạo session
│   ├── models.py                   # Định nghĩa ORM (User, Product, Order, ...)
│   ├── schemas.py                  # Pydantic schema cho request/response validation
│   ├── config.py                   # Đọc biến môi trường tập trung
│   ├── observability.py            # Cấu hình Prometheus metrics
│   ├── requirements.txt            # Danh sách thư viện Python
│   ├── Dockerfile                  # Image Python 3.10-slim, expose 8001
│   ├── docker-compose.yml          # PostgreSQL + Redis services
│   ├── pytest.ini                  # Cấu hình pytest
│   ├── conftest.py                 # Fixtures cho test (database, auth token)
│   ├── .env                        # Biến môi trường (KHÔNG commit lên git)
│   ├── .env.example                # Mẫu biến môi trường
│   │
│   ├── api/                        # API routes
│   │   ├── auth.py                 # Đăng ký, đăng nhập, đặt lại mật khẩu, Google OAuth
│   │   ├── products.py             # CRUD sản phẩm, tìm kiếm, lọc
│   │   ├── orders.py               # Tạo đơn, cập nhật trạng thái, lịch sử
│   │   ├── scans.py                # Quét ảnh AI kiểm tra độ tươi
│   │   ├── admin.py                # Bảng admin: thống kê, quản lý user/sản phẩm
│   │   ├── delivery_profiles.py    # Địa chỉ giao hàng của user
│   │   └── notifications.py        # Push notifications
│   │
│   ├── utils/                      # Tiện ích dùng chung
│   │   ├── auth.py                 # Tạo/xác thực JWT token, hash mật khẩu
│   │   ├── cache.py                # Redis cache helper
│   │   └── email.py                # Gửi email qua SMTP
│   │
│   ├── tests/                      # Test suite
│   │   └── test_stock_inventory.py # Test quản lý tồn kho
│   │
│   ├── migrations/                 # Alembic database migrations
│   ├── uploads/                    # File upload
│   │   ├── products/               # Ảnh sản phẩm
│   │   ├── scans/                  # Ảnh quét độ tươi
│   │   └── freshness_reviews/      # Ảnh xác nhận độ tươi
│   └── logs/                       # Log files
│
├── frontend/                       # React + Vite SPA
│   ├── package.json                # Dependencies và scripts npm
│   ├── vite.config.js              # Cấu hình Vite (port 3000, plugins)
│   ├── Dockerfile                  # Multi-stage: build Node → serve nginx
│   ├── nginx.conf                  # Cấu hình nginx cho production
│   ├── .env                        # Biến môi trường frontend (KHÔNG commit)
│   │
│   └── src/
│       ├── index.jsx               # React DOM entry, mount vào #root
│       ├── App.jsx                 # Cấu hình routing, AuthProvider
│       ├── App.css                 # Global CSS
│       │
│       ├── pages/                  # Trang chính
│       │   ├── Home.jsx            # Trang chủ
│       │   ├── Products.jsx        # Danh sách sản phẩm / cửa hàng
│       │   ├── ProductDetail.jsx   # Chi tiết sản phẩm
│       │   ├── Cart.jsx            # Giỏ hàng
│       │   ├── Profile.jsx         # Hồ sơ người dùng
│       │   ├── FreshnessConfirm.jsx # Xác nhận độ tươi sau nhận hàng
│       │   └── AdminDashboard.jsx  # Bảng điều khiển Admin
│       │
│       ├── components/             # React components tái sử dụng
│       │   ├── common/             # Layout, sidebar, grid sản phẩm
│       │   └── admin/              # Component dành riêng trang Admin
│       │
│       ├── context/                # React Context
│       │   └── AuthContext.jsx     # Quản lý trạng thái đăng nhập toàn app
│       │
│       ├── services/               # Giao tiếp API
│       │   ├── api.js              # Axios instance, 60+ API methods, JWT refresh
│       │   └── chatbot.js          # Kết nối n8n chatbot webhook
│       │
│       ├── hooks/                  # Custom React hooks
│       ├── utils/                  # Hàm tiện ích
│       ├── styles/                 # File CSS bổ sung
│       ├── assets/                 # Ảnh, icon tĩnh
│       └── data/                   # Dữ liệu tĩnh (danh mục, mẫu dữ liệu)
│
├── ops/                            # DevOps & vận hành
│   ├── observability/              # Stack giám sát
│   │   ├── docker-compose.yml      # Prometheus, Grafana, Loki, Promtail
│   │   ├── prometheus/             # Cấu hình scrape targets
│   │   ├── loki/                   # Cấu hình log aggregation
│   │   ├── grafana/                # Dashboard JSON, datasources
│   │   └── promtail/               # Cấu hình thu thập log
│   └── diagrams/                   # Sơ đồ kiến trúc hệ thống
│
├── model_training/                 # Scripts huấn luyện mô hình AI
├── n8n/                            # Cấu hình workflow n8n
├── README.txt                      # Ghi chú gốc
├── BACKEND_ARCHITECTURE.md         # Tài liệu kiến trúc backend
└── README.md                       # File này
```

---

## 7. API & Tài liệu

Sau khi backend chạy, truy cập tài liệu API tương tác tại:

| Giao diện | URL |
|-----------|-----|
| Swagger UI | `http://localhost:8001/docs` |
| ReDoc | `http://localhost:8001/redoc` |
| Health Check | `http://localhost:8001/health` |
| Metrics (Prometheus) | `http://localhost:8001/metrics` |

### Các nhóm API chính

| Prefix | File | Chức năng |
|--------|------|-----------|
| `/api/auth` | `api/auth.py` | Đăng ký, đăng nhập, refresh token, Google OAuth, đặt lại mật khẩu |
| `/api/products` | `api/products.py` | CRUD sản phẩm, tìm kiếm, lọc theo danh mục |
| `/api/orders` | `api/orders.py` | Tạo đơn hàng, cập nhật trạng thái, lịch sử |
| `/api/scans` | `api/scans.py` | Quét ảnh kiểm tra độ tươi bằng AI |
| `/api/admin` | `api/admin.py` | Thống kê, quản lý user, AI feedback |
| `/api/delivery-profiles` | `api/delivery_profiles.py` | Địa chỉ giao hàng |
| `/api/notifications` | `api/notifications.py` | Quản lý thông báo đẩy |

---

## 8. Lỗi thường gặp & cách xử lý

### Lỗi kết nối Database

**Triệu chứng:**
```
sqlalchemy.exc.OperationalError: (psycopg2.OperationalError) could not connect to server
```

**Nguyên nhân:** PostgreSQL chưa chạy hoặc thông tin kết nối sai.

**Cách xử lý:**
```bash
# Kiểm tra PostgreSQL đang chạy
# Windows:
Get-Service -Name postgresql*
# Linux:
sudo systemctl status postgresql

# Kiểm tra lại DATABASE_URL trong backend/.env
# Đảm bảo database và user đã được tạo (xem mục 4.3)
```

---

### Lỗi kết nối Redis

**Triệu chứng:**
```
redis.exceptions.ConnectionError: Error connecting to localhost:6379
```

**Cách xử lý:**
```bash
# Kiểm tra Redis đang chạy
# Windows:
redis-cli ping
# Linux:
sudo systemctl status redis

# Hoặc chạy qua Docker
docker-compose -f backend/docker-compose.yml up -d redis
```

---

### Lỗi thiếu biến môi trường

**Triệu chứng:**
```
KeyError: 'SECRET_KEY'
# hoặc
pydantic_core._pydantic_core.ValidationError
```

**Cách xử lý:**
```bash
# Kiểm tra file .env đã tồn tại
ls backend/.env

# Đảm bảo SECRET_KEY, DATABASE_URL, REDIS_URL đã được điền
```

---

### Lỗi CORS trên Frontend

**Triệu chứng:**
```
Access to XMLHttpRequest at 'http://localhost:8001/api/...' from origin 'http://localhost:3000'
has been blocked by CORS policy
```

**Cách xử lý:**

Đảm bảo `CORS_ORIGINS` trong `backend/.env` chứa đúng URL của frontend:
```dotenv
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

Sau đó khởi động lại backend.

---

### Frontend không kết nối được Backend

**Triệu chứng:** Trang web trắng hoặc tất cả API call đều lỗi 404/Network Error.

**Cách xử lý:**
```bash
# Kiểm tra biến môi trường frontend
cat frontend/.env
# VITE_API_BASE_URL phải trỏ đúng cổng backend

# Kiểm tra backend có đang chạy không
curl http://localhost:8001/health
```

---

### Lỗi import module Python

**Triệu chứng:**
```
ModuleNotFoundError: No module named 'fastapi'
```

**Cách xử lý:**
```bash
# Đảm bảo đang ở trong môi trường ảo
.\venv\Scripts\Activate.ps1   # Windows
source venv/bin/activate       # Linux/macOS

# Cài lại dependencies
pip install -r requirements.txt
```

---

### Lỗi npm — node_modules không tồn tại

**Triệu chứng:**
```
Error: Cannot find module 'vite'
```

**Cách xử lý:**
```bash
cd frontend
npm install
```

---

### Lỗi chạy pytest

**Triệu chứng:**
```
FAILED tests/test_stock_inventory.py - sqlalchemy.exc.OperationalError
```

**Cách xử lý:**

Pytest dùng database riêng. Đặt biến `TESTING=1` trước khi chạy:
```bash
# Windows PowerShell
$env:TESTING="1"; pytest -v

# Linux/macOS
TESTING=1 pytest -v
```

---

### Port đã được sử dụng

**Triệu chứng:**
```
ERROR: [Errno 10048] error while attempting to bind on address ('0.0.0.0', 8001)
```

**Cách xử lý:**
```bash
# Windows — tìm process đang dùng port 8001
netstat -ano | findstr :8001
# Dừng process theo PID
taskkill /PID <PID> /F

# Hoặc đổi port trong lệnh uvicorn
uvicorn main:app --host 0.0.0.0 --port 8002 --reload
# Nhớ cập nhật VITE_API_BASE_URL trong frontend/.env
```
