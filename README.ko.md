# nestjs-serve-static-template

**언어:** [English](./README.md) | 한국어

하나의 **NestJS 11** 서버가 `/api/*` REST API와 컴파일된 **React 19 + Vite 6** 단일 페이지 애플리케이션을 같은 오리진에서 함께 서빙하는 프로덕션 지향 템플릿입니다.

이 앱은 하나의 배포 단위로 패키징됩니다. 프로덕션에서는 별도 프론트엔드 호스트, 브라우저 대상 CORS 설정, 하드코딩된 localhost API URL이 필요하지 않습니다.

## 제공 기능

- 단일 오리진 배포: 하나의 NestJS 프로세스가 API와 빌드된 SPA를 함께 서빙합니다.
- API 분리: 모든 백엔드 라우트는 `/api` 아래에 있고, 나머지 경로는 SPA로 전달됩니다.
- 프로덕션 정적 서빙: Vite가 `client/`로 빌드하고 `@nestjs/serve-static`이 해당 디렉터리를 서빙합니다.
- 로컬 HMR: 개발 중 Vite dev 서버가 `/api` 요청을 NestJS로 프록시합니다.
- 런타임 하드닝: Helmet, gzip 압축, 환경변수 검증, 요청 검증, 헬스 체크, graceful shutdown, 프록시 인식을 포함합니다.
- Docker 패키징: 멀티스테이지 이미지가 프론트엔드와 백엔드 산출물을 빌드한 뒤 non-root 사용자로 실행합니다.

## 아키텍처

```text
Browser
  |
  | same origin
  v
NestJS process
  |-- /api/*  -> controllers, services, health checks
  |
  `-- /*      -> ServeStaticModule -> client/index.html and Vite assets

frontend/ source -- npm run build:client --> client/ static bundle
src/ source      -- nest build              --> dist/ server bundle
```

핵심 라우팅 계약:

- `main.ts`가 `setGlobalPrefix('api')`를 적용해 백엔드 엔드포인트를 `/api` 아래로 묶습니다.
- `app.module.ts`가 정적 서빙에서 `/api/{*path}`를 제외하므로 API 요청이 SPA 라우트로 처리되지 않습니다.
- `frontend/vite.config.ts`는 `../client`로 빌드하며, 이는 NestJS 정적 루트 `join(__dirname, '..', 'client')`와 일치합니다.

## 요구사항

- Node.js 22+
- npm
- Docker, 컨테이너 빌드 및 실행 검증 시 필요

## 빠른 시작

```bash
npm install
npm run dev
```

개발 서버:

- API: `http://localhost:3000/api`
- Vite HMR이 적용된 SPA: `http://localhost:5173`
- 헬스 체크: `http://localhost:3000/api/health`

개발 중에는 Vite 서버가 `/api` 요청을 `http://localhost:3000`으로 프록시합니다.

## 프로덕션 빌드

```bash
npm run build
npm run start:prod
```

`npm run build`는 두 빌드를 모두 수행합니다.

1. `npm run build:client`가 `frontend/` 의존성을 설치하고 SPA를 `client/`로 빌드합니다.
2. `nest build`가 백엔드를 `dist/`로 컴파일합니다.

`npm run start:prod`는 `PORT` 또는 `3000`에서 하나의 Node.js 프로세스를 실행합니다.

## 주요 명령

| 명령 | 설명 |
|---|---|
| `npm run dev` | NestJS watch 모드와 Vite dev 서버를 함께 실행합니다. |
| `npm run build:client` | 프론트엔드 의존성을 설치하고 SPA를 `client/`로 빌드합니다. |
| `npm run build` | 프론트엔드와 백엔드 프로덕션 산출물을 빌드합니다. |
| `npm run start:prod` | `dist/`의 컴파일된 서버를 실행합니다. |
| `npm test` | 백엔드 단위 테스트를 실행합니다. |
| `npm run test:e2e` | 백엔드 e2e 테스트를 실행합니다. |
| `npm run test:cov` | 백엔드 테스트 커버리지를 확인합니다. |
| `npm run lint` | 백엔드 ESLint 검사를 실행합니다. |
| `npm run docker:build` | 프로덕션 Docker 이미지를 빌드합니다. |
| `npm run docker:run` | 프로덕션 Docker 이미지를 3000번 포트에서 실행합니다. |

## 환경변수

로컬에서 값을 재정의해야 하면 `.env.example`을 복사해 사용합니다.

| 변수 | 기본값 | 설명 |
|---|---:|---|
| `PORT` | `3000` | HTTP 포트입니다. PaaS 플랫폼이 보통 이 값을 주입합니다. |
| `NODE_ENV` | `development` | `development`, `production`, `test` 중 하나입니다. |

환경변수는 부팅 시 Zod로 검증됩니다. 잘못된 값은 서버 시작 전에 fail-fast로 실패합니다.

## 저장소 구조

```text
src/
  main.ts                    NestJS 부트스트랩과 런타임 하드닝
  app.module.ts              Config, 정적 서빙, Health 모듈 조립
  app.controller.ts          GET /api
  app.service.ts             애플리케이션 응답 로직
  config/env.validation.ts   Zod 환경변수 검증
  health/                    GET /api/health

frontend/
  src/                       React 애플리케이션 소스
  vite.config.ts             Vite 빌드 출력 및 /api 개발 프록시

client/                      생성된 Vite 산출물, 직접 수정하지 않음
dist/                        생성된 NestJS 산출물, 직접 수정하지 않음
Dockerfile                   멀티스테이지 프로덕션 이미지
DEPLOY.md                    플랫폼 배포 가이드
```

루트 패키지와 `frontend/`는 각각 별도 lockfile을 가진 독립 npm 프로젝트입니다. 프론트엔드 패키지 내부 작업이 명확히 필요한 경우가 아니라면 루트 스크립트를 사용합니다.

## 프로덕션 기본값

| 영역 | 구현 |
|---|---|
| 보안 헤더 | `helmet` |
| 압축 | `compression` |
| 정적 캐시 | 해시 에셋: `public, max-age=31536000, immutable`; `index.html`: `no-cache` |
| 헬스 체크 | `@nestjs/terminus` 기반 `GET /api/health` |
| 종료 처리 | `enableShutdownHooks()` |
| 컨테이너 바인딩 | `0.0.0.0` |
| 프록시 지원 | Express `trust proxy` |
| 환경변수 검증 | `@nestjs/config` + Zod |
| 요청 검증 | 전역 `ValidationPipe({ whitelist: true, transform: true })` |

## Docker

```bash
npm run docker:build
npm run docker:run
```

이미지는 `client/`와 `dist/`를 빌드하고, 프로덕션 의존성만 설치하며, `node` 사용자로 실행되고 `/api/health`를 대상으로 컨테이너 헬스 체크를 수행합니다.

플랫폼별 배포 방법은 [DEPLOY.md](./DEPLOY.md)를 참고하세요.

## CI/CD

`.github/workflows/deploy.yml`은 pull request와 `master` push에서 실행됩니다.

- Pull request: 설치, 빌드, 단위 테스트, e2e 테스트를 수행합니다.
- Push 및 버전 태그: 테스트 통과 후 Docker 이미지를 빌드하고 GHCR에 게시합니다.

## 개발 메모

- 모든 API 라우트는 `/api` 아래에 둡니다.
- 생성물인 `client/`와 `dist/`를 직접 수정하지 않습니다.
- Vite `build.outDir`와 NestJS `ServeStaticModule.rootPath`가 같은 `client/` 디렉터리를 가리키도록 유지합니다.
- 프론트엔드 API 오리진을 하드코딩하지 않습니다. SPA는 같은 오리진의 `/api`를 호출해야 합니다.
