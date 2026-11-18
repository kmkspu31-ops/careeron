alter table public.data_sync_logs
  add column if not exists records_seen integer not null default 0 check (records_seen >= 0),
  add column if not exists records_duplicate integer not null default 0 check (records_duplicate >= 0),
  add column if not exists records_failed integer not null default 0 check (records_failed >= 0);

insert into public.data_sources (
  id, provider, dataset_name, dataset_url, api_url, license_name, license_url, usage_status, verified_at
) values (
  'work24-job-postings',
  '고용24',
  '채용정보 목록 및 상세정보',
  'https://www.work24.go.kr/cm/openApi/call/wk/callOpenApiSvcInfo210L01.do',
  'https://www.work24.go.kr/cm/openApi/call/wk/callOpenApiSvcInfo210L01.do',
  'API 신청 승인 및 이용 조건 확인 필요',
  'https://www.work24.go.kr/',
  'review_required',
  now()
)
on conflict (id) do update set
  provider = excluded.provider,
  dataset_name = excluded.dataset_name,
  dataset_url = excluded.dataset_url,
  api_url = excluded.api_url,
  license_name = excluded.license_name,
  license_url = excluded.license_url,
  updated_at = now();
