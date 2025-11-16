# TDD 워크플로우 가이드

> Test-Driven Development 기반 개발 프로세스

## 🎯 핵심 원칙

**"테스트를 먼저 작성하고, 구현은 나중에"**

TDD의 3단계 사이클:
1. 🔴 **Red**: 실패하는 테스트 작성
2. 🟢 **Green**: 테스트를 통과하는 최소한의 코드 작성
3. 🔵 **Refactor**: 코드 개선 (테스트는 계속 통과)

---

## 📋 상세 워크플로우

### Step 1: 유저 시나리오 정의 ✍️

```markdown
# 시나리오 예시: HTTP Exception Filter

## 유저 스토리
As a: API 사용자
I want: 일관된 형식의 에러 응답을 받고 싶다
So that: 에러를 쉽게 파싱하고 처리할 수 있다

## 시나리오 1: 404 Not Found
Given: 존재하지 않는 워크스페이스 조회
When: GET /workspaces/non-existent-id
Then:
  - Status: 404
  - Body: { code: "WORKSPACE_NOT_FOUND", message: "...", timestamp: "..." }

## 시나리오 2: 400 Validation Error
Given: 잘못된 형식의 요청
When: POST /workspaces { name: "" }
Then:
  - Status: 400
  - Body: { code: "VALIDATION_ERROR", message: "...", errors: [...] }
```

### Step 2: 인터페이스/타입 설계 🎨

```typescript
// BEFORE 테스트 작성

// 1. 타입 정의
interface ErrorResponse {
  code: string;
  message: string;
  timestamp: string;
  path: string;
  details?: any;
}

// 2. 예외 클래스 설계
class BusinessException extends HttpException {
  constructor(code: string, message: string, statusCode: number);
}
```

### Step 3: 테스트 작성 (Red 단계) 🔴

```bash
# 테스트 파일 생성
touch backend/src/common/filters/http-exception.filter.spec.ts

# Watch 모드로 테스트 실행
cd backend
npm run test:watch -- http-exception.filter
```

```typescript
// http-exception.filter.spec.ts
import { Test } from '@nestjs/testing';
import { HttpExceptionFilter } from './http-exception.filter';
import { NotFoundException } from '@nestjs/common';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [HttpExceptionFilter],
    }).compile();

    filter = module.get<HttpExceptionFilter>(HttpExceptionFilter);
  });

  it('should be defined', () => {
    expect(filter).toBeDefined();
  });

  describe('catch', () => {
    it('should format NotFoundException correctly', () => {
      const mockJson = jest.fn();
      const mockStatus = jest.fn().mockReturnValue({ json: mockJson });
      const mockResponse = { status: mockStatus } as any;
      const mockRequest = { url: '/test' } as any;

      const exception = new NotFoundException('Resource not found');

      filter.catch(exception, {
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      } as any);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          code: expect.any(String),
          message: 'Resource not found',
          timestamp: expect.any(String),
          path: '/test',
        })
      );
    });
  });
});
```

**예상 결과**: ❌ FAIL (HttpExceptionFilter 아직 구현 안 함)

### Step 4: 구현 (Green 단계) 🟢

```typescript
// http-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import { Response, Request } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();

    response.status(status).json({
      code: this.getErrorCode(exception),
      message: exception.message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  private getErrorCode(exception: HttpException): string {
    // 간단한 구현
    return exception.constructor.name.replace('Exception', '').toUpperCase();
  }
}
```

```bash
# 테스트 실행
npm test -- http-exception.filter

# 예상 결과: ✅ PASS
```

### Step 5: 리팩토링 (Refactor 단계) 🔵

```typescript
// 코드 개선
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    const errorResponse = {
      code: this.extractErrorCode(exceptionResponse),
      message: this.extractMessage(exceptionResponse),
      timestamp: new Date().toISOString(),
      path: request.url,
      ...(this.isValidationError(exceptionResponse) && {
        details: this.extractValidationErrors(exceptionResponse),
      }),
    };

    response.status(status).json(errorResponse);
  }

  // ... helper methods
}
```

```bash
# 리팩토링 후에도 테스트 통과 확인
npm test -- http-exception.filter

# 예상 결과: ✅ PASS (여전히)
```

### Step 6: 통합 테스트 작성 🧩

```typescript
// workspace.controller.spec.ts (E2E 스타일)
describe('WorkspaceController Error Handling', () => {
  it('should return formatted error for not found', async () => {
    const result = await request(app.getHttpServer())
      .get('/workspaces/non-existent')
      .expect(404);

    expect(result.body).toMatchObject({
      code: 'WORKSPACE_NOT_FOUND',
      message: expect.any(String),
      timestamp: expect.any(String),
      path: '/workspaces/non-existent',
    });
  });
});
```

---

## ✅ 검증 체크리스트

각 단계마다 다음을 확인:

### 테스트 작성 후
- [ ] 테스트가 명확한 시나리오를 표현하는가?
- [ ] 테스트가 실패하는가? (Red 확인)
- [ ] 테스트 이름이 의도를 설명하는가?

### 구현 후
- [ ] 모든 테스트가 통과하는가? (Green 확인)
- [ ] 최소한의 코드로 구현했는가?
- [ ] 엣지 케이스를 고려했는가?

### 리팩토링 후
- [ ] 코드가 더 읽기 쉬워졌는가?
- [ ] 중복이 제거되었는가?
- [ ] 테스트가 여전히 통과하는가?

---

## 🎯 베스트 프랙티스

### ✅ DO

```typescript
// ✅ 명확한 테스트 이름
it('should return 404 when workspace not found', () => {});

// ✅ AAA 패턴 (Arrange, Act, Assert)
it('should create workspace', () => {
  // Arrange
  const dto = { name: 'Test Workspace' };

  // Act
  const result = await service.create(dto, userId);

  // Assert
  expect(result).toHaveProperty('id');
});

// ✅ 독립적인 테스트
beforeEach(() => {
  // 매 테스트마다 새로운 상태
  jest.clearAllMocks();
});
```

### ❌ DON'T

```typescript
// ❌ 모호한 테스트 이름
it('works', () => {});

// ❌ 여러 개념을 한 번에 테스트
it('should create, update, and delete workspace', () => {});

// ❌ 테스트 간 의존성
it('should create workspace', () => {
  createdId = result.id; // 전역 변수 사용
});
it('should update workspace', () => {
  await service.update(createdId); // 이전 테스트에 의존
});
```

---

## 🔄 실전 예제: P1-1 에러 핸들링

### Phase 1: 계획 (30분)
```bash
# 1. 시나리오 문서 읽기
cat docs/P1-1-ERROR_HANDLING.md

# 2. 유저 시나리오 정리
# 3. 인터페이스 설계
```

### Phase 2: Red (1-2시간)
```bash
# 1. 테스트 파일 생성
touch backend/src/common/filters/http-exception.filter.spec.ts
touch backend/src/common/exceptions/business.exception.spec.ts

# 2. 테스트 작성
npm run test:watch

# 3. 모든 테스트 FAIL 확인
```

### Phase 3: Green (2-3시간)
```bash
# 1. 구현
touch backend/src/common/filters/http-exception.filter.ts
touch backend/src/common/exceptions/business.exception.ts

# 2. 테스트 통과 확인
npm test

# 예상: ✅ All tests passed
```

### Phase 4: Refactor (1-2시간)
```bash
# 1. 코드 개선
# 2. 테스트 계속 통과 확인
npm test

# 3. 커버리지 확인
npm run test:cov
```

### Phase 5: 검증 (30분)
```bash
# VALIDATION_CHECKLIST.md 참조
npm run build       # ✅
npm run lint        # ✅
npm test            # ✅
npm run test:cov    # ✅ 커버리지 확인
```

---

## 📊 진행 상황 추적

각 작업마다 다음을 기록:

```markdown
## P1-1: 에러 핸들링 통일

### 진행 상황
- [x] 시나리오 정의
- [x] 인터페이스 설계
- [x] 테스트 작성 (Red)
- [x] 구현 (Green)
- [x] 리팩토링
- [x] 검증 체크리스트

### 테스트 통계
- Unit Tests: 15 passed
- Integration Tests: 5 passed
- Coverage: 92%

### 검증 결과
- ✅ Build: Success
- ✅ Lint: No errors
- ✅ Type Check: Success
- ✅ Tests: 20/20 passed
```

---

## 🆘 문제 해결

### "테스트가 너무 많이 실패해요"
→ 한 번에 하나의 테스트만 작성하고 통과시키세요.

### "테스트를 어떻게 작성해야 할지 모르겠어요"
→ 유저 시나리오부터 시작하세요. "사용자가 X를 하면 Y가 나와야 한다"

### "리팩토링 후 테스트가 깨져요"
→ 리팩토링 전 커밋하세요. `git commit -m "feat: working implementation"`

---

*Next: [VALIDATION_CHECKLIST.md](./VALIDATION_CHECKLIST.md)*
