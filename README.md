# nestjs-serve-static-template

**NestJS 서버 하나**가 REST API(`/api/`*)와 그 API를 소비하는 **React(Vite) SPA**를 함께 서빙하는 템플릿.
프론트/백엔드가 **동일 origin·단일 배포 단위**이므로 CORS 설정이나 별도 프론트 호스팅이 필요 없다.

## 아키텍처

```
요청 →  ┌─────────────────────────── NestJS (단일 프로세스) ───────────────────────────┐
        │  /api/*   → 컨트롤러 (setGlobalPrefix('api'))                                  │
        │  그 외    → ServeStaticModule → client/ 의 SPA, 미지 경로는 index.html 폴백   │
        └──────────────────────────────────────────────────────────────────────────────┘

frontend/ (React+Vite 소스)  ──npm run build──▶  client/ (정적 산출물, gitignore)  ──serve──▶ NestJS
```

- API 네임스페이스 `/api` + ServeStatic `exclude: ['/api/{*path}']`(Express 5 문법)로 API/SPA 라우팅 충돌 차단.
- 개발 시엔 Vite dev 서버(HMR)가 `/api`를 NestJS로 프록시.

## 요구사항

- Node.js 22+
- (배포/검증용) Docker

## 개발

```bash
npm install
npm run dev          # NestJS(watch, :3000) + Vite dev(:5173, /api 프록시) 동시 실행
```

브라우저에서 [http://localhost:5173](http://localhost:5173) → 화면이 `/api` 응답을 표시.

## 빌드 & 프로덕션 실행 (로컬)

```bash
npm run build        # frontend → client/, backend → dist/
npm run start:prod   # node dist/main → http://localhost:3000 (API + SPA 단일 포트)
```

## 테스트

```bash
npm test             # 유닛
npm run test:e2e     # e2e
npm run test:cov     # 커버리지
```

## Docker & 배포

```bash
npm run docker:build # 멀티스테이지 이미지 빌드 (non-root, dumb-init, HEALTHCHECK)
npm run docker:run   # http://localhost:3000
```

PaaS(Cloud Run/Railway/Render/Fly) 배포 방법은 **[DEPLOY.md](./DEPLOY.md)** 참고.
`.github/workflows/deploy.yml`이 `master`/태그 push 시 테스트 → 이미지 빌드 → GHCR 푸시를 수행한다.

## 프로덕션 하드닝 (기본 내장)


| 영역                | 구현                                                        |
| ----------------- | --------------------------------------------------------- |
| 보안 헤더             | `helmet` (CSP, HSTS, nosniff, frameguard …)               |
| 압축                | `compression` (gzip)                                      |
| 정적 캐시             | 해시 에셋 `immutable, max-age=1y` / `index.html` `no-cache`   |
| 헬스체크              | `@nestjs/terminus` → `GET /api/health`                    |
| Graceful shutdown | `enableShutdownHooks()` + `0.0.0.0` 바인딩                   |
| 프록시 신뢰            | `trust proxy`(X-Forwarded-*)                              |
| 설정 검증             | `@nestjs/config` + zod (부팅 시 `PORT`/`NODE_ENV` fail-fast) |
| 입력 검증             | 전역 `ValidationPipe(whitelist, transform)`                 |


## 환경변수

`.env.example` 참고. 핵심은 `PORT`(플랫폼이 주입, 미설정 시 3000), `NODE_ENV`.

## 주요 구조

```
src/
├── main.ts               # 부트스트랩 + 하드닝 미들웨어
├── app.module.ts         # ServeStatic(캐시헤더) + Config + Health
├── config/env.validation.ts
└── health/               # terminus 헬스체크
frontend/                 # React + Vite 소스 (→ client/)
Dockerfile                # 멀티스테이지 (builder → runner)
DEPLOY.md                 # PaaS 배포 가이드
```

