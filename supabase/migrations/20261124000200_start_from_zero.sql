-- Munchira · «Empiezo desde cero»
-- Inscribe al alumno en el ciclo A1 sin registrar un diagnóstico.
-- Solo actúa si el alumno aún no tiene ninguna inscripción: nunca baja
-- de nivel a quien ya hizo la prueba o ya tiene un ciclo.
create or replace function public.start_from_zero()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_cycle uuid;
  v_enrollment uuid;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;

  perform pg_advisory_xact_lock(hashtext('nivelo:' || v_uid::text));

  select id into v_enrollment from public.enrollments
   where user_id = v_uid order by started_at desc limit 1;
  if v_enrollment is not null then
    return jsonb_build_object('enrollment_id', v_enrollment, 'already_enrolled', true);
  end if;

  select id into v_cycle from public.cycles where cefr_level::text = 'A1';
  if v_cycle is null then raise exception 'cycle_not_found' using errcode = 'P0002'; end if;

  insert into public.enrollments (user_id, cycle_id) values (v_uid, v_cycle)
  returning id into v_enrollment;

  return jsonb_build_object('enrollment_id', v_enrollment, 'cefr_level', 'A1');
end;
$$;

revoke all on function public.start_from_zero() from public, anon;
grant execute on function public.start_from_zero() to authenticated;
