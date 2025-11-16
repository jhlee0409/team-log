# 🌊 TeamLog

**Effortless Flow** — Team collaboration that never breaks your VS Code rhythm.

TeamLog is a VS Code extension that enables real-time collaborative logging for development teams. Keep daily logs, track tasks, and collaborate with your team without ever leaving your editor.

## ✨ Features

### 🔐 No-Login Authentication
- Seamlessly uses your existing GitHub account from VS Code
- One-click authentication with `vscode.authentication` API
- No additional login required

### ⚡ Real-time Collaboration
- **Yjs-powered** real-time editing
- See your teammates' changes instantly
- Conflict-free collaborative editing
- Dynamic rooms per workspace and date (`workspaceId-YYYY-MM-DD`)

### 📅 Daily Logs with Auto-Archiving
- Each day gets a fresh document with auto-generated date headers
- Previous days automatically archived to PostgreSQL at midnight KST
- View past logs in read-only mode
- Never lose your team's history

### 🎯 Smart Task Management
- Import yesterday's uncompleted tasks with one click
- Extracts `- [ ]` checkbox items from your section
- Keeps you on track without manual copying

### 👥 GitHub-Based Invites
- Invite teammates by `@github-username`
- No email invitations needed
- Only workspace admins can invite members

### 🔔 Quiet @Mentions
- Get notified when teammates mention you
- Client-side detection (no server overhead)
- Badge appears on sidebar icon
- Clears automatically when you view the panel

## 🏗️ Architecture

```
team-log/
├── backend/          # NestJS backend
│   ├── src/
│   │   ├── auth/     # GitHub OAuth & JWT
│   │   ├── user/     # User management
│   │   ├── workspace/# Workspace & invites
│   │   ├── log/      # Daily logs & archiving
│   │   └── yjs/      # Real-time collaboration
│   └── prisma/       # Database schema
│
└── extension/        # VS Code extension
    └── src/
        ├── extension.ts       # Extension activation
        ├── teamLogProvider.ts # Webview provider
        └── webview/
            ├── components/    # React UI
            └── services/      # API client
```

### Tech Stack

**Backend:**
- NestJS - Robust, scalable Node.js framework
- PostgreSQL - Reliable data persistence
- Prisma - Type-safe database ORM
- Yjs + y-websocket - Real-time CRDT collaboration
- Passport.js - GitHub OAuth authentication
- @nestjs/schedule - Daily archiving cron jobs

**Frontend (VS Code Extension):**
- TypeScript - Type safety
- React - UI components
- CodeMirror 6 - Modern code editor
- y-codemirror.next - Yjs bindings for CodeMirror
- VS Code Extension API - Native integration

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose
- VS Code 1.85+
- GitHub account

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/team-log.git
cd team-log
```

### 2. Start PostgreSQL

```bash
docker-compose up -d
```

### 3. Setup Backend

```bash
cd backend

# Install dependencies
npm install

# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Start backend server
npm run start:dev
```

Backend will run on:
- HTTP API: `http://localhost:3000`
- Yjs WebSocket: `ws://localhost:1234`

### 4. Setup Extension

```bash
cd ../extension

# Install dependencies
npm install

# Build extension
npm run build
```

### 5. Run Extension in VS Code

1. Open the `team-log` folder in VS Code
2. Press `F5` to launch Extension Development Host
3. In the new VS Code window, click the TeamLog icon in the Activity Bar
4. Authenticate with GitHub when prompted
5. Create or select a workspace
6. Start collaborating!

## 🔧 Configuration

### Backend Environment Variables

Copy `backend/.env.example` to `backend/.env` and configure:

```env
# Database
DATABASE_URL="postgresql://teamlog:teamlog_dev_password@localhost:5432/teamlog?schema=public"

# JWT Secret (change in production!)
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRATION="7d"

# GitHub OAuth (optional, for web OAuth flow)
GITHUB_CLIENT_ID="your-github-oauth-app-client-id"
GITHUB_CLIENT_SECRET="your-github-oauth-app-client-secret"

# Server Ports
PORT=3000
YJS_PORT=1234
```

### GitHub OAuth App (Optional)

The VS Code extension uses VS Code's built-in GitHub authentication, so you **don't need** to create a GitHub OAuth app for the extension to work.

However, if you want to support web clients or traditional OAuth flow:

1. Go to GitHub Settings → Developer Settings → OAuth Apps
2. Create a new OAuth App
3. Set Authorization callback URL to `http://localhost:3000/auth/github/callback`
4. Copy Client ID and Secret to `backend/.env`

## 📖 Usage Guide

### Creating a Workspace

1. Open TeamLog panel
2. Click "+ New Workspace"
3. Enter a workspace name
4. Click "Create"

### Inviting Team Members

1. Open a workspace
2. Click "👥 Invite" button
3. Enter teammate's GitHub username (with or without `@`)
4. Press Enter
5. They must sign in to TeamLog before they can be invited

### Daily Workflow

**Morning:**
1. Open TeamLog
2. See today's date header automatically created
3. Click "+ Import Tasks" to bring in yesterday's uncompleted items
4. Start logging!

**During the Day:**
- Type your updates, notes, and tasks
- Use `@username` to mention teammates
- See teammates' updates in real-time
- Checkbox items: `- [ ] Task name`

**Evening:**
- Your work is auto-saved in real-time
- At midnight KST, today's log archives to PostgreSQL
- Tomorrow starts with a fresh document

### Viewing Past Logs

1. Click "📅 Yesterday" button
2. View read-only archive of previous day
3. Click "← Back to Today" to return

## 🏛️ Database Schema

```prisma
model User {
  id              String   @id @default(uuid())
  githubId        String   @unique
  githubUsername  String
  email           String?
  avatarUrl       String?
}

model Workspace {
  id      String   @id @default(uuid())
  name    String
  members WorkspaceMember[]
  dailyLogs DailyLog[]
}

model WorkspaceMember {
  userId      String
  workspaceId String
  role        WorkspaceRole  // OWNER, ADMIN, MEMBER
}

model DailyLog {
  id          String   @id @default(uuid())
  workspaceId String
  date        DateTime @db.Date
  content     String   @db.Text
}
```

## 🎨 Design Philosophy

### The "Effortless Flow" Vibe

TeamLog is designed around these principles:

1. **Zero Context Switching** - Everything happens in VS Code
2. **Invisible Authentication** - Use your existing GitHub account
3. **Ephemeral Today** - Real-time collaboration for today only
4. **Persistent History** - Yesterday's logs safely archived
5. **Quiet Collaboration** - Notifications that don't interrupt
6. **GitHub-Native** - Invite by username, not email

## 🔐 Security Notes

- JWT tokens for API authentication
- GitHub OAuth for identity verification
- Workspace-level access control (OWNER, ADMIN, MEMBER)
- Admin guard prevents unauthorized team invites
- Environment variables for secrets (never commit `.env`)

## 🐛 Troubleshooting

### Backend won't start
- Ensure PostgreSQL is running: `docker-compose ps`
- Check database connection: `docker-compose logs postgres`
- Verify `DATABASE_URL` in `backend/.env`

### Extension not connecting
- Backend must be running on port 3000
- Yjs WebSocket must be running on port 1234
- Check browser console in VS Code DevTools (`Help → Toggle Developer Tools`)

### Authentication fails
- Ensure you're signed into GitHub in VS Code
- Try `> Sign out of GitHub` and sign back in
- Check backend logs for authentication errors

### Real-time sync not working
- Verify Yjs WebSocket is accessible: `ws://localhost:1234`
- Check for CORS issues in backend logs
- Ensure room name format is correct: `workspaceId-YYYY-MM-DD`

## 🚧 Development

### Run in Development Mode

```bash
# Terminal 1: Backend
cd backend
npm run start:dev

# Terminal 2: Extension (watch mode)
cd extension
npm run watch

# Terminal 3: Database
docker-compose up
```

### Database Management

```bash
# View database in Prisma Studio
cd backend
npm run prisma:studio

# Create a new migration
npm run prisma:migrate

# Reset database (WARNING: deletes all data)
npx prisma migrate reset
```

## 🧪 Testing

TeamLog 백엔드는 **80%+ 테스트 커버리지**를 목표로 하며, 현재 **80.08%** 달성했습니다.

### 테스트 현황

```
총 테스트: 317개 통과
라인 커버리지: 80.08% ✅
함수 커버리지: 82.79%
브랜치 커버리지: 74.41%
```

### 테스트 실행

```bash
cd backend

# 전체 테스트 실행
npm test

# 커버리지 리포트
npm test -- --coverage

# 특정 파일 테스트
npm test -- workspace.service.spec.ts

# Watch 모드
npm test -- --watch
```

### 테스트 구조

- **Controller Tests** (57 tests): API 엔드포인트, 가드, 인증 검증
- **Service Tests** (84 tests): 비즈니스 로직, CRUD, 에러 처리
- **Guard Tests** (6 tests): 권한 기반 접근 제어
- **Strategy Tests** (12 tests): JWT 및 GitHub OAuth 인증
- **Scheduler Tests** (19 tests): 일일 로그 아카이빙 cron 작업
- **Yjs Tests** (34 tests): 실시간 CRDT 협업 로직

### 주요 테스트 영역

✅ **인증/인가**: GitHub OAuth, JWT, Admin Guard
✅ **워크스페이스 관리**: 생성, 멤버 초대/제거, 권한 제어
✅ **실시간 협업**: Yjs 문서 관리, 동시 편집
✅ **일일 로그**: 아카이빙, 태스크 추출
✅ **에러 핸들링**: BusinessException, 권한 부족, 리소스 없음

자세한 내용은 [backend/TESTING.md](backend/TESTING.md)를 참조하세요.

## 📝 License

MIT

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

**Built with the "Effortless Flow" vibe** 🌊
