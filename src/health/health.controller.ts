import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  MemoryHealthIndicator,
} from '@nestjs/terminus';

// 전역 프리픽스('api')와 합쳐져 최종 경로는 GET /api/health 가 된다.
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly memory: MemoryHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    // 힙 사용량이 임계치 이하이면 healthy. DB 등 의존성이 생기면 여기에 인디케이터를 추가한다.
    return this.health.check([
      () => this.memory.checkHeap('memory_heap', 512 * 1024 * 1024),
    ]);
  }
}
