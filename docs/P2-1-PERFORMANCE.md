# P2-1: 성능 최적화

> Redis 캐싱, N+1 쿼리 제거, DB 인덱싱 최적화

## 🎯 목표

**예상 기간**: 1-2주
**예상 점수 개선**: 성능 7/10 → 9/10
**목표**: API 응답 시간 50% 단축

---

## 📊 현재 성능 병목

### 1. N+1 쿼리 문제

```typescript
// ❌ N+1 문제
async findUserWorkspaces(userId: string) {
  const workspaces = await this.prisma.workspace.findMany({
    where: { members: { some: { userId } } },
  });

  // N+1: 각 workspace마다 쿼리 실행
  for (const workspace of workspaces) {
    workspace.members = await this.prisma.workspaceMember.findMany({
      where: { workspaceId: workspace.id },
    });
  }
}
```

### 2. 캐싱 부재
- 자주 조회되는 워크스페이스 정보
- 사용자 프로필
- 권한 정보

---

## 📝 구현 플랜

### Phase 1: Redis 캐싱 (Week 1)

**설치**:
```bash
npm install @nestjs/cache-manager cache-manager cache-manager-redis-store
npm install -D @types/cache-manager
```

**설정**:
```typescript
// cache.module.ts
import { CacheModule } from '@nestjs/cache-manager';
import * as redisStore from 'cache-manager-redis-store';

@Module({
  imports: [
    CacheModule.register({
      store: redisStore,
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
      ttl: 600, // 10 minutes
    }),
  ],
})
export class AppModule {}
```

**사용**:
```typescript
@Injectable()
export class WorkspaceService {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async findById(id: string) {
    const cacheKey = `workspace:${id}`;
    const cached = await this.cacheManager.get(cacheKey);

    if (cached) return cached;

    const workspace = await this.prisma.workspace.findUnique({
      where: { id },
      include: { members: { include: { user: true } } },
    });

    await this.cacheManager.set(cacheKey, workspace, 600);
    return workspace;
  }
}
```

### Phase 2: N+1 제거 (Week 1-2)

```typescript
// ✅ 해결: include 사용
async findUserWorkspaces(userId: string) {
  return this.prisma.workspace.findMany({
    where: {
      members: { some: { userId } },
    },
    include: {
      members: {
        include: {
          user: true,
        },
      },
    },
  });
}
```

### Phase 3: DB 인덱싱 (Week 2)

```prisma
// schema.prisma
model Workspace {
  id String @id @default(cuid())
  name String

  @@index([name]) // 이름 검색 최적화
}

model WorkspaceMember {
  workspaceId String
  userId String

  @@unique([workspaceId, userId])
  @@index([userId]) // 사용자별 워크스페이스 조회 최적화
}
```

---

## ✅ 검증 체크리스트

- [ ] 캐시 히트율 > 70%
- [ ] N+1 쿼리 0개
- [ ] API 응답 시간 50% 단축
- [ ] 부하 테스트 통과 (1000 req/s)

---

*Next: [P2-2-MONITORING.md](./P2-2-MONITORING.md)*
