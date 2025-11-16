# 🧪 TeamLog Backend Testing Guide

이 문서는 TeamLog 백엔드의 테스트 전략, 구조, 그리고 커버리지 목표에 대해 설명합니다.

## 📊 테스트 커버리지 현황

### 전체 커버리지 (2025-01-16 기준)

```
총 테스트: 317개 통과
라인 커버리지: 80.08% ✅
구문 커버리지: 79.24%
함수 커버리지: 82.79%
브랜치 커버리지: 74.41%
```

### 모듈별 커버리지

| 모듈 | 라인 커버리지 | 주요 파일 커버리지 |
|------|--------------|------------------|
| **src/auth** | 81.03% | auth.controller (100%), auth.service (100%), guards (100%), strategies (100%) |
| **src/user** | 78.94% | user.controller (100%), user.service (100%) |
| **src/workspace** | 90.56% | workspace.controller (100%), workspace.service (100%) |
| **src/log** | 92.85% | log.controller (100%), log.service (100%), archive.scheduler (100%) |
| **src/yjs** | 81.13% | yjs.gateway (100%), yjs.service (88.88%) |
| **src/common** | - | filters (88.23%), logger (100%), middleware (100%) |

## 🎯 테스트 전략

### 1. Controller 테스트
**목적**: API 엔드포인트의 라우팅, 가드, 인증/인가 검증

**테스트 파일**:
- `auth.controller.spec.ts` (7 tests)
- `user.controller.spec.ts` (10 tests)
- `workspace.controller.spec.ts` (22 tests)
- `log.controller.spec.ts` (18 tests)

**주요 테스트 항목**:
- ✅ HTTP 요청/응답 검증
- ✅ 가드 적용 확인 (JWT, Admin)
- ✅ 에러 핸들링
- ✅ DTO 검증
- ✅ 권한 기반 접근 제어

**예시**:
```typescript
// workspace.controller.spec.ts
it('should invite member to workspace', async () => {
  const result = await controller.inviteMember(
    workspaceId,
    inviteDto,
    mockRequest
  );

  expect(workspaceService.inviteMemberByGithubUsername).toHaveBeenCalled();
  expect(result).toBeDefined();
});
```

### 2. Service 테스트
**목적**: 비즈니스 로직, 데이터 처리, 트랜잭션 검증

**테스트 파일**:
- `auth.service.spec.ts` (8 tests)
- `user.service.spec.ts` (22 tests)
- `workspace.service.spec.ts` (20 tests)
- `log.service.spec.ts` (11 tests)
- `yjs.service.spec.ts` (23 tests)

**주요 테스트 항목**:
- ✅ CRUD 연산
- ✅ 비즈니스 규칙 검증
- ✅ 에러 시나리오
- ✅ 엣지 케이스
- ✅ Prisma 호출 검증

**예시**:
```typescript
// workspace.service.spec.ts
describe('removeMember', () => {
  it('should throw error if trying to remove workspace owner', async () => {
    mockPrismaService.workspaceMember.findUnique.mockResolvedValue(
      mockOwnerMember
    );

    await expect(
      service.removeMember(workspaceId, ownerId)
    ).rejects.toThrow('Cannot remove workspace owner');
  });
});
```

### 3. Guard 테스트
**목적**: 인증/인가 로직 검증

**테스트 파일**:
- `admin.guard.spec.ts` (6 tests)

**주요 테스트 항목**:
- ✅ OWNER/ADMIN 권한 검증
- ✅ 권한 부족 시 에러 처리
- ✅ 요청 컨텍스트 파싱

### 4. Strategy 테스트
**목적**: Passport 인증 전략 검증

**테스트 파일**:
- `jwt.strategy.spec.ts` (5 tests)
- `github.strategy.spec.ts` (7 tests)

**주요 테스트 항목**:
- ✅ JWT 토큰 검증
- ✅ GitHub OAuth 흐름
- ✅ 사용자 조회 및 생성

### 5. 스케줄러 테스트
**목적**: Cron 작업 및 자동화 로직 검증

**테스트 파일**:
- `archive.scheduler.spec.ts` (19 tests)

**주요 테스트 항목**:
- ✅ 일일 로그 아카이빙
- ✅ 날짜 계산 (월 경계 포함)
- ✅ 에러 처리 및 로깅
- ✅ 빈 문서 처리

**예시**:
```typescript
// archive.scheduler.spec.ts
it('should calculate yesterday correctly across month boundaries', async () => {
  const mockDate = new Date('2025-02-01T10:00:00.000Z');
  jest.spyOn(global, 'Date').mockImplementation(() => mockDate);

  await scheduler.archiveDailyLogs();

  const calledDate = mockYjsService.archiveYesterdayLogs.mock.calls[0][0];
  expect(calledDate.getDate()).toBe(31); // 2025-01-31
  expect(calledDate.getMonth()).toBe(0); // January
});
```

### 6. Yjs 실시간 협업 테스트
**목적**: CRDT 기반 실시간 편집 로직 검증

**테스트 파일**:
- `yjs.service.spec.ts` (23 tests)
- `yjs.gateway.spec.ts` (11 tests)

**주요 테스트 항목**:
- ✅ 문서 생성 및 관리
- ✅ 동시 편집 시나리오
- ✅ 문서 아카이빙
- ✅ 룸 이름 생성 (`workspaceId-YYYY-MM-DD`)

**예시**:
```typescript
// yjs.service.spec.ts
it('should allow multiple clients to edit same document', () => {
  const doc = service.getDocument('workspace-collab-2025-01-15');
  const yText1 = doc.getText('content');
  yText1.insert(0, 'Client 1: ');

  const doc2 = service.getDocument('workspace-collab-2025-01-15');
  const yText2 = doc2.getText('content');
  yText2.insert(10, 'editing');

  expect(yText1.toString()).toBe('Client 1: editing');
});
```

## 📁 테스트 파일 구조

```
backend/src/
├── auth/
│   ├── auth.controller.spec.ts    (7 tests)
│   ├── auth.service.spec.ts       (8 tests)
│   ├── guards/
│   │   └── admin.guard.spec.ts    (6 tests)
│   └── strategies/
│       ├── jwt.strategy.spec.ts   (5 tests)
│       └── github.strategy.spec.ts (7 tests)
├── user/
│   ├── user.controller.spec.ts    (10 tests)
│   └── user.service.spec.ts       (22 tests)
├── workspace/
│   ├── workspace.controller.spec.ts (22 tests)
│   └── workspace.service.spec.ts  (20 tests)
├── log/
│   ├── log.controller.spec.ts     (18 tests)
│   ├── log.service.spec.ts        (11 tests)
│   └── archive.scheduler.spec.ts  (19 tests)
└── yjs/
    ├── yjs.service.spec.ts        (23 tests)
    └── yjs.gateway.spec.ts        (11 tests)
```

## 🚀 테스트 실행

### 전체 테스트 실행
```bash
npm test
```

### 커버리지 리포트 생성
```bash
npm test -- --coverage
```

### 특정 파일 테스트
```bash
npm test -- workspace.service.spec.ts
```

### Watch 모드
```bash
npm test -- --watch
```

### 특정 테스트만 실행
```bash
npm test -- --testNamePattern="should remove member"
```

## 🎨 테스트 작성 가이드

### 1. 테스트 구조
```typescript
describe('ServiceName', () => {
  let service: ServiceName;
  let dependency: Dependency;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ServiceName,
        { provide: Dependency, useValue: mockDependency }
      ]
    }).compile();

    service = module.get<ServiceName>(ServiceName);
    dependency = module.get<Dependency>(Dependency);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('methodName', () => {
    it('should handle success case', async () => {
      // Arrange
      mockDependency.method.mockResolvedValue(expectedValue);

      // Act
      const result = await service.methodName();

      // Assert
      expect(result).toEqual(expectedValue);
      expect(mockDependency.method).toHaveBeenCalledWith(expectedArgs);
    });

    it('should handle error case', async () => {
      // Arrange
      mockDependency.method.mockRejectedValue(new Error('Failed'));

      // Act & Assert
      await expect(service.methodName()).rejects.toThrow('Failed');
    });
  });
});
```

### 2. Mock 패턴

**Prisma Service Mock**:
```typescript
const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  workspace: {
    // ... same pattern
  }
};
```

**Request Mock (Controller)**:
```typescript
const mockRequest = {
  user: {
    userId: 'user-123',
    githubId: '12345',
    githubUsername: 'testuser',
  }
};
```

### 3. 테스트 커버리지 목표

- ✅ **컨트롤러**: 100% (API 계약 보장)
- ✅ **서비스**: 100% (비즈니스 로직 보장)
- ✅ **가드**: 100% (보안 검증)
- ✅ **전략**: 100% (인증 보장)
- ⚠️ **모듈 파일**: 0% (설정 파일, 테스트 불필요)
- ⚠️ **main.ts**: 0% (부트스트랩, E2E에서 커버)

## 📈 커버리지 개선 히스토리

| 날짜 | 커버리지 | 추가된 테스트 | 주요 작업 |
|------|----------|--------------|----------|
| 2025-01-14 | 60.67% | - | 초기 상태 |
| 2025-01-15 | 63.63% | +32 (Controller 테스트) | P1-1 Phase 1 완료 |
| 2025-01-15 | 72.92% | +57 (Guard, Strategy, Yjs 테스트) | P1-2, P1-3 Phase 1-4 완료 |
| 2025-01-15 | 73.91% | +22 (UserService 테스트) | 사용자 관리 테스트 강화 |
| 2025-01-15 | 75.29% | +12 (WorkspaceService 테스트) | 워크스페이스 테스트 강화 |
| 2025-01-15 | 79.05% | +19 (ArchiveScheduler 테스트) | 스케줄러 테스트 추가 |
| 2025-01-16 | **80.08%** ✅ | +6 (LogService 추가 테스트) | **목표 달성!** |

## 🔍 주요 테스트 시나리오

### 인증 및 인가
```typescript
✅ GitHub 토큰 검증
✅ JWT 토큰 생성 및 검증
✅ 사용자 자동 생성 (첫 로그인 시)
✅ Admin 권한 검증
✅ Workspace 멤버십 확인
```

### 워크스페이스 관리
```typescript
✅ 워크스페이스 생성 (소유자 자동 설정)
✅ 멤버 초대 (GitHub 사용자명)
✅ 멤버 제거 (소유자 제거 방지)
✅ 권한 기반 접근 제어
✅ @ 접두사 처리
```

### 실시간 협업
```typescript
✅ Yjs 문서 생성 및 관리
✅ 동시 편집 (CRDT)
✅ 룸 이름 생성 (workspaceId-YYYY-MM-DD)
✅ 문서 아카이빙
✅ 빈 문서 필터링
```

### 일일 로그 아카이빙
```typescript
✅ 매일 자정 KST 아카이빙
✅ 어제 날짜 계산 (월 경계 포함)
✅ PostgreSQL 저장
✅ 에러 처리 및 로깅
✅ 빈 로그 건너뛰기
```

### 태스크 추출
```typescript
✅ 미완료 체크박스 추출 (- [ ])
✅ 사용자별 섹션 파싱 (### @username)
✅ 완료된 태스크 제외 (- [x])
✅ 빈 로그 처리
```

## 🐛 알려진 제한사항

### WebSocket 서버 초기화 (yjs.service.ts:19-27)
- **현재 커버리지**: 88.37%
- **미커버 라인**: onModuleInit의 WebSocketServer 인스턴스화
- **이유**: 단위 테스트에서 실제 WebSocket 서버 생성 불가
- **해결 방안**: 통합 테스트 또는 E2E 테스트에서 커버

### 모듈 파일들 (*.module.ts)
- **현재 커버리지**: 0%
- **이유**: NestJS 모듈 설정 파일로 비즈니스 로직 없음
- **우선순위**: 낮음 (테스트 불필요)

## 💡 테스트 작성 팁

### 1. AAA 패턴 사용
```typescript
it('should do something', async () => {
  // Arrange (준비)
  const input = 'test';
  mockService.method.mockResolvedValue('result');

  // Act (실행)
  const result = await service.doSomething(input);

  // Assert (검증)
  expect(result).toBe('result');
});
```

### 2. 의미 있는 테스트 이름
```typescript
❌ it('test 1', ...)
✅ it('should throw error if member not found', ...)

❌ it('works', ...)
✅ it('should allow removing ADMIN role', ...)
```

### 3. 엣지 케이스 테스트
```typescript
✅ 빈 값 (null, undefined, '')
✅ 경계 조건 (월 말일, 윤년)
✅ 권한 부족
✅ 중복 데이터
✅ 네트워크 에러
```

### 4. Mock 정리
```typescript
beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  jest.restoreAllMocks();
});
```

## 📚 참고 자료

- [NestJS Testing Documentation](https://docs.nestjs.com/fundamentals/testing)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)

---

**마지막 업데이트**: 2025-01-16
**목표 달성**: ✅ 80%+ 라인 커버리지 달성 (80.08%)
