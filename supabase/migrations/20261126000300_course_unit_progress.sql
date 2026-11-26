-- Fase 2 · Un solo origen de avance por nivel y unidad.
-- SOLO AGREGA: una vista y una función nuevas. No modifica tablas, filas, funciones ni permisos
-- existentes; el avance de los alumnos se lee tal cual de las tablas actuales.
-- NO APLICAR sin el OK del propietario. Mientras no se aplique, la app usa las lecturas anteriores.
--
-- 1) public.course_unit_progress: una fila por alumno, nivel y unidad (0 = Unidad 0).
--    Hoy reúne A1 (a1_unit0_progress + a1_unit_progress); cada nivel nuevo sumará aquí sus filas.
--    security_invoker: cada alumno sigue viendo solo lo suyo (RLS de las tablas de origen).
create or replace view public.course_unit_progress
with (security_invoker = true) as
  select p.user_id, 'A1'::text as level, 0 as unit_number, p.best_score, p.last_score, p.completed_at, p.updated_at
    from public.a1_unit0_progress p
  union all
  select p.user_id, 'A1'::text as level, p.unit_number, p.best_score, p.last_score, p.completed_at, p.updated_at
    from public.a1_unit_progress p;

comment on view public.course_unit_progress is
  'Avance por nivel y unidad (Unidad 0 = 0). Origen único de lectura para alumno, panel docente y revisor.';

revoke all on public.course_unit_progress from public, anon, authenticated;
grant select on public.course_unit_progress to authenticated;
grant select on public.course_unit_progress to service_role;

-- 2) public.teacher_course_progress(): el avance por unidades de los alumnos que el docente puede
--    ver (todos si es admin), con los mismos permisos que teacher_overview. Solo lectura.
create or replace function public.teacher_course_progress()
returns table (
  student_id     uuid,
  units          jsonb,
  drafts         jsonb,
  words_studied  integer,
  words_due      integer,
  last_activity  timestamptz
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
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'level', u.level, 'unit_number', u.unit_number, 'best_score', u.best_score,
        'last_score', u.last_score, 'completed_at', u.completed_at, 'updated_at', u.updated_at)
        order by u.level, u.unit_number)
        from public.course_unit_progress u where u.user_id = p.id
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'level', 'A1', 'unit_number', substring(d.lesson_key from '^unit:([0-8])$')::integer, 'updated_at', d.updated_at)
        order by d.lesson_key)
        from public.a1_learning_drafts d
       where d.user_id = p.id and d.lesson_key ~ '^unit:[0-8]$'
    ), '[]'::jsonb),
    (select count(*)::integer from public.a1_word_progress w where w.user_id = p.id),
    (select count(*) filter (where w.next_review <= now())::integer from public.a1_word_progress w where w.user_id = p.id),
    nullif(greatest(
      (select max(u.updated_at) from public.course_unit_progress u where u.user_id = p.id),
      (select max(d.updated_at) from public.a1_learning_drafts d where d.user_id = p.id),
      (select max(w.last_reviewed_at) from public.a1_word_progress w where w.user_id = p.id)
    ), '-infinity'::timestamptz)
  from public.profiles p
  where p.role = 'student'
    and (
      public.app_role() = 'admin'
      or exists (select 1 from public.teacher_students ts
                  where ts.teacher_id = auth.uid() and ts.student_id = p.id)
    )
  order by p.full_name nulls last, p.id;
end;
$$;

revoke all on function public.teacher_course_progress() from public, anon;
grant execute on function public.teacher_course_progress() to authenticated;
