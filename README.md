# CAREERON

진로 탐색부터 취업 준비까지 이어지는 커리어 플랫폼의 반응형 UI 기반입니다.

## 실행

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3000`을 엽니다. 프로덕션 빌드는 `npm run build`, TypeScript 검사는 `npm run typecheck`으로 실행합니다.

## 구현 범위

- Next.js App Router, TypeScript, Tailwind CSS 4
- 홈, 직업, 채용, 기업, 자격증, AI 진로 상담, AI 취업 도우미, 학습, 포트폴리오, 커뮤니티, 마이페이지, 로그인 및 상세/검색 화면
- 데스크톱 사이드바와 모바일 메뉴/하단 내비게이션, 다크/라이트 테마, 통합 검색, 기본 상세 화면
- `data/mock-data.ts`에 분리된 명시적 예시 데이터와 `types/index.ts`의 데이터 타입
- OpenAI Responses API 서버 스트리밍, 자동 상담 모드와 6개 전문 모드, 입력 검증 및 서버 측 이용량 제한
- Supabase AI 테이블/RLS/일일 한도 RPC 초안: `supabase/migrations/202611170001_ai_system.sql`
- 공개 커리어 데이터 카탈로그와 RLS: `supabase/migrations/202611190001_public_data_catalog.sql`
- 허가 상태가 확인된 공식 공공 API 동기화 엔드포인트: `app/api/data-sync/route.ts`

## AI 연결 설정

1. `.env.example`을 참고해 `.env.local`을 만들고 `OPENAI_API_KEY`, 실제 API 프로젝트에서 사용할 수 있는 `OPENAI_MODEL`, 양의 정수 `AI_DAILY_REQUEST_LIMIT`을 설정합니다. `OPENAI_API_KEY`는 서버 전용이며 `NEXT_PUBLIC_` 접두사를 붙이지 마세요.
2. 개발 환경에서 Supabase 없이 테스트하면 요청 제한은 개발 서버 메모리에만 유지됩니다. 프로덕션에서는 Supabase 마이그레이션을 적용하고 `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, 별도의 강한 `AI_RATE_LIMIT_SECRET`을 설정해야 일일 한도가 DB에서 원자적으로 적용됩니다. `x-real-ip` 또는 `x-forwarded-for`는 신뢰된 프록시가 덮어쓰도록 배포 환경을 설정하세요.
3. API 키나 모델 설정이 없으면 AI 응답 대신 설정 오류를 표시합니다. 가짜 AI 답변으로 대체하지 않습니다.

상담은 자동 모드 외에 진로, 자기소개서, 면접, 채용공고 분석, 자격증 추천, 취업 로드맵 모드를 제공합니다. 대화는 기본적으로 서버에 저장되지 않으며, 사용자가 동의한 경우에만 현재 브라우저의 로컬 저장소에 보관됩니다. 로그인 기반 계정 동기화는 아직 연결되지 않았습니다.

커뮤니티 게시글 등 일부 화면은 여전히 미리보기용 예시를 사용합니다. 공개 카탈로그 화면은 실제 데이터가 없을 때 예시를 노출하지 않습니다. Supabase 계정 인증, 회원별 AI 대화 저장/불러오기, 파일 첨부 분석, 답변 피드백 저장은 별도 구현이 필요합니다. AI에 실제 공고나 공식 자료가 제공되지 않으면 출처를 만들어내지 않도록 안내합니다.

## 공개 커리어 데이터 카탈로그

카탈로그 화면은 샘플 대신 `catalog_records`의 실제 레코드만 표시합니다. 공개 카탈로그 마이그레이션을 적용하고 다음 서버 환경변수를 설정해야 합니다.

- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`: 서버 전용 Supabase REST 연결. 비밀키를 `NEXT_PUBLIC_` 변수로 만들지 마세요.
- `DATA_GO_KR_API_KEY`: data.go.kr에서 발급한 서버 전용 서비스 키.
- `DATA_SYNC_SECRET`: 동기화 endpoint 보호용으로 생성한 별도의 강한 비밀값. API 키와 재사용하지 마세요.

마이그레이션 적용 후 배포 환경에 위 값을 설정하고, GitHub Actions 저장소 secrets에 `CAREERON_DATA_SYNC_URL` (예: `https://서비스도메인/api/data-sync`)과 같은 값의 `CAREERON_DATA_SYNC_SECRET`을 등록하면 매일 동기화를 실행할 수 있습니다. 수동 실행은 Actions의 `Public catalog sync`에서 가능합니다. 서버 엔드포인트는 Bearer 비밀값을 검증하고 `usage_status = allowed`인 출처만 동기화합니다. 동일 출처 동시 실행은 DB 고유 인덱스로 막고, 오래된 실행 로그는 실패 처리합니다.

현재 동기화 코드는 나라일터 공공 채용공고, Q-Net 국가자격 시험일정, NCS 직무역량, e새일 직업교육훈련과정에 한정됩니다. 제공처 응답이 개별 원문 링크를 주지 않으면 상세 페이지는 데이터셋 문서 링크를 표시하고 개별 원문이 없음을 구분합니다. 진행 상태 날짜가 제공되지 않는 항목은 확인 필요로 표시합니다. 워크넷 데이터는 공공누리 제4유형이라 이용 권한이 확인되기 전까지 가져오지 않으며, OpenDART는 재배포 조건 검토가 끝나지 않아 동기화하지 않습니다. 기업 전체 디렉터리와 직업 설명 전체 정보의 실데이터 연동은 미구현입니다. NCS 능력단위는 직업 설명 데이터가 아닙니다.

이 환경에는 데이터 제공처/API 키와 Supabase 연결이 설정되어 있지 않으므로 실제 API 호출, 마이그레이션 적용, 저장 건수 및 동기화 결과는 검증되지 않았습니다. 환경 변수를 채우기 전에는 화면에 실제 연결 완료 또는 레코드 건수를 표시하지 않습니다.
