# ---- builder: 프론트(client/) + 백엔드(dist/) 빌드 ----
FROM node:22-alpine AS builder
WORKDIR /app

# 루트 의존성 (레이어 캐시)
COPY package*.json ./
RUN npm ci

# 프론트 의존성 (레이어 캐시)
COPY frontend/package*.json ./frontend/
RUN npm ci --prefix frontend

# 소스 복사 후 빌드: client/ (Vite) + dist/ (Nest)
COPY . .
RUN npm run build:client && npx nest build

# ---- runner: 슬림 런타임 (dist/ + client/ + prod deps만) ----
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# PID 1 시그널 처리 (SIGTERM → graceful shutdown)
RUN apk add --no-cache dumb-init

# 프로덕션 의존성만 설치
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# 빌드 산출물 복사
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/client ./client

# 비루트 실행 (node 이미지에 기본 존재하는 node 유저)
USER node

EXPOSE 3000

# 컨테이너 헬스체크 (node 22 전역 fetch 사용)
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
