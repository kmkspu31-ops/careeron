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
- Supabase SSR 이메일 인증, 프로필, 회원별 AI 대화/RLS/원자적 일일 한도: `supabase/migrations/202611170001_ai_system.sql`, `supabase/migrations/202611180001_auth_ai_persistence.sql`

## OpenAI 및 Supabase 설정

1. `.env.example`을 복사해 `.env.local`을 만들고 `OPENAI_API_KEY`, 계정에서 사용할 수 있는 `OPENAI_MODEL`과 Supabase URL/공개 키를 설정합니다.
2. 서버에서만 사용하는 `SUPABASE_SECRET_KEY`(또는 기존 프로젝트의 `SUPABASE_SERVICE_ROLE_KEY`), 32자 이상의 무작위 `AI_RATE_LIMIT_SECRET`, `AI_DAILY_REQUEST_LIMIT`을 설정합니다. API 비밀 키에는 `NEXT_PUBLIC_` 접두사를 붙이지 마세요.
3. Supabase SQL Editor 또는 배포 마이그레이션 절차를 통해 두 SQL 파일을 순서대로 적용하고, Auth의 이메일 확인과 비밀번호 재설정 redirect URL에 앱의 `/auth/callback` 주소를 등록합니다. 마이그레이션은 자동 실행되지 않습니다.
4. 설정이 빠져 있으면 해당 AI/계정/사용량 기능은 설정 필요 오류를 반환합니다. 가짜 응답이나 저장 성공으로 대체하지 않습니다.

상담은 자동 모드 외에 진로, 자기소개서, 면접, 채용공고 분석, 자격증 추천, 취업 로드맵 모드를 제공합니다. 로그인은 이메일 확인을 거치며, 회원 대화는 계정에 저장되고 비회원 기록은 저장에 동의한 경우에만 브라우저에 남습니다. 기존 비회원 기록은 회원 로그인 후 자동 업로드되지 않으며, 사용자가 AI 기록 화면에서 가져오기를 선택해야 합니다.

채용·기업·자격증·게시글은 화면 미리보기용 예시 데이터입니다. 고용24·Q-Net 실시간 검색, 파일 첨부 분석, 답변 피드백 및 즐겨찾기 저장은 연결되지 않았습니다. AI에 실제 공고나 공식 자료가 제공되지 않으면 출처를 만들어내지 않도록 안내합니다. 실제 API 연동과 Supabase 데이터 격리는 외부 자격 증명과 마이그레이션 적용 후 별도로 검증해야 합니다.
