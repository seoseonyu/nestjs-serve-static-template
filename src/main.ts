import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import compression from 'compression';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  // PORT는 플랫폼이 주입(Cloud Run 8080 등). 컨테이너 접근을 위해 0.0.0.0 바인딩 필수.
  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
void bootstrap();
