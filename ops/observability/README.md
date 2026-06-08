# Observability Stack

Stack nay cung cap:

- **Prometheus**: thu thap metrics tu backend FastAPI (`/metrics`)
- **Grafana**: dashboard va canh bao
- **Loki + Promtail**: tap trung hoa logs ung dung

## 1) Chay stack quan trac

```bash
cd test1/ops/observability
docker compose up -d
```

## 2) Endpoint truy cap

- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3001` (admin/admin123)
- Loki API: `http://localhost:3100`

## 3) Yeu cau cho backend

1. Bat metrics trong `test1/backend/.env`:
   - `ENABLE_METRICS=True`
2. Chay backend tren `127.0.0.1:8001` de Prometheus scrape.
3. Neu muon thu log voi Promtail, ghi file log vao:
   - `test1/backend/logs/*.log`

## 4) Mot so metric chinh de theo doi

- `freshfood_http_requests_total`
- `freshfood_http_request_duration_seconds`
- `freshfood_http_requests_in_progress`
- `freshfood_scan_events_total`
