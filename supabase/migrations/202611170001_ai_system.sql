create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '새 대화',
  mode text not null default 'auto'
    check (mode in ('auto', 'career', 'resume', 'interview', 'job-analysis', 'certification', 'roadmap')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  mode text not null default 'general',
  sources jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_usage (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  visitor_hash text,
  model text not null,
  input_tokens integer not null default 0 check (input_tokens >= 0),
  output_tokens integer not null default 0 check (output_tokens >= 0),
  request_count integer not null default 1 check (request_count > 0),
  created_at timestamptz not null default now(),
  check ((user_id is null) <> (visitor_hash is null))
);

create table if not exists public.ai_usage_daily (
  subject_hash text not null,
  usage_date date not null default current_date,
  request_count integer not null default 0 check (request_count >= 0),
  primary key (subject_hash, usage_date)
);

create table if not exists public.ai_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  message_id uuid not null references public.ai_messages(id) on delete cascade,
  rating smallint not null check (rating in (-1, 1)),
  feedback_text text,
  created_at timestamptz not null default now(),
  unique (user_id, message_id)
);

create table if not exists public.ai_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid references public.ai_conversations(id) on delete set null,
  file_name text not null,
  file_type text not null check (file_type in ('application/pdf', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')),
  storage_path text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_career_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  desired_roles text[] not null default '{}',
  interests text[] not null default '{}',
  certifications text[] not null default '{}',
  employment_goal text,
  updated_at timestamptz not null default now()
);

create index if not exists ai_conversations_user_updated_idx
  on public.ai_conversations (user_id, updated_at desc);
create index if not exists ai_messages_conversation_created_idx
  on public.ai_messages (conversation_id, created_at);
create index if not exists ai_usage_created_idx
  on public.ai_usage (created_at desc);

alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;
alter table public.ai_usage enable row level security;
alter table public.ai_usage_daily enable row level security;
alter table public.ai_feedback enable row level security;
alter table public.ai_documents enable row level security;
alter table public.ai_career_profiles enable row level security;

create policy "Users manage their own AI conversations"
  on public.ai_conversations for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users read messages in their own conversations"
  on public.ai_messages for select
  using (exists (
    select 1 from public.ai_conversations c
    where c.id = conversation_id and c.user_id = auth.uid()
  ));

create policy "Users add messages to their own conversations"
  on public.ai_messages for insert
  with check (exists (
    select 1 from public.ai_conversations c
    where c.id = conversation_id and c.user_id = auth.uid()
  ));

create policy "Users update messages in their own conversations"
  on public.ai_messages for update
  using (exists (
    select 1 from public.ai_conversations c
    where c.id = conversation_id and c.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.ai_conversations c
    where c.id = conversation_id and c.user_id = auth.uid()
  ));

create policy "Users delete messages in their own conversations"
  on public.ai_messages for delete
  using (exists (
    select 1 from public.ai_conversations c
    where c.id = conversation_id and c.user_id = auth.uid()
  ));

create policy "Users read their own feedback"
  on public.ai_feedback for select
  using (auth.uid() = user_id);
create policy "Users add feedback to their own messages"
  on public.ai_feedback for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.ai_messages m
      join public.ai_conversations c on c.id = m.conversation_id
      where m.id = message_id and c.user_id = auth.uid()
    )
  );
create policy "Users update their own career profile"
  on public.ai_career_profiles for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "Users manage their own AI documents"
  on public.ai_documents for all
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and (
      conversation_id is null
      or exists (
        select 1 from public.ai_conversations c
        where c.id = conversation_id and c.user_id = auth.uid()
      )
    )
  );

create or replace function public.reserve_ai_daily_request(
  p_subject_hash text,
  p_daily_limit integer
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  reserved_count integer;
begin
  if p_subject_hash is null or length(p_subject_hash) <> 64 or p_daily_limit < 1 then
    raise exception 'Invalid AI quota reservation';
  end if;

  insert into public.ai_usage_daily as usage (subject_hash, usage_date, request_count)
  values (p_subject_hash, current_date, 1)
  on conflict (subject_hash, usage_date) do update
    set request_count = usage.request_count + 1
    where usage.request_count < p_daily_limit
  returning request_count into reserved_count;

  return coalesce(reserved_count, 0);
end;
$$;

create or replace function public.record_ai_usage(
  p_subject_hash text,
  p_model text,
  p_input_tokens integer,
  p_output_tokens integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_subject_hash is null
    or length(p_subject_hash) <> 64
    or p_model is null
    or p_input_tokens < 0
    or p_output_tokens < 0 then
    raise exception 'Invalid AI usage record';
  end if;

  insert into public.ai_usage (visitor_hash, model, input_tokens, output_tokens)
  values (p_subject_hash, p_model, p_input_tokens, p_output_tokens);
end;
$$;

revoke all on function public.reserve_ai_daily_request(text, integer) from public, anon, authenticated;
revoke all on function public.record_ai_usage(text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.reserve_ai_daily_request(text, integer) to service_role;
grant execute on function public.record_ai_usage(text, text, integer, integer) to service_role;
