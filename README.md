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

## AI 연결 설정

1. `.env.example`을 참고해 `.env.local`을 만들고 `OPENAI_API_KEY`, 실제 API 프로젝트에서 사용할 수 있는 `OPENAI_MODEL`, 양의 정수 `AI_DAILY_REQUEST_LIMIT`을 설정합니다. `OPENAI_API_KEY`는 서버 전용이며 `NEXT_PUBLIC_` 접두사를 붙이지 마세요.
2. 개발 환경에서 Supabase 없이 테스트하면 요청 제한은 개발 서버 메모리에만 유지됩니다. 프로덕션에서는 Supabase 마이그레이션을 적용하고 `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, 별도의 강한 `AI_RATE_LIMIT_SECRET`을 설정해야 일일 한도가 DB에서 원자적으로 적용됩니다. `x-real-ip` 또는 `x-forwarded-for`는 신뢰된 프록시가 덮어쓰도록 배포 환경을 설정하세요.
3. API 키나 모델 설정이 없으면 AI 응답 대신 설정 오류를 표시합니다. 가짜 AI 답변으로 대체하지 않습니다.

상담은 자동 모드 외에 진로, 자기소개서, 면접, 채용공고 분석, 자격증 추천, 취업 로드맵 모드를 제공합니다. 대화는 기본적으로 서버에 저장되지 않으며, 사용자가 동의한 경우에만 현재 브라우저의 로컬 저장소에 보관됩니다. 로그인 기반 계정 동기화는 아직 연결되지 않았습니다.

현재 채용·기업·자격증·게시글은 실제 데이터가 아닌 화면 미리보기용 예시입니다. 고용24·Q-Net 등의 실시간 검색, Supabase 계정 인증과 대화 저장/불러오기, 파일 첨부 분석, 답변 피드백 저장은 아직 구현되지 않았습니다. AI에 실제 공고나 공식 자료가 제공되지 않으면 출처를 만들어내지 않도록 안내합니다.
