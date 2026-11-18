create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Users read their own profile" on public.profiles;
create policy "Users read their own profile"
  on public.profiles for select using (auth.uid() = id);
drop policy if exists "Users update their own profile" on public.profiles;
create policy "Users update their own profile"
  on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

insert into public.profiles (id, full_name)
select u.id, coalesce(u.raw_user_meta_data ->> 'full_name', '')
from auth.users u
on conflict (id) do nothing;

alter table public.ai_messages
  add column if not exists request_id uuid,
  add column if not exists status text not null default 'completed'
    check (status in ('pending', 'completed', 'failed'));

create unique index if not exists ai_messages_request_role_idx
  on public.ai_messages (conversation_id, request_id, role)
  where request_id is not null;

alter table public.ai_usage_daily
  add column if not exists last_requested_at timestamptz;

alter table public.ai_usage
  add column if not exists status text not null default 'completed'
    check (status in ('completed', 'failed'));

drop function if exists public.reserve_ai_daily_request(text, integer);
create function public.reserve_ai_daily_request(
  p_subject_hash text,
  p_daily_limit integer,
  p_min_interval_seconds integer default 3
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  reserved_count integer;
begin
  if p_subject_hash is null
    or length(p_subject_hash) <> 64
    or p_daily_limit < 1
    or p_min_interval_seconds < 1 then
    raise exception 'Invalid AI quota reservation';
  end if;

  insert into public.ai_usage_daily as usage (subject_hash, usage_date, request_count, last_requested_at)
  values (p_subject_hash, current_date, 1, now())
  on conflict (subject_hash, usage_date) do update
    set request_count = usage.request_count + 1,
        last_requested_at = now()
    where usage.request_count < p_daily_limit
      and (
        usage.last_requested_at is null
        or usage.last_requested_at <= now() - make_interval(secs => p_min_interval_seconds)
      )
  returning request_count into reserved_count;

  if reserved_count is not null then return reserved_count; end if;
  if exists (
    select 1 from public.ai_usage_daily usage
    where usage.subject_hash = p_subject_hash
      and usage.usage_date = current_date
      and usage.request_count < p_daily_limit
      and usage.last_requested_at > now() - make_interval(secs => p_min_interval_seconds)
  ) then return -1; end if;
  return 0;
end;
$$;
revoke all on function public.reserve_ai_daily_request(text, integer, integer) from public, anon, authenticated;
grant execute on function public.reserve_ai_daily_request(text, integer, integer) to service_role;

create table if not exists public.ai_request_keys (
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  request_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (conversation_id, request_id)
);
alter table public.ai_request_keys enable row level security;
drop policy if exists "Users manage their own AI request keys" on public.ai_request_keys;
create policy "Users manage their own AI request keys"
  on public.ai_request_keys for all
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.ai_conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  );

drop function if exists public.record_ai_usage(text, text, integer, integer, uuid);
create function public.record_ai_usage(
  p_subject_hash text,
  p_model text,
  p_input_tokens integer,
  p_output_tokens integer,
  p_user_id uuid,
  p_status text
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
    or p_output_tokens < 0
    or p_status not in ('completed', 'failed') then
    raise exception 'Invalid AI usage record';
  end if;

  insert into public.ai_usage (user_id, visitor_hash, model, input_tokens, output_tokens, status)
  values (
    p_user_id,
    case when p_user_id is null then p_subject_hash else null end,
    p_model,
    p_input_tokens,
    p_output_tokens,
    p_status
  );
end;
$$;
revoke all on function public.record_ai_usage(text, text, integer, integer, uuid, text) from public, anon, authenticated;
grant execute on function public.record_ai_usage(text, text, integer, integer, uuid, text) to service_role;

create or replace function public.save_ai_exchange(
  p_conversation_id uuid,
  p_request_id uuid,
  p_user_message_id uuid,
  p_assistant_message_id uuid,
  p_user_content text,
  p_assistant_content text,
  p_mode text,
  p_title text,
  p_regenerate boolean default false,
  p_conversation_mode text default 'auto'
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_message_created_at timestamptz;
begin
  if auth.uid() is null
    or p_user_content is null
    or length(p_user_content) > 6000
    or p_assistant_content is null
    or length(p_assistant_content) > 80000
    or p_mode not in ('general', 'career', 'resume', 'interview', 'job-analysis', 'certification', 'roadmap')
    or p_conversation_mode not in ('auto', 'career', 'resume', 'interview', 'job-analysis', 'certification', 'roadmap') then
    raise exception 'Invalid AI exchange';
  end if;

  if not exists (
    select 1 from public.ai_request_keys k
    where k.conversation_id = p_conversation_id
      and k.request_id = p_request_id
      and k.user_id = auth.uid()
  ) then
    raise exception 'AI request reservation not found';
  end if;

  update public.ai_conversations c
  set updated_at = now(),
      mode = p_conversation_mode,
      title = case when c.title = '새 대화' then left(p_title, 80) else c.title end
  where c.id = p_conversation_id and c.user_id = auth.uid();
  if not found then raise exception 'AI conversation not found'; end if;

  if p_regenerate then
    select m.created_at into target_message_created_at
    from public.ai_messages m
    where m.id = p_user_message_id
      and m.conversation_id = p_conversation_id
      and m.role = 'user'
      and m.content = p_user_content
      and m.status = 'completed'
    for update;
    if target_message_created_at is null then
      raise exception 'AI message to regenerate was not found';
    end if;
    if exists (
      select 1 from public.ai_messages m
      where m.conversation_id = p_conversation_id
        and m.role = 'user'
        and m.created_at > target_message_created_at
    ) then
      raise exception 'Only the latest user message can be regenerated';
    end if;
    delete from public.ai_messages m
    where m.conversation_id = p_conversation_id
      and m.role = 'assistant'
      and m.created_at > target_message_created_at;
    insert into public.ai_messages (id, conversation_id, request_id, role, content, mode, status, created_at)
    values (p_assistant_message_id, p_conversation_id, p_request_id, 'assistant', p_assistant_content, p_mode, 'completed', clock_timestamp());
  else
    insert into public.ai_messages (id, conversation_id, request_id, role, content, mode, status, created_at)
    values
      (p_user_message_id, p_conversation_id, p_request_id, 'user', p_user_content, p_mode, 'completed', clock_timestamp()),
      (p_assistant_message_id, p_conversation_id, p_request_id, 'assistant', p_assistant_content, p_mode, 'completed', clock_timestamp());
  end if;
end;
$$;
revoke all on function public.save_ai_exchange(uuid, uuid, uuid, uuid, text, text, text, text, boolean, text) from public, anon;
grant execute on function public.save_ai_exchange(uuid, uuid, uuid, uuid, text, text, text, text, boolean, text) to authenticated;

create or replace function public.import_ai_conversation(
  p_id uuid,
  p_title text,
  p_mode text,
  p_messages jsonb
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  imported_id uuid;
begin
  if auth.uid() is null
    or p_title is null
    or length(p_title) > 80
    or p_mode not in ('auto', 'career', 'resume', 'interview', 'job-analysis', 'certification', 'roadmap')
    or p_messages is null
    or jsonb_typeof(p_messages) is distinct from 'array'
    or jsonb_array_length(p_messages) > 20 then
    raise exception 'Invalid AI conversation import';
  end if;

  insert into public.ai_conversations (id, user_id, title, mode)
  values (p_id, auth.uid(), p_title, p_mode)
  on conflict (id) do nothing
  returning id into imported_id;

  if imported_id is null then return false; end if;

  insert into public.ai_messages (id, conversation_id, role, content, mode, status, created_at)
  select
    (message.value ->> 'id')::uuid,
    p_id,
    message.value ->> 'role',
    message.value ->> 'content',
    coalesce(message.value ->> 'mode', 'general'),
    'completed',
    clock_timestamp() + (message.ordinality * interval '1 millisecond')
  from jsonb_array_elements(p_messages) with ordinality as message(value, ordinality)
  where jsonb_typeof(message.value) = 'object'
    and message.value ->> 'role' in ('user', 'assistant')
    and jsonb_typeof(message.value -> 'content') = 'string'
    and length(message.value ->> 'content') <= 12000
    and coalesce(message.value ->> 'mode', 'general')
      in ('general', 'career', 'resume', 'interview', 'job-analysis', 'certification', 'roadmap');

  if (select count(*) from public.ai_messages m where m.conversation_id = p_id)
    <> jsonb_array_length(p_messages) then
    raise exception 'Invalid AI conversation messages';
  end if;

  return true;
end;
$$;
revoke all on function public.import_ai_conversation(uuid, text, text, jsonb) from public, anon;
grant execute on function public.import_ai_conversation(uuid, text, text, jsonb) to authenticated;
