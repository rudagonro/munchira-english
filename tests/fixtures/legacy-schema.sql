-- Snapshot of the production schema BEFORE these migrations (project "nivelo",
-- read on 2026-10-23): enum types, NOT NULL columns, old RLS helpers, old
-- policies, a handle_new_user that trusts client metadata, and permissive grants.
create type public.user_role as enum ('student', 'teacher', 'admin');
create type public.cefr_level as enum ('A1', 'A2', 'B1', 'B2', 'C1', 'C2');
create type public.enrollment_status as enum ('active', 'completed', 'paused');
create type public.module_status as enum ('locked', 'in_progress', 'completed');
create type public.skill_type as enum ('grammar', 'vocabulary', 'reading', 'listening', 'writing');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  role public.user_role not null default 'student',
  created_at timestamptz not null default now()
);
create table public.cycles (
  id uuid primary key default gen_random_uuid(),
  cefr_level public.cefr_level not null unique,
  title text not null,
  duration_weeks_min integer not null,
  duration_weeks_max integer not null,
  created_at timestamptz not null default now()
);
create table public.modules (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.cycles (id) on delete cascade,
  order_index integer not null,
  title text not null,
  skill_type public.skill_type not null,
  created_at timestamptz not null default now(),
  unique (cycle_id, order_index)
);
create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules (id) on delete cascade,
  order_index integer not null,
  title text not null,
  theory_content text not null,
  practice_content text not null,
  created_at timestamptz not null default now(),
  theory_table jsonb, image_url text, dialogue_turns jsonb, exercises jsonb,
  unique (module_id, order_index)
);
create table public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules (id) on delete cascade,
  question text not null, options jsonb not null, correct_idx integer not null,
  created_at timestamptz not null default now()
);
create table public.vocab_items (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules (id) on delete cascade,
  order_index integer not null, english text not null, spanish text not null, example_sentence text,
  created_at timestamptz not null default now()
);
create table public.checkpoints (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.cycles (id) on delete cascade,
  after_module_order integer not null,
  min_score_to_pass numeric not null check (min_score_to_pass >= 0 and min_score_to_pass <= 100),
  title text not null,
  created_at timestamptz not null default now(),
  unique (cycle_id, after_module_order)
);
create table public.diagnostics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  cefr_level public.cefr_level not null,
  gv_pct numeric not null, reading_pct numeric not null, listening_pct numeric not null,
  writing_pct numeric not null, final_score numeric not null,
  taken_at timestamptz not null default now()
);
create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  cycle_id uuid not null references public.cycles (id) on delete cascade,
  status public.enrollment_status not null default 'active',
  started_at timestamptz not null default now(),
  completed_at timestamptz
);
create table public.module_progress (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.enrollments (id) on delete cascade,
  module_id uuid not null references public.modules (id) on delete cascade,
  status public.module_status not null default 'locked',
  quiz_score numeric check (quiz_score >= 0 and quiz_score <= 100),
  completed_at timestamptz,
  unique (enrollment_id, module_id)
);
create table public.checkpoint_attempts (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.enrollments (id) on delete cascade,
  checkpoint_id uuid not null references public.checkpoints (id) on delete cascade,
  score numeric not null, passed boolean not null,
  attempted_at timestamptz not null default now()
);
create table public.teacher_students (
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key (teacher_id, student_id)
);

create function public.current_user_role() returns public.user_role
  language sql stable security definer set search_path to 'public'
  as $$ select role from public.profiles where id = auth.uid(); $$;
create function public.is_teacher_of(student_uuid uuid) returns boolean
  language sql stable security definer set search_path to 'public'
  as $$ select exists (select 1 from public.teacher_students where teacher_id = auth.uid() and student_id = student_uuid); $$;
-- Trusts client-controlled metadata: anyone can sign up as admin.
create function public.handle_new_user() returns trigger
  language plpgsql security definer set search_path to 'public'
  as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', 'Sin nombre'),
          coalesce((new.raw_user_meta_data->>'role')::user_role, 'student'));
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.cycles enable row level security;
alter table public.modules enable row level security;
alter table public.lessons enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.vocab_items enable row level security;
alter table public.checkpoints enable row level security;
alter table public.diagnostics enable row level security;
alter table public.enrollments enable row level security;
alter table public.module_progress enable row level security;
alter table public.checkpoint_attempts enable row level security;
alter table public.teacher_students enable row level security;

create policy profiles_select_own on public.profiles for select using (id = auth.uid());
create policy profiles_select_admin_all on public.profiles for select using (current_user_role() = 'admin');
create policy profiles_select_teacher_view_students on public.profiles for select using (is_teacher_of(id));
create policy profiles_update_own on public.profiles for update using (id = auth.uid());
create policy cycles_select_authenticated on public.cycles for select using (auth.role() = 'authenticated');
create policy cycles_write_admin_teacher on public.cycles for all
  using (current_user_role() = any (array['admin'::user_role, 'teacher'::user_role]))
  with check (current_user_role() = any (array['admin'::user_role, 'teacher'::user_role]));
create policy modules_select_authenticated on public.modules for select using (auth.role() = 'authenticated');
create policy lessons_select_authenticated on public.lessons for select using (auth.role() = 'authenticated');
create policy quiz_questions_select_authenticated on public.quiz_questions for select using (auth.role() = 'authenticated');
create policy vocab_items_select_authenticated on public.vocab_items for select using (auth.role() = 'authenticated');
create policy checkpoints_select_authenticated on public.checkpoints for select using (auth.role() = 'authenticated');
create policy diagnostics_insert_own on public.diagnostics for insert with check (user_id = auth.uid());
create policy diagnostics_select_own on public.diagnostics for select using (user_id = auth.uid());
create policy enrollments_insert_own on public.enrollments for insert with check (user_id = auth.uid());
create policy enrollments_select_own on public.enrollments for select using (user_id = auth.uid());
create policy enrollments_update_own on public.enrollments for update using (user_id = auth.uid());
create policy module_progress_write_own on public.module_progress for all
  using (exists (select 1 from enrollments e where e.id = module_progress.enrollment_id and e.user_id = auth.uid()));
create policy checkpoint_attempts_insert_own on public.checkpoint_attempts for insert
  with check (exists (select 1 from enrollments e where e.id = checkpoint_attempts.enrollment_id and e.user_id = auth.uid()));
create policy teacher_students_write_admin on public.teacher_students for all
  using (current_user_role() = 'admin') with check (current_user_role() = 'admin');

grant all on all tables in schema public to anon, authenticated;
