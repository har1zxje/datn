# AI Inspection - CI/CD & Observability (As-Is)

Tai lieu nay tong hop hien trang tu:
- `Untitled5.ipynb` (pipeline train/convert model cu)
- `test1/backend`, `test1/frontend`
- `.github/workflows/ci-cd.yml`
- `test1/ops/observability/*`

## 1) Hien trang chuc nang kiem dinh bang AI

### 1.1 Nguon mo hinh va huan luyen
- `Untitled5.ipynb` la notebook train MobileNetV2, luu model `.h5` va convert TensorFlow.js.
- Notebook dang tro duong dan Google Drive (`/content/drive/...`) nen mang tinh thu nghiem thu cong, chua pipeline hoa.
- Trong backend hien tai, endpoint scan khong nap model `.h5` tu notebook, ma di theo 3 nhanh:
  1. Standards-based scoring neu co `inspection_indicators`.
  2. Visual spoilage quantification (`visual_spoilage_quantification_v2`).
  3. Mock fallback (`model_inference_mock_v1`) neu khong du du lieu/khong xu ly duoc.

### 1.2 Luong runtime scanner (frontend -> backend)
- Frontend upload anh goi `POST /api/scans/quick-analyze`.
- Endpoint quick-analyze khong yeu cau auth, khong luu lich su scan.
- Neu backend quick-analyze loi, frontend fallback local TFJS de giu UX.
- Feedback duoc gui ve `POST /api/scans/feedback-events` de luu du lieu retrain.

## 2) Quy trinh CI/CD hien tai (as-is)

## CI trigger
- Chay khi `pull_request` hoac `push` vao `main/master`, chi khi thay doi:
  - `test1/backend/**`
  - `test1/frontend/**`
  - `.github/workflows/ci-cd.yml`

## CI jobs
1. `backend-ci`
   - Python 3.10
   - `pip install -r requirements.txt`
   - `pytest -q tests`
2. `frontend-ci`
   - Node 20
   - `npm ci`
   - `npm run build`

## CD jobs
- Job `build-and-publish-images` chi chay khi push (khong chay tren PR).
- Build + push 2 image len GHCR:
  - `ghcr.io/<repo>/freshfood-backend:<sha>`
  - `ghcr.io/<repo>/freshfood-frontend:<sha>`

## Luu y quan trong
- Chua co deployment job sang staging/prod (hien tai dung o muc build/push image).
- Chua co job rieng cho `test1/model_training` hoac `Untitled5.ipynb`.

## 3) Ha tang quan trac hien tai (as-is)

Stack trong `test1/ops/observability/docker-compose.yml`:
- Prometheus
- Loki
- Promtail
- Grafana

## Metrics backend
- Backend expose `/metrics` neu `ENABLE_METRICS=True`.
- Metrics chinh:
  - `freshfood_http_requests_total`
  - `freshfood_http_request_duration_seconds`
  - `freshfood_http_requests_in_progress`
  - `freshfood_scan_events_total`

## Log pipeline
- Promtail doc log tu `test1/backend/logs/*.log` (mount vao `/var/log/freshfood/*.log`) va day sang Loki.
- Grafana da provisioning san 2 datasource: Prometheus + Loki.

## Ranh gioi hien trang
- Backend da co metrics middleware ro rang.
- Pipeline log file co cau hinh, nhung trong backend chua thay logger ghi file `test1/backend/logs/*.log`.
  - Suy ra: can bo sung app logging ra file neu muon Loki co du lieu on dinh (ngoai stdout container).

## 4) Sơ do PlantUML (as-is)

Da tao san:
- `test1/ops/diagrams/ci_cd_as_is.puml`
- `test1/ops/diagrams/observability_as_is.puml`
- `test1/ops/diagrams/ai_inspection_as_is.puml`

## 5) Huong dan render PlantUML chi tiet

## Cach 1: VS Code
1. Cai extension "PlantUML".
2. Mo file `.puml`.
3. `Alt + D` de preview.
4. Export PNG/SVG tu menu extension.

## Cach 2: Docker
```bash
cd test1/ops/diagrams
docker run --rm -v ${PWD}:/workspace plantuml/plantuml -tpng /workspace/*.puml
docker run --rm -v ${PWD}:/workspace plantuml/plantuml -tsvg /workspace/*.puml
```

Tren PowerShell neu `${PWD}` gap van de, dung:
```bash
docker run --rm -v "C:\Users\pc\Desktop\do_an_tot_nghiep\test1\ops\diagrams:/workspace" plantuml/plantuml -tpng /workspace/*.puml
```

## Cach 3: Java local
1. Cai Java 17+.
2. Tai `plantuml.jar`.
3. Chay:
```bash
cd test1/ops/diagrams
java -jar plantuml.jar -tpng *.puml
java -jar plantuml.jar -tsvg *.puml
```

## 6) De xuat bo sung toi thieu (neu muon lam tiep)

1. Tach them workflow train model (`model_training`) + artifact versioning.
2. Bo sung deploy stage (staging/prod) sau khi push image.
3. Bo sung logging config backend ghi file (hoac chuyen sang scrape stdout container truc tiep).
4. Them dashboard Scanner SLI:
   - p95 latency quick-analyze
   - error rate quick-analyze
   - ty le `needs_manual_review`
   - phan bo `assessment_basis`.
