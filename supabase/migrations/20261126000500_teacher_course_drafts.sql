-- Panel docente · el paso de cada borrador de unidad, para leer el avance con la misma regla que /cycle.
-- SOLO AGREGA una función de lectura. No modifica tablas, filas, funciones ni permisos existentes.
-- NO APLICAR sin el OK del propietario. Mientras no se aplique, el panel cuenta cualquier borrador
-- guardado como «en curso» (un borrador solo se guarda al avanzar).
--
-- Devuelve, para los alumnos que el docente puede ver (todos si es admin), solo el paso actual y la lista
-- de pasos hechos de cada borrador «unit:1»…«unit:8»; nunca las respuestas escritas.
create or replace function public.teacher_course_drafts()
returns table (
  student_id   uuid,
  level        text,
  unit_number  integer,
  step         integer,
  completed    jsonb,
  updated_at   timestamptz
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
    d.user_id,
    'A1'::text,
    substring(d.lesson_key from '^unit:([1-8])$')::integer,
    case when jsonb_typeof(d.fields -> 'step') = 'number' then (d.fields ->> 'step')::numeric::integer end,
    case when jsonb_typeof(d.fields -> 'step.completed') = 'array' then d.fields -> 'step.completed' else '[]'::jsonb end,
    d.updated_at
  from public.a1_learning_drafts d
  join public.profiles p on p.id = d.user_id
  where d.lesson_key ~ '^unit:[1-8]$'
    and p.role = 'student'
    and (
      public.app_role() = 'admin'
      or exists (select 1 from public.teacher_students ts
                  where ts.teacher_id = auth.uid() and ts.student_id = d.user_id)
    )
  order by d.user_id, d.lesson_key;
end;
$$;

revoke all on function public.teacher_course_drafts() from public, anon;
grant execute on function public.teacher_course_drafts() to authenticated;
