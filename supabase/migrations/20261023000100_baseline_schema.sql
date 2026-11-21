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
