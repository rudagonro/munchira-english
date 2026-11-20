-- NIVelo · teacher dashboard
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
