# CI/CD Quy Trinh

Workflow: `.github/workflows/ci-cd.yml`

## CI (Pull Request va Push)

1. **Backend CI**
   - Cai dependency Python
   - Chay `pytest` cho `test1/backend/tests`
2. **Frontend CI**
   - Cai dependency Node
   - Chay `npm run build` trong `test1/frontend`

Neu mot job fail, merge bi chan.

## CD (Push len main/master)

Sau khi CI xanh:

1. Build image backend tu `test1/backend/Dockerfile`
2. Build image frontend tu `test1/frontend/Dockerfile`
3. Push image len GHCR voi tag commit SHA:
   - `ghcr.io/<owner>/<repo>/freshfood-backend:<sha>`
   - `ghcr.io/<owner>/<repo>/freshfood-frontend:<sha>`

## Bien mat khau can quan ly

- `GITHUB_TOKEN`: duoc GitHub cap san cho workflow (push GHCR)
- Cac secret moi truong deploy (neu co server staging/prod) can khai bao them trong repository settings.
