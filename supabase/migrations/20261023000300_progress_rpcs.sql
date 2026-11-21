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
