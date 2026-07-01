# nestjs-serve-static-template

**Language:** English | [한국어](./README.ko.md)

A production-oriented template where one **NestJS 11** server serves both REST APIs under `/api/*` and a compiled **React 19 + Vite 6** single-page application from the same origin.

The app is packaged as one deployable unit. In production there is no separate frontend host, no browser-facing CORS setup, and no hardcoded localhost API URL.

## What This Template Provides

- Single-origin deployment: NestJS serves the API and the built SPA from one process.
- API isolation: every backend route lives under `/api`, while all other routes fall through to the SPA.
- Production static serving: Vite builds into `client/`, and `@nestjs/serve-static` serves that directory.
- Local HMR: Vite dev server proxies `/api` to NestJS during development.
- Runtime hardening: Helmet, gzip compression, validated environment variables, request validation, health checks, graceful shutdown, and proxy awareness.
- Docker-ready packaging: a multi-stage image builds frontend and backend artifacts, then runs as a non-root user.

## Architecture

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

Key routing contracts:

- `main.ts` applies `setGlobalPrefix('api')`, so backend endpoints are namespaced under `/api`.
- `app.module.ts` excludes `/api/{*path}` from static serving, so API requests are never handled as SPA routes.
- `frontend/vite.config.ts` builds to `../client`, matching the NestJS static root `join(__dirname, '..', 'client')`.

## Requirements

- Node.js 22+
- npm
- Docker, only for container build/run verification

## Quick Start

```bash
npm install
npm run dev
```

Development servers:

- API: `http://localhost:3000/api`
- SPA with Vite HMR: `http://localhost:5173`
- Health check: `http://localhost:3000/api/health`

During development, the Vite server proxies `/api` to `http://localhost:3000`.

## Production Build

```bash
npm run build
npm run start:prod
```

`npm run build` performs both builds:

1. `npm run build:client` installs and builds `frontend/` into `client/`.
2. `nest build` compiles the backend into `dist/`.

`npm run start:prod` starts one Node.js process on `PORT` or `3000`.

## Common Commands

| Command | Description |
|---|---|
| `npm run dev` | Run NestJS watch mode and Vite dev server together. |
| `npm run build:client` | Install frontend dependencies and build the SPA into `client/`. |
| `npm run build` | Build frontend and backend production artifacts. |
| `npm run start:prod` | Run the compiled server from `dist/`. |
| `npm test` | Run backend unit tests. |
| `npm run test:e2e` | Run backend end-to-end tests. |
| `npm run test:cov` | Run backend tests with coverage. |
| `npm run lint` | Run backend ESLint checks. |
| `npm run docker:build` | Build the production Docker image. |
| `npm run docker:run` | Run the production Docker image on port 3000. |

## Environment

Copy `.env.example` when local overrides are needed.

| Variable | Default | Description |
|---|---:|---|
| `PORT` | `3000` | HTTP port. PaaS platforms usually inject this value. |
| `NODE_ENV` | `development` | One of `development`, `production`, or `test`. |

Environment variables are validated with Zod at boot. Invalid values fail fast before the server starts.

## Repository Layout

```text
src/
  main.ts                    NestJS bootstrap and runtime hardening
  app.module.ts              Config, static serving, health module composition
  app.controller.ts          GET /api
  app.service.ts             Application response logic
  config/env.validation.ts   Zod environment validation
  health/                    GET /api/health

frontend/
  src/                       React application source
  vite.config.ts             Vite build output and /api dev proxy

client/                      Generated Vite output, do not edit
dist/                        Generated NestJS output, do not edit
Dockerfile                   Multi-stage production image
DEPLOY.md                    Platform deployment guide
```

The root package and `frontend/` are separate npm projects with separate lockfiles. Use root scripts unless you intentionally need to work inside the frontend package.

## Production Defaults

| Area | Implementation |
|---|---|
| Security headers | `helmet` |
| Compression | `compression` |
| Static cache | Hashed assets: `public, max-age=31536000, immutable`; `index.html`: `no-cache` |
| Health check | `GET /api/health` with `@nestjs/terminus` |
| Shutdown | `enableShutdownHooks()` |
| Container binding | `0.0.0.0` |
| Proxy support | Express `trust proxy` |
| Environment validation | `@nestjs/config` + Zod |
| Request validation | Global `ValidationPipe({ whitelist: true, transform: true })` |

## Docker

```bash
npm run docker:build
npm run docker:run
```

The image builds `client/` and `dist/`, installs production dependencies only, runs as the `node` user, and exposes a container health check against `/api/health`.

For platform-specific deployment notes, see [DEPLOY.md](./DEPLOY.md).

## CI/CD

`.github/workflows/deploy.yml` runs on pull requests and on pushes to `master`.

- Pull requests: install, build, unit tests, e2e tests.
- Pushes and version tags: after tests pass, build and publish a Docker image to GHCR.

## Development Notes

- Keep all API routes under `/api`.
- Do not edit generated `client/` or `dist/` artifacts.
- Keep Vite `build.outDir` and NestJS `ServeStaticModule.rootPath` pointed at the same `client/` directory.
- Do not hardcode frontend API origins. The SPA should call the same-origin `/api`.
