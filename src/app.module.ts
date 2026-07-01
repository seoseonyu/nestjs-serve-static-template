import { join } from 'path';
import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      // dist/ 기준 상위 = 레포 루트. Vite 빌드 산출물(client/)을 정적 서빙한다.
      rootPath: join(__dirname, '..', 'client'),
      // API 경로는 정적 미들웨어가 가로채지 않도록 제외 (Express 5 경로 문법).
      exclude: ['/api/{*path}'],
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
