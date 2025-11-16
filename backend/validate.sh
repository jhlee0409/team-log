#!/bin/bash
# TeamLog 검증 스크립트
# 다음 태스크로 넘어가기 전 필수 검증 수행

set -e  # 에러 발생 시 즉시 종료

echo "🔍 TeamLog 품질 검증 시작..."
echo "================================"

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 시작 시간 기록
START_TIME=$(date +%s)

# 1. 빌드 검증
echo ""
echo "1️⃣  빌드 검증..."
if npm run build > /dev/null 2>&1; then
    echo -e "${GREEN}✅ 빌드 성공${NC}"
else
    echo -e "${RED}❌ 빌드 실패${NC}"
    npm run build
    exit 1
fi

# 2. 린트 검증
echo ""
echo "2️⃣  린트 검증..."
if npm run lint > /dev/null 2>&1; then
    echo -e "${GREEN}✅ 린트 성공 (0 errors)${NC}"
else
    echo -e "${RED}❌ 린트 실패${NC}"
    npm run lint
    exit 1
fi

# 3. 타입 체크
echo ""
echo "3️⃣  타입 체크..."
if npx tsc --noEmit > /dev/null 2>&1; then
    echo -e "${GREEN}✅ 타입 체크 성공${NC}"
else
    echo -e "${RED}❌ 타입 체크 실패${NC}"
    npx tsc --noEmit
    exit 1
fi

# 4. 테스트 실행
echo ""
echo "4️⃣  테스트 검증..."
if npm test -- --passWithNoTests > /dev/null 2>&1; then
    echo -e "${GREEN}✅ 테스트 성공${NC}"
else
    echo -e "${RED}❌ 테스트 실패${NC}"
    npm test
    exit 1
fi

# 종료 시간 계산
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo "================================"
echo -e "${GREEN}🎉 모든 검증 통과!${NC}"
echo "소요 시간: ${DURATION}초"
echo ""

# 커버리지 요약 표시
echo "📊 테스트 커버리지 확인:"
npm run test:cov -- --coverageReporters=text-summary 2>/dev/null | grep -A 5 "Coverage summary"

echo ""
echo -e "${GREEN}✅ 다음 태스크로 진행 가능합니다.${NC}"
echo ""
