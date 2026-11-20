-- 0700 · Modo revisor: respuestas del quiz solo para docentes y admins.
--
-- Los alumnos nunca pueden leer correct_idx (0300 lo oculta con permisos por
-- columna). Quien revisa el contenido sí necesita verlo, también en módulos que
-- aún son borrador. Esta función es la única vía y exige rol teacher o admin.
-- No escribe nada: es de solo lectura.

create or replace function public.staff_quiz_answers(p_module uuid)
returns table (question_id uuid, correct_idx integer)
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
    select q.id, q.correct_idx
      from public.quiz_questions q
     where q.module_id = p_module
     order by q.id;
end;
$$;

revoke all on function public.staff_quiz_answers(uuid) from public, anon;
grant execute on function public.staff_quiz_answers(uuid) to authenticated;
