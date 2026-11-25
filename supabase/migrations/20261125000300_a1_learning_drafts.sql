-- Additive drafts only: does not change grades, content, roles, enrollment or completed progress.
begin;
create table if not exists public.a1_learning_drafts (
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_key text not null,
  fields jsonb not null default '{}'::jsonb check (jsonb_typeof(fields) = 'object' and octet_length(fields::text) <= 262144),
  revision bigint not null default 1 check (revision > 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_key)
);
revoke all on public.a1_learning_drafts from public, anon, authenticated;
grant select on public.a1_learning_drafts to authenticated;
grant all on public.a1_learning_drafts to service_role;
alter table public.a1_learning_drafts enable row level security;
drop policy if exists a1_learning_drafts_owner on public.a1_learning_drafts;
create policy a1_learning_drafts_owner on public.a1_learning_drafts for select to authenticated using (user_id = auth.uid());

create or replace function public.save_a1_learning_draft(p_key text, p_fields jsonb, p_revision bigint, p_user uuid)
returns public.a1_learning_drafts language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_row public.a1_learning_drafts%rowtype;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if p_user is distinct from v_uid then raise exception 'draft_user_changed' using errcode = '28000'; end if;
  if p_key is null or not (p_key ~ '^unit:[1-8]$' or p_key ~ '^module:[0-9a-f-]{36}$') then
    raise exception 'invalid_a1_key' using errcode = '22023';
  end if;
  if p_key like 'module:%' and not exists (
    select 1 from public.modules m join public.cycles c on c.id = m.cycle_id
    join public.enrollments e on e.cycle_id = c.id
    where m.id::text = substring(p_key from 8) and c.cefr_level::text = 'A1' and e.user_id = v_uid
  ) then raise exception 'invalid_a1_module' using errcode = '22023'; end if;
  if p_fields is null or jsonb_typeof(p_fields) <> 'object' or octet_length(p_fields::text) > 262144
     or p_revision is null or p_revision < 0 then raise exception 'invalid_a1_draft' using errcode = '22023'; end if;
  -- Per-account, per-lesson lock plus compare-and-swap: a stale device cannot overwrite newer work.
  perform pg_advisory_xact_lock(hashtextextended(v_uid::text || ':' || p_key, 0));
  select * into v_row from public.a1_learning_drafts where user_id = v_uid and lesson_key = p_key;
  if coalesce(v_row.revision, 0) <> p_revision then raise exception 'draft_conflict' using errcode = '40001'; end if;
  insert into public.a1_learning_drafts(user_id, lesson_key, fields, revision)
  values(v_uid, p_key, p_fields, p_revision + 1)
  on conflict (user_id, lesson_key) do update set fields = excluded.fields, revision = excluded.revision, updated_at = now()
  returning * into v_row;
  return v_row;
end;
$$;
revoke all on function public.save_a1_learning_draft(text,jsonb,bigint,uuid) from public, anon;
grant execute on function public.save_a1_learning_draft(text,jsonb,bigint,uuid) to authenticated;
commit;
