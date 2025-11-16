# P1-3: 테스트 커버리지 80% 달성

> 컨트롤러, 가드, 게이트웨이 테스트 추가로 전체 커버리지 80% 달성

## 🎯 목표

**예상 기간**: 1-2주
**예상 점수 개선**: 테스트 6/10 → 9/10
**커버리지**: 65% → 80%+

---

## 📊 현재 상태

### 완료된 테스트 (P0)
- ✅ AuthService: 8 tests
- ✅ WorkspaceService: 5 tests
- ✅ LogService: 6 tests
- **Total**: 19 tests, 65% coverage

### 미완료 영역
- ❌ Controllers (0 tests)
- ❌ Guards (0 tests)
- ❌ Gateways (0 tests)
- ❌ E2E tests (0 tests)

---

## 📝 구현 플랜

### Phase 1: 컨트롤러 테스트 (Week 1)

#### 1.1 AuthController (2일)

```typescript
// auth.controller.spec.ts
describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            validateGithubToken: jest.fn(),
            generateToken: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  describe('POST /auth/github/token', () => {
    it('should return access token for valid token', async () => {
      const mockUser = { id: '1', githubUsername: 'test' };
      const mockResult = { access_token: 'jwt.token', user: mockUser };

      jest.spyOn(authService, 'validateGithubToken').mockResolvedValue(mockUser);
      jest.spyOn(authService, 'generateToken').mockResolvedValue(mockResult);

      const result = await controller.validateGithubToken({
        token: 'valid-token',
      });

      expect(result.success).toBe(true);
      expect(result.access_token).toBeDefined();
    });

    it('should return error for invalid token', async () => {
      jest.spyOn(authService, 'validateGithubToken').mockResolvedValue(null);

      const result = await controller.validateGithubToken({
        token: 'invalid-token',
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid GitHub token');
    });
  });

  // ... 더 많은 테스트
});
```

#### 1.2 WorkspaceController (2일)
#### 1.3 LogController (1일)
#### 1.4 UserController (1일)

### Phase 2: 가드 테스트 (Week 1)

#### 2.1 JwtAuthGuard (1일)

```typescript
// jwt-auth.guard.spec.ts
describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new JwtAuthGuard(reflector);
  });

  it('should allow access with valid JWT', async () => {
    const mockExecutionContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: { id: '1', githubUsername: 'test' },
        }),
      }),
      getHandler: () => {},
      getClass: () => {},
    } as any;

    const result = await guard.canActivate(mockExecutionContext);

    expect(result).toBe(true);
  });

  it('should deny access without JWT', async () => {
    // ... test implementation
  });
});
```

#### 2.2 WorkspaceAdminGuard (1일)

### Phase 3: 게이트웨이 테스트 (Week 2)

#### 3.1 YjsGateway (3일)

```typescript
// yjs.gateway.spec.ts
describe('YjsGateway', () => {
  let gateway: YjsGateway;
  let yjsService: YjsService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        YjsGateway,
        {
          provide: YjsService,
          useValue: {
            handleConnection: jest.fn(),
            handleDisconnection: jest.fn(),
            syncDocument: jest.fn(),
          },
        },
      ],
    }).compile();

    gateway = module.get<YjsGateway>(YjsGateway);
    yjsService = module.get<YjsService>(YjsService);
  });

  describe('handleConnection', () => {
    it('should initialize Yjs document for workspace', async () => {
      const mockClient = {
        id: 'client-1',
        handshake: {
          query: { workspaceId: 'workspace-1' },
        },
      } as any;

      await gateway.handleConnection(mockClient);

      expect(yjsService.handleConnection).toHaveBeenCalledWith(
        'workspace-1',
        mockClient,
      );
    });
  });

  // ... more tests
});
```

### Phase 4: E2E 테스트 (Week 2)

#### 4.1 인증 플로우 (1일)

```typescript
// test/auth.e2e-spec.ts
describe('Authentication (e2e)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('POST /auth/github/token - should authenticate with valid token', () => {
    return request(app.getHttpServer())
      .post('/auth/github/token')
      .send({ token: 'valid-github-token' })
      .expect(200)
      .expect((res) => {
        expect(res.body.success).toBe(true);
        expect(res.body.access_token).toBeDefined();
        authToken = res.body.access_token;
      });
  });

  it('GET /auth/me - should return current user', () => {
    return request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.githubUsername).toBeDefined();
      });
  });
});
```

#### 4.2 워크스페이스 CRUD (2일)
#### 4.3 로그 관리 (1일)

---

## 📊 목표 커버리지

### 파일별 목표

| 파일 | 현재 | 목표 |
|------|------|------|
| auth.service.ts | 95% | 95% |
| workspace.service.ts | 88% | 90% |
| log.service.ts | 92% | 92% |
| **auth.controller.ts** | 0% | **85%** |
| **workspace.controller.ts** | 0% | **85%** |
| **log.controller.ts** | 0% | **85%** |
| **yjs.gateway.ts** | 0% | **70%** |
| **Guards** | 0% | **90%** |
| **Filters** | 0% | **95%** |

### 전체 목표
- **Statements**: 80%+
- **Branches**: 75%+
- **Functions**: 80%+
- **Lines**: 80%+

---

## ✅ 검증 체크리스트

### Week 1 마무리
- [ ] 모든 컨트롤러 테스트 완료 (4개)
- [ ] 모든 가드 테스트 완료 (2개)
- [ ] 커버리지 > 75%
- [ ] 모든 테스트 통과

### Week 2 마무리
- [ ] 게이트웨이 테스트 완료
- [ ] E2E 테스트 10개 이상
- [ ] 커버리지 > 80%
- [ ] CI/CD 파이프라인에 테스트 통합

---

*Next: [P2-1-PERFORMANCE.md](./P2-1-PERFORMANCE.md)*
