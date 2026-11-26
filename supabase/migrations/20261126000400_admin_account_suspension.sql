-- 0400 · Suspender, reactivar y eliminar cuentas desde el panel de administración (aditiva).
--
-- 1. profiles.suspended_at / suspended_by: suspensión reversible. Las columnas NO se dan a
--    authenticated (ni select ni update): solo se leen con las funciones de abajo.
-- 2. is_active_user(): falso si quien llama está suspendido. Políticas RESTRICTIVAS (se suman con AND
--    a las existentes, que no cambian) impiden a una cuenta suspendida leer contenido y progreso; de su
--    perfil solo ve su propia fila. Un trigger en las tablas de alumno bloquea escrituras de una cuenta
--    suspendida aunque lleguen por funciones security definer (calificación incluida), sin tocar esas
--    funciones. El service_role (auth.uid() nulo) no se ve afectado.
-- 3. admin_set_suspension / admin_check_delete_user: las llaman las Edge Functions admin-account-status y
--    admin-delete-user CON EL TOKEN DEL ADMIN, así que la regla vive aquí: solo un admin activo, nunca a
--    sí mismo ni a otro admin, y siempre queda al menos un admin activo. El bloqueo en Auth (ban) y el
--    borrado en auth.users los hace la Edge Function con su service_role, que nunca llega al navegador.
-- 4. admin_list_users_v2 (lista con suspended_at) y my_account_status (la app muestra «cuenta suspendida»).
-- Borrar una cuenta: todas las tablas con user_id cuelgan de auth.users o profiles con on delete cascade.

alter table public.profiles add column if not exists suspended_at timestamptz;
alter table public.profiles add column if not exists suspended_by uuid references auth.users (id) on delete set null;

create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is null or not exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.suspended_at is not null
  )
$$;
revoke all on function public.is_active_user() from public, anon;
grant execute on function public.is_active_user() to authenticated;

-- ------------------------------------------------------------ lecturas
do $$
declare t text;
begin
  foreach t in array array[
    'cycles', 'modules', 'lessons', 'quiz_questions', 'vocab_items', 'checkpoints',
    'diagnostics', 'enrollments', 'module_progress', 'checkpoint_attempts', 'teacher_students',
    'word_progress', 'lesson_progress', 'a1_vocab_items', 'a1_unit_progress', 'a1_learning_drafts',
    'a1_word_progress', 'a1_unit0_progress'
  ] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop policy if exists %I on public.%I', t || '_not_suspended', t);
      execute format(
        'create policy %I on public.%I as restrictive for all to authenticated using ((select public.is_active_user())) with check ((select public.is_active_user()))',
        t || '_not_suspended', t);
    end if;
  end loop;
end;
$$;

-- Perfil: una cuenta suspendida solo ve el suyo (para que la app pueda cerrar sesión con calma).
drop policy if exists profiles_not_suspended on public.profiles;
create policy profiles_not_suspended on public.profiles as restrictive for all to authenticated
  using (id = auth.uid() or (select public.is_active_user()))
  with check (id = auth.uid() or (select public.is_active_user()));

-- ----------------------------------------------------------- escrituras
create or replace function public.block_suspended_writes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_active_user() then
    raise exception 'account_suspended' using errcode = '42501';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function public.block_suspended_writes() from public, anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array[
    'profiles', 'diagnostics', 'enrollments', 'module_progress', 'checkpoint_attempts', 'teacher_students',
    'word_progress', 'lesson_progress', 'tts_usage', 'a1_unit_progress', 'a1_learning_drafts',
    'a1_word_progress', 'a1_unit0_progress'
  ] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop trigger if exists zz_block_suspended_writes on public.%I', t);
      execute format(
        'create trigger zz_block_suspended_writes before insert or update or delete on public.%I for each row execute function public.block_suspended_writes()',
        t);
    end if;
  end loop;
end;
$$;

-- -------------------------------------------------------- funciones admin
-- p_restoring = true (reactivar) deja reactivar a quien luego fue ascendido a admin; nunca a uno mismo.
create or replace function public.admin_guard_target(p_user uuid, p_restoring boolean default false)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare v_role text;
begin
  if auth.uid() is null or public.app_role() is distinct from 'admin' or not public.is_active_user() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_user is null then
    raise exception 'user_not_found' using errcode = 'P0002';
  end if;
  if p_user = auth.uid() then
    raise exception 'cannot_target_self' using errcode = '42501';
  end if;
  select p.role::text into v_role from public.profiles p where p.id = p_user;
  if not found then
    raise exception 'user_not_found' using errcode = 'P0002';
  end if;
  if p_restoring then
    return v_role;
  end if;
  if v_role = 'admin' then
    raise exception 'cannot_target_admin' using errcode = '42501';
  end if;
  if (select count(*) from public.profiles p
       where p.role = 'admin' and p.suspended_at is null and p.id <> p_user) < 1 then
    raise exception 'last_admin' using errcode = '42501';
  end if;
  return v_role;
end;
$$;
revoke all on function public.admin_guard_target(uuid, boolean) from public, anon, authenticated;

create or replace function public.admin_set_suspension(p_user uuid, p_suspend boolean)
returns table (id uuid, email text, suspended_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_suspend is null then
    raise exception 'invalid_action' using errcode = '22023';
  end if;
  perform public.admin_guard_target(p_user, not p_suspend);
  update public.profiles p
     set suspended_at = case when p_suspend then coalesce(p.suspended_at, now()) else null end,
         suspended_by = case when p_suspend then coalesce(p.suspended_by, auth.uid()) else null end
   where p.id = p_user;
  return query
    select p.id, u.email::text, p.suspended_at
      from public.profiles p left join auth.users u on u.id = p.id
     where p.id = p_user;
end;
$$;

-- Solo valida y devuelve el correo; el borrado lo hace la Edge Function con auth.admin.deleteUser.
create or replace function public.admin_check_delete_user(p_user uuid)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare v_email text;
begin
  perform public.admin_guard_target(p_user);
  select u.email::text into v_email from auth.users u where u.id = p_user;
  return v_email;
end;
$$;

create or replace function public.admin_list_users_v2()
returns table (
  id uuid,
  full_name text,
  email text,
  role text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  teacher_id uuid,
  suspended_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or public.app_role() is distinct from 'admin' or not public.is_active_user() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return query
    select p.id, p.full_name, u.email::text, p.role::text, p.created_at, u.last_sign_in_at,
           (select ts.teacher_id from public.teacher_students ts where ts.student_id = p.id limit 1),
           p.suspended_at
      from public.profiles p
      left join auth.users u on u.id = p.id
     order by p.created_at desc, p.id;
end;
$$;

create or replace function public.my_account_status()
returns table (suspended boolean, suspended_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select p.suspended_at is not null, p.suspended_at from public.profiles p where p.id = auth.uid()
$$;

revoke all on function public.admin_set_suspension(uuid, boolean), public.admin_check_delete_user(uuid),
  public.admin_list_users_v2(), public.my_account_status() from public, anon;
grant execute on function public.admin_set_suspension(uuid, boolean), public.admin_check_delete_user(uuid),
  public.admin_list_users_v2(), public.my_account_status() to authenticated;
