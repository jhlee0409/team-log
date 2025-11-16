# P1-2: 구조화된 로깅

> Winston 기반 구조화 로깅 시스템 구축

## 🎯 목표

프로덕션 환경에서 디버깅과 모니터링을 위한 체계적인 로깅 시스템

**예상 기간**: 2-3일
**예상 점수 개선**: 모니터링 5/10 → 7/10

---

## 📊 현재 문제점

```typescript
// ❌ 산발적인 console.log 사용
console.log('User logged in:', user.id);
console.error('GitHub token validation failed:', error);

// 문제점:
// 1. 로그 레벨 관리 불가
// 2. 프로덕션 환경에서 로그 수집 어려움
// 3. 구조화되지 않은 메시지
// 4. 민감 정보 노출 위험
```

---

## ✨ 목표 아키텍처

### 구조화된 로그 형식

```json
{
  "timestamp": "2025-11-16T10:30:00.000Z",
  "level": "info",
  "context": "AuthService",
  "message": "User authenticated successfully",
  "userId": "user-123",
  "githubUsername": "testuser",
  "method": "POST",
  "path": "/auth/github/token",
  "duration": 245,
  "traceId": "req-abc123"
}
```

---

## 🧪 TDD: 유저 시나리오

### 시나리오 1: 요청/응답 로깅

```gherkin
Given: 사용자가 API 요청
When: POST /workspaces { "name": "My Workspace" }
Then: 로그 기록됨
  - Level: info
  - Method: POST
  - Path: /workspaces
  - Status: 201
  - Duration: 150ms
  - 민감 정보 마스킹됨 (token, password)
```

### 시나리오 2: 에러 로깅

```gherkin
Given: 데이터베이스 연결 실패
When: 워크스페이스 조회 시도
Then: 에러 로그 기록됨
  - Level: error
  - Message: "Database connection failed"
  - Stack trace: included
  - Context: "WorkspaceService"
  - TraceId: "req-xyz789"
```

---

## 📝 구현 플랜

### Phase 1: Winston 설정 (1일차)

**설치**:
```bash
npm install winston winston-daily-rotate-file
npm install -D @types/winston
```

**파일 1**: `common/logger/winston.config.ts`

```typescript
import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

export const winstonConfig = {
  transports: [
    // Console (development)
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
      ),
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    }),

    // File - All logs
    new DailyRotateFile({
      filename: 'logs/application-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      format: logFormat,
    }),

    // File - Errors only
    new DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '30d',
      format: logFormat,
    }),
  ],
};
```

**파일 2**: `common/logger/logger.service.ts`

```typescript
import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import * as winston from 'winston';
import { winstonConfig } from './winston.config';

@Injectable()
export class LoggerService implements NestLoggerService {
  private logger: winston.Logger;

  constructor(private context?: string) {
    this.logger = winston.createLogger(winstonConfig);
  }

  log(message: string, context?: string, meta?: any) {
    this.logger.info(message, { context: context || this.context, ...meta });
  }

  error(message: string, trace?: string, context?: string, meta?: any) {
    this.logger.error(message, {
      context: context || this.context,
      trace,
      ...meta,
    });
  }

  warn(message: string, context?: string, meta?: any) {
    this.logger.warn(message, { context: context || this.context, ...meta });
  }

  debug(message: string, context?: string, meta?: any) {
    this.logger.debug(message, { context: context || this.context, ...meta });
  }

  verbose(message: string, context?: string, meta?: any) {
    this.logger.verbose(message, { context: context || this.context, ...meta });
  }
}
```

### Phase 2: HTTP 로깅 미들웨어 (2일차)

**파일 3**: `common/middleware/http-logger.middleware.ts`

```typescript
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class HttpLoggerMiddleware implements NestMiddleware {
  private logger = new LoggerService('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl, body, headers } = req;
    const startTime = Date.now();

    // Mask sensitive data
    const sanitizedBody = this.maskSensitiveData(body);

    // Log request
    this.logger.log('Incoming request', 'HTTP', {
      method,
      path: originalUrl,
      userAgent: headers['user-agent'],
      ip: req.ip,
      body: sanitizedBody,
    });

    // Log response when finished
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const { statusCode } = res;

      const logLevel = statusCode >= 400 ? 'error' : 'log';

      this.logger[logLevel]('Request completed', 'HTTP', {
        method,
        path: originalUrl,
        statusCode,
        duration,
      });
    });

    next();
  }

  private maskSensitiveData(data: any): any {
    if (!data || typeof data !== 'object') return data;

    const sensitiveKeys = ['password', 'token', 'secret', 'apiKey'];
    const masked = { ...data };

    for (const key of Object.keys(masked)) {
      if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
        masked[key] = '***MASKED***';
      }
    }

    return masked;
  }
}
```

### Phase 3: 서비스 로깅 적용 (2-3일차)

```typescript
// auth.service.ts
import { LoggerService } from '../common/logger/logger.service';

export class AuthService {
  private logger = new LoggerService(AuthService.name);

  async validateGithubToken(token: string) {
    this.logger.log('Validating GitHub token', AuthService.name);

    try {
      // ... validation logic

      this.logger.log('GitHub token validated successfully', AuthService.name, {
        githubId: user.githubId,
        username: user.githubUsername,
      });

      return user;
    } catch (error) {
      this.logger.error('GitHub token validation failed', error.stack, AuthService.name, {
        errorMessage: error.message,
      });

      return null;
    }
  }
}
```

---

## ✅ 검증 체크리스트

### 1일차
- [ ] Winston 설정 완료
- [ ] LoggerService 구현
- [ ] 로그 레벨 테스트 (debug, info, warn, error)
- [ ] 파일 로테이션 테스트

### 2일차
- [ ] HTTP 미들웨어 구현
- [ ] 민감 정보 마스킹 테스트
- [ ] 요청/응답 로깅 검증

### 3일차
- [ ] 모든 서비스에 로깅 적용
- [ ] console.log 제거 (0개)
- [ ] 린트 규칙 추가: no-console

---

*Next: [P1-3-TEST_COVERAGE.md](./P1-3-TEST_COVERAGE.md)*
