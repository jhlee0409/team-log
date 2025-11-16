# P2-2: 모니터링 시스템

> Prometheus + Grafana 기반 프로덕션 모니터링

## 🎯 목표

**예상 기간**: 1주
**예상 점수 개선**: 모니터링 7/10 → 9/10

---

## 📝 구현 플랜

### Phase 1: 헬스체크 엔드포인트

```typescript
// health.controller.ts
import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, PrismaHealthIndicator } from '@nestjs/terminus';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private prisma: PrismaHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.prisma.pingCheck('database'),
    ]);
  }

  @Get('ready')
  @HealthCheck()
  ready() {
    // Readiness probe for Kubernetes
    return { status: 'ok' };
  }
}
```

### Phase 2: Prometheus 메트릭

```bash
npm install @willsoto/nestjs-prometheus prom-client
```

```typescript
// Metrics tracking
@Injectable()
export class MetricsService {
  private httpRequestDuration: Histogram;
  private httpRequestTotal: Counter;

  constructor() {
    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
    });

    this.httpRequestTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
    });
  }
}
```

---

## ✅ 검증 체크리스트

- [ ] /health 엔드포인트 응답
- [ ] Prometheus 메트릭 수집
- [ ] Grafana 대시보드 구성
- [ ] 알림 설정 (에러율 > 5%)

---

*Next: [P2-3-API_DOCS.md](./P2-3-API_DOCS.md)*
