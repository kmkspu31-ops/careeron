# CAREERON 실데이터 연동 설정 및 검증

## 현재 상태 (2026-11-18)

데이터 연동 코드가 있는 PR #2는 열려 있으며 아직 병합되지 않았습니다. 이 작업 환경에는 `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `DATA_GO_KR_API_KEY`, `DATA_SYNC_SECRET`이 설정되지 않았고 `.env.local`도 없습니다. 저장소 GitHub Actions secret 목록에서도 필요한 동기화 secret을 확인하지 못했습니다. 따라서 외부 API를 실제 호출하거나 Supabase에 쓰지 않았으며, 실제 저장 건수와 동기화 성공률은 아직 산출할 수 없습니다. 운영 DB에는 변경을 가하지 않았습니다.

## 사람이 먼저 해야 하는 설정

### 1. 사용할 Supabase 프로젝트 선택

실서비스 데이터에 영향을 주지 않도록 먼저 별도의 **개발/스테이징 Supabase 프로젝트**를 준비하세요. 이 저장소의 현재 서버 코드는 아래 변수를 사용합니다.

| 변수 | 발급/확인 위치 | 설정 위치 |
|---|---|---|
| `SUPABASE_URL` | Supabase Dashboard → 프로젝트 → Project Settings → API의 Project URL | 로컬 `.env.local`, 배포 플랫폼의 서버 전용 환경변수 |
| `SUPABASE_SERVICE_ROLE_KEY` | 같은 API 설정 화면의 서버 전용 `service_role` 키 | 로컬 `.env.local`, 배포 플랫폼의 서버 전용 환경변수 |

`SUPABASE_SERVICE_ROLE_KEY`는 브라우저 코드, `NEXT_PUBLIC_*` 변수, GitHub 저장소에 넣지 마세요. 배포 플랫폼에서도 서버 런타임에만 제공하고 로그에 출력하지 마세요. 새 형식의 Supabase 키를 사용하려면 현재 REST 클라이언트가 지원하는지 별도로 확인한 뒤 설정하세요.

### 2. 공공데이터포털 API 키 발급

공공데이터포털 계정의 **마이페이지 → 오픈API → 개발계정/활용신청**에서 아래 각 데이터셋을 신청하고 승인 상태를 확인하세요. 기존 구현은 `DATA_GO_KR_API_KEY` 하나를 읽으며, 실제 호출에는 인증키를 서버에서 URL 인코딩합니다. 포털이 복호화 키를 보여주는 경우 그 키를 환경변수 값으로 사용하세요.

| 데이터 | 데이터셋 / 공식 문서 | 범위 및 주의 |
|---|---|---|
| 나라일터 공공 채용 | [15156780](https://www.data.go.kr/data/15156780/openapi.do) | 무료, 이용허락 제한 없음. 목록은 공고 유형(`e01/e02/e03/e04/e06`)과 기관 구분(`g01`–`g04`)을 요구합니다. |
| Q-Net 국가자격 시험 일정 | [15074408](https://www.data.go.kr/data/15074408/openapi.do) | 무료, 이용허락 제한 없음. 국가기술·과정평가형·일학습병행·국가전문자격 일정 범위이며 종목 전체 마스터 목록과는 다릅니다. |
| NCS 능력단위 | [15063879](https://www.data.go.kr/data/15063879/openapi.do) | 무료, 이용허락 제한 없음. 제공처 문서상 약 1,306개 능력단위입니다. 직업 프로필 전체가 아닙니다. |
| e새일 직업교육훈련과정 | [15106088](https://www.data.go.kr/data/15106088/openapi.do) | 무료, 이용허락 제한 없음. e새일 과정 데이터로 전국 내일배움카드 과정 전체를 의미하지 않습니다. |

워크넷 채용정보 [3038225](https://www.data.go.kr/data/3038225/openapi.do)와 직업정보 [3071087](https://www.data.go.kr/data/3071087/openapi.do)는 공공누리 제4유형(비영리·변경금지) 조건이 표시되어 있습니다. CAREERON의 상업적 이용 여부와 변경·저장 권한이 확인되기 전에는 연동하지 않습니다. 필요한 경우 제공기관에 별도 이용 허가를 받아 주세요.

### 3. 동기화 비밀값 설정

강한 무작위 값 하나를 비밀값 생성기에서 발급해 다음 두 곳에 동일하게 설정하세요.

| 변수 | 설정 위치 | 용도 |
|---|---|---|
| `DATA_SYNC_SECRET` | 앱 배포 환경의 서버 전용 환경변수 | `/api/data-sync` 요청 인증 |
| `CAREERON_DATA_SYNC_URL` | GitHub 저장소 → Settings → Secrets and variables → Actions → Repository secrets | 배포된 `https://서비스도메인/api/data-sync` 주소 |
| `CAREERON_DATA_SYNC_SECRET` | 같은 GitHub Actions secrets 화면 | `DATA_SYNC_SECRET`과 동일한 요청 인증값 |

URL과 키를 소스 코드, 이슈, 채팅, Actions 로그에 붙여 넣지 마세요. 이 workflow는 기본 브랜치에 반영되고 배포 URL이 준비된 후에만 동작합니다. 매일 17:17 UTC(한국시간 02:17)에 실행되며 `workflow_dispatch`로 수동 실행할 수도 있습니다.

## AI가 자동으로 할 수 있는 작업

사람이 스테이징 프로젝트와 위 자격 증명을 설정한 뒤에는 동기화 API 호출, 응답 오류 확인, upsert, 중복 및 레코드 수 집계, 검색/상세 화면 확인을 진행할 수 있습니다. 현재 코드의 동기화 대상은 나라일터 공고, Q-Net 시험 일정, NCS 능력단위, e새일 교육과정뿐입니다. 실제 데이터는 허용된 출처에서 받은 응답만 저장해야 하며, 키가 없거나 호출이 실패하면 완료로 표시하지 않습니다.

서비스가 배포된 후 수동 실행 예시는 다음과 같습니다. 비밀값은 터미널 환경변수에 먼저 안전하게 설정하고 명령 인자나 출력에 직접 넣지 마세요.

```powershell
Invoke-RestMethod `
  -Uri $env:CAREERON_DATA_SYNC_URL `
  -Method Post `
  -Headers @{ Authorization = "Bearer $env:CAREERON_DATA_SYNC_SECRET" } `
  -ContentType "application/json" `
  -Body "{}"
```

정상 응답은 각 출처별 `inserted`/`updated`를 반환합니다. `partial` 또는 HTTP 오류가 나오면 성공 건수로 처리하지 말고 해당 동기화 로그와 제공처 오류를 확인하세요.

## 마이그레이션 및 DB 검증 절차

1. PR #2의 `supabase/migrations/202611190001_public_data_catalog.sql`을 검토한 뒤 **스테이징 DB에 먼저** 적용하세요. Supabase SQL Editor 또는 프로젝트에서 승인된 마이그레이션 절차를 사용합니다. 이 작업에서는 인증 정보가 없어 마이그레이션을 적용하지 않았습니다.
2. 적용 후 `data_sources`, `catalog_records`, `data_sync_logs` 테이블과 RLS가 존재하는지 확인하세요. 공개 역할에는 공개 데이터 SELECT만 있고, 기록 쓰기 권한은 서버 전용이어야 합니다.
3. Actions를 수동 실행하고 출처별 API 결과가 정상인지 확인한 뒤 아래 SQL로 실제 행 수, 마지막 확인 시각, 중복 여부를 조회하세요.

```sql
select
  s.provider,
  s.dataset_name,
  r.record_type,
  count(distinct (r.source_id, r.external_id)) as unique_records,
  max(r.last_verified_at) as last_verified_at
from public.catalog_records r
join public.data_sources s on s.id = r.source_id
group by s.provider, s.dataset_name, r.record_type
order by r.record_type, s.provider;

select
  source_id,
  count(*) filter (where status = 'completed') as completed_runs,
  count(*) filter (where status = 'failed') as failed_runs,
  max(completed_at) filter (where status = 'completed') as last_success_at
from public.data_sync_logs
group by source_id
order by source_id;

select source_id, external_id, count(*) as copies
from public.catalog_records
group by source_id, external_id
having count(*) > 1;
```

고유 제약조건이 중복 레코드 삽입을 막아야 하며 마지막 쿼리는 0행이어야 합니다. 계정 간 차단은 스테이징의 서로 다른 두 테스트 계정으로 RLS를 별도 검증하세요. 프로덕션 적용이나 운영 데이터 변경은 명시적인 승인 전에 하지 마세요.

## 아직 조사·구현이 필요한 데이터

- **자격증 종목:** Q-Net 시험 일정 API는 일정 제공용입니다. 국가기술자격 종목 정보 API [15041600](https://www.data.go.kr/data/15041600/openapi.do)은 문서상 HTTP 요청 URL만 안내하므로 서비스 키를 평문 전송하지 않습니다. 사용허락 제한 없음인 파일데이터 [3038404](https://www.data.go.kr/data/3038404/fileData.do)는 CSV 연간 자료라 안전한 HTTPS 다운로드/갱신 절차를 별도로 확인해야 합니다.
- **민간자격:** 한국직업능력연구원의 등록 민간자격 [15075600](https://www.data.go.kr/data/15075600/fileData.do)은 등록·폐지 상태를 포함하는 반기 CSV이고, 공인 민간자격 [15069557](https://www.data.go.kr/data/15069557/fileData.do)은 연간 CSV입니다. 국가공인 여부와 일반 등록 여부를 분리해야 하며 현재 자동 수집기는 없습니다.
- **기업:** 금융위원회 기업기본정보 [15043184](https://www.data.go.kr/data/15043184/openapi.do)는 이용허락 제한 없음으로 표시되고 일 1회 갱신되며 기업명/법인등록번호 조회가 가능합니다. 다만 전체 전국 기업의 완전한 디렉터리 제공 여부는 확인되지 않았고, 이 프로젝트에는 어댑터가 없습니다. OpenDART 기업개황은 회사별 고유번호 조회 방식이며, 전체 적재·재배포 권리는 확인 전까지 사용하지 않습니다.
- **민간 채용:** 워크넷 API는 이용 조건 확인 전 제외됩니다. 민간기업 공식 채용 페이지를 자동 수집할 수 있는 포괄적 공공 API는 확인되지 않았습니다. 제공사 계약, 공식 피드 또는 별도 이용 허가 없이 크롤링하지 않습니다.
- **교육:** e새일은 일부 대상 과정만 제공합니다. 이번 조사에서는 전국 훈련과정을 포괄하는 Work24 API 문서를 확인하지 못했습니다.
- **직업 상세:** 워크넷 직업정보는 제4유형 조건이 있어 이용 권한 확인 전 적재하지 않습니다. 현재 NCS 레코드를 직업정보로 오인해 표시하지 않습니다.

## 현재 측정 결과

| 항목 | 결과 |
|---|---|
| API 호출 시도/성공률 | 자격 증명 미설정으로 0회 시도, 성공률 산출 불가 |
| Supabase 저장 레코드 | 미검증; 연결 및 마이그레이션 미적용 |
| 실제 저장 건수 | 미검증; 제공처 문서의 건수는 저장 건수가 아님 |
| 마지막 성공 동기화 | 없음 |
| UI 실제 데이터 표시 | DB 연결 전이라 검증 불가; 빈/설정 필요 상태만 표시해야 함 |

## 고용24 채용정보 API

### 필수 설정

고용24 Open API를 신청해 승인을 받은 뒤 발급된 새 키를 사용하세요. 이전 대화에 키가 평문으로 입력된 적이 있으므로 해당 키는 폐기하고 재발급해야 하며, 재발급 키도 채팅이나 코드에 입력하지 마세요.

GitHub 저장소의 **Settings → Secrets and variables → Actions → New repository secret**에서 다음 Secret을 설정하세요.

| Secret | 설명 |
|---|---|
| `WORK24_API_KEY` | 고용24 Open API 인증키 |
| `CAREERON_DATA_SYNC_URL` | 배포된 서버의 `/api/data-sync` 주소 |
| `CAREERON_DATA_SYNC_SECRET` | 서버 환경변수 `DATA_SYNC_SECRET`과 동일한 난수 비밀값 |

동기화 서버를 직접 호스팅하는 경우 `WORK24_API_KEY`를 서버 전용 환경변수로도 설정할 수 있습니다. 키는 브라우저에서 사용되지 않습니다. GitHub Actions 워크플로는 매일 17:43 UTC에 실행되며 수동 실행도 지원합니다. 실행당 최대 10페이지(페이지당 100건)를 요청합니다. Work24 연동 브랜치에서는 API 자격 증명 확인과 목록/상세 XML 파싱 점검을 별도로 실행하며, 로그에는 키와 공고 원문을 출력하지 않습니다.

### 데이터베이스 설정 및 이용 조건

1. 별도의 개발/스테이징 Supabase 프로젝트에서 `supabase/migrations/202611190002_work24_job_postings.sql`을 적용하세요. 운영 DB에 적용하지 마세요.
2. 고용24 API 승인 및 이용 조건을 확인한 후에만 `data_sources`의 `work24-job-postings.usage_status`를 `allowed`로 변경하세요. 마이그레이션은 의도적으로 `review_required`로 등록합니다.
3. Actions를 수동 실행하고 결과가 성공인지 확인하세요. 키나 인증 헤더를 로그로 출력하지 마세요.
4. `data_sync_logs`의 `records_seen`, `records_inserted`, `records_updated`, `records_duplicate`, `records_failed`를 확인하고, `catalog_records`에서 Work24의 고유 공고를 집계하세요.

2026-11-18 확인: GitHub repository secret 이름은 등록되어 있었지만, 목록 API 요청은 HTTP 200 XML 응답에서 `신청하신 서비스가 존재하지 않습니다` 오류를 반환했습니다. 실제 공고는 수집되지 않았고 상세 API는 호출되지 않았습니다. 고용24에서 신청한 API 서비스와 키의 승인/연결 상태를 확인한 후 재검증하세요. 오류 응답 원문과 자격 증명은 로그에 남기지 않았습니다.

상세 API 결과는 서버 환경변수 `WORK24_API_KEY`가 필요합니다. 실제 상세 응답을 아직 검증하지 못했으며, API 요청 및 DB 동기화는 위 오류와 Supabase 설정 부재로 미완료입니다.

### GitHub Pages 제한

GitHub Pages는 정적 호스팅이므로 Next.js 서버 렌더링, `/api/data-sync`, Supabase 서버 전용 키 또는 OpenAI/Work24 비밀키를 실행할 수 없습니다. GitHub Pages에서는 서버 기능이 동작하지 않으며, 전체 CAREERON 서비스를 공개하려면 Next.js 서버를 지원하는 호스팅에 배포해야 합니다. 정적 프리뷰를 Pages에 배포하더라도 API/DB 기능을 사용할 수 있다고 표시하면 안 됩니다.

### Vercel 배포

Vercel에서 이 GitHub 저장소를 새 Next.js 프로젝트로 연결하면 별도 정적 내보내기 설정 없이 서버 기능을 배포할 수 있습니다. **Project Settings → Environment Variables**에 필요한 값만 서버 환경변수로 등록하고 Preview/Production 범위를 구분하세요. 이 저장소에서 사용하는 이름은 `OPENAI_API_KEY`, `OPENAI_MODEL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `WORK24_API_KEY`, `DATA_GO_KR_API_KEY`, `DATA_SYNC_SECRET`입니다. 실제 자격 증명은 `NEXT_PUBLIC_` 접두사를 붙이지 말고, 채팅/코드/GitHub 변수에 입력하지 마세요. Vercel 계정 연결 및 배포는 이 세션에서 수행하지 않았습니다.
