-- Additive A1 progress for repository-owned units; never seeds, updates or deletes existing courses.
begin;
create table if not exists public.a1_unit_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  unit_number integer not null check (unit_number between 1 and 8),
  best_score integer not null check (best_score between 0 and 100),
  last_score integer not null check (last_score between 0 and 100),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, unit_number)
);
revoke all on public.a1_unit_progress from anon, authenticated;
grant select on public.a1_unit_progress to authenticated;
grant all on public.a1_unit_progress to service_role;
alter table public.a1_unit_progress enable row level security;
drop policy if exists a1_unit_progress_owner on public.a1_unit_progress;
create policy a1_unit_progress_owner on public.a1_unit_progress for select to authenticated using (user_id = auth.uid());

create or replace function public.submit_a1_unit_quiz(p_unit integer, p_answers jsonb)
returns public.a1_unit_progress language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_keys jsonb := '{"1": [1, 1, 0, 1, 2, 2, 2, 0, 1, 1], "2": [1, 2, 2, 1, 1, 1, 1, 1, 1, 2], "3": [1, 1, 0, 1, 0, 1, 1, 1, 1, 1], "4": [1, 1, 1, 0, 0, 1, 0, 0, 1, 1], "5": [0, 1, 0, 0, 0, 1, 1, 1, 0, 0], "6": [1, 1, 0, 0, 1, 1, 0, 0, 1, 2], "7": [1, 0, 0, 1, 0, 0, 0, 1, 0, 1], "8": [1, 1, 1, 1, 0, 0, 1, 1, 2, 0]}'::jsonb;
  v_options jsonb := '{"1": [4, 4, 4, 4, 4, 4, 4, 4, 4, 3], "2": [4, 4, 4, 4, 4, 4, 4, 4, 4, 4], "3": [4, 4, 4, 4, 4, 4, 4, 4, 4, 4], "4": [4, 4, 4, 4, 4, 4, 4, 4, 4, 4], "5": [4, 4, 4, 4, 4, 4, 4, 4, 4, 4], "6": [4, 4, 4, 4, 4, 4, 4, 4, 4, 4], "7": [4, 4, 4, 4, 4, 4, 4, 4, 4, 4], "8": [4, 4, 4, 4, 4, 4, 4, 4, 4, 4]}'::jsonb;
  v_key jsonb;
  v_limits jsonb;
  v_answer jsonb;
  v_correct integer := 0;
  v_score integer;
  v_count integer;
  v_row public.a1_unit_progress%rowtype;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if p_unit is null or p_unit not between 1 and 8 then raise exception 'invalid_a1_unit' using errcode = '22023'; end if;
  v_key := v_keys -> p_unit::text; v_limits := v_options -> p_unit::text;
  v_count := jsonb_array_length(v_key);
  if p_answers is null or jsonb_typeof(p_answers) <> 'array' then raise exception 'invalid_answers' using errcode = '22023'; end if;
  if jsonb_array_length(p_answers) <> v_count then raise exception 'invalid_answers' using errcode = '22023'; end if;
  for i in 0..v_count-1 loop
    v_answer := p_answers -> i;
    if jsonb_typeof(v_answer) <> 'number' or (v_answer #>> '{}') !~ '^[0-9]+$' then raise exception 'invalid_answers' using errcode = '22023'; end if;
    if (v_answer #>> '{}')::numeric >= (v_limits ->> i)::integer then raise exception 'invalid_answers' using errcode = '22023'; end if;
    if v_answer = v_key -> i then v_correct := v_correct + 1; end if;
  end loop;
  v_score := round(v_correct * 100.0 / v_count)::integer;
  insert into public.a1_unit_progress(user_id, unit_number, best_score, last_score, completed_at)
  values (v_uid, p_unit, v_score, v_score, case when v_score >= 70 then now() else null end)
  on conflict(user_id, unit_number) do update
    set best_score = greatest(public.a1_unit_progress.best_score, excluded.best_score),
        last_score = excluded.last_score,
        completed_at = coalesce(public.a1_unit_progress.completed_at, excluded.completed_at),
        updated_at = now()
  returning * into v_row;
  return v_row;
end;
$$;
revoke all on function public.submit_a1_unit_quiz(integer, jsonb) from public, anon;
grant execute on function public.submit_a1_unit_quiz(integer, jsonb) to authenticated;
commit;
