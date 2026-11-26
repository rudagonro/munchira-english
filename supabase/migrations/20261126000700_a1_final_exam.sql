-- 0700 · Examen final de A1 y paso a A2 (aditiva). NO APLICAR sin el OK del propietario.
--
-- 1. a1_final_exam_progress: un registro por alumno (mejor nota, última, intentos, aprobado). Solo se escribe
--    con submit_a1_final_exam; lo leen el alumno y el personal que puede verlo (can_view_student).
-- 2. level_waitlist: marca «en lista de espera» de un nivel en preparación (por ahora solo un indicador en la
--    app; no se envía ningún correo). notified_at queda vacío hasta que exista un aviso.
-- 3. submit_a1_final_exam(p_answers): califica en el servidor las 30 preguntas de content/a1/final-exam.json.
--    · Se abre con las Unidades 1–8 aprobadas (con ellas la Unidad 0 queda reconocida, como en /cycle) y una
--      inscripción A1 activa. El personal (admin o docente) no lo presenta: lo revisa en /revisor sin guardar.
--    · 70% o más aprueba. Tras un intento no aprobado hay que esperar 15 minutos para repetirlo.
--    · Al aprobar: se guarda el aprobado, la inscripción A1 pasa a «completed» (con su historial intacto), se
--      abre una inscripción A2 activa (o se reactiva una A2 en pausa) y el alumno queda en la lista de espera de A2.
--    · Aprobado una vez, no se vuelve a calificar: devuelve el resultado guardado.
-- No modifica tablas, filas, funciones ni permisos existentes.

create table if not exists public.a1_final_exam_progress (
  user_id         uuid primary key references auth.users(id) on delete cascade,
  best_score      integer not null check (best_score between 0 and 100),
  last_score      integer not null check (last_score between 0 and 100),
  attempts        integer not null default 1 check (attempts >= 1),
  last_attempt_at timestamptz not null default now(),
  passed_at       timestamptz,
  updated_at      timestamptz not null default now()
);
revoke all on public.a1_final_exam_progress from anon, authenticated;
grant select on public.a1_final_exam_progress to authenticated;
grant all on public.a1_final_exam_progress to service_role;
alter table public.a1_final_exam_progress enable row level security;
drop policy if exists a1_final_exam_progress_select on public.a1_final_exam_progress;
create policy a1_final_exam_progress_select on public.a1_final_exam_progress for select to authenticated
  using ((select public.can_view_student(user_id)));

create table if not exists public.level_waitlist (
  user_id     uuid not null references auth.users(id) on delete cascade,
  level       public.cefr_level not null,
  source      text not null check (source in ('a1_final_exam')),
  joined_at   timestamptz not null default now(),
  notified_at timestamptz,
  primary key (user_id, level)
);
revoke all on public.level_waitlist from anon, authenticated;
grant select on public.level_waitlist to authenticated;
grant all on public.level_waitlist to service_role;
alter table public.level_waitlist enable row level security;
drop policy if exists level_waitlist_select on public.level_waitlist;
create policy level_waitlist_select on public.level_waitlist for select to authenticated
  using ((select public.can_view_student(user_id)));

-- Igual que las demás tablas del alumno (migración 0400): una cuenta suspendida no lee ni escribe.
do $$
declare t text;
begin
  foreach t in array array['a1_final_exam_progress', 'level_waitlist'] loop
    if to_regprocedure('public.is_active_user()') is not null then
      execute format('drop policy if exists %I on public.%I', t || '_not_suspended', t);
      execute format(
        'create policy %I on public.%I as restrictive for all to authenticated using ((select public.is_active_user())) with check ((select public.is_active_user()))',
        t || '_not_suspended', t);
    end if;
    if to_regprocedure('public.block_suspended_writes()') is not null then
      execute format('drop trigger if exists zz_block_suspended_writes on public.%I', t);
      execute format(
        'create trigger zz_block_suspended_writes before insert or update or delete on public.%I for each row execute function public.block_suspended_writes()', t);
    end if;
  end loop;
end;
$$;

create or replace function public.submit_a1_final_exam(p_answers jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  -- Clave de content/a1/final-exam.json (30 preguntas de 4 opciones); una prueba comprueba que coincide.
  v_key jsonb := '[1,3,0,3,1,0,2,3,3,0,2,2,1,2,0,0,2,3,3,3,2,0,1,0,0,2,1,1,2,0]'::jsonb;
  v_options integer := 4;
  v_pass integer := 70;
  v_cooldown interval := interval '15 minutes';
  v_count integer;
  v_answer jsonb;
  v_correct integer := 0;
  v_score integer;
  v_row public.a1_final_exam_progress%rowtype;
  v_enrollment uuid;
  v_a2_cycle uuid;
  v_a2 uuid;
  v_units integer;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if public.is_staff() then raise exception 'staff_no_write' using errcode = '42501'; end if;

  select * into v_row from public.a1_final_exam_progress where user_id = v_uid for update;
  if v_row.passed_at is not null then
    return jsonb_build_object('score', v_row.last_score, 'best_score', v_row.best_score, 'passed', true, 'already_passed', true,
      'attempts', v_row.attempts, 'passed_at', v_row.passed_at, 'promoted_to', 'A2');
  end if;

  select e.id into v_enrollment
    from public.enrollments e join public.cycles c on c.id = e.cycle_id
   where e.user_id = v_uid and e.status = 'active' and c.cefr_level = 'A1'
   for update of e;
  if v_enrollment is null then raise exception 'no_active_a1_enrollment' using errcode = '22023'; end if;

  select count(*) into v_units from public.a1_unit_progress
   where user_id = v_uid and unit_number between 1 and 8 and completed_at is not null;
  if v_units < 8 then raise exception 'final_exam_locked' using errcode = '22023'; end if;

  if v_row.last_attempt_at is not null and v_row.last_attempt_at + v_cooldown > now() then
    raise exception 'final_exam_cooldown' using errcode = '22023', detail = (v_row.last_attempt_at + v_cooldown)::text;
  end if;

  v_count := jsonb_array_length(v_key);
  if p_answers is null or jsonb_typeof(p_answers) <> 'array' or jsonb_array_length(p_answers) <> v_count then
    raise exception 'invalid_answers' using errcode = '22023';
  end if;
  for i in 0..v_count - 1 loop
    v_answer := p_answers -> i;
    if jsonb_typeof(v_answer) <> 'number' or (v_answer #>> '{}') !~ '^[0-9]+$' then raise exception 'invalid_answers' using errcode = '22023'; end if;
    if (v_answer #>> '{}')::numeric >= v_options then raise exception 'invalid_answers' using errcode = '22023'; end if;
    if v_answer = v_key -> i then v_correct := v_correct + 1; end if;
  end loop;
  v_score := round(v_correct * 100.0 / v_count)::integer;

  insert into public.a1_final_exam_progress(user_id, best_score, last_score, attempts, last_attempt_at, passed_at)
  values (v_uid, v_score, v_score, 1, now(), case when v_score >= v_pass then now() end)
  on conflict (user_id) do update
    set best_score = greatest(public.a1_final_exam_progress.best_score, excluded.best_score),
        last_score = excluded.last_score,
        attempts = public.a1_final_exam_progress.attempts + 1,
        last_attempt_at = excluded.last_attempt_at,
        passed_at = coalesce(public.a1_final_exam_progress.passed_at, excluded.passed_at),
        updated_at = now()
  returning * into v_row;

  if v_score >= v_pass then
    -- A1 queda «completada» con todo su historial; A2 (en preparación) pasa a ser su inscripción activa.
    update public.enrollments set status = 'completed', completed_at = now() where id = v_enrollment;
    select id into v_a2_cycle from public.cycles where cefr_level = 'A2';
    if v_a2_cycle is null then raise exception 'a2_cycle_missing' using errcode = 'P0002'; end if;
    update public.enrollments set status = 'active'
     where id = (select id from public.enrollments where user_id = v_uid and cycle_id = v_a2_cycle and status = 'paused'
                  order by started_at desc limit 1)
    returning id into v_a2;
    if v_a2 is null then
      insert into public.enrollments(user_id, cycle_id, status) values (v_uid, v_a2_cycle, 'active') returning id into v_a2;
    end if;
    insert into public.level_waitlist(user_id, level, source) values (v_uid, 'A2', 'a1_final_exam')
    on conflict (user_id, level) do nothing;
  end if;

  return jsonb_build_object(
    'score', v_score, 'correct', v_correct, 'total', v_count, 'passed', v_score >= v_pass, 'already_passed', false,
    'best_score', v_row.best_score, 'attempts', v_row.attempts, 'passed_at', v_row.passed_at,
    'next_attempt_at', case when v_score < v_pass then v_row.last_attempt_at + v_cooldown end,
    'promoted_to', case when v_score >= v_pass then 'A2' end);
end;
$$;
revoke all on function public.submit_a1_final_exam(jsonb) from public, anon;
grant execute on function public.submit_a1_final_exam(jsonb) to authenticated;
