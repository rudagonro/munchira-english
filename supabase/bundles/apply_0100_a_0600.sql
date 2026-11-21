-- Munchira · migraciones 0100 a 0600 en un solo archivo (para pegar en el SQL Editor de Supabase).
-- Equivale a ejecutar, en orden, los archivos de supabase/migrations (el hotfix 0050 ya está aplicado).
-- Corre en UNA transacción: si algo falla, no se aplica nada. Haz una copia de seguridad antes.
begin;

-- ===================== 20261023000100_baseline_schema.sql =====================
-- Munchira · baseline schema
--
-- Mirrors the production schema (enum types, NOT NULL columns) and is
-- idempotent: on the existing project it only adds what is missing, on a fresh
-- project it creates everything. Review before applying to production.

-- ------------------------------------------------------------------- enums
do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role' and typnamespace = 'public'::regnamespace) then
    create type public.user_role as enum ('student', 'teacher', 'admin');
  end if;
  if not exists (select 1 from pg_type where typname = 'cefr_level' and typnamespace = 'public'::regnamespace) then
    create type public.cefr_level as enum ('A1', 'A2', 'B1', 'B2', 'C1', 'C2');
  end if;
  if not exists (select 1 from pg_type where typname = 'enrollment_status' and typnamespace = 'public'::regnamespace) then
    -- 'paused' also marks an enrollment replaced by a newer diagnostic result.
    create type public.enrollment_status as enum ('active', 'completed', 'paused');
  end if;
  if not exists (select 1 from pg_type where typname = 'module_status' and typnamespace = 'public'::regnamespace) then
    create type public.module_status as enum ('locked', 'in_progress', 'completed');
  end if;
  if not exists (select 1 from pg_type where typname = 'skill_type' and typnamespace = 'public'::regnamespace) then
    create type public.skill_type as enum ('grammar', 'vocabulary', 'reading', 'listening', 'writing');
  end if;
end $$;

-- ---------------------------------------------------------------- profiles
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  full_name  text not null,
  role       public.user_role not null default 'student',
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------ course content
create table if not exists public.cycles (
  id                 uuid primary key default gen_random_uuid(),
  cefr_level         public.cefr_level not null unique,
  title              text not null,
  duration_weeks_min integer not null,
  duration_weeks_max integer not null,
  created_at         timestamptz not null default now()
);

create table if not exists public.modules (
  id          uuid primary key default gen_random_uuid(),
  cycle_id    uuid not null references public.cycles (id) on delete cascade,
  order_index integer not null,
  title       text not null,
  skill_type  public.skill_type not null,
  created_at  timestamptz not null default now(),
  unique (cycle_id, order_index)
);
-- Draft/publish: students only see published modules. Existing modules stay
-- visible (default true); new content is seeded as draft and published per cycle.
alter table public.modules add column if not exists published boolean not null default true;

create table if not exists public.lessons (
  id               uuid primary key default gen_random_uuid(),
  module_id        uuid not null references public.modules (id) on delete cascade,
  order_index      integer not null,
  title            text not null,
  theory_content   text not null,
  practice_content text not null,
  created_at       timestamptz not null default now(),
  theory_table     jsonb,
  image_url        text,
  dialogue_turns   jsonb,
  exercises        jsonb,
  unique (module_id, order_index)
);
alter table public.lessons add column if not exists dialogue_turns jsonb;
alter table public.lessons add column if not exists exercises      jsonb;
alter table public.lessons add column if not exists audio_text     text;
alter table public.lessons add column if not exists audio_url      text;

create table if not exists public.quiz_questions (
  id          uuid primary key default gen_random_uuid(),
  module_id   uuid not null references public.modules (id) on delete cascade,
  question    text not null,
  options     jsonb not null,
  correct_idx integer not null,
  created_at  timestamptz not null default now()
);

create table if not exists public.vocab_items (
  id               uuid primary key default gen_random_uuid(),
  module_id        uuid not null references public.modules (id) on delete cascade,
  order_index      integer not null,
  english          text not null,
  spanish          text not null,
  example_sentence text,
  created_at       timestamptz not null default now()
);
alter table public.vocab_items add column if not exists audio_url text;

create table if not exists public.checkpoints (
  id                 uuid primary key default gen_random_uuid(),
  cycle_id           uuid not null references public.cycles (id) on delete cascade,
  after_module_order integer not null,
  min_score_to_pass  numeric not null check (min_score_to_pass between 0 and 100),
  title              text not null,
  created_at         timestamptz not null default now(),
  unique (cycle_id, after_module_order)
);

-- ------------------------------------------------------------ student state
create table if not exists public.diagnostics (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  cefr_level    public.cefr_level not null,
  gv_pct        numeric not null check (gv_pct between 0 and 100),
  reading_pct   numeric not null check (reading_pct between 0 and 100),
  listening_pct numeric not null check (listening_pct between 0 and 100),
  writing_pct   numeric not null check (writing_pct between 0 and 100),
  final_score   numeric not null check (final_score between 0 and 100),
  taken_at      timestamptz not null default now()
);

create table if not exists public.enrollments (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  cycle_id     uuid not null references public.cycles (id) on delete cascade,
  status       public.enrollment_status not null default 'active',
  started_at   timestamptz not null default now(),
  completed_at timestamptz
);

-- A student may only have one active enrollment. Legacy data can violate this
-- (retaking the diagnostic at another level left both active): keep the newest
-- and pause the others, which also keeps their progress.
update public.enrollments e
   set status = 'paused'
 where e.status = 'active'
   and exists (
     select 1 from public.enrollments n
     where n.user_id = e.user_id and n.status = 'active'
       and (n.started_at, n.id) > (e.started_at, e.id)
   );
create unique index if not exists enrollments_one_active_per_user
  on public.enrollments (user_id) where status = 'active';
create index if not exists enrollments_user_idx on public.enrollments (user_id);

create table if not exists public.module_progress (
  id            uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.enrollments (id) on delete cascade,
  module_id     uuid not null references public.modules (id) on delete cascade,
  status        public.module_status not null default 'locked',
  quiz_score    numeric check (quiz_score between 0 and 100),
  completed_at  timestamptz,
  unique (enrollment_id, module_id)
);

create table if not exists public.checkpoint_attempts (
  id            uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.enrollments (id) on delete cascade,
  checkpoint_id uuid not null references public.checkpoints (id) on delete cascade,
  score         numeric not null check (score between 0 and 100),
  passed        boolean not null,
  attempted_at  timestamptz not null default now()
);
create index if not exists checkpoint_attempts_enrollment_idx
  on public.checkpoint_attempts (enrollment_id, checkpoint_id);

-- Teachers see only the students assigned to them.
create table if not exists public.teacher_students (
  teacher_id  uuid not null references public.profiles (id) on delete cascade,
  student_id  uuid not null references public.profiles (id) on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key (teacher_id, student_id)
);

-- --------------------------------------------------------- new-user trigger
-- Every public sign-up is a student. The role is NEVER read from the sign-up
-- metadata (it is client-controlled). Roles are only changed with direct
-- database access (SQL editor / service role), never from the browser.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Sin nombre'
    ),
    'student'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ===================== 20261023000200_rls_policies.sql =====================
-- Munchira · row level security
--
-- Replaces every existing policy on the app tables with the set below so the
-- result does not depend on what the project had before. Legacy permissive
-- policies would otherwise be OR-ed with these and silently widen access.

-- ------------------------------------------------------------------ helpers
create or replace function public.app_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select role::text from public.profiles where id = auth.uid()
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.app_role() in ('teacher', 'admin'), false)
$$;

-- Own data, an assigned student, or anyone for admins.
create or replace function public.can_view_student(p_student uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and (
    auth.uid() = p_student
    or coalesce(public.app_role() = 'admin', false)
    or exists (
      select 1 from public.teacher_students ts
      where ts.teacher_id = auth.uid() and ts.student_id = p_student
    )
  )
$$;

revoke all on function public.app_role(), public.is_staff(), public.can_view_student(uuid) from public, anon;
grant execute on function public.app_role(), public.is_staff(), public.can_view_student(uuid) to authenticated;

-- ------------------------------------------------------- reset old policies
do $$
declare p record;
begin
  for p in
    select schemaname, tablename, policyname from pg_policies
    where schemaname = 'public' and tablename in (
      'profiles', 'cycles', 'modules', 'lessons', 'quiz_questions', 'vocab_items',
      'checkpoints', 'diagnostics', 'enrollments', 'module_progress',
      'checkpoint_attempts', 'teacher_students'
    )
  loop
    execute format('drop policy %I on %I.%I', p.policyname, p.schemaname, p.tablename);
  end loop;
end $$;

alter table public.profiles            enable row level security;
alter table public.cycles              enable row level security;
alter table public.modules             enable row level security;
alter table public.lessons             enable row level security;
alter table public.quiz_questions      enable row level security;
alter table public.vocab_items         enable row level security;
alter table public.checkpoints         enable row level security;
alter table public.diagnostics         enable row level security;
alter table public.enrollments         enable row level security;
alter table public.module_progress     enable row level security;
alter table public.checkpoint_attempts enable row level security;
alter table public.teacher_students    enable row level security;

-- ----------------------------------------------------------------- privileges
-- Supabase grants everything to anon/authenticated by default. Start from zero.
revoke all on public.profiles, public.cycles, public.modules, public.lessons,
  public.quiz_questions, public.vocab_items, public.checkpoints, public.diagnostics,
  public.enrollments, public.module_progress, public.checkpoint_attempts,
  public.teacher_students from anon, authenticated;

grant select on public.profiles, public.cycles, public.modules, public.lessons,
  public.quiz_questions, public.vocab_items, public.checkpoints, public.diagnostics,
  public.enrollments, public.module_progress, public.checkpoint_attempts,
  public.teacher_students to authenticated;

-- A user may rename themselves; the role column is never writable from the API.
grant update (full_name) on public.profiles to authenticated;

-- Content is managed by staff (teachers and admins).
grant insert, update, delete on public.cycles, public.modules, public.lessons,
  public.quiz_questions, public.vocab_items, public.checkpoints,
  public.teacher_students to authenticated;

-- Progress writes (tightened to server-side functions in the progress migration).
grant insert, update on public.enrollments, public.module_progress to authenticated;
grant insert on public.diagnostics, public.checkpoint_attempts to authenticated;

-- ------------------------------------------------------------------- policies
create policy profiles_select on public.profiles
  for select to authenticated using (public.can_view_student(id));
create policy profiles_update_own on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Course content (staff = teacher or admin can edit, as in the existing project):
-- cycles and checkpoints are readable by any signed-in user;
-- modules (and everything inside them) only when published, except for staff.
create policy cycles_read  on public.cycles         for select to authenticated using (true);
create policy cp_read      on public.checkpoints    for select to authenticated using (true);
create policy modules_read on public.modules        for select to authenticated
  using (published or public.is_staff());
-- The sub-select is itself filtered by modules_read, so drafts stay hidden.
create policy lessons_read on public.lessons        for select to authenticated
  using (exists (select 1 from public.modules m where m.id = module_id));
create policy quiz_read    on public.quiz_questions for select to authenticated
  using (exists (select 1 from public.modules m where m.id = module_id));
create policy vocab_read   on public.vocab_items    for select to authenticated
  using (exists (select 1 from public.modules m where m.id = module_id));

create policy cycles_staff  on public.cycles         for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
create policy modules_staff on public.modules        for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
create policy lessons_staff on public.lessons        for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
create policy quiz_staff    on public.quiz_questions for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
create policy vocab_staff   on public.vocab_items    for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
create policy cp_staff      on public.checkpoints    for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- Student data.
create policy diagnostics_select on public.diagnostics
  for select to authenticated using (public.can_view_student(user_id));
create policy diagnostics_insert on public.diagnostics
  for insert to authenticated with check (user_id = auth.uid());

create policy enrollments_select on public.enrollments
  for select to authenticated using (public.can_view_student(user_id));
create policy enrollments_insert on public.enrollments
  for insert to authenticated with check (user_id = auth.uid());
create policy enrollments_update on public.enrollments
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy progress_select on public.module_progress
  for select to authenticated using (exists (
    select 1 from public.enrollments e
    where e.id = enrollment_id and public.can_view_student(e.user_id)));
create policy progress_insert on public.module_progress
  for insert to authenticated with check (exists (
    select 1 from public.enrollments e where e.id = enrollment_id and e.user_id = auth.uid()));
create policy progress_update on public.module_progress
  for update to authenticated
  using (exists (select 1 from public.enrollments e where e.id = enrollment_id and e.user_id = auth.uid()))
  with check (exists (select 1 from public.enrollments e where e.id = enrollment_id and e.user_id = auth.uid()));

create policy attempts_select on public.checkpoint_attempts
  for select to authenticated using (exists (
    select 1 from public.enrollments e
    where e.id = enrollment_id and public.can_view_student(e.user_id)));
create policy attempts_insert on public.checkpoint_attempts
  for insert to authenticated with check (exists (
    select 1 from public.enrollments e where e.id = enrollment_id and e.user_id = auth.uid()));

create policy teacher_students_select on public.teacher_students
  for select to authenticated
  using (teacher_id = auth.uid() or student_id = auth.uid() or public.app_role() = 'admin');
create policy teacher_students_admin on public.teacher_students
  for all to authenticated
  using (public.app_role() = 'admin') with check (public.app_role() = 'admin');

-- ----------------------------------------------------------- audio cache bucket
-- Private bucket; only the tts-generate function (service role) reads/writes it.
insert into storage.buckets (id, name, public)
values ('audio-cache', 'audio-cache', false)
on conflict (id) do update set public = false;


-- ===================== 20261023000250_tts_guard.sql =====================
-- Munchira · cost guard for the tts-generate edge function
--
-- The function runs with the service role. These helpers are callable only by
-- it, so a browser can neither read usage nor bypass the daily cap.

create table if not exists public.tts_usage (
  user_id  uuid not null references auth.users (id) on delete cascade,
  day      date not null default (now() at time zone 'utc')::date,
  requests integer not null default 0,
  chars    integer not null default 0,
  primary key (user_id, day)
);
alter table public.tts_usage enable row level security;
revoke all on public.tts_usage from anon, authenticated;

-- Atomically reserves p_chars of today's budget. Returns false when the cap
-- would be exceeded (nothing is reserved in that case).
create or replace function public.tts_consume(p_user uuid, p_chars integer, p_daily_cap integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare used integer;
begin
  insert into public.tts_usage (user_id, day, requests, chars)
  values (p_user, (now() at time zone 'utc')::date, 0, 0)
  on conflict (user_id, day) do nothing;

  update public.tts_usage
     set requests = requests + 1, chars = chars + p_chars
   where user_id = p_user and day = (now() at time zone 'utc')::date
     and chars + p_chars <= p_daily_cap
  returning chars into used;

  return used is not null;
end;
$$;

-- Only text that belongs to course content may be synthesised (lesson audio,
-- dialogue turns, quoted practice text, vocabulary). Keeps the endpoint from
-- being used as a free general-purpose TTS.
create or replace function public.tts_text_allowed(p_text text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_text is not null and length(btrim(p_text)) > 0 and (
    exists (
      select 1 from public.lessons l
      where l.audio_text = p_text
         or position(p_text in coalesce(l.practice_content, '')) > 0
         or exists (
           select 1 from jsonb_array_elements(
             case when jsonb_typeof(l.dialogue_turns) = 'array' then l.dialogue_turns else '[]'::jsonb end
           ) t where t ->> 'text' = p_text)
    )
    or exists (
      select 1 from public.vocab_items v
      where v.english = p_text or v.example_sentence = p_text
    )
  )
$$;

revoke all on function public.tts_consume(uuid, integer, integer), public.tts_text_allowed(text)
  from public, anon, authenticated;
grant execute on function public.tts_consume(uuid, integer, integer), public.tts_text_allowed(text)
  to service_role;


-- ===================== 20261023000300_progress_rpcs.sql =====================
-- Munchira · atomic, server-validated progress
--
-- Quiz scoring, checkpoint results, unlocking and cycle advancement now run in
-- one transaction on the server. The browser can no longer write progress
-- tables directly, and no longer receives correct answers before submitting.

-- ------------------------------------------------------- lock down client writes
drop policy if exists diagnostics_insert  on public.diagnostics;
drop policy if exists enrollments_insert  on public.enrollments;
drop policy if exists enrollments_update  on public.enrollments;
drop policy if exists progress_insert     on public.module_progress;
drop policy if exists progress_update     on public.module_progress;
drop policy if exists attempts_insert     on public.checkpoint_attempts;

revoke insert, update, delete on public.diagnostics, public.enrollments,
  public.module_progress, public.checkpoint_attempts from authenticated;

-- Students may read question text and options, never the answer key.
-- (A `select *` from the client now fails, which is intended.)
revoke select on public.quiz_questions from authenticated;
grant select (id, module_id, question, options) on public.quiz_questions to authenticated;

-- ----------------------------------------------------------------- helpers
-- Same rule as computeModuleAvailability() in the frontend: the first module is
-- open; others need the previous module completed and no failed/pending
-- checkpoint (whose module is already completed) before them.
create or replace function public.module_is_available(p_enrollment uuid, p_module uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_cycle uuid;
  v_order integer;
begin
  select e.cycle_id, m.order_index into v_cycle, v_order
    from public.enrollments e
    join public.modules m on m.cycle_id = e.cycle_id
   where e.id = p_enrollment and m.id = p_module;
  if v_order is null then return false; end if;
  if v_order = 1 then return true; end if;

  if not exists (
    select 1 from public.modules pm
      join public.module_progress mp on mp.module_id = pm.id and mp.enrollment_id = p_enrollment
     where pm.cycle_id = v_cycle and pm.order_index = v_order - 1 and mp.status = 'completed'
  ) then
    return false;
  end if;

  return not exists (
    select 1
      from public.checkpoints cp
      join public.modules cm on cm.cycle_id = cp.cycle_id and cm.order_index = cp.after_module_order
      join public.module_progress cmp on cmp.module_id = cm.id
       and cmp.enrollment_id = p_enrollment and cmp.status = 'completed'
     where cp.cycle_id = v_cycle and cp.after_module_order < v_order
       and not exists (
         select 1 from public.checkpoint_attempts a
          where a.enrollment_id = p_enrollment and a.checkpoint_id = cp.id and a.passed)
  );
end;
$$;

-- ---------------------------------------------------------- save_diagnostic
-- Stores the diagnostic and enrolls the student in the cycle for their level.
-- The overall score is recomputed here from the section percentages with the
-- same weights as the client; the client-sent score is not trusted.
create or replace function public.save_diagnostic(
  p_level text,
  p_gv_pct numeric,
  p_reading_pct numeric,
  p_listening_pct numeric,
  p_writing_pct numeric
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_cycle uuid;
  v_enrollment uuid;
  v_score numeric;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if p_level is null or p_level not in ('A1', 'A2', 'B1', 'B2', 'C1', 'C2') then
    raise exception 'invalid_level' using errcode = '22023';
  end if;
  if p_gv_pct is null or p_reading_pct is null or p_listening_pct is null or p_writing_pct is null
     or least(p_gv_pct, p_reading_pct, p_listening_pct, p_writing_pct) < 0
     or greatest(p_gv_pct, p_reading_pct, p_listening_pct, p_writing_pct) > 100 then
    raise exception 'invalid_scores' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtext('nivelo:' || v_uid::text));

  select id into v_cycle from public.cycles where cefr_level::text = p_level;
  if v_cycle is null then raise exception 'cycle_not_found' using errcode = 'P0002'; end if;

  v_score := round(p_gv_pct * 0.30 + p_reading_pct * 0.25 + p_listening_pct * 0.25 + p_writing_pct * 0.20, 2);

  insert into public.diagnostics (user_id, cefr_level, gv_pct, reading_pct, listening_pct, writing_pct, final_score)
  values (v_uid, p_level::public.cefr_level, p_gv_pct, p_reading_pct, p_listening_pct, p_writing_pct, v_score);

  select id into v_enrollment from public.enrollments
   where user_id = v_uid and cycle_id = v_cycle and status = 'active';

  if v_enrollment is null then
    update public.enrollments set status = 'paused'
     where user_id = v_uid and status = 'active';
    insert into public.enrollments (user_id, cycle_id) values (v_uid, v_cycle)
    returning id into v_enrollment;
  end if;

  return jsonb_build_object('enrollment_id', v_enrollment, 'cefr_level', p_level, 'final_score', v_score);
end;
$$;

-- ------------------------------------------------------ submit_module_quiz
-- p_answers: { "<question uuid>": <chosen index>, ... }
-- Scores the quiz, records progress, evaluates the checkpoint that follows the
-- module and, when the whole cycle is done, moves the student to the next level.
create or replace function public.submit_module_quiz(p_module_id uuid, p_answers jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_enrollment public.enrollments%rowtype;
  v_module public.modules%rowtype;
  v_cp public.checkpoints%rowtype;
  v_total integer;
  v_correct integer;
  v_score numeric;
  v_review jsonb;
  v_cp_result jsonb := null;
  v_cp_passed boolean;
  v_level text;
  v_next_level text;
  v_next_cycle uuid;
  v_cycle_done boolean := false;
  v_advanced boolean := false;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if p_answers is null or jsonb_typeof(p_answers) <> 'object' then
    raise exception 'invalid_answers' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtext('nivelo:' || v_uid::text));

  select * into v_enrollment from public.enrollments where user_id = v_uid and status = 'active';
  if not found then raise exception 'no_active_enrollment' using errcode = 'P0002'; end if;

  select * into v_module from public.modules where id = p_module_id and cycle_id = v_enrollment.cycle_id;
  if not found then raise exception 'module_not_in_cycle' using errcode = 'P0002'; end if;

  if not public.module_is_available(v_enrollment.id, v_module.id) then
    raise exception 'module_locked' using errcode = '42501';
  end if;

  with qs as (
    select q.id, q.correct_idx,
           case when jsonb_typeof(p_answers -> q.id::text) = 'number'
                then (p_answers ->> q.id::text)::numeric end as chosen
      from public.quiz_questions q
     where q.module_id = v_module.id
  )
  select count(*),
         count(*) filter (where chosen = correct_idx),
         coalesce(jsonb_agg(jsonb_build_object(
           'question_id', id, 'chosen_idx', chosen, 'correct_idx', correct_idx,
           'is_correct', coalesce(chosen = correct_idx, false)) order by id), '[]'::jsonb)
    into v_total, v_correct, v_review
    from qs;

  if v_total = 0 then raise exception 'module_without_quiz' using errcode = 'P0002'; end if;
  v_score := round(100.0 * v_correct / v_total, 2);

  insert into public.module_progress (enrollment_id, module_id, status, quiz_score, completed_at)
  values (v_enrollment.id, v_module.id, 'completed', v_score, now())
  on conflict (enrollment_id, module_id)
  do update set status = 'completed', quiz_score = excluded.quiz_score, completed_at = excluded.completed_at;

  select * into v_cp from public.checkpoints
   where cycle_id = v_enrollment.cycle_id and after_module_order = v_module.order_index;
  if found then
    v_cp_passed := v_score >= v_cp.min_score_to_pass;
    insert into public.checkpoint_attempts (enrollment_id, checkpoint_id, score, passed)
    values (v_enrollment.id, v_cp.id, v_score, v_cp_passed);
    v_cp_result := jsonb_build_object(
      'checkpoint_id', v_cp.id, 'title', v_cp.title,
      'min_score_to_pass', v_cp.min_score_to_pass, 'passed', v_cp_passed);
  end if;

  -- Cycle is done when it has no draft modules, every module is completed and
  -- every checkpoint passed.
  v_cycle_done :=
    exists (select 1 from public.modules where cycle_id = v_enrollment.cycle_id)
    and not exists (select 1 from public.modules where cycle_id = v_enrollment.cycle_id and not published)
    and not exists (
      select 1 from public.modules m
       where m.cycle_id = v_enrollment.cycle_id
         and not exists (select 1 from public.module_progress mp
                          where mp.enrollment_id = v_enrollment.id and mp.module_id = m.id
                            and mp.status = 'completed'))
    and not exists (
      select 1 from public.checkpoints cp
       where cp.cycle_id = v_enrollment.cycle_id
         and not exists (select 1 from public.checkpoint_attempts a
                          where a.enrollment_id = v_enrollment.id and a.checkpoint_id = cp.id and a.passed));

  if v_cycle_done then
    select c.cefr_level::text into v_level from public.cycles c where c.id = v_enrollment.cycle_id;
    v_next_level := (array['A1', 'A2', 'B1', 'B2', 'C1', 'C2'])[
      array_position(array['A1', 'A2', 'B1', 'B2', 'C1', 'C2'], v_level) + 1];
    if v_next_level is not null then
      select id into v_next_cycle from public.cycles where cefr_level::text = v_next_level;
    end if;
    -- Only close the enrollment when there is somewhere to go; otherwise the
    -- student keeps their active (finished) cycle instead of being stranded.
    if v_next_cycle is not null then
      update public.enrollments set status = 'completed', completed_at = now() where id = v_enrollment.id;
      insert into public.enrollments (user_id, cycle_id) values (v_uid, v_next_cycle);
      v_advanced := true;
    else
      v_next_level := null;
    end if;
  end if;

  return jsonb_build_object(
    'correct', v_correct, 'total', v_total, 'score_pct', v_score,
    'review', v_review, 'checkpoint', v_cp_result,
    'cycle_completed', v_cycle_done, 'advanced', v_advanced, 'next_level', v_next_level);
end;
$$;

revoke all on function public.module_is_available(uuid, uuid), public.save_diagnostic(text, numeric, numeric, numeric, numeric),
  public.submit_module_quiz(uuid, jsonb) from public, anon;
grant execute on function public.module_is_available(uuid, uuid), public.save_diagnostic(text, numeric, numeric, numeric, numeric),
  public.submit_module_quiz(uuid, jsonb) to authenticated;


-- ===================== 20261023000400_vocab_and_lesson_progress.sql =====================
-- Munchira · persistent vocabulary review (spaced repetition) and lesson progress
--
-- Both tables are written only through the functions below, which derive the
-- user from the session. Reading is limited to the owner, an assigned teacher
-- or an admin (same rule as the rest of the student data).

create table if not exists public.word_progress (
  user_id          uuid not null references public.profiles (id) on delete cascade,
  vocab_item_id    uuid not null references public.vocab_items (id) on delete cascade,
  ease_factor      numeric not null default 2.5 check (ease_factor between 1.3 and 3.0),
  interval_days    integer not null default 0 check (interval_days between 0 and 365),
  repetitions      integer not null default 0 check (repetitions >= 0),
  correct_count    integer not null default 0,
  incorrect_count  integer not null default 0,
  next_review      timestamptz not null default now(),
  last_reviewed_at timestamptz,
  primary key (user_id, vocab_item_id)
);
create index if not exists word_progress_due_idx on public.word_progress (user_id, next_review);

create table if not exists public.lesson_progress (
  user_id      uuid not null references public.profiles (id) on delete cascade,
  lesson_id    uuid not null references public.lessons (id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

alter table public.word_progress   enable row level security;
alter table public.lesson_progress enable row level security;

drop policy if exists word_progress_select   on public.word_progress;
drop policy if exists lesson_progress_select on public.lesson_progress;
create policy word_progress_select on public.word_progress
  for select to authenticated using (public.can_view_student(user_id));
create policy lesson_progress_select on public.lesson_progress
  for select to authenticated using (public.can_view_student(user_id));

revoke all on public.word_progress, public.lesson_progress from anon, authenticated;
grant select on public.word_progress, public.lesson_progress to authenticated;

-- ------------------------------------------------------ record_vocab_review
-- Simplified SM-2 for a two-button grade ("Repasar" / "¡Lo sé!"):
--   known   -> repetitions + 1; interval 1 day, then 6 days, then interval * ease (max 365 days);
--              ease grows by 0.05 (max 3.0)
--   unknown -> repetitions reset; due again in 10 minutes; ease drops by 0.2 (min 1.3)
create or replace function public.record_vocab_review(p_vocab_item_id uuid, p_known boolean)
returns public.word_progress
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.word_progress%rowtype;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if p_known is null then raise exception 'invalid_grade' using errcode = '22023'; end if;
  if not exists (select 1 from public.vocab_items where id = p_vocab_item_id) then
    raise exception 'vocab_item_not_found' using errcode = 'P0002';
  end if;

  insert into public.word_progress (user_id, vocab_item_id) values (v_uid, p_vocab_item_id)
  on conflict (user_id, vocab_item_id) do nothing;

  select * into v_row from public.word_progress
   where user_id = v_uid and vocab_item_id = p_vocab_item_id for update;

  if p_known then
    v_row.repetitions := v_row.repetitions + 1;
    v_row.interval_days := case v_row.repetitions
      when 1 then 1
      when 2 then 6
      else least(greatest(round(v_row.interval_days * v_row.ease_factor)::integer, 1), 365)
    end;
    v_row.ease_factor := least(3.0, v_row.ease_factor + 0.05);
    v_row.correct_count := v_row.correct_count + 1;
    v_row.next_review := now() + make_interval(days => v_row.interval_days);
  else
    v_row.repetitions := 0;
    v_row.interval_days := 0;
    v_row.ease_factor := greatest(1.3, v_row.ease_factor - 0.2);
    v_row.incorrect_count := v_row.incorrect_count + 1;
    v_row.next_review := now() + interval '10 minutes';
  end if;
  v_row.last_reviewed_at := now();

  update public.word_progress
     set repetitions = v_row.repetitions, interval_days = v_row.interval_days,
         ease_factor = v_row.ease_factor, correct_count = v_row.correct_count,
         incorrect_count = v_row.incorrect_count, next_review = v_row.next_review,
         last_reviewed_at = v_row.last_reviewed_at
   where user_id = v_uid and vocab_item_id = p_vocab_item_id
  returning * into v_row;
  return v_row;
end;
$$;

-- ----------------------------------------------------------- get_due_vocab
-- Words the student has already studied whose review date has arrived.
create or replace function public.get_due_vocab(p_limit integer default 20)
returns table (
  id uuid, module_id uuid, english text, spanish text, example_sentence text, next_review timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  select v.id, v.module_id, v.english, v.spanish, v.example_sentence, w.next_review
    from public.word_progress w
    join public.vocab_items v on v.id = w.vocab_item_id
   where w.user_id = auth.uid() and w.next_review <= now()
   order by w.next_review, v.id
   limit greatest(least(coalesce(p_limit, 20), 100), 1)
$$;

-- --------------------------------------------------------- complete_lesson
create or replace function public.complete_lesson(p_lesson_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_enrollment uuid;
  v_module uuid;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;

  select e.id, l.module_id into v_enrollment, v_module
    from public.lessons l
    join public.modules m on m.id = l.module_id
    join public.enrollments e on e.cycle_id = m.cycle_id and e.user_id = v_uid and e.status = 'active'
   where l.id = p_lesson_id;
  if v_enrollment is null then raise exception 'lesson_not_in_cycle' using errcode = 'P0002'; end if;
  if not public.module_is_available(v_enrollment, v_module) then
    raise exception 'module_locked' using errcode = '42501';
  end if;

  insert into public.lesson_progress (user_id, lesson_id) values (v_uid, p_lesson_id)
  on conflict (user_id, lesson_id) do nothing;
end;
$$;

revoke all on function public.record_vocab_review(uuid, boolean), public.get_due_vocab(integer),
  public.complete_lesson(uuid) from public, anon;
grant execute on function public.record_vocab_review(uuid, boolean), public.get_due_vocab(integer),
  public.complete_lesson(uuid) to authenticated;


-- ===================== 20261023000500_teacher_dashboard.sql =====================
-- Munchira · teacher dashboard
--
-- Read-only aggregates for the teacher panel. Teachers see only the students
-- assigned to them in public.teacher_students; admins see every student.
-- Both functions refuse to run for anyone else, so the access rule lives in the
-- database and not in the browser.

create or replace function public.teacher_overview()
returns table (
  student_id            uuid,
  full_name             text,
  joined_at             timestamptz,
  cefr_level            text,
  modules_completed     integer,
  modules_total         integer,
  avg_quiz_score        numeric,
  weakest_skill         text,
  words_studied         integer,
  words_due             integer,
  checkpoint_blocked    boolean,
  last_diagnostic_level text,
  last_activity         timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.is_staff() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return query
  select
    p.id,
    p.full_name,
    p.created_at,
    c.cefr_level::text,
    coalesce(prog.done, 0)::integer,
    coalesce(tot.n, 0)::integer,
    scores.avg_score,
    weak.skill_type::text,
    coalesce(words.studied, 0)::integer,
    coalesce(words.due, 0)::integer,
    coalesce(blocked.is_blocked, false),
    diag.cefr_level::text,
    nullif(greatest(
      prog.last_at, words.last_at, lessons.last_at, diag.taken_at
    ), '-infinity'::timestamptz)
  from public.profiles p
  left join lateral (
    select e.* from public.enrollments e
     where e.user_id = p.id
     order by (e.status = 'active') desc, e.started_at desc
     limit 1
  ) en on true
  left join public.cycles c on c.id = en.cycle_id
  left join lateral (
    select count(*) filter (where mp.status = 'completed') as done,
           max(mp.completed_at) as last_at
      from public.module_progress mp where mp.enrollment_id = en.id
  ) prog on true
  left join lateral (
    select count(*) as n from public.modules m where m.cycle_id = en.cycle_id
  ) tot on true
  left join lateral (
    select round(avg(mp.quiz_score), 1) as avg_score
      from public.module_progress mp
      join public.enrollments e2 on e2.id = mp.enrollment_id and e2.user_id = p.id
     where mp.quiz_score is not null
  ) scores on true
  left join lateral (
    select m.skill_type
      from public.module_progress mp
      join public.enrollments e2 on e2.id = mp.enrollment_id and e2.user_id = p.id
      join public.modules m on m.id = mp.module_id
     where mp.quiz_score is not null
     group by m.skill_type
     order by avg(mp.quiz_score), m.skill_type
     limit 1
  ) weak on true
  left join lateral (
    select count(*) as studied,
           count(*) filter (where w.next_review <= now()) as due,
           max(w.last_reviewed_at) as last_at
      from public.word_progress w where w.user_id = p.id
  ) words on true
  left join lateral (
    select max(lp.completed_at) as last_at
      from public.lesson_progress lp where lp.user_id = p.id
  ) lessons on true
  left join lateral (
    select d.cefr_level, d.taken_at
      from public.diagnostics d where d.user_id = p.id
     order by d.taken_at desc limit 1
  ) diag on true
  left join lateral (
    select exists (
      select 1 from public.checkpoints cp
       where cp.cycle_id = en.cycle_id
         and exists (select 1 from public.checkpoint_attempts a
                      where a.enrollment_id = en.id and a.checkpoint_id = cp.id)
         and not exists (select 1 from public.checkpoint_attempts a
                          where a.enrollment_id = en.id and a.checkpoint_id = cp.id and a.passed)
    ) as is_blocked
  ) blocked on true
  where p.role = 'student'
    and (
      public.app_role() = 'admin'
      or exists (select 1 from public.teacher_students ts
                  where ts.teacher_id = auth.uid() and ts.student_id = p.id)
    )
  order by p.full_name nulls last, p.id;
end;
$$;

create or replace function public.teacher_student_detail(p_student uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_enrollment public.enrollments%rowtype;
  v_result jsonb;
begin
  if auth.uid() is null or not public.is_staff() or not public.can_view_student(p_student) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if not exists (select 1 from public.profiles where id = p_student and role = 'student') then
    raise exception 'student_not_found' using errcode = 'P0002';
  end if;

  select * into v_enrollment from public.enrollments
   where user_id = p_student
   order by (status = 'active') desc, started_at desc limit 1;

  select jsonb_build_object(
    'student', (select jsonb_build_object('id', p.id, 'full_name', p.full_name, 'joined_at', p.created_at)
                  from public.profiles p where p.id = p_student),

    'diagnostics', coalesce((
      select jsonb_agg(jsonb_build_object(
        'cefr_level', d.cefr_level, 'final_score', d.final_score, 'gv_pct', d.gv_pct,
        'reading_pct', d.reading_pct, 'listening_pct', d.listening_pct,
        'writing_pct', d.writing_pct, 'taken_at', d.taken_at) order by d.taken_at desc)
      from (select * from public.diagnostics where user_id = p_student order by taken_at desc limit 5) d
    ), '[]'::jsonb),

    'enrollment', (
      select jsonb_build_object('id', v_enrollment.id, 'status', v_enrollment.status,
        'started_at', v_enrollment.started_at, 'completed_at', v_enrollment.completed_at,
        'cefr_level', c.cefr_level, 'title', c.title)
      from public.cycles c where c.id = v_enrollment.cycle_id),

    'modules', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', m.id, 'order_index', m.order_index, 'title', m.title, 'skill_type', m.skill_type,
        'status', coalesce(mp.status::text, 'pending'), 'quiz_score', mp.quiz_score,
        'completed_at', mp.completed_at) order by m.order_index)
      from public.modules m
      left join public.module_progress mp on mp.module_id = m.id and mp.enrollment_id = v_enrollment.id
      where m.cycle_id = v_enrollment.cycle_id
    ), '[]'::jsonb),

    'checkpoints', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', cp.id, 'title', cp.title, 'after_module_order', cp.after_module_order,
        'min_score_to_pass', cp.min_score_to_pass,
        'attempts', coalesce((
          select jsonb_agg(jsonb_build_object('score', a.score, 'passed', a.passed, 'attempted_at', a.attempted_at)
                           order by a.attempted_at)
            from public.checkpoint_attempts a
           where a.checkpoint_id = cp.id and a.enrollment_id = v_enrollment.id), '[]'::jsonb)
      ) order by cp.after_module_order)
      from public.checkpoints cp where cp.cycle_id = v_enrollment.cycle_id
    ), '[]'::jsonb),

    'skills', coalesce((
      select jsonb_agg(jsonb_build_object('skill_type', s.skill_type, 'avg_score', s.avg_score, 'modules', s.n)
                       order by s.avg_score, s.skill_type)
      from (
        select m.skill_type, round(avg(mp.quiz_score), 1) as avg_score, count(*) as n
          from public.module_progress mp
          join public.enrollments e on e.id = mp.enrollment_id and e.user_id = p_student
          join public.modules m on m.id = mp.module_id
         where mp.quiz_score is not null
         group by m.skill_type
      ) s
    ), '[]'::jsonb),

    'vocab', (
      select jsonb_build_object(
        'studied', count(*),
        'due', count(*) filter (where w.next_review <= now()),
        'mastered', count(*) filter (where w.interval_days >= 21),
        'correct', coalesce(sum(w.correct_count), 0),
        'incorrect', coalesce(sum(w.incorrect_count), 0))
      from public.word_progress w where w.user_id = p_student),

    'recent', coalesce((
      select jsonb_agg(jsonb_build_object('kind', x.kind, 'title', x.title, 'detail', x.detail, 'at', x.at)
                       order by x.at desc)
      from (select * from (
        (select 'module' as kind, m.title, to_char(mp.quiz_score, 'FM990.0') || '%' as detail, mp.completed_at as at
           from public.module_progress mp
           join public.enrollments e on e.id = mp.enrollment_id and e.user_id = p_student
           join public.modules m on m.id = mp.module_id
          where mp.completed_at is not null
          order by mp.completed_at desc limit 10)
        union all
        (select 'checkpoint', cp.title, case when a.passed then 'aprobado' else 'no aprobado' end
                || ' (' || to_char(a.score, 'FM990.0') || '%)', a.attempted_at
           from public.checkpoint_attempts a
           join public.enrollments e on e.id = a.enrollment_id and e.user_id = p_student
           join public.checkpoints cp on cp.id = a.checkpoint_id
          order by a.attempted_at desc limit 10)
        union all
        (select 'diagnostic', 'Diagnóstico ' || d.cefr_level, to_char(d.final_score, 'FM990.0') || '/100', d.taken_at
           from public.diagnostics d where d.user_id = p_student
          order by d.taken_at desc limit 5)
        union all
        (select 'lesson', l.title, null, lp.completed_at
           from public.lesson_progress lp join public.lessons l on l.id = lp.lesson_id
          where lp.user_id = p_student
          order by lp.completed_at desc limit 10)
      ) r order by r.at desc limit 20) x
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.teacher_overview(), public.teacher_student_detail(uuid) from public, anon;
grant execute on function public.teacher_overview(), public.teacher_student_detail(uuid) to authenticated;


-- ===================== 20261023000600_content_pipeline.sql =====================
-- Munchira · content pipeline (seed, readiness gate, publish)
--
-- Course content lives in the repository (content/*.json) and is loaded with
-- seed_cycle / seed_module. New modules are drafts; publish_cycle only flips a
-- whole cycle to published when it passes the readiness checks, so students
-- never land in a half-written level.

-- ---------------------------------------------------------------- seeding
-- Callable only by the database owner / service role (seed scripts, migrations).
create or replace function public.seed_cycle(
  p_level text, p_title text, p_weeks_min integer, p_weeks_max integer, p_checkpoints jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cycle uuid;
  cp jsonb;
begin
  insert into public.cycles (cefr_level, title, duration_weeks_min, duration_weeks_max)
  values (p_level::public.cefr_level, p_title, coalesce(p_weeks_min, 0), coalesce(p_weeks_max, 0))
  on conflict (cefr_level) do nothing;
  select id into v_cycle from public.cycles where cefr_level::text = p_level;

  for cp in select * from jsonb_array_elements(coalesce(p_checkpoints, '[]'::jsonb)) loop
    insert into public.checkpoints (cycle_id, after_module_order, title, min_score_to_pass)
    values (v_cycle, (cp ->> 'after_module_order')::integer, cp ->> 'title',
            coalesce((cp ->> 'min_score_to_pass')::numeric, 70))
    on conflict (cycle_id, after_module_order)
    do update set title = excluded.title, min_score_to_pass = excluded.min_score_to_pass;
  end loop;
end;
$$;

-- p_module: { title, skill_type, lessons: [...], quiz: [...], vocab: [...] }
-- Replaces the module's children. Refuses to touch a published module.
create or replace function public.seed_module(p_level text, p_order integer, p_module jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cycle uuid;
  v_module uuid;
  v_published boolean;
begin
  select id into v_cycle from public.cycles where cefr_level::text = p_level;
  if v_cycle is null then raise exception 'cycle_not_found: %', p_level using errcode = 'P0002'; end if;

  select id, published into v_module, v_published
    from public.modules where cycle_id = v_cycle and order_index = p_order;
  if v_module is not null and v_published then
    raise exception 'module_published: % module % is live; unpublish the cycle before re-seeding', p_level, p_order
      using errcode = '42501';
  end if;

  if v_module is null then
    insert into public.modules (cycle_id, order_index, title, skill_type, published)
    values (v_cycle, p_order, p_module ->> 'title', (p_module ->> 'skill_type')::public.skill_type, false)
    returning id into v_module;
  else
    update public.modules set title = p_module ->> 'title', skill_type = (p_module ->> 'skill_type')::public.skill_type
     where id = v_module;
  end if;

  delete from public.lessons where module_id = v_module;
  insert into public.lessons (module_id, order_index, title, theory_content, theory_table,
                              practice_content, exercises, audio_text, dialogue_turns, image_url)
  select v_module, (l ->> 'order')::integer, l ->> 'title', l ->> 'theory_content', l -> 'theory_table',
         l ->> 'practice_content', l -> 'exercises', l ->> 'audio_text', l -> 'dialogue_turns', l ->> 'image_url'
    from jsonb_array_elements(coalesce(p_module -> 'lessons', '[]'::jsonb)) l;

  delete from public.quiz_questions where module_id = v_module;
  insert into public.quiz_questions (module_id, question, options, correct_idx)
  select v_module, q ->> 'question', q -> 'options', (q ->> 'correct_idx')::integer
    from jsonb_array_elements(coalesce(p_module -> 'quiz', '[]'::jsonb)) q;

  delete from public.vocab_items where module_id = v_module;
  insert into public.vocab_items (module_id, order_index, english, spanish, example_sentence)
  select v_module, row_number() over ()::integer, v ->> 'english', v ->> 'spanish', v ->> 'example_sentence'
    from jsonb_array_elements(coalesce(p_module -> 'vocab', '[]'::jsonb)) v;

  return v_module;
end;
$$;

-- ------------------------------------------------------------- readiness
-- Thresholds mirror content/lib/validate.js (MIN_*). One row per problem.
create or replace function public.content_readiness(p_level text)
returns table (problem text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_cycle uuid;
  v_max_order integer;
  m record;
  v_lessons integer;
  v_questions integer;
  v_bad_questions integer;
  v_vocab integer;
  v_no_audio integer;
begin
  if auth.uid() is not null and not public.is_staff() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select id into v_cycle from public.cycles where cefr_level::text = p_level;
  if v_cycle is null then
    return query select format('%s: el ciclo no existe', p_level);
    return;
  end if;

  select max(order_index) into v_max_order from public.modules where cycle_id = v_cycle;
  if (select count(*) from public.modules where cycle_id = v_cycle) < 4 then
    return query select format('%s: faltan módulos (tiene %s, mínimo 4)', p_level,
      (select count(*) from public.modules where cycle_id = v_cycle));
  end if;

  for m in select * from public.modules where cycle_id = v_cycle order by order_index loop
    select count(*) into v_lessons from public.lessons where module_id = m.id;
    if v_lessons < 4 then
      return query select format('%s · módulo %s (%s): faltan lecciones (tiene %s, mínimo 4)',
        p_level, m.order_index, m.skill_type, v_lessons);
    end if;

    select count(*),
           count(*) filter (where jsonb_typeof(to_jsonb(options)) <> 'array'
                              or jsonb_array_length(to_jsonb(options)) < 2
                              or correct_idx >= jsonb_array_length(to_jsonb(options)))
      into v_questions, v_bad_questions
      from public.quiz_questions where module_id = m.id;
    if v_questions < 5 then
      return query select format('%s · módulo %s (%s): faltan preguntas de quiz (tiene %s, mínimo 5)',
        p_level, m.order_index, m.skill_type, v_questions);
    end if;
    if v_bad_questions > 0 then
      return query select format('%s · módulo %s (%s): %s pregunta(s) con opciones o respuesta inválidas',
        p_level, m.order_index, m.skill_type, v_bad_questions);
    end if;

    if m.skill_type = 'vocabulary' then
      select count(*) into v_vocab from public.vocab_items where module_id = m.id;
      if v_vocab < 10 then
        return query select format('%s · módulo %s (vocabulary): faltan palabras (tiene %s, mínimo 10)',
          p_level, m.order_index, v_vocab);
      end if;
    end if;

    if m.skill_type = 'listening' then
      select count(*) into v_no_audio from public.lessons
       where module_id = m.id
         and coalesce(btrim(audio_text), '') = ''
         and (dialogue_turns is null or jsonb_typeof(dialogue_turns) <> 'array' or jsonb_array_length(dialogue_turns) = 0);
      if v_no_audio > 0 then
        return query select format('%s · módulo %s (listening): %s lección(es) sin audio_text ni dialogue_turns',
          p_level, m.order_index, v_no_audio);
      end if;
    end if;
  end loop;

  if v_max_order is not null and not exists (
    select 1 from public.checkpoints where cycle_id = v_cycle and after_module_order = v_max_order
  ) then
    return query select format('%s: falta el checkpoint final (después del módulo %s)', p_level, v_max_order);
  end if;
end;
$$;

-- One row per cycle for the staff dashboard.
create or replace function public.content_status()
returns table (
  cefr_level text, title text, total_modules integer, published_modules integer, problems text[]
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.is_staff() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return query
  select c.cefr_level::text, c.title,
         (select count(*)::integer from public.modules m where m.cycle_id = c.id),
         (select count(*)::integer from public.modules m where m.cycle_id = c.id and m.published),
         coalesce(array(select r.problem from public.content_readiness(c.cefr_level::text) r), '{}'::text[])
    from public.cycles c
   order by c.cefr_level;
end;
$$;

-- Publishes every module of a cycle atomically, only if it passes the checks.
create or replace function public.publish_cycle(p_level text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_problems text[];
begin
  if auth.uid() is null or public.app_role() is distinct from 'admin' then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  v_problems := array(select r.problem from public.content_readiness(p_level) r);
  if cardinality(v_problems) > 0 then
    return jsonb_build_object('published', false, 'problems', to_jsonb(v_problems));
  end if;
  update public.modules set published = true
   where cycle_id = (select id from public.cycles where cefr_level::text = p_level);
  return jsonb_build_object('published', true, 'problems', '[]'::jsonb);
end;
$$;

create or replace function public.unpublish_cycle(p_level text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or public.app_role() is distinct from 'admin' then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update public.modules set published = false
   where cycle_id = (select id from public.cycles where cefr_level::text = p_level);
end;
$$;

revoke all on function public.seed_cycle(text, text, integer, integer, jsonb),
  public.seed_module(text, integer, jsonb), public.content_readiness(text), public.content_status(),
  public.publish_cycle(text), public.unpublish_cycle(text) from public, anon, authenticated;
grant execute on function public.seed_cycle(text, text, integer, integer, jsonb),
  public.seed_module(text, integer, jsonb) to service_role;
grant execute on function public.content_readiness(text), public.content_status(),
  public.publish_cycle(text), public.unpublish_cycle(text) to authenticated, service_role;

commit;
