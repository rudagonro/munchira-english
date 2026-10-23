-- NIVelo · baseline schema
--
-- Reproduces the tables the frontend relies on. Every statement is idempotent:
-- on the existing production project it only adds what is missing, and on a
-- fresh project it creates everything. Review before applying to production.

-- ---------------------------------------------------------------- profiles
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  full_name  text,
  role       text not null default 'student' check (role in ('student', 'teacher', 'admin')),
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------ course content
create table if not exists public.cycles (
  id                 uuid primary key default gen_random_uuid(),
  cefr_level         text not null unique check (cefr_level in ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  title              text not null,
  duration_weeks_min integer,
  duration_weeks_max integer
);

create table if not exists public.modules (
  id          uuid primary key default gen_random_uuid(),
  cycle_id    uuid not null references public.cycles (id) on delete cascade,
  order_index integer not null,
  title       text not null,
  skill_type  text not null check (skill_type in
                ('grammar', 'vocabulary', 'reading', 'listening', 'writing', 'speaking', 'pronunciation')),
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
  theory_content   text,
  theory_table     jsonb,
  image_url        text,
  practice_content text,
  dialogue_turns   jsonb,
  exercises        jsonb,
  audio_text       text,
  audio_url        text,
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
  correct_idx integer not null check (correct_idx >= 0)
);

create table if not exists public.vocab_items (
  id               uuid primary key default gen_random_uuid(),
  module_id        uuid not null references public.modules (id) on delete cascade,
  order_index      integer not null,
  english          text not null,
  spanish          text not null,
  example_sentence text,
  audio_url        text
);
alter table public.vocab_items add column if not exists audio_url text;

create table if not exists public.checkpoints (
  id                 uuid primary key default gen_random_uuid(),
  cycle_id           uuid not null references public.cycles (id) on delete cascade,
  after_module_order integer not null,
  title              text not null,
  min_score_to_pass  numeric not null default 70 check (min_score_to_pass between 0 and 100),
  unique (cycle_id, after_module_order)
);

-- ------------------------------------------------------------ student state
create table if not exists public.diagnostics (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  cefr_level    text not null check (cefr_level in ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  gv_pct        numeric,
  reading_pct   numeric,
  listening_pct numeric,
  writing_pct   numeric,
  final_score   numeric,
  taken_at      timestamptz not null default now()
);

create table if not exists public.enrollments (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  cycle_id     uuid not null references public.cycles (id),
  status       text not null default 'active',
  started_at   timestamptz not null default now(),
  completed_at timestamptz
);

-- The status vocabulary is part of the contract: replace whatever status check
-- exists (its name is unknown on the legacy project) with a known one.
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.enrollments'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%status%'
  loop
    execute format('alter table public.enrollments drop constraint %I', c.conname);
  end loop;
  alter table public.enrollments
    add constraint enrollments_status_check check (status in ('active', 'completed', 'abandoned'));
end $$;

-- A student may only have one active enrollment. Legacy data can violate this
-- (retaking the diagnostic at another level left both active): keep the newest.
update public.enrollments e
   set status = 'abandoned'
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
  status        text not null default 'completed',
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
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (teacher_id, student_id)
);

-- --------------------------------------------------------- new-user trigger
-- Every public sign-up is a student. Roles are only ever changed with direct
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
      split_part(new.email, '@', 1)
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
