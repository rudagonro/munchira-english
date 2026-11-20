-- NIVelo · row level security
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
