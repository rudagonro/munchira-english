-- 0800 · Gestión de usuarios y roles desde la app (solo admin).
--
-- Los roles no se pueden cambiar desde el cliente (0200 solo deja editar
-- full_name). Estas funciones son la única vía, y cada una exige rol admin en el
-- servidor. Un admin no puede cambiar su propio rol: así nunca se queda la
-- plataforma sin administrador por un clic equivocado.

create or replace function public.admin_list_users()
returns table (
  id uuid,
  full_name text,
  email text,
  role text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  teacher_id uuid
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or public.app_role() is distinct from 'admin' then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return query
    select p.id, p.full_name, u.email::text, p.role::text, p.created_at, u.last_sign_in_at,
           (select ts.teacher_id from public.teacher_students ts where ts.student_id = p.id limit 1)
      from public.profiles p
      left join auth.users u on u.id = p.id
     order by p.created_at desc, p.id;
end;
$$;

create or replace function public.admin_set_role(p_user uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or public.app_role() is distinct from 'admin' then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_role is null or p_role not in ('student', 'teacher', 'admin') then
    raise exception 'invalid_role' using errcode = '22023';
  end if;
  if p_user = auth.uid() then
    raise exception 'cannot_change_own_role' using errcode = '42501';
  end if;
  update public.profiles set role = p_role::public.user_role where id = p_user;
  if not found then
    raise exception 'user_not_found' using errcode = 'P0002';
  end if;
  -- Un usuario que deja de ser docente ya no tiene alumnos asignados.
  if p_role = 'student' then
    delete from public.teacher_students where teacher_id = p_user;
  end if;
end;
$$;

-- p_teacher null = quitar la asignación del alumno.
create or replace function public.admin_assign_student(p_student uuid, p_teacher uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or public.app_role() is distinct from 'admin' then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if not exists (select 1 from public.profiles where id = p_student and role = 'student') then
    raise exception 'student_not_found' using errcode = 'P0002';
  end if;
  delete from public.teacher_students where student_id = p_student;
  if p_teacher is not null then
    if not exists (select 1 from public.profiles where id = p_teacher and role in ('teacher', 'admin')) then
      raise exception 'teacher_not_found' using errcode = 'P0002';
    end if;
    insert into public.teacher_students (teacher_id, student_id) values (p_teacher, p_student);
  end if;
end;
$$;

revoke all on function public.admin_list_users(), public.admin_set_role(uuid, text),
  public.admin_assign_student(uuid, uuid) from public, anon;
grant execute on function public.admin_list_users(), public.admin_set_role(uuid, text),
  public.admin_assign_student(uuid, uuid) to authenticated;
