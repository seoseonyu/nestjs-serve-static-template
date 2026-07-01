/**
 * [Clean Architecture] Platform
 * Role: Nest 앱을 생성하고 보안·압축·프리픽스·검증·종료훅을 적용해 서버를 기동한다.
 * Scope: 조립/기동/인프라 설정만 담당. 비즈니스 규칙이나 데이터 접근은 포함하지 않는다.
 * Depends-on: Platform(AppModule, NestExpressApplication) 및 인프라 미들웨어(helmet/compression).
 * SOLID: SRP(부트스트랩 책임만) · DIP(애플리케이션 조립은 AppModule에 위임)
 */

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import compression from 'compression';
import helmet from 'helmet';
import { AppModule } from './app.module';

const bootstrapLogger = new Logger('Bootstrap');

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // 보안 헤더 (HSTS, nosniff, frameguard 등). 기본 CSP는 Vite 정적 자산('self')과 호환된다.
  app.use(helmet());
  // 응답 gzip 압축 (PaaS 엣지가 압축하지 않는 경우 대비).
  app.use(compression());

  // 모든 API 라우트를 /api 아래로 묶어 SPA 클라이언트 라우트와 충돌을 방지한다.
  app.setGlobalPrefix('api');

  // 요청 바디 화이트리스트/변환 (알 수 없는 속성 제거, mass-assignment 방지).
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // SIGTERM 등 종료 시그널에 라이프사이클 훅을 태워 graceful shutdown.
  app.enableShutdownHooks();

  // PaaS 로드밸런서 뒤에서 X-Forwarded-* 헤더를 신뢰(프로토콜/클라이언트 IP 판별).
  app.set('trust proxy', 1);

  // PORT는 플랫폼이 주입(Cloud Run 8080 등). 컨테이너 접근을 위해 0.0.0.0 바인딩 필수.
  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}

void bootstrap().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  bootstrapLogger.error(message, stack);
  process.exitCode = 1;
});
