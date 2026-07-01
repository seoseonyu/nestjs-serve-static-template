import { join } from 'node:path';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { validateEnv } from './config/env.validation';
import { HealthModule } from './health/health.module';

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
        setHeaders: (res, path) =>
          res.setHeader(
            'Cache-Control',
            path.endsWith('index.html')
              ? 'no-cache'
              : 'public, max-age=31536000, immutable',
          ),
      },
    }),
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
