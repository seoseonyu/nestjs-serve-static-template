# AGENT.md — nestjs-serve-static-template

이 저장소에서 코드를 작성·수정하는 모든 에이전트(및 사람)를 위한 작업 지침서다.
**하나의 NestJS 11 프로세스**가 REST API(`/api/*`)와 컴파일된 **React 19 + Vite 6 SPA**를
같은 오리진에서 서빙하는 단일 배포 단위 템플릿이다. 모든 산출물은 **Clean Architecture +
SOLID**를 처음부터 준수해야 하며, **TODO·추측성 구현·부실 구현·중복 구현·미구현·기술부채는
존재해서는 안 된다.** 모든 신규/수정 소스 파일은 아래 [File Header Rule](#file-header-rule-mandatory)을
반드시 따른다.

---

## Golden Rules (TL;DR)

작업 시작 전 이 10개를 먼저 내재화한다. 세부 근거는 각 섹션에 있다.

1. **단일 오리진·단일 프로세스.** API는 전부 `/api` 프리픽스 아래. 프론트는 같은 서버의 `/api`를
   호출한다. CORS·별도 프론트 호스팅·localhost 하드코딩 금지.
2. **소스만 수정, 산출물은 만지지 않는다.** 편집 대상은 `src/**`, `frontend/src/**`뿐이다.
   `client/`(Vite 산출물)·`dist/`(Nest 산출물)는 생성물이며 빌드 시 덮어써진다.
3. **`outDir` ↔ `rootPath` 동기화.** Vite `outDir: '../client'`와 NestJS
   `rootPath: join(__dirname, '..', 'client')`는 항상 같은 폴더를 가리켜야 한다. 한쪽만 바꾸면
   정적 서빙이 깨진다.
4. **레이어는 안쪽으로만 의존한다.** Presentation/Platform → Domain/Core. Domain·Core는 웹
   프레임워크와 바깥 레이어를 import 하지 않는다.
5. **모든 소스 파일에 헤더 주석.** 5개 필드(Layer/Role/Scope/Depends-on/SOLID)를 실제 내용과
   일치시켜 작성한다. 거짓 헤더는 없느니만 못하다.
6. **포트·바인딩 하드코딩 금지.** `process.env.PORT ?? 3000`, `0.0.0.0` 바인딩을 유지한다.
7. **경계에서 검증.** 환경변수는 Zod로 부팅 시 fail-fast(`env.validation.ts`), 요청 바디는
   전역 `ValidationPipe({ whitelist: true, transform: true })`로 화이트리스트/변환한다.
8. **추측성·부실 구현 금지(YAGNI·DRY·KISS).** 미사용 추상화·죽은 코드·중복·`TODO`/`stub`/
   placeholder를 남기지 않는다. 필요할 때 필요한 만큼만 구현한다.
9. **타입 안전.** `any` 금지(외부 입력은 `unknown` + 내로잉), 판별 유니온으로 상태 모델링,
   `React.FC` 미사용, `console.log` 금지(운영 코드).
10. **완료 전 게이트.** `npm run build`, `npm test`, `npm run test:e2e`, `npm run lint`(Biome) 통과 +
    [Review Protocol](#review-protocol) 2라운드 통과 없이는 "완료"라고 하지 않는다.

---

## Project Overview

| 항목 | 값 |
|---|---|
| 런타임 | 앱 Node.js **22** (Dockerfile `node:22-alpine`, CI `node-version: 22`) · CI 액션은 `actions/checkout@v5`·`actions/setup-node@v5`(Node 24 러너 기반) |
| 백엔드 | NestJS **11** (`@nestjs/platform-express`), TypeScript ~5.7.3 |
| 프론트 | React **19** + Vite **6**, 순수 CSS(BEM 네이밍) |
| 패키지 매니저 | **npm** (root + `frontend/` 각각 lockfile 보유) |
| 정적 서빙 | `@nestjs/serve-static` — `client/`를 SPA로 서빙, `/api`는 제외 |
| 하드닝 | helmet · compression · ValidationPipe · shutdown hooks · trust proxy · Zod env · Terminus health |

**두 개의 npm 프로젝트.** 저장소 루트(백엔드)와 중첩된 `frontend/`(프론트엔드)는 각자
`package.json`·lockfile·`node_modules`를 갖는 독립 프로젝트다. 프론트 설치/빌드는 반드시
`--prefix frontend`로 수행한다(`npm run build:client`가 이를 수행).

**개발 vs 운영 흐름.**
- 개발: `npm run dev` → Nest(watch, `:3000`) + Vite dev(`:5173`). Vite dev 서버가 `/api`를
  `http://localhost:3000`으로 프록시하므로 HMR을 유지한 채 실제 API를 쓴다.
- 운영: `npm run build`로 프론트를 `client/`에, 백엔드를 `dist/`에 빌드한 뒤 `node dist/main`
  단일 프로세스가 SPA와 API를 함께 서빙한다.

---

## Repository Map

각 영역에 1차 책임 레이어를 태그로 표시한다. **`client/`·`dist/`는 편집 금지 생성물.**

```
nestjs-serve-static-template/  (repo root = NestJS 백엔드 패키지)
├── src/                       백엔드 소스
│   ├── main.ts                [Platform] 부트스트랩 + 하드닝
│   ├── app.module.ts          [Platform] 컴포지션 루트(ServeStatic/Config/Health 조립)
│   ├── app.controller.ts      [Presentation] GET /api
│   ├── app.service.ts         [Domain] 애플리케이션/유스케이스 로직
│   ├── app.controller.spec.ts [Presentation·test]
│   ├── config/
│   │   └── env.validation.ts  [Core] Zod 환경변수 스키마 + fail-fast 검증
│   └── health/
│       ├── health.controller.ts [Presentation] GET /api/health
│       └── health.module.ts     [Platform] Terminus 조립
├── test/
│   └── app.e2e-spec.ts        [Platform·e2e] 조립된 앱 전체를 부팅해 검증
├── frontend/                  (React + Vite 패키지, 독립 npm 프로젝트)
│   ├── vite.config.ts         [Platform] 빌드 설정(outDir '../client', /api 프록시)
│   └── src/
│       ├── main.tsx           [Platform] React 부트스트랩(createRoot)
│       ├── App.tsx            [Presentation] 루트 UI 컴포넌트
│       ├── index.css          [Presentation] 전역 스타일(BEM)
│       └── vite-env.d.ts      [Platform] Vite 타입 레퍼런스
├── client/                    ⚠️ Vite 빌드 산출물 (gitignore, 편집 금지)
├── dist/                      ⚠️ Nest 빌드 산출물 (gitignore, 편집 금지)
├── Dockerfile                 [Platform] 멀티스테이지 builder→runner
├── .github/workflows/deploy.yml  [Platform] CI/CD (biome → test → docker/GHCR)
├── README.md · DEPLOY.md      한국어 문서
└── package.json · tsconfig.json · biome.json
```

---

## Clean Architecture — Layer Model

이 프로젝트는 5개 레이어를 사용한다. NestJS 템플릿 특성상 별도 **Application 레이어를 두지
않고**, 유스케이스/애플리케이션 서비스는 **Domain**에 포함한다.

| Layer | 이 프로젝트에서의 의미 | 대표 파일 (현재) |
|---|---|---|
| **Domain** | 프레임워크 비의존 비즈니스 규칙·유스케이스·엔티티. | `src/app.service.ts` |
| **Data** | 영속성·외부 시스템 접근(repository, DB, HTTP client). **현재 없음 → 추가 시 이 레이어(확장 지점).** | *(없음)* |
| **Presentation** | 전달 인터페이스: NestJS 컨트롤러(HTTP), React 컴포넌트/스타일(UI). | `app.controller.ts`, `health/health.controller.ts`, `frontend/src/App.tsx`, `frontend/src/index.css` |
| **Platform** | 부트스트랩·DI 조립(컴포지션 루트)·정적 서빙·빌드/인프라 설정. | `main.ts`, `app.module.ts`, `health/health.module.ts`, `frontend/src/main.tsx`, `frontend/vite.config.ts`, `Dockerfile` |
| **Core** | 프레임워크 비의존 공유 커널: 설정/검증, 공통 타입·상수·에러·유틸, 관측 계약. | `src/config/env.validation.ts` |

### Dependency Rule (의존은 항상 안쪽으로)

```
        ┌─────────── Platform (컴포지션 루트: 모든 레이어를 조립) ───────────┐
        │   ┌──────── Presentation (Controller / React UI) ────────┐        │
        │   │              ↓ 의존                                   │        │
        │   │        Domain (유스케이스/규칙)  ←  Data (adapter)     │        │
        │   │              ↓                        ↓               │        │
        │   │            Core (공유 커널: 프레임워크 비의존)          │        │
        │   └───────────────────────────────────────────────────────┘       │
        └────────────────────────────────────────────────────────────────────┘
```

| Layer | may depend on | must NOT depend on |
|---|---|---|
| Core | (없음 · 범용 라이브러리 zod 등만) | Domain, Data, Presentation, Platform |
| Domain | Core | Data, Presentation, Platform, 웹 프레임워크(HTTP/정적서빙) |
| Data | Domain, Core | Presentation, Platform |
| Presentation | Domain, Core | Data(직접 import), Platform |
| Platform | 모든 레이어 (조립이 책임) | — |

**규칙 보충:**
- **레이어 태그는 파일의 1차 책임을 따른다.** 예: `health.controller.ts`는 관측(observability)
  관심사를 노출하지만 1차 책임이 "HTTP 엔드포인트 전달"이므로 **Presentation**이다. 관측 조립은
  `health.module.ts`(Platform)가 담당한다.
- **DI 데코레이터의 최소 결합은 허용.** Domain 서비스의 `@Injectable()`, Core가 소비되는 방식은
  NestJS DI 등록을 위한 최소 결합으로 허용한다. 단 Domain·Core는 컨트롤러·HTTP·정적서빙 등
  **전달/인프라 관심사를 import 해서는 안 된다.**
- **테스트는 대상의 레이어를 따른다.** `*.spec.ts`는 대상 레이어, `*.e2e-spec.ts`는 조립된 앱을
  부팅하므로 Platform 성격이다.

### How to Extend (새 기능 추가 시)

기능 폴더 하나에 레이어별 파일을 모은다. 예 `src/orders/`:
`orders.controller.ts`(Presentation) → `orders.service.ts`(Domain, 유스케이스) →
`order.repository.ts`(Domain에 **포트 인터페이스** 선언) + `order.repository.impl.ts`(Data, 어댑터) →
`orders.module.ts`(Platform, 조립). Domain은 포트에만 의존하고 Data가 이를 구현한다(DIP).
프론트는 데이터 접근을 `frontend/src/lib/`의 API 클라이언트(Data)로 분리하고, 컴포넌트
(Presentation)는 그 결과 타입(Domain/Core)에만 의존하게 한다.

---

## File Header Rule (MANDATORY)

모든 신규 소스 파일 최상단에, 그리고 기존 파일을 수정할 때 그 파일에 아래 5개 필드를 언어별
자연스러운 주석으로 작성한다. **필드 키는 영어, 설명은 한국어.** 헤더는 실제 코드와 일치해야 하며
(추측/희망 사항 금지), `Layer`는 반드시 5개 중 하나다. 파일의 역할이 바뀌면 헤더도 갱신한다.

**필드**
- `[Clean Architecture] <Layer>` — Domain / Data / Presentation / Platform / Core 중 하나
- `Role:` — 이 파일이 무엇을 하는지 한 줄 요약
- `Scope:` — 무엇을 하고 **무엇을 하지 않는지**
- `Depends-on:` — 어떤 레이어/모듈에 의존하는지 (의존 방향)
- `SOLID:` — 적용된 원칙과 그 이유(약식)

### Example — Presentation (NestJS 컨트롤러, `app.controller.ts`)

```ts
/**
 * [Clean Architecture] Presentation
 * Role: 루트 API 엔드포인트(GET /api)를 노출하고 요청을 AppService에 위임한다.
 * Scope: HTTP 요청/응답 변환만 담당. 비즈니스 로직·데이터 접근은 하지 않는다.
 * Depends-on: Domain(AppService). 외부/하위 레이어를 직접 import 하지 않는다.
 * SOLID: SRP(전달 책임만) · DIP(주입된 서비스 추상에 의존)
 */
import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
```

### Example — Domain (유스케이스 서비스, `app.service.ts`)

```ts
/**
 * [Clean Architecture] Domain
 * Role: 애플리케이션 유스케이스 로직을 담는 서비스(현재는 데모 응답).
 * Scope: 순수 로직만. HTTP·정적서빙·영속성 등 전달/인프라 관심사는 다루지 않는다.
 * Depends-on: Core(공유 타입/상수)만. 웹 프레임워크 전달 계층에 의존하지 않는다.
 * SOLID: SRP(단일 유스케이스 책임) · OCP(신규 유스케이스는 추가로 확장)
 */
import { Injectable } from '@nestjs/common';
```

### Example — Core (Zod 환경 검증, `env.validation.ts`)

```ts
/**
 * [Clean Architecture] Core
 * Role: 프로세스 환경변수 스키마와 부팅 시 fail-fast 검증기를 제공한다.
 * Scope: 스키마 정의·파싱만. 값 사용처(서버 기동 등)는 Platform이 담당한다.
 * Depends-on: 범용 라이브러리(zod)만. 웹 프레임워크·상위 레이어에 의존하지 않는다.
 * SOLID: SRP(설정 검증 단일 책임) · DIP(상위 레이어가 이 추상 계약에 의존)
 */
import { z } from 'zod';
```

### Example — Platform (부트스트랩, `main.ts`)

```ts
/**
 * [Clean Architecture] Platform
 * Role: Nest 앱을 생성하고 보안·압축·프리픽스·검증·종료훅을 적용해 서버를 기동한다.
 * Scope: 조립/기동/인프라 설정만. 비즈니스 규칙은 포함하지 않는다.
 * Depends-on: AppModule(컴포지션 루트) 및 인프라 미들웨어(helmet/compression).
 * SOLID: SRP(부트스트랩 단일 책임) · DIP(구체 모듈 조립은 AppModule에 위임)
 */
import { NestFactory } from '@nestjs/core';
```

### Example — Presentation (React 컴포넌트, `App.tsx`)

```tsx
/**
 * [Clean Architecture] Presentation
 * Role: 같은 서버의 GET /api 결과를 로딩/성공/에러 상태로 렌더링하는 루트 컴포넌트.
 * Scope: UI 렌더링과 로컬 상태만. 라우팅·전역 상태·직접적 인프라 접근은 하지 않는다.
 * Depends-on: react. (데이터 접근이 늘면 Data 레이어의 API 클라이언트로 분리한다.)
 * SOLID: SRP(단일 화면 책임) · ISP(판별 유니온으로 상태별 최소 형태만 노출)
 */
import { useEffect, useState } from 'react';
```

### Example — Presentation (CSS, `index.css`)

```css
/*
 * [Clean Architecture] Presentation
 * Role: SPA 전역 스타일과 상태별 클래스(BEM)를 정의한다.
 * Scope: 표현(스타일)만. 로직·데이터·마크업 구조 결정은 하지 않는다.
 * Depends-on: 없음(디자인 토큰/전역 스타일 자체가 최하위 표현 자원).
 * SOLID: SRP(표현 책임만) · OCP(토큰/클래스 추가로 확장, 기존 규칙 수정 최소화)
 */
```

---

## SOLID Application Guide

추상론이 아니라 이 저장소에서의 구체적 적용을 기준으로 판단한다.

- **SRP (단일 책임):** 컨트롤러는 HTTP 변환·위임만(`app.controller.ts`), 서비스는 로직만
  (`app.service.ts`). 한 파일이 전달+로직+영속성을 동시에 하면 위반이다.
- **OCP (개방·폐쇄):** 헬스 체크는 `health.check([...])` 배열에 인디케이터를 **추가**해 확장하고
  기존 인디케이터를 수정하지 않는다(`health.controller.ts`). 미들웨어는 옵션으로 구성한다.
- **LSP (리스코프 치환):** `MemoryHealthIndicator`는 여러 `HealthIndicator` 중 하나이며 배열에서
  치환 가능해야 한다. 향후 Data 레이어의 리포지토리는 포트를 구현해 서로 치환 가능해야 한다.
- **ISP (인터페이스 분리):** 전역 `ValidationPipe({ whitelist: true })`가 미지 속성을 제거하므로
  DTO는 필요한 필드만 노출한다. 프론트는 판별 유니온(`ApiState`)으로 상태별 최소 형태만 갖는다.
- **DIP (의존 역전):** 컨트롤러는 주입된 서비스 추상에 의존한다(생성자 주입). 환경변수는 흩어진
  `process.env` 접근 대신 검증된 설정(`validateEnv`)을 통한다. Data 레이어 도입 시 Domain은
  리포지토리 **인터페이스(포트)** 에 의존하고 Data가 어댑터로 구현한다.

---

## Coding Standards & Invariants

### 절대 불변식 (Runtime Invariants — 이 계약을 깨면 서비스가 깨진다)

| 불변식 | 강제 위치 |
|---|---|
| 모든 API 라우트는 `/api` 프리픽스 아래 | `main.ts` `setGlobalPrefix('api')` |
| 정적 미들웨어는 `/api`를 가로채지 않음 | `app.module.ts` `exclude: ['/api/{*path}']` (Express 5 문법) |
| Vite `outDir` = NestJS `rootPath` = 루트 `client/` | `vite.config.ts` ↔ `app.module.ts` |
| 포트는 플랫폼 주입, 하드코딩 금지 | `main.ts` `process.env.PORT ?? 3000` |
| 컨테이너 접근 위해 `0.0.0.0` 바인딩 | `main.ts` `app.listen(..., '0.0.0.0')` |
| 헬스 경로 `GET /api/health` → 200 | `health.controller.ts` |
| 해시 자산 `immutable` 1년, `index.html` `no-cache` | `app.module.ts` `setHeaders` |
| 하드닝 체인 순서 유지: helmet→compression→prefix→ValidationPipe→shutdownHooks→trust proxy | `main.ts` |
| 잘못된 env는 부팅 시 즉시 실패 | `env.validation.ts` + `app.module.ts` `validate` |

### TypeScript / 코드 규약

- **`any` 금지.** 외부·비신뢰 입력은 `unknown`으로 받고 `instanceof`/판별 유니온으로 내로잉한다
  (`App.tsx`의 `err instanceof Error` 패턴을 표준으로 삼는다).
- **경계 검증은 Zod.** 스키마에서 타입을 `z.infer`로 파생한다(`env.validation.ts`).
- **불변성.** 객체는 스프레드로 새로 만들고 제자리 변경(mutation)하지 않는다.
- **React:** `React.FC` 미사용, props는 명명된 `interface`/`type`, 콜백 prop은 명시 타입.
- **로깅:** 운영 코드에 `console.log` 금지(필요 시 Nest Logger 등 사용).
- **공개 API 타입 명시:** export 함수/공개 메서드에는 파라미터·반환 타입을 명시한다.
- **크기 한도:** 함수 < 50줄, 파일 < 800줄(권장 200–400), 중첩 ≤ 4단계(early return 선호).
- **KISS·DRY·YAGNI:** 미사용 추상화·중복 구현·추측성 일반화 금지. 반복이 실제로 나타난 뒤
  추상화한다.

---

## Anti-Patterns & Known Debt

### 하지 말 것 (Anti-Patterns)

- ❌ 포트/호스트/오리진 하드코딩 (DEPLOY.md "하드코딩 금지"). ❌ CORS·localhost 결합 도입
  (동일 오리진 설계).
- ❌ `client/`·`dist/` 편집 (생성물, 빌드 시 소멸).
- ❌ Vite `outDir`와 ServeStatic `rootPath`를 한쪽만 변경.
- ❌ `/api` 밖 라우트 추가 (정적 `exclude`·SPA 폴백과 충돌).
- ❌ 안쪽→바깥 의존 (Domain/Core가 컨트롤러·HTTP·정적서빙 import).
- ❌ `node_modules` 커밋.
- ❌ CI 액션을 Node 20 기반 구버전(`actions/*@v4`)으로 되돌리기 (GitHub 러너 deprecation 경고 유발 → `@v5` 유지).
- ❌ `TODO`/`FIXME`/`stub`/placeholder/미구현 함수 남기기.

### 알려진 기술부채 (Known Debt — 기록만, 이번 작업 범위 아님)

해당 영역을 건드리는 다음 작업에서 아래 목표 표준으로 수렴시킨다.

1. **백엔드 타입 엄격도 불일치.** `tsconfig.json`이 full `strict`가 아니다
   (`noImplicitAny: false` 등). 프론트(`frontend/tsconfig.json`)는 `strict: true`.
   `no-explicit-any`는 Biome `noExplicitAny`(error)로 복원됨. **목표:** 백엔드도 full `strict`.
2. **프론트 테스트 부재.** 루트 `biome.json`이 `frontend/`까지 린트·포맷한다(React 도메인)
   — 린트 부재는 해소됨. 다만 `frontend/`에 테스트가 없다. **목표:** Vitest +
   React Testing Library 도입.
3. **[해결됨] `frontend/node_modules` 커밋 → 언트랙.** `.gitignore`를 `node_modules/`(비앵커)로
   고치고 `git rm -r --cached frontend/node_modules`로 제거했다. Windows에서 커밋된
   `frontend/node_modules/.bin/vite` 등 셸림이 실행 비트 없이(mode 100644) 저장돼, Ubuntu CI의
   `npm run build`(`tsc && vite build`)가 `sh: vite: Permission denied`(exit 127)로 실패했다.
   기존 트리 위의 `npm install`은 셸림 권한을 고치지 않으므로, 커밋에서 제외해 CI가 클린 설치로
   실행 가능한 셸림을 생성하게 한다.

---

## Review Protocol

두 라운드를 **엄격히** 적용한다. 관대할수록 재작업이 반복된다. 모든 판정은 추측이 아니라 실제
코드베이스 흐름 추적에 근거한다. 일부만 읽고 성급히 판단하지 않는다.

### Round 1 — Static / Codebase Conformance (전수 검토)

전체 트리를 기계적으로 확인한다.

- [ ] **헤더 규칙:** 모든 소스 파일에 5개 필드 헤더가 있고 실제 내용과 일치. `Layer`가 5개 중 하나.
- [ ] **부실/미구현/추측성 없음:** `git grep -nE "TODO|FIXME|HACK|XXX|stub|placeholder" -- src frontend/src test` → 0건.
- [ ] **죽은 코드/미사용 추상화 없음(YAGNI).** 미사용 export·파라미터·분기 제거.
- [ ] **중복 없음(DRY).** 동일 로직 복붙 금지.
- [ ] **의존 규칙 준수.** 안쪽 레이어가 바깥을 import 하지 않음(예: `env.validation.ts`·
      `app.service.ts`가 컨트롤러/정적서빙을 import 하지 않는지 확인).
- [ ] **SOLID 위반 없음**(위 가이드 기준), **크기 한도** 충족.
- [ ] **정적 검증 통과:** `npm run lint` · `npm run build` · `npm --prefix frontend run build`(tsc 포함).

### Round 2 — Service-Story / Runtime Trace (엄격·전 구간 추적)

각 스토리를 **실제 코드 경로**로 끝까지 추적하고, 불변식이 런타임에 성립하는지 파일:라인 근거와
함께 pass/fail 판정한다.

1. **SPA 로드:** 브라우저 `/` → ServeStatic가 `client/index.html` 서빙, 해시 자산 `immutable`
   캐시. (`app.module.ts`)
2. **API 호출:** `GET /api` → `AppController.getHello` → `AppService.getHello`. (`app.*.ts`)
3. **헬스:** `GET /api/health` → Terminus 힙 인디케이터(임계치 512MB) → 200. (`health.controller.ts`)
4. **운영 빌드/서빙:** `npm run build` → 프론트 `client/`, 백엔드 `dist/` → `node dist/main`이
   둘 다 서빙. 컨테이너는 `Dockerfile` builder→runner로 동일 산출. (`package.json`, `Dockerfile`)
5. **env fail-fast:** 잘못된 `PORT`/`NODE_ENV` → 부팅 시 Zod 파싱 실패로 즉시 종료.
   (`env.validation.ts` + `app.module.ts`)
6. **graceful shutdown:** `SIGTERM` → `enableShutdownHooks` 라이프사이클 → 정상 종료. (`main.ts`)

**런타임 확인 명령(예):** `npm run build && npm run start:prod` 후 `curl -i localhost:3000/api`,
`curl -i localhost:3000/api/health`, SPA 응답의 `Cache-Control` 확인. 컨테이너:
`npm run docker:build && npm run docker:run` 후 `docker ps` STATUS=healthy 확인.

### Severity → Action

| Level | 의미 | 조치 |
|---|---|---|
| CRITICAL | 보안 취약점·데이터 손실·불변식 파괴 | **BLOCK** (머지 전 필수 수정) |
| HIGH | 버그·중대한 품질 결함 | WARN (머지 전 수정 권장) |
| MEDIUM | 유지보수성 저하 | INFO (가급적 수정) |
| LOW | 스타일·경미 제안 | NOTE (선택) |

---

## Commands

| 명령 | 설명 |
|---|---|
| `npm run dev` | Nest(watch, :3000) + Vite dev(:5173, `/api` 프록시) 동시 실행 |
| `npm run build` | `build:client`(프론트→`client/`) 후 `nest build`(백엔드→`dist/`) |
| `npm run build:client` | `npm --prefix frontend install && npm --prefix frontend run build` |
| `npm run start:prod` | `node dist/main` (운영 실행) |
| `npm test` / `npm run test:cov` | Jest 단위 테스트 / 커버리지 |
| `npm run test:e2e` | supertest e2e (`test/jest-e2e.json`) |
| `npm run lint` / `npm run check` | Biome `check --write .` (린트+포맷+import 정리, 자동 수정) — **백+프론트** |
| `npm run format` | Biome `format --write .` (전체) |
| `npm run ci:check` | Biome `ci .` (비수정 검사 — CI 게이트) |
| `npm run docker:build` / `docker:run` | 이미지 빌드 / `:3000` 실행 |

---

## Definition of Done

"완료" 선언 전 아래를 모두 만족한다.

- [ ] 변경/신규 파일에 정확한 헤더 주석(실제 내용과 일치).
- [ ] Clean Architecture 의존 규칙·SOLID·크기 한도 준수, 중복·추측성·미구현·TODO 없음.
- [ ] 불변식(프리픽스·`outDir`/`rootPath` 동기화·포트·바인딩·헬스·캐시) 유지.
- [ ] `npm run build` · `npm test` · `npm run test:e2e` · `npm run lint` ·
      `npm --prefix frontend run build` 통과.
- [ ] [Review Protocol](#review-protocol) Round 1·2를 실제 코드 추적으로 통과(파일:라인 근거).
- [ ] 새 기술부채를 남겼다면 [Known Debt](#anti-patterns--known-debt)에 목표 표준과 함께 기록.

---

> 이 문서는 `AGENT.md`가 단일 출처(Single Source of Truth)다. `AGENTS.md`는 이 파일을 가리키는 미러다.
