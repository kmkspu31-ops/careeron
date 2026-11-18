create table if not exists public.data_sources (
  id text primary key,
  provider text not null,
  dataset_name text not null,
  dataset_url text not null,
  api_url text,
  license_name text not null,
  license_url text,
  usage_status text not null check (
    usage_status in ('allowed', 'conditional', 'review_required', 'not_verified')
  ),
  verified_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.catalog_records (
  id uuid primary key default gen_random_uuid(),
  source_id text not null references public.data_sources(id) on delete restrict,
  record_type text not null check (
    record_type in ('job', 'occupation', 'skill', 'certification', 'company', 'training')
  ),
  external_id text not null,
  title text not null,
  summary text not null default '',
  category text,
  region text,
  source_url text,
  fields jsonb not null default '{}'::jsonb,
  data_status text not null default 'active' check (
    data_status in ('active', 'expired', 'withdrawn', 'unknown')
  ),
  collected_at timestamptz not null default now(),
  last_verified_at timestamptz not null default now(),
  expires_at timestamptz,
  updated_at timestamptz not null default now(),
  search_document tsvector generated always as (
    to_tsvector(
      'simple',
      concat_ws(' ', title, summary, category, region, fields::text)
    )
  ) stored,
  unique (source_id, external_id)
);

create table if not exists public.data_sync_logs (
  id bigint generated always as identity primary key,
  source_id text not null references public.data_sources(id) on delete restrict,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null check (status in ('running', 'completed', 'failed')),
  records_inserted integer not null default 0 check (records_inserted >= 0),
  records_updated integer not null default 0 check (records_updated >= 0),
  error_code text,
  created_at timestamptz not null default now()
);

create index if not exists catalog_records_type_status_updated_idx
  on public.catalog_records (record_type, data_status, last_verified_at desc);
create index if not exists catalog_records_category_idx
  on public.catalog_records (record_type, category);
create index if not exists catalog_records_region_idx
  on public.catalog_records (region);
create index if not exists catalog_records_expires_idx
  on public.catalog_records (expires_at)
  where expires_at is not null;
create index if not exists catalog_records_search_idx
  on public.catalog_records using gin (search_document);
create index if not exists data_sync_logs_source_started_idx
  on public.data_sync_logs (source_id, started_at desc);
create unique index if not exists data_sync_logs_one_running_per_source_idx
  on public.data_sync_logs (source_id)
  where status = 'running';

alter table public.data_sources enable row level security;
alter table public.catalog_records enable row level security;
alter table public.data_sync_logs enable row level security;

drop policy if exists "Public can read data sources" on public.data_sources;
create policy "Public can read data sources"
  on public.data_sources for select
  to anon, authenticated
  using (true);

drop policy if exists "Public can read catalog records" on public.catalog_records;
create policy "Public can read catalog records"
  on public.catalog_records for select
  to anon, authenticated
  using (data_status in ('active', 'expired', 'unknown'));

revoke all on public.data_sources from anon, authenticated;
revoke all on public.catalog_records from anon, authenticated;
revoke all on public.data_sync_logs from anon, authenticated;
grant select on public.data_sources, public.catalog_records to anon, authenticated;
grant all on public.data_sources, public.catalog_records, public.data_sync_logs to service_role;
grant usage, select on sequence public.data_sync_logs_id_seq to service_role;

insert into public.data_sources (
  id, provider, dataset_name, dataset_url, api_url, license_name, license_url, usage_status, verified_at
) values
  (
    'narailter-public-jobs',
    '인사혁신처',
    '공공취업정보 조회 서비스 (나라일터)',
    'https://www.data.go.kr/data/15156780/openapi.do',
    'https://apis.data.go.kr/1760000/PblJobService',
    '이용허락범위 제한 없음',
    'https://www.data.go.kr/ugs/selectPortalPolicyView.do',
    'allowed',
    '2026-11-18T00:00:00Z'
  ),
  (
    'qnet-national-qualification-schedules',
    '한국산업인력공단',
    '국가자격 시험일정 조회 서비스',
    'https://www.data.go.kr/data/15074408/openapi.do',
    'https://apis.data.go.kr/B490007/qualExamSchd',
    '이용허락범위 제한 없음',
    'https://www.data.go.kr/ugs/selectPortalPolicyView.do',
    'allowed',
    '2026-11-18T00:00:00Z'
  ),
  (
    'esaeil-training-courses',
    '성평등가족부',
    'e새일 직업교육훈련과정 정보 서비스',
    'https://www.data.go.kr/data/15106088/openapi.do',
    'https://apis.data.go.kr/1383000/nwis/workTrainningEducationCourseService',
    '이용허락범위 제한 없음',
    'https://www.data.go.kr/ugs/selectPortalPolicyView.do',
    'allowed',
    '2026-11-18T00:00:00Z'
  ),
  (
    'worknet-job-postings',
    '한국고용정보원',
    '워크넷 채용정보 채용목록 및 상세정보',
    'https://www.data.go.kr/data/3038225/openapi.do',
    null,
    '공공누리 제4유형 (비영리, 변경금지)',
    'https://www.kogl.or.kr/info/licenseType4.do',
    'conditional',
    '2026-11-18T00:00:00Z'
  ),
  (
    'worknet-occupation-information',
    '한국고용정보원',
    '워크넷 직업정보 및 직업사전',
    'https://www.data.go.kr/data/3071087/openapi.do',
    null,
    '공공누리 제4유형 (비영리, 변경금지)',
    'https://www.kogl.or.kr/info/licenseType4.do',
    'conditional',
    '2026-11-18T00:00:00Z'
  ),
  (
    'qnet-ncs-competency-units',
    '한국산업인력공단',
    'NCS 관련 정보 서비스',
    'https://www.data.go.kr/data/15063879/openapi.do',
    'https://c.q-net.or.kr/openapi/Ncs1info/ncsinfo.do',
    '이용허락범위 제한 없음',
    'https://www.data.go.kr/ugs/selectPortalPolicyView.do',
    'allowed',
    '2026-11-18T00:00:00Z'
  ),
  (
    'procurement-registered-suppliers',
    '조달청',
    '나라장터 사용자정보 서비스',
    'https://www.data.go.kr/data/15129466/openapi.do',
    'https://apis.data.go.kr/1230000/ao/UsrInfoService02',
    '이용허락범위 제한 없음',
    'https://www.data.go.kr/ugs/selectPortalPolicyView.do',
    'allowed',
    '2026-11-18T00:00:00Z'
  ),
  (
    'factoryon-registered-factories',
    '한국산업단지공단',
    '전국등록공장현황',
    'https://www.data.go.kr/data/15105482/fileData.do',
    null,
    '이용허락범위 제한 없음',
    'https://www.data.go.kr/ugs/selectPortalPolicyView.do',
    'allowed',
    '2026-11-18T00:00:00Z'
  ),
  (
    'opendart-company-information',
    '금융감독원',
    'OpenDART 기업개황',
    'https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS001&apiId=2019002',
    'https://opendart.fss.or.kr/api/company.json',
    'API 이용약관 및 재배포 권리 확인 필요',
    'https://opendart.fss.or.kr/uss/umt/EgovMberInsertView.do',
    'review_required',
    '2026-11-18T00:00:00Z'
  )
on conflict (id) do update set
  provider = excluded.provider,
  dataset_name = excluded.dataset_name,
  dataset_url = excluded.dataset_url,
  api_url = excluded.api_url,
  license_name = excluded.license_name,
  license_url = excluded.license_url,
  usage_status = excluded.usage_status,
  verified_at = excluded.verified_at,
  updated_at = now();
