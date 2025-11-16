# CLAUDE.md - AI Assistant Guide for TeamLog

> **Purpose**: This document provides AI assistants with comprehensive guidance on the TeamLog codebase structure, development workflows, and key conventions.

**Last Updated**: 2025-11-16
**Repository**: teamlog (VS Code Extension + NestJS Backend)
**Target Coverage**: 80%+ (Currently: 80.08% ✅)

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Repository Structure](#repository-structure)
3. [Technology Stack](#technology-stack)
4. [Development Setup](#development-setup)
5. [Architecture Patterns](#architecture-patterns)
6. [Code Conventions](#code-conventions)
7. [Database Schema](#database-schema)
8. [API Endpoints](#api-endpoints)
9. [Testing Guidelines](#testing-guidelines)
10. [Error Handling](#error-handling)
11. [Logging Standards](#logging-standards)
12. [Common Tasks](#common-tasks)
13. [Troubleshooting](#troubleshooting)

---

## Project Overview

**TeamLog** is a VS Code extension that enables real-time collaborative daily logging for development teams. It combines:

- **Frontend**: VS Code Extension (React + CodeMirror)
- **Backend**: NestJS API + Yjs WebSocket Server
- **Database**: PostgreSQL with Prisma ORM
- **Real-time**: Yjs CRDT for conflict-free collaborative editing

### Key Features

- **No-Login Auth**: Uses VS Code's built-in GitHub authentication
- **Real-time Collaboration**: Yjs-powered CRDT editing
- **Daily Auto-Archiving**: Logs archived to PostgreSQL at midnight KST
- **Smart Task Management**: Import yesterday's uncompleted tasks
- **GitHub-Based Invites**: Invite by @username
- **@Mentions**: Client-side mention detection with badge notifications

---

## Repository Structure

```
team-log/
├── backend/                    # NestJS backend (Node.js)
│   ├── src/
│   │   ├── auth/              # GitHub OAuth & JWT authentication
│   │   │   ├── guards/        # WorkspaceAdminGuard
│   │   │   └── strategies/    # JwtStrategy, GithubStrategy
│   │   ├── user/              # User management
│   │   ├── workspace/         # Workspace & team management
│   │   ├── log/               # Daily log CRUD & archiving
│   │   ├── yjs/               # Real-time WebSocket server
│   │   ├── health/            # Health check endpoint
│   │   ├── common/            # Shared utilities
│   │   │   ├── exceptions/    # BusinessException hierarchy
│   │   │   ├── filters/       # HttpExceptionFilter
│   │   │   ├── logger/        # Winston-based logging
│   │   │   └── middleware/    # HTTP request/response logging
│   │   ├── prisma/            # Database ORM service
│   │   ├── config/            # Environment validation
│   │   └── main.ts            # Bootstrap entry point
│   ├── prisma/
│   │   └── schema.prisma      # Database schema
│   ├── test/                  # E2E tests
│   ├── jest.config.js         # Jest configuration
│   ├── tsconfig.json          # TypeScript config
│   ├── .eslintrc.js           # ESLint rules
│   ├── TESTING.md             # Testing guide (80%+ coverage)
│   └── package.json
│
├── extension/                  # VS Code extension (TypeScript + React)
│   ├── src/
│   │   ├── extension.ts       # Extension activation & lifecycle
│   │   ├── teamLogProvider.ts # Webview provider
│   │   ├── services/
│   │   │   └── authService.ts # GitHub OAuth via VS Code API
│   │   └── webview/
│   │       ├── App.tsx        # Root React component
│   │       ├── components/    # React UI components
│   │       │   ├── Editor.tsx # CodeMirror + Yjs integration
│   │       │   ├── WorkspaceSelector.tsx
│   │       │   └── AuthScreen.tsx
│   │       ├── services/
│   │       │   └── apiService.ts # Backend API client
│   │       ├── index.tsx      # React entry point
│   │       └── styles.css     # VS Code theme-aware styles
│   ├── webpack.config.js      # Dual build (extension + webview)
│   ├── tsconfig.json
│   └── package.json
│
├── docs/                       # Development guides
│   ├── P1-1-ERROR_HANDLING.md # Error handling patterns
│   ├── P1-2-LOGGING.md        # Logging standards
│   ├── P2-1-PERFORMANCE.md    # Performance guidelines
│   ├── P2-2-MONITORING.md     # Monitoring setup
│   └── P2-3-API_DOCS.md       # Swagger/OpenAPI docs
│
├── .github/
│   └── workflows/
│       ├── claude.yml         # Claude Code integration
│       └── claude-code-review.yml
│
├── docker-compose.yml          # PostgreSQL setup
├── package.json                # Monorepo root (npm workspaces)
└── README.md                   # User-facing documentation
```

---

## Technology Stack

### Backend (NestJS)

| Technology | Version | Purpose |
|------------|---------|---------|
| **NestJS** | 10.3.0 | Node.js framework |
| **PostgreSQL** | Latest | Relational database |
| **Prisma** | 5.8.0 | Type-safe ORM |
| **Yjs** | 13.6.10 | CRDT collaboration |
| **y-websocket** | 1.5.0 | WebSocket server |
| **Passport.js** | 0.7.0 | Authentication |
| **Winston** | 3.18.3 | Structured logging |
| **Jest** | 29.7.0 | Testing framework |
| **Swagger** | 7.4.2 | API documentation |
| **class-validator** | 0.14.0 | DTO validation |
| **class-transformer** | 0.5.1 | DTO transformation |
| **Helmet** | 8.1.0 | Security headers |

### Frontend (VS Code Extension)

| Technology | Version | Purpose |
|------------|---------|---------|
| **VS Code API** | 1.85.0+ | Extension framework |
| **React** | 18.2.0 | UI framework |
| **TypeScript** | 5.3.3 | Type safety |
| **CodeMirror** | 6.x | Code editor |
| **y-codemirror.next** | 0.3.5 | Yjs bindings for CodeMirror |
| **Yjs** | 13.6.10 | CRDT client |
| **Webpack** | 5.89.0 | Bundler |

---

## Development Setup

### Prerequisites

- Node.js 18+
- npm
- Docker & Docker Compose
- VS Code 1.85+
- GitHub account

### Initial Setup

```bash
# 1. Clone repository
git clone https://github.com/yourusername/team-log.git
cd team-log

# 2. Install root dependencies
npm install

# 3. Start PostgreSQL
docker-compose up -d

# 4. Setup backend
cd backend
npm install
npm run prisma:generate
npm run prisma:migrate
npm run start:dev  # Runs on http://localhost:3000

# 5. Setup extension (in new terminal)
cd ../extension
npm install
npm run build
```

### Running the Extension

1. Open `team-log` folder in VS Code
2. Press `F5` to launch Extension Development Host
3. In new VS Code window, click TeamLog icon in Activity Bar
4. Authenticate with GitHub
5. Create/select workspace and start logging

### Development Mode

```bash
# Terminal 1: Backend (watch mode)
cd backend
npm run start:dev

# Terminal 2: Extension (watch mode)
cd extension
npm run watch

# Terminal 3: Database
docker-compose up

# Terminal 4: Prisma Studio (optional)
cd backend
npm run prisma:studio  # Opens at http://localhost:5555
```

---

## Architecture Patterns

### Backend Architecture

#### 1. **Module-Based Structure**

Each feature is organized as a NestJS module:

```typescript
@Module({
  imports: [DependencyModule],          // Import dependencies
  controllers: [FeatureController],     // HTTP endpoints
  providers: [FeatureService, Guard],   // Business logic
  exports: [FeatureService]             // Export for other modules
})
export class FeatureModule {}
```

**Current Modules**:
- `AuthModule` - Authentication & authorization
- `UserModule` - User management
- `WorkspaceModule` - Workspace & team management
- `LogModule` - Daily log CRUD & archiving
- `YjsModule` - Real-time WebSocket server
- `HealthModule` - System health checks
- `PrismaModule` - Database client

#### 2. **Service Layer Pattern**

All business logic resides in services:

```typescript
@Injectable()
export class WorkspaceService {
  constructor(
    private prisma: PrismaService,
    private userService: UserService,
  ) {}

  async create(name: string, userId: string) {
    // Business logic here
    return this.prisma.workspace.create({...});
  }
}
```

**Conventions**:
- ✅ Services are injected via constructor
- ✅ Services handle database operations via Prisma
- ✅ Services throw `BusinessException` for errors
- ✅ Services use `LoggerService` for logging
- ✅ Services are 100% unit tested

#### 3. **Controller Layer Pattern**

Controllers handle HTTP requests/responses:

```typescript
@Controller('workspaces')
@ApiTags('workspaces')
@UseGuards(AuthGuard('jwt'))
export class WorkspaceController {
  constructor(private workspaceService: WorkspaceService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new workspace' })
  async create(
    @Body() dto: CreateWorkspaceDto,
    @Req() req: RequestWithUser
  ) {
    return this.workspaceService.create(dto.name, req.user.userId);
  }
}
```

**Conventions**:
- ✅ Controllers delegate to services
- ✅ DTOs validate input via `class-validator`
- ✅ Guards protect endpoints (`@UseGuards`)
- ✅ Swagger decorators document APIs (`@ApiOperation`)
- ✅ Controllers are 100% unit tested

#### 4. **Exception Hierarchy**

Custom exceptions extend `BusinessException`:

```typescript
// Base class
export class BusinessException extends HttpException {
  constructor(
    public readonly code: string,
    message: string,
    statusCode: HttpStatus,
    public readonly details?: any,
  ) {
    super({ code, message, details }, statusCode);
  }
}

// Derived exceptions
export class WorkspaceNotFoundException extends BusinessException {
  constructor(workspaceId: string) {
    super(
      'WORKSPACE_NOT_FOUND',
      `Workspace with id '${workspaceId}' does not exist`,
      HttpStatus.NOT_FOUND,
    );
  }
}
```

**All Exceptions** (in `common/exceptions/business.exception.ts`):
- `WorkspaceNotFoundException`
- `WorkspaceAccessDeniedException`
- `MemberAlreadyExistsException`
- `UserNotFoundException`
- `AuthenticationFailedException`
- `InvalidGithubTokenException`
- `InsufficientPermissionException`
- `ValidationException`
- `LogNotFoundException`
- `ExternalServiceException`
- `DatabaseException`

#### 5. **Global Exception Filter**

`HttpExceptionFilter` standardizes all error responses:

```typescript
// Standard error response format
{
  "code": "WORKSPACE_NOT_FOUND",          // Error code (UPPER_SNAKE_CASE)
  "message": "Workspace with id '...' does not exist",
  "timestamp": "2025-11-16T10:00:00.000Z",
  "path": "/workspaces/abc123",
  "traceId": "uuid-for-tracking",
  "details": { ... }                       // Optional context
}
```

**Features**:
- Auto-extracts error codes from `BusinessException`
- Maps HTTP status codes to default error codes
- Formats validation errors with field details
- Generates unique trace IDs for debugging
- Logs errors with Winston (error for 5xx, warn for 4xx)

#### 6. **Authentication & Authorization**

**Two Strategies**:

1. **GitHub OAuth Strategy** (`github.strategy.ts`)
   - For web-based OAuth flow
   - Validates GitHub profile
   - Creates/updates user in database

2. **JWT Strategy** (`jwt.strategy.ts`)
   - Extracts JWT from `Authorization: Bearer <token>`
   - Validates signature and expiration
   - Attaches user to request object

**Guards**:

1. **AuthGuard('jwt')** - Requires valid JWT token
2. **WorkspaceAdminGuard** - Requires ADMIN or OWNER role

**Usage**:

```typescript
// Require authentication
@UseGuards(AuthGuard('jwt'))

// Require admin access
@UseGuards(AuthGuard('jwt'), WorkspaceAdminGuard)
async inviteMember(...) { ... }
```

#### 7. **DTO Validation Pattern**

All DTOs use `class-validator`:

```typescript
import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateWorkspaceDto {
  @ApiProperty({
    description: 'Workspace name',
    example: 'My Team Workspace',
    minLength: 1,
    maxLength: 100,
  })
  @IsNotEmpty({ message: 'Workspace name is required' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;
}
```

**Validation Pipeline** (in `main.ts`):

```typescript
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,        // Strip unknown properties
  forbidNonWhitelisted: false,
  transform: true,        // Auto-transform types
}));
```

#### 8. **Real-time Collaboration (Yjs)**

**Architecture**:

```
Client (CodeMirror) ←→ WebSocket ←→ YjsService ←→ Yjs Document (CRDT)
                                         ↓
                                   Prisma (Archive)
```

**Room Naming**: `{workspaceId}-{YYYY-MM-DD}`
- Each workspace gets a fresh document daily
- Multiple clients sync via Yjs WebSocket
- Documents archived to PostgreSQL at midnight KST

**Lifecycle**:

1. Client connects to WebSocket
2. `YjsService.getDocument(roomName)` creates/retrieves Yjs doc
3. Edits sync in real-time via CRDT
4. `ArchiveScheduler` runs daily at 15:00 UTC (midnight KST)
5. Yesterday's logs persisted to `DailyLog` table
6. Yjs documents destroyed to free memory

#### 9. **Scheduled Tasks**

`ArchiveScheduler` uses `@Cron` decorator:

```typescript
@Injectable()
export class ArchiveScheduler {
  @Cron('0 15 * * *', { timeZone: 'UTC' })  // 15:00 UTC = 00:00 KST
  async archiveDailyLogs() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    await this.yjsService.archiveYesterdayLogs(yesterday);
  }
}
```

### Extension Architecture

#### 1. **Extension Lifecycle**

```
activate() → TeamLogProvider → Webview (React) → Backend API
     ↓
AuthService → GitHub OAuth → JWT Token → API Calls
```

**Files**:
- `extension.ts` - Entry point, registers commands and webview
- `teamLogProvider.ts` - Manages webview lifecycle
- `authService.ts` - Handles GitHub authentication

#### 2. **Message Bridge Pattern**

Extension and webview communicate via `postMessage`:

```typescript
// Extension → Webview
panel.webview.postMessage({
  type: 'setToken',
  token: 'jwt-token-here'
});

// Webview → Extension
window.addEventListener('message', event => {
  const message = event.data;
  switch (message.type) {
    case 'getToken':
      // Handle request
      break;
  }
});
```

**Message Types**:
- `getToken` - Request JWT token from extension
- `setToken` - Send JWT token to webview
- `authenticate` - Trigger GitHub OAuth flow

#### 3. **React Component Hierarchy**

```
App.tsx (Root)
├── AuthScreen (if not authenticated)
├── WorkspaceSelector (if no workspace selected)
└── Editor (CodeMirror + Yjs)
    ├── Toolbar (Date, Import Tasks, Invite, Yesterday)
    └── CodeMirror (Real-time editing)
```

**State Management**: React hooks (`useState`, `useEffect`, `useRef`)

#### 4. **API Client Pattern**

`apiService.ts` is a singleton:

```typescript
class ApiService {
  private token: string | null = null;
  private baseURL = 'http://localhost:3000';

  setToken(token: string) {
    this.token = token;
  }

  async get(endpoint: string) {
    return fetch(`${this.baseURL}${endpoint}`, {
      headers: { 'Authorization': `Bearer ${this.token}` }
    });
  }
}

export const apiService = new ApiService();
```

**Usage**:

```typescript
// Set token once after auth
apiService.setToken(jwtToken);

// All subsequent calls include token
const workspaces = await apiService.get('/workspaces');
```

#### 5. **CodeMirror + Yjs Integration**

```typescript
import { EditorView } from '@codemirror/view';
import { WebsocketProvider } from 'y-websocket';
import { yCollab } from 'y-codemirror.next';
import * as Y from 'yjs';

const ydoc = new Y.Doc();
const wsProvider = new WebsocketProvider(
  'ws://localhost:1234',
  `${workspaceId}-${YYYY-MM-DD}`,
  ydoc
);

const ytext = ydoc.getText('content');

const view = new EditorView({
  extensions: [
    yCollab(ytext, wsProvider.awareness),
    // ... other extensions
  ],
  parent: editorRef.current
});
```

**Features**:
- Real-time cursor tracking
- Automatic conflict resolution (CRDT)
- Undo/redo across clients
- Network awareness (online/offline)

---

## Code Conventions

### Backend Conventions

#### File Naming

```
feature.controller.ts       # HTTP endpoints
feature.service.ts          # Business logic
feature.module.ts           # NestJS module
feature.dto.ts              # Data transfer objects
feature.interface.ts        # TypeScript interfaces
feature.exception.ts        # Custom exceptions
feature.guard.ts            # Route guards
feature.strategy.ts         # Passport strategies
feature.controller.spec.ts  # Controller tests
feature.service.spec.ts     # Service tests
```

#### TypeScript Settings

**tsconfig.json** (backend):
- Target: ES2021
- Module: CommonJS
- Decorators: Enabled
- Strict mode: Partially enabled (no `strictNullChecks`, no `noImplicitAny`)

#### ESLint Rules

**Key Rules** (`.eslintrc.js`):
- `no-console`: **error** - Use `LoggerService` instead
- `@typescript-eslint/no-explicit-any`: **warn**
- `prettier/recommended`: Enabled

**Running Linter**:

```bash
npm run lint           # Check
npm run lint -- --fix  # Auto-fix
```

#### Import Organization

**Convention**:
1. NestJS decorators/modules
2. Third-party libraries
3. Local services/providers
4. Types/interfaces
5. DTOs

**Example**:

```typescript
// 1. NestJS
import { Injectable, NotFoundException } from '@nestjs/common';

// 2. Third-party
import { Prisma } from '@prisma/client';

// 3. Local services
import { PrismaService } from '../prisma/prisma.service';

// 4. Types
import { RequestWithUser } from '../auth/interfaces/request-with-user.interface';

// 5. DTOs
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
```

#### Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| **Classes** | PascalCase | `WorkspaceService` |
| **Interfaces** | PascalCase | `JwtPayload` |
| **Methods** | camelCase | `createWorkspace()` |
| **Variables** | camelCase | `workspaceId` |
| **Constants** | UPPER_SNAKE_CASE | `JWT_SECRET` |
| **Files** | kebab-case | `workspace.service.ts` |
| **Folders** | kebab-case | `workspace-member/` |
| **Error Codes** | UPPER_SNAKE_CASE | `WORKSPACE_NOT_FOUND` |

#### Database Naming

**Prisma Model Mapping** (`@@map`):
- Models: PascalCase (`User`, `Workspace`)
- Tables: snake_case (`users`, `workspaces`)
- Fields: camelCase in models, snake_case in DB

### Extension Conventions

#### File Naming

```
Component.tsx               # React components (PascalCase)
service.ts                  # Services (camelCase)
index.tsx                   # Entry points
styles.css                  # Styles
```

#### React Patterns

**Functional Components with Hooks**:

```typescript
const Editor: React.FC = () => {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Side effects
  }, [dependencies]);

  return <div ref={editorRef}>...</div>;
};
```

**Avoid**:
- ❌ Class components
- ❌ `any` types (use proper typing)
- ❌ Direct DOM manipulation (use refs)

---

## Database Schema

### Models

#### User

```prisma
model User {
  id              String             @id @default(uuid())
  githubId        String             @unique
  githubUsername  String
  email           String?
  avatarUrl       String?
  createdAt       DateTime           @default(now())
  updatedAt       DateTime           @updatedAt
  workspaces      WorkspaceMember[]

  @@map("users")
}
```

#### Workspace

```prisma
model Workspace {
  id              String             @id @default(uuid())
  name            String
  createdAt       DateTime           @default(now())
  updatedAt       DateTime           @updatedAt
  members         WorkspaceMember[]
  dailyLogs       DailyLog[]

  @@map("workspaces")
}
```

#### WorkspaceMember (Join Table with Roles)

```prisma
enum WorkspaceRole {
  OWNER
  ADMIN
  MEMBER
}

model WorkspaceMember {
  id              String           @id @default(uuid())
  userId          String
  workspaceId     String
  role            WorkspaceRole    @default(MEMBER)
  joinedAt        DateTime         @default(now())
  user            User             @relation(...)
  workspace       Workspace        @relation(...)

  @@unique([userId, workspaceId])
  @@map("workspace_members")
}
```

#### DailyLog

```prisma
model DailyLog {
  id              String           @id @default(uuid())
  workspaceId     String
  date            DateTime         @db.Date
  content         String           @db.Text
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt
  workspace       Workspace        @relation(...)

  @@unique([workspaceId, date])
  @@index([workspaceId, date])
  @@map("daily_logs")
}
```

### Key Constraints

- `@@unique([userId, workspaceId])` - One membership per user per workspace
- `@@unique([workspaceId, date])` - One log per workspace per day
- `onDelete: Cascade` - Deleting workspace removes members and logs

### Migrations

```bash
# Create migration
npm run prisma:migrate

# Generate Prisma Client
npm run prisma:generate

# Reset database (DANGER: deletes all data)
npx prisma migrate reset

# Open Prisma Studio
npm run prisma:studio  # http://localhost:5555
```

---

## API Endpoints

### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/github/token` | None | Validate GitHub token from VS Code |
| GET | `/auth/github` | None | Initiate GitHub OAuth flow |
| GET | `/auth/github/callback` | None | OAuth callback |
| GET | `/auth/me` | JWT | Get current user |

### Users

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/users/me` | JWT | Get current user with workspaces |

### Workspaces

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/workspaces` | JWT | Create workspace |
| GET | `/workspaces` | JWT | List user's workspaces |
| GET | `/workspaces/:id` | JWT | Get workspace details |
| POST | `/workspaces/:id/invite` | JWT + Admin | Invite member by GitHub username |
| DELETE | `/workspaces/:id/members/:userId` | JWT + Admin | Remove member |

### Daily Logs

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/logs/:workspaceId` | JWT | Get log for date (default: today) |
| GET | `/logs/:workspaceId/range` | JWT | Query logs by date range |
| GET | `/logs/:workspaceId/yesterday-tasks` | JWT | Extract uncompleted tasks for current user |

### Health

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/health` | None | System health check |

### Swagger Documentation

Available at: `http://localhost:3000/api`

**Features**:
- Interactive API explorer
- Request/response schemas
- Authentication (Bearer token)
- Try it out functionality

---

## Testing Guidelines

### Test Coverage Goals

**Current**: 80.08% line coverage ✅
**Target**: 80%+

**By Module**:
- Controllers: 100% (API contract verification)
- Services: 100% (business logic)
- Guards: 100% (security verification)
- Strategies: 100% (authentication)

### Test File Organization

```
src/
├── auth/
│   ├── auth.controller.spec.ts    (7 tests)
│   ├── auth.service.spec.ts       (8 tests)
│   ├── guards/
│   │   └── admin.guard.spec.ts    (6 tests)
│   └── strategies/
│       ├── jwt.strategy.spec.ts   (5 tests)
│       └── github.strategy.spec.ts (7 tests)
```

**Total**: 317 tests across 19 test files

### Test Structure (AAA Pattern)

```typescript
describe('WorkspaceService', () => {
  let service: WorkspaceService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        WorkspaceService,
        { provide: PrismaService, useValue: mockPrismaService }
      ]
    }).compile();

    service = module.get(WorkspaceService);
    prisma = module.get(PrismaService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create workspace with owner role', async () => {
      // Arrange
      const mockWorkspace = { id: 'ws-1', name: 'Team' };
      mockPrismaService.workspace.create.mockResolvedValue(mockWorkspace);

      // Act
      const result = await service.create('Team', 'user-1');

      // Assert
      expect(result.name).toBe('Team');
      expect(prisma.workspace.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Team',
          members: {
            create: {
              userId: 'user-1',
              role: 'OWNER'
            }
          }
        })
      });
    });

    it('should handle database error', async () => {
      // Arrange
      mockPrismaService.workspace.create.mockRejectedValue(
        new Error('DB error')
      );

      // Act & Assert
      await expect(service.create('Team', 'user-1'))
        .rejects.toThrow('DB error');
    });
  });
});
```

### Mock Patterns

**Prisma Service**:

```typescript
const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  workspace: { /* same */ },
  workspaceMember: { /* same */ },
  dailyLog: { /* same */ },
};
```

**Request Object** (for controllers):

```typescript
const mockRequest = {
  user: {
    userId: 'user-123',
    githubId: '12345',
    githubUsername: 'testuser',
  }
};
```

### Running Tests

```bash
# Run all tests
npm test

# Watch mode
npm test -- --watch

# Coverage report
npm test -- --coverage

# Specific file
npm test -- workspace.service.spec.ts

# Specific test
npm test -- --testNamePattern="should create workspace"
```

### Test Naming Conventions

**Good**:
- ✅ `should create workspace with owner role`
- ✅ `should throw error if member not found`
- ✅ `should allow removing ADMIN role`

**Bad**:
- ❌ `test 1`
- ❌ `works`
- ❌ `create test`

### Coverage Exclusions

**Excluded from coverage** (see `jest.config.js`):
- `*.spec.ts` - Test files
- `*.interface.ts` - Type definitions
- `*.dto.ts` - Data transfer objects
- `*.module.ts` - Module configuration
- `main.ts` - Bootstrap (covered by E2E)

---

## Error Handling

### Standard Error Response

All errors follow this format:

```json
{
  "code": "WORKSPACE_NOT_FOUND",
  "message": "Workspace with id 'abc123' does not exist",
  "timestamp": "2025-11-16T10:00:00.000Z",
  "path": "/workspaces/abc123",
  "traceId": "req-uuid-12345",
  "details": { ... }
}
```

### Throwing Errors

**Use BusinessException subclasses**:

```typescript
// ✅ Good
if (!workspace) {
  throw new WorkspaceNotFoundException(workspaceId);
}

// ❌ Bad
if (!workspace) {
  throw new NotFoundException('Workspace not found');
}
```

### Creating New Exceptions

1. Add to `common/exceptions/business.exception.ts`:

```typescript
export class FeatureNotFoundException extends BusinessException {
  constructor(featureId: string) {
    super(
      'FEATURE_NOT_FOUND',
      `Feature with id '${featureId}' does not exist`,
      HttpStatus.NOT_FOUND,
    );
  }
}
```

2. Use in services:

```typescript
if (!feature) {
  throw new FeatureNotFoundException(id);
}
```

### Validation Errors

Automatically formatted by `HttpExceptionFilter`:

```json
{
  "code": "VALIDATION_ERROR",
  "message": "Request validation failed",
  "timestamp": "2025-11-16T10:00:00.000Z",
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

---

## Logging Standards

### Using LoggerService

**Import**:

```typescript
import { LoggerService } from '../common/logger/logger.service';
```

**Initialize** (in service constructor or as class property):

```typescript
private logger = new LoggerService(ServiceName.name);
```

**Log Levels**:

```typescript
// Info (successful operations)
this.logger.log('Creating workspace', WorkspaceService.name, {
  workspaceName: 'Team',
  userId: user.id
});

// Error (exceptions, failures)
this.logger.error('Failed to create workspace', error.stack, WorkspaceService.name, {
  workspaceName: 'Team',
  errorMessage: error.message
});

// Warn (recoverable issues)
this.logger.warn('Invalid token detected', WorkspaceService.name, {
  token: '***MASKED***'
});

// Debug (development debugging)
this.logger.debug('Prisma query result', WorkspaceService.name, {
  resultCount: results.length
});
```

### Console.log is Forbidden

**ESLint Rule**: `no-console: error`

**Reason**: Logs must be structured and collected in production.

**Migration**:

```typescript
// ❌ Bad
console.log('User logged in:', user.id);

// ✅ Good
this.logger.log('User authenticated', AuthService.name, {
  userId: user.id,
  githubUsername: user.githubUsername
});
```

### Log Rotation

**Winston Configuration** (`winston.config.ts`):

- **Console**: Colorized, simple format (development)
- **File**: JSON format, daily rotation
  - `logs/application-%DATE%.log` (all levels, 14 days retention)
  - `logs/error-%DATE%.log` (errors only, 30 days retention)
- **Max Size**: 20MB per file
- **Format**: JSON with timestamp, level, context, metadata

### Sensitive Data Masking

**HTTP Middleware** automatically masks:
- `password`
- `token`
- `secret`
- `apiKey`

**Example**:

```json
// Original request
{ "username": "test", "token": "ghp_abc123" }

// Logged request
{ "username": "test", "token": "***MASKED***" }
```

---

## Common Tasks

### Adding a New API Endpoint

1. **Create DTO** (if needed):

```typescript
// feature/dto/create-feature.dto.ts
export class CreateFeatureDto {
  @ApiProperty({ description: '...' })
  @IsNotEmpty()
  @IsString()
  name: string;
}
```

2. **Add Service Method**:

```typescript
// feature/feature.service.ts
async create(dto: CreateFeatureDto, userId: string) {
  return this.prisma.feature.create({
    data: { ...dto, userId }
  });
}
```

3. **Add Controller Route**:

```typescript
// feature/feature.controller.ts
@Post()
@UseGuards(AuthGuard('jwt'))
@ApiOperation({ summary: 'Create feature' })
async create(@Body() dto: CreateFeatureDto, @Req() req: RequestWithUser) {
  return this.service.create(dto, req.user.userId);
}
```

4. **Write Tests**:

```typescript
// feature/feature.service.spec.ts
it('should create feature', async () => {
  const result = await service.create(dto, userId);
  expect(result).toBeDefined();
});

// feature/feature.controller.spec.ts
it('should call service.create', async () => {
  await controller.create(dto, mockRequest);
  expect(service.create).toHaveBeenCalled();
});
```

### Adding a New Database Model

1. **Update Schema**:

```prisma
// prisma/schema.prisma
model Feature {
  id          String   @id @default(uuid())
  name        String
  userId      String
  createdAt   DateTime @default(now())

  user        User     @relation(fields: [userId], references: [id])

  @@map("features")
}
```

2. **Create Migration**:

```bash
npm run prisma:migrate
# Enter migration name when prompted
```

3. **Generate Client**:

```bash
npm run prisma:generate
```

4. **Update Relations** (if needed):

```prisma
model User {
  // ... existing fields
  features    Feature[]
}
```

### Adding a New Module

1. **Create Files**:

```bash
mkdir -p src/feature
touch src/feature/feature.module.ts
touch src/feature/feature.service.ts
touch src/feature/feature.controller.ts
touch src/feature/feature.service.spec.ts
touch src/feature/feature.controller.spec.ts
```

2. **Implement Module**:

```typescript
// feature.module.ts
@Module({
  imports: [PrismaModule],
  controllers: [FeatureController],
  providers: [FeatureService],
  exports: [FeatureService],
})
export class FeatureModule {}
```

3. **Register in AppModule**:

```typescript
// app.module.ts
@Module({
  imports: [
    // ... existing modules
    FeatureModule,
  ],
})
export class AppModule {}
```

### Adding a New Guard

1. **Create Guard**:

```typescript
// auth/guards/feature.guard.ts
@Injectable()
export class FeatureGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    // Validation logic
    return true;
  }
}
```

2. **Apply to Route**:

```typescript
@UseGuards(AuthGuard('jwt'), FeatureGuard)
async protectedRoute() { ... }
```

3. **Write Tests**:

```typescript
// feature.guard.spec.ts
it('should allow access when condition met', async () => {
  const result = await guard.canActivate(mockContext);
  expect(result).toBe(true);
});
```

### Running Database Migrations in Production

```bash
# Generate migration locally
npm run prisma:migrate

# In production:
npx prisma migrate deploy
```

---

## Troubleshooting

### Backend Won't Start

**Issue**: `Error: P1001: Can't reach database server`

**Solution**:
1. Check PostgreSQL is running: `docker-compose ps`
2. Verify `DATABASE_URL` in `backend/.env`
3. Restart containers: `docker-compose down && docker-compose up -d`

### Extension Not Connecting to Backend

**Issue**: API calls fail with network error

**Solution**:
1. Verify backend is running on port 3000
2. Check CORS settings in `main.ts`
3. Open VS Code DevTools: `Help → Toggle Developer Tools`
4. Check Console for errors

### Real-time Sync Not Working

**Issue**: Changes not appearing for other users

**Solution**:
1. Verify Yjs WebSocket server is running on port 1234
2. Check `YjsService.isWebSocketServerRunning()`
3. Verify room name format: `{workspaceId}-{YYYY-MM-DD}`
4. Check browser console for WebSocket errors

### Tests Failing

**Issue**: `Cannot find module 'uuid'`

**Solution**:
1. Clear Jest cache: `npx jest --clearCache`
2. Reinstall dependencies: `rm -rf node_modules && npm install`
3. Verify `moduleNameMapper` in `jest.config.js`

### Prisma Client Out of Sync

**Issue**: `Type '...' is not assignable to type '...'`

**Solution**:
```bash
npm run prisma:generate
```

### ESLint Errors

**Issue**: `console.log is forbidden`

**Solution**: Replace with `LoggerService`:
```typescript
// Before
console.log('Message', data);

// After
this.logger.log('Message', ClassName.name, { data });
```

---

## Git Workflow

### Branch Naming

- Feature: `feature/description`
- Bug fix: `fix/description`
- Chore: `chore/description`

### Commit Messages

**Format**: `<type>(<scope>): <description>`

**Types**:
- `feat` - New feature
- `fix` - Bug fix
- `refactor` - Code refactoring
- `test` - Adding tests
- `docs` - Documentation
- `chore` - Maintenance

**Examples**:
```
feat(workspace): add member removal endpoint
fix(auth): handle expired JWT tokens
test(log): add archive scheduler tests
docs(api): update Swagger annotations
refactor(yjs): simplify document management
```

### CI/CD (GitHub Actions)

**Workflow**: `.github/workflows/claude.yml`

**Triggers**:
- Issue comments with `@claude`
- PR review comments with `@claude`
- New issues with `@claude` in title/body

**Permissions**:
- `contents: read`
- `pull-requests: read`
- `issues: read`
- `actions: read`

---

## Quick Reference

### Environment Variables

**Backend** (`backend/.env`):
```env
DATABASE_URL="postgresql://teamlog:teamlog_dev_password@localhost:5432/teamlog"
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRATION="7d"
PORT=3000
YJS_PORT=1234
GITHUB_CLIENT_ID="optional"
GITHUB_CLIENT_SECRET="optional"
```

### Ports

- **3000**: NestJS HTTP API
- **1234**: Yjs WebSocket Server
- **5432**: PostgreSQL
- **5555**: Prisma Studio

### Key Commands

```bash
# Development
npm run dev                    # Start both backend + extension

# Backend
npm run start:dev              # NestJS watch mode
npm run prisma:studio          # Database UI
npm test                       # Run tests
npm run lint                   # ESLint

# Extension
npm run watch                  # Webpack watch mode
npm run build                  # Production build

# Database
docker-compose up -d           # Start PostgreSQL
npm run prisma:migrate         # Create migration
npm run prisma:generate        # Update Prisma client
```

### File Locations

| Purpose | Path |
|---------|------|
| **Backend entry** | `backend/src/main.ts` |
| **Extension entry** | `extension/src/extension.ts` |
| **Database schema** | `backend/prisma/schema.prisma` |
| **Exceptions** | `backend/src/common/exceptions/business.exception.ts` |
| **Error filter** | `backend/src/common/filters/http-exception.filter.ts` |
| **Logger** | `backend/src/common/logger/logger.service.ts` |
| **Testing guide** | `backend/TESTING.md` |
| **API docs** | `http://localhost:3000/api` |

---

## Document Maintenance

This document should be updated when:
- ✅ New modules are added
- ✅ Architecture patterns change
- ✅ Testing coverage goals change
- ✅ New conventions are established
- ✅ Environment variables are added
- ✅ Dependencies are upgraded

**Last Review**: 2025-11-16
**Next Review**: When major features are added

---

## Additional Resources

- **README.md** - User-facing project documentation
- **backend/TESTING.md** - Comprehensive testing guide
- **docs/P1-1-ERROR_HANDLING.md** - Error handling implementation plan
- **docs/P1-2-LOGGING.md** - Logging implementation plan
- **docs/P2-3-API_DOCS.md** - API documentation plan
- **Swagger UI** - Interactive API docs at `http://localhost:3000/api`
- **Prisma Studio** - Database UI at `http://localhost:5555`

---

*This document is designed to help AI assistants understand and work effectively with the TeamLog codebase. For questions or suggestions, please update this file or consult the development team.*
