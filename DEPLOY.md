# 배포 가이드 (Deployment)

이 앱은 **단일 Docker 이미지**(백엔드 + 빌드된 SPA + 프로덕션 의존성)로 패키징되어, 컨테이너를 실행하는 어떤 플랫폼에도 배포할 수 있다. TLS·스케일링·로드밸런싱은 **플랫폼(엣지)** 이 담당하고, 앱은 컨테이너 내부에서 HTTP로만 동작한다.

## 핵심 규약

| 항목 | 값 |
|---|---|
| 리슨 포트 | `process.env.PORT`(플랫폼 주입) → 없으면 `3000`. **하드코딩 금지** |
| 바인드 주소 | `0.0.0.0` (컨테이너 외부 접근) |
| 헬스체크 경로 | `GET /api/health` → `200 {"status":"ok"}` |
| 이미지 빌드 | `docker build -t nestjs-serve-static-template .` (멀티스테이지, non-root, dumb-init) |
| 종료 시그널 | `SIGTERM` → graceful shutdown (`enableShutdownHooks`) |

CI(`.github/workflows/deploy.yml`)가 `master`/태그 push 시 이미지를 빌드해 **GHCR**(`ghcr.io/<owner>/<repo>`)에 푸시한다. 아래 플랫폼은 그 이미지를 당기거나, 저장소의 `Dockerfile`을 직접 빌드한다.

---

## Google Cloud Run

```bash
# 소스에서 바로 빌드+배포 (Cloud Build가 Dockerfile 사용)
gcloud run deploy nestjs-serve-static-template \
  --source . \
  --region asia-northeast3 \
  --allow-unauthenticated
```

- `PORT`는 Cloud Run이 자동 주입(기본 8080) → 코드가 `process.env.PORT`를 따르므로 설정 불필요.
- TLS·오토스케일 자동. 최소 인스턴스/동시성은 콘솔 또는 `--min-instances`, `--concurrency`로 조정.
- 헬스체크: 시작 프로브 경로를 `/api/health`로 지정(선택).

## Railway

1. New Project → Deploy from Repo. `Dockerfile` 자동 감지.
2. Variables: 별도 `PORT` 불필요(Railway가 주입). 필요 시 `NODE_ENV=production`.
3. Settings → Healthcheck Path: `/api/health`.

## Render

1. New → Web Service → Runtime: **Docker**.
2. Health Check Path: `/api/health`.
3. `PORT`는 Render가 주입 → 코드가 자동 사용.

## Fly.io

```bash
fly launch        # Dockerfile 감지, fly.toml 생성
fly deploy
```

`fly.toml` 예시 요점:

```toml
[http_service]
  internal_port = 3000     # 앱이 PORT 미설정 시 3000 리슨
  force_https = true

[env]
  NODE_ENV = "production"

[[http_service.checks]]
  method = "get"
  path = "/api/health"
```

---

## 로컬에서 프로덕션 이미지 검증

```bash
npm run docker:build
docker run --rm -e PORT=3000 -p 3000:3000 nestjs-serve-static-template
# 확인
curl http://127.0.0.1:3000/api/health      # {"status":"ok"}
curl -I http://127.0.0.1:3000/             # Cache-Control: no-cache + helmet 헤더
docker ps                                   # STATUS = healthy
```
