# 검증 체크리스트

> 다음 태스크로 넘어가기 전 필수 검증 항목

## 🎯 목적

각 작업 완료 후 코드 품질을 보장하고 회귀(regression)를 방지합니다.

---

## ✅ 필수 검증 4단계

### 1️⃣ 빌드 검증

```bash
cd /home/user/team-log/backend
npm run build
```

**통과 조건**:
- ✅ TypeScript 컴파일 에러 없음
- ✅ `dist/` 폴더 생성 성공
- ✅ Exit code: 0

**실패 시**:
```bash
# 에러 확인
npm run build 2>&1 | grep error

# 타입 에러 수정 후 재시도
```

---

### 2️⃣ 린트 검증

```bash
npm run lint
```

**통과 조건**:
- ✅ ESLint 에러 0개
- ✅ ESLint 경고는 허용 (추후 수정)
- ✅ Exit code: 0

**실패 시**:
```bash
# 자동 수정 시도
npm run lint -- --fix

# 수동 수정이 필요한 경우 에러 메시지 확인
```

**주요 린트 규칙**:
- ❌ `no-console` - console.log 사용 금지 (logger 사용)
- ❌ `@typescript-eslint/no-unused-vars` - 미사용 변수
- ❌ `@typescript-eslint/no-explicit-any` - any 타입 사용 금지

---

### 3️⃣ 타입 체크

```bash
npx tsc --noEmit
```

**통과 조건**:
- ✅ 타입 에러 0개
- ✅ `any` 타입 사용 없음
- ✅ Exit code: 0

**실패 시**:
```typescript
// ❌ BAD
function process(data: any) { }

// ✅ GOOD
interface ProcessData {
  id: string;
  name: string;
}
function process(data: ProcessData) { }
```

---

### 4️⃣ 테스트 검증

```bash
# 모든 테스트 실행
npm test

# 커버리지 포함
npm run test:cov
```

**통과 조건**:
- ✅ 모든 테스트 통과 (0 failed)
- ✅ 새로 작성한 코드의 테스트 커버리지 > 80%
- ✅ 전체 커버리지 감소하지 않음

**커버리지 확인**:
```bash
# 커버리지 리포트 확인
npm run test:cov

# 예상 출력:
# --------------------|---------|----------|---------|---------|
# File                | % Stmts | % Branch | % Funcs | % Lines |
# --------------------|---------|----------|---------|---------|
# All files           |   85.5  |   78.3   |   82.1  |   86.2  |
#  auth/              |   92.1  |   85.4   |   90.0  |   93.5  |
#   auth.service.ts   |   95.0  |   88.2   |   100   |   96.3  |
```

**테스트 실패 시**:
```bash
# 특정 테스트만 실행
npm test -- auth.service.spec.ts

# 디버그 모드
npm run test:debug

# Watch 모드로 빠르게 수정
npm run test:watch
```

---

## 📋 체크리스트 템플릿

작업 완료 후 다음을 복사해서 사용:

```markdown
## [작업명] 검증 결과

### 날짜: YYYY-MM-DD
### 작업자: [이름]

#### 1. 빌드 검증
- [ ] `npm run build` 성공
- [ ] Exit code: 0
- [ ] 에러 메시지: (없음 / 있으면 기록)

#### 2. 린트 검증
- [ ] `npm run lint` 성공
- [ ] ESLint 에러: 0개
- [ ] ESLint 경고: X개 (허용)

#### 3. 타입 체크
- [ ] `npx tsc --noEmit` 성공
- [ ] 타입 에러: 0개
- [ ] any 타입 사용: 없음

#### 4. 테스트 검증
- [ ] `npm test` 모두 통과
- [ ] 테스트 수: X passed, 0 failed
- [ ] 커버리지: X.X% (이전: X.X%)
- [ ] 새 코드 커버리지: > 80%

#### 5. 추가 확인사항
- [ ] 문서 업데이트 (필요시)
- [ ] 마이그레이션 스크립트 (필요시)
- [ ] 환경변수 추가 (.env.example 업데이트)

### 최종 결과: ✅ PASS / ❌ FAIL

### 다음 액션:
- [x] 커밋 및 푸시
- [ ] 다음 태스크 시작: [태스크명]
```

---

## 🚨 빠른 검증 스크립트

시간 절약을 위한 올인원 스크립트:

```bash
#!/bin/bash
# validate.sh

echo "🔍 TeamLog 검증 시작..."

echo ""
echo "1️⃣ 빌드 검증..."
npm run build || exit 1
echo "✅ 빌드 성공"

echo ""
echo "2️⃣ 린트 검증..."
npm run lint || exit 1
echo "✅ 린트 성공"

echo ""
echo "3️⃣ 타입 체크..."
npx tsc --noEmit || exit 1
echo "✅ 타입 체크 성공"

echo ""
echo "4️⃣ 테스트 검증..."
npm test || exit 1
echo "✅ 테스트 성공"

echo ""
echo "🎉 모든 검증 통과!"
echo ""
echo "📊 커버리지 확인:"
npm run test:cov -- --coverageReporters=text-summary

echo ""
echo "✅ 다음 태스크로 진행 가능합니다."
```

**사용법**:
```bash
# 실행 권한 부여
chmod +x backend/validate.sh

# 검증 실행
cd backend
./validate.sh
```

---

## 🎯 성능 기준

검증은 빠르게 실행되어야 합니다:

| 단계 | 예상 시간 | 최대 허용 시간 |
|------|-----------|---------------|
| 빌드 | 10-20초 | 60초 |
| 린트 | 5-10초 | 30초 |
| 타입 체크 | 5-10초 | 30초 |
| 테스트 | 10-30초 | 120초 |
| **전체** | **30-70초** | **4분** |

**느린 경우**:
- 캐시 삭제: `rm -rf node_modules/.cache`
- Jest 캐시 삭제: `npm test -- --clearCache`
- 병렬 실행 조정: `jest --maxWorkers=4`

---

## 🔄 CI/CD 통합

GitHub Actions에서도 동일한 검증 실행:

```yaml
# .github/workflows/quality-check.yml
name: Quality Check

on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: |
          cd backend
          npm ci

      - name: Build
        run: cd backend && npm run build

      - name: Lint
        run: cd backend && npm run lint

      - name: Type Check
        run: cd backend && npx tsc --noEmit

      - name: Test
        run: cd backend && npm run test:cov

      - name: Upload Coverage
        uses: codecov/codecov-action@v3
        with:
          directory: ./backend/coverage
```

---

## 📊 검증 히스토리 추적

각 검증 결과를 기록:

```markdown
# VALIDATION_HISTORY.md

## 2025-11-16: P0 완료
- ✅ Build: Success (15s)
- ✅ Lint: 0 errors, 2 warnings
- ✅ Type Check: Success (8s)
- ✅ Tests: 19/19 passed (12s)
- Coverage: 65% → 65% (stable)

## 2025-11-17: P1-1 에러 핸들링
- ✅ Build: Success (18s)
- ✅ Lint: 0 errors, 1 warning
- ✅ Type Check: Success (9s)
- ✅ Tests: 34/34 passed (18s)
- Coverage: 65% → 72% (+7%)
```

---

## 🆘 자주 묻는 질문

### Q: 린트 경고는 무시해도 되나요?
A: 일단 진행하되, 주기적으로 수정하세요. 에러는 반드시 수정해야 합니다.

### Q: 테스트 커버리지가 줄어들었어요
A: 새로운 코드의 테스트를 추가하세요. 전체 커버리지는 절대 감소하면 안 됩니다.

### Q: 빌드는 성공하는데 타입 체크가 실패해요
A: `tsconfig.json` 설정 차이입니다. `npx tsc --noEmit`이 더 엄격합니다.

### Q: 검증에 너무 시간이 오래 걸려요
A: Watch 모드(`test:watch`, `build --watch`)를 사용하세요.

---

*Next: [P1-1-ERROR_HANDLING.md](./P1-1-ERROR_HANDLING.md)*
