/**
 * [Clean Architecture] Platform
 * Role: Config, 정적 SPA 서빙, Health 모듈과 루트 컨트롤러/서비스를 조립한다.
 * Scope: NestJS 모듈 조립과 정적 서빙 설정만 담당. 요청 처리 로직과 비즈니스 규칙은 포함하지 않는다.
 * Depends-on: Presentation(AppController, HealthModule), Domain(AppService), Core(validateEnv), ServeStatic/Config 인프라.
 * SOLID: SRP(컴포지션 루트 책임) · DIP(구체 구현 조립을 모듈 경계에서 수행)
 */
import { join } from 'path';
import type { Response } from 'express';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthModule } from './health/health.module';
import { validateEnv } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    ServeStaticModule.forRoot({
      // dist/ 기준 상위 = 레포 루트. Vite 빌드 산출물(client/)을 정적 서빙한다.
      rootPath: join(__dirname, '..', 'client'),
      // API 경로는 정적 미들웨어가 가로채지 않도록 제외 (Express 5 경로 문법).
      exclude: ['/api/{*path}'],
      serveStaticOptions: {
        // Vite 콘텐츠 해시 파일명 → 무기한 캐시 안전. index.html 만 no-cache로 배포 즉시 반영.
        setHeaders: (res: Response, path: string): void => {
          res.setHeader(
            'Cache-Control',
            path.endsWith('index.html')
              ? 'no-cache'
              : 'public, max-age=31536000, immutable',
          );
        },
      },
    }),
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
