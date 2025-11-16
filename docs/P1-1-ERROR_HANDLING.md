# P1-1: 에러 핸들링 통일

> HTTP Exception Filter 기반 중앙화된 에러 처리 시스템

## 🎯 목표

일관된 에러 응답 형식과 중앙화된 에러 처리로 API 사용성 향상

**예상 기간**: 3-5일
**예상 점수 개선**: 에러 핸들링 6/10 → 9/10

---

## 📊 현재 문제점

### 1. 일관성 없는 에러 응답
```typescript
// workspace.service.ts - NotFoundException
throw new NotFoundException('Workspace not found');
// 응답: { statusCode: 404, message: 'Workspace not found' }

// auth.controller.ts - 커스텀 응답
return { success: false, message: 'Invalid token' };
// 응답: { success: false, message: '...' }
```

### 2. 에러 코드 부재
- 클라이언트가 에러 타입을 message로만 구분해야 함
- 다국어 지원 불가능

### 3. 에러 추적 어려움
- 타임스탬프 없음
- 요청 경로 정보 없음
- 에러 ID/추적번호 없음

---

## ✨ 목표 아키텍처

### 표준 에러 응답 형식

```typescript
interface ErrorResponse {
  // 에러 코드 (대문자 스네이크 케이스)
  code: string;

  // 사람이 읽을 수 있는 메시지
  message: string;

  // ISO 8601 타임스탬프
  timestamp: string;

  // 요청 경로
  path: string;

  // 에러 추적 ID (선택적)
  traceId?: string;

  // 추가 세부 정보 (선택적)
  details?: any;
}
```

### 예시 응답

**404 Not Found**:
```json
{
  "code": "WORKSPACE_NOT_FOUND",
  "message": "Workspace with id 'abc123' does not exist",
  "timestamp": "2025-11-16T10:30:00.000Z",
  "path": "/workspaces/abc123",
  "traceId": "req-12345"
}
```

**400 Validation Error**:
```json
{
  "code": "VALIDATION_ERROR",
  "message": "Request validation failed",
  "timestamp": "2025-11-16T10:30:00.000Z",
  "path": "/workspaces",
  "details": {
    "errors": [
      {
        "field": "name",
        "constraint": "isNotEmpty",
        "message": "Workspace name is required"
      }
    ]
  }
}
```

**403 Forbidden**:
```json
{
  "code": "WORKSPACE_ACCESS_DENIED",
  "message": "You do not have permission to access this workspace",
  "timestamp": "2025-11-16T10:30:00.000Z",
  "path": "/workspaces/abc123",
  "details": {
    "requiredRole": "ADMIN",
    "userRole": "MEMBER"
  }
}
```

---

## 🧪 TDD: 유저 시나리오

### 시나리오 1: 리소스를 찾을 수 없음 (404)

```gherkin
Given: 사용자가 인증됨
When: 존재하지 않는 워크스페이스 조회
  GET /workspaces/non-existent-id
Then:
  - Status: 404 Not Found
  - Body.code: "WORKSPACE_NOT_FOUND"
  - Body.message: includes "does not exist"
  - Body.timestamp: valid ISO 8601
  - Body.path: "/workspaces/non-existent-id"
```

### 시나리오 2: 입력 검증 실패 (400)

```gherkin
Given: 사용자가 인증됨
When: 빈 이름으로 워크스페이스 생성 시도
  POST /workspaces
  { "name": "" }
Then:
  - Status: 400 Bad Request
  - Body.code: "VALIDATION_ERROR"
  - Body.details.errors[0].field: "name"
  - Body.details.errors[0].message: includes "required"
```

### 시나리오 3: 권한 없음 (403)

```gherkin
Given: 사용자가 MEMBER 권한으로 인증됨
When: 멤버 초대 시도 (ADMIN 권한 필요)
  POST /workspaces/{id}/invite
Then:
  - Status: 403 Forbidden
  - Body.code: "INSUFFICIENT_PERMISSION"
  - Body.details.requiredRole: "ADMIN"
  - Body.details.userRole: "MEMBER"
```

### 시나리오 4: 비즈니스 로직 에러 (409)

```gherkin
Given: 사용자가 이미 워크스페이스 멤버임
When: 같은 워크스페이스에 다시 초대 시도
Then:
  - Status: 409 Conflict
  - Body.code: "MEMBER_ALREADY_EXISTS"
  - Body.message: includes "already a member"
```

---

## 📝 구현 플랜

### Phase 1: 인터페이스 및 타입 정의 (1일차 오전)

```bash
# 파일 생성
mkdir -p backend/src/common/interfaces
mkdir -p backend/src/common/exceptions
mkdir -p backend/src/common/filters
```

**파일 1**: `common/interfaces/error-response.interface.ts`
```typescript
export interface ErrorResponse {
  code: string;
  message: string;
  timestamp: string;
  path: string;
  traceId?: string;
  details?: any;
}

export interface ValidationErrorDetail {
  field: string;
  constraint: string;
  message: string;
}
```

**파일 2**: `common/exceptions/business.exception.ts`
```typescript
import { HttpException, HttpStatus } from '@nestjs/common';

export class BusinessException extends HttpException {
  constructor(
    public readonly code: string,
    message: string,
    statusCode: HttpStatus = HttpStatus.BAD_REQUEST,
    public readonly details?: any,
  ) {
    super({ code, message, details }, statusCode);
  }
}

// 사전 정의된 예외들
export class WorkspaceNotFoundException extends BusinessException {
  constructor(workspaceId: string) {
    super(
      'WORKSPACE_NOT_FOUND',
      `Workspace with id '${workspaceId}' does not exist`,
      HttpStatus.NOT_FOUND,
    );
  }
}

export class MemberAlreadyExistsException extends BusinessException {
  constructor(username: string) {
    super(
      'MEMBER_ALREADY_EXISTS',
      `User '${username}' is already a member of this workspace`,
      HttpStatus.CONFLICT,
    );
  }
}

export class InsufficientPermissionException extends BusinessException {
  constructor(requiredRole: string, userRole: string) {
    super(
      'INSUFFICIENT_PERMISSION',
      'You do not have permission to perform this action',
      HttpStatus.FORBIDDEN,
      { requiredRole, userRole },
    );
  }
}
```

### Phase 2: 테스트 작성 (1일차 오후)

**파일 3**: `common/filters/http-exception.filter.spec.ts`

```typescript
import { Test } from '@nestjs/testing';
import { HttpExceptionFilter } from './http-exception.filter';
import { ArgumentsHost, NotFoundException } from '@nestjs/common';
import { BusinessException } from '../exceptions/business.exception';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let mockArgumentsHost: ArgumentsHost;
  let mockResponse: any;
  let mockRequest: any;

  beforeEach(async () => {
    // Setup mocks
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockRequest = {
      url: '/test-path',
      method: 'GET',
    };

    mockArgumentsHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as any;

    filter = new HttpExceptionFilter();
  });

  describe('NestJS built-in exceptions', () => {
    it('should handle NotFoundException', () => {
      const exception = new NotFoundException('Resource not found');

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'NOT_FOUND',
          message: 'Resource not found',
          timestamp: expect.any(String),
          path: '/test-path',
        }),
      );
    });
  });

  describe('BusinessException', () => {
    it('should handle custom business exceptions', () => {
      const exception = new BusinessException(
        'CUSTOM_ERROR',
        'Custom error message',
        400,
        { key: 'value' },
      );

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        code: 'CUSTOM_ERROR',
        message: 'Custom error message',
        timestamp: expect.any(String),
        path: '/test-path',
        details: { key: 'value' },
      });
    });
  });

  describe('Validation errors', () => {
    it('should format class-validator errors', () => {
      const validationError = {
        statusCode: 400,
        message: [
          {
            property: 'name',
            constraints: {
              isNotEmpty: 'name should not be empty',
            },
          },
        ],
        error: 'Bad Request',
      };

      const exception = new BadRequestException(validationError);

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'VALIDATION_ERROR',
          details: {
            errors: [
              {
                field: 'name',
                constraint: 'isNotEmpty',
                message: 'name should not be empty',
              },
            ],
          },
        }),
      );
    });
  });
});
```

### Phase 3: Filter 구현 (2일차)

**파일 4**: `common/filters/http-exception.filter.ts`

```typescript
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorResponse } from '../interfaces/error-response.interface';
import { BusinessException } from '../exceptions/business.exception';
import { v4 as uuidv4 } from 'uuid';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    const traceId = uuidv4();

    const errorResponse: ErrorResponse = {
      code: this.extractErrorCode(exception, exceptionResponse),
      message: this.extractMessage(exceptionResponse),
      timestamp: new Date().toISOString(),
      path: request.url,
      traceId,
    };

    // Add details if available
    const details = this.extractDetails(exceptionResponse);
    if (details) {
      errorResponse.details = details;
    }

    // Log error
    this.logError(exception, request, traceId, status);

    response.status(status).json(errorResponse);
  }

  private extractErrorCode(
    exception: HttpException,
    exceptionResponse: any,
  ): string {
    // BusinessException has custom code
    if (exception instanceof BusinessException) {
      return exception.code;
    }

    // Check if response has code
    if (typeof exceptionResponse === 'object' && exceptionResponse.code) {
      return exceptionResponse.code;
    }

    // Validation error
    if (this.isValidationError(exceptionResponse)) {
      return 'VALIDATION_ERROR';
    }

    // Map HTTP status to error code
    return this.httpStatusToErrorCode(exception.getStatus());
  }

  private extractMessage(exceptionResponse: any): string {
    if (typeof exceptionResponse === 'string') {
      return exceptionResponse;
    }

    if (exceptionResponse.message) {
      if (Array.isArray(exceptionResponse.message)) {
        return 'Request validation failed';
      }
      return exceptionResponse.message;
    }

    return 'An error occurred';
  }

  private extractDetails(exceptionResponse: any): any {
    if (typeof exceptionResponse !== 'object') {
      return null;
    }

    // Validation errors
    if (this.isValidationError(exceptionResponse)) {
      return {
        errors: exceptionResponse.message.map((err: any) => ({
          field: err.property,
          constraint: Object.keys(err.constraints)[0],
          message: Object.values(err.constraints)[0],
        })),
      };
    }

    // BusinessException details
    if (exceptionResponse.details) {
      return exceptionResponse.details;
    }

    return null;
  }

  private isValidationError(exceptionResponse: any): boolean {
    return (
      typeof exceptionResponse === 'object' &&
      Array.isArray(exceptionResponse.message) &&
      exceptionResponse.message.length > 0 &&
      exceptionResponse.message[0].property !== undefined
    );
  }

  private httpStatusToErrorCode(status: number): string {
    const codeMap: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'UNPROCESSABLE_ENTITY',
      500: 'INTERNAL_SERVER_ERROR',
    };

    return codeMap[status] || 'UNKNOWN_ERROR';
  }

  private logError(
    exception: HttpException,
    request: Request,
    traceId: string,
    status: number,
  ) {
    const message = `[${traceId}] ${request.method} ${request.url} - ${status} ${exception.message}`;

    if (status >= 500) {
      this.logger.error(message, exception.stack);
    } else {
      this.logger.warn(message);
    }
  }
}
```

### Phase 4: 서비스에 적용 (3일차)

**기존 코드 리팩토링**:

```typescript
// ❌ BEFORE: workspace.service.ts
async findById(id: string) {
  const workspace = await this.prisma.workspace.findUnique({
    where: { id },
  });

  if (!workspace) {
    throw new NotFoundException('Workspace not found');
  }

  return workspace;
}

// ✅ AFTER
async findById(id: string) {
  const workspace = await this.prisma.workspace.findUnique({
    where: { id },
  });

  if (!workspace) {
    throw new WorkspaceNotFoundException(id);
  }

  return workspace;
}
```

### Phase 5: 전역 필터 등록 (3일차)

**파일**: `main.ts`

```typescript
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // ... rest of configuration
}
```

### Phase 6: E2E 테스트 (4일차)

**파일**: `test/error-handling.e2e-spec.ts`

```typescript
describe('Error Handling (e2e)', () => {
  it('GET /workspaces/:id - 404 Not Found', () => {
    return request(app.getHttpServer())
      .get('/workspaces/non-existent')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(404)
      .expect((res) => {
        expect(res.body).toMatchObject({
          code: 'WORKSPACE_NOT_FOUND',
          message: expect.stringContaining('does not exist'),
          timestamp: expect.any(String),
          path: '/workspaces/non-existent',
          traceId: expect.any(String),
        });
      });
  });

  it('POST /workspaces - 400 Validation Error', () => {
    return request(app.getHttpServer())
      .post('/workspaces')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: '' })
      .expect(400)
      .expect((res) => {
        expect(res.body.code).toBe('VALIDATION_ERROR');
        expect(res.body.details.errors).toHaveLength(1);
      });
  });
});
```

---

## ✅ 검증 체크리스트

### 1일차 마무리
- [ ] 인터페이스 정의 완료
- [ ] BusinessException 클래스 작성
- [ ] 필터 테스트 15개 이상 작성
- [ ] 모든 테스트 FAIL 확인 (아직 구현 안 함)

### 2일차 마무리
- [ ] HttpExceptionFilter 구현 완료
- [ ] 모든 unit 테스트 PASS
- [ ] 빌드 성공: `npm run build`
- [ ] 린트 통과: `npm run lint`

### 3일차 마무리
- [ ] 모든 서비스에 커스텀 Exception 적용
- [ ] 전역 필터 등록
- [ ] 기존 테스트 모두 통과
- [ ] 타입 체크: `npx tsc --noEmit`

### 4일차 마무리
- [ ] E2E 테스트 10개 이상 작성
- [ ] 모든 테스트 PASS (unit + e2e)
- [ ] 커버리지 > 90%
- [ ] 검증 스크립트 실행: `./validate.sh`

---

## 📊 성공 지표

- ✅ 모든 API 엔드포인트가 표준 형식 에러 반환
- ✅ 에러 코드 30개 이상 정의
- ✅ 테스트 커버리지 > 90%
- ✅ E2E 테스트로 모든 에러 시나리오 검증
- ✅ 응답 시간 영향 < 5ms

---

## 🎯 다음 단계

완료 후:
1. 커밋 및 푸시
2. P1-2 로깅 시작
3. 에러 모니터링 대시보드 구성 (P2-2에서)

---

*Next: [P1-2-LOGGING.md](./P1-2-LOGGING.md)*
