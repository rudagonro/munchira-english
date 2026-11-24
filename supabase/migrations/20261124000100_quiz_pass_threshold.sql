-- Munchira · a module counts as completed only with a quiz score of 70% or more.
-- Idempotent. Existing progress rows are not modified.

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

  -- A module only counts as completed with 70% or more. Once passed it stays
  -- passed and keeps the best score, so a weaker retake never undoes it.
  insert into public.module_progress (enrollment_id, module_id, status, quiz_score, completed_at)
  values (v_enrollment.id, v_module.id,
          case when v_score >= 70 then 'completed' else 'in_progress' end::public.module_status,
          v_score, case when v_score >= 70 then now() end)
  on conflict (enrollment_id, module_id)
  do update set
    status = case when public.module_progress.status = 'completed' or excluded.status = 'completed'
                  then 'completed' else 'in_progress' end::public.module_status,
    quiz_score = greatest(coalesce(public.module_progress.quiz_score, 0), excluded.quiz_score),
    completed_at = coalesce(public.module_progress.completed_at, excluded.completed_at);

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
    'passed', v_score >= 70, 'cycle_completed', v_cycle_done, 'advanced', v_advanced, 'next_level', v_next_level);
end;
$$;

revoke all on function public.submit_module_quiz(uuid, jsonb) from public, anon;
grant execute on function public.submit_module_quiz(uuid, jsonb) to authenticated;
