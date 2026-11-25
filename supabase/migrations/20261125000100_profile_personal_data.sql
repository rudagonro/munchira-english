-- Munchira · datos personales en el perfil y edad mínima de 14 años en la base de datos.
-- Idempotente. Solo añade columnas y rellena las vacías desde los metadatos de registro.
--
-- Regla de edad: la base de datos rechaza una fecha de nacimiento que no cumpla 14 años
-- (o anterior a 1900), de modo que no depende solo del formulario. Un alta con fecha de un
-- menor de 14 años falla entera: no se crea ni la cuenta ni el perfil.
-- La fecha de nacimiento no es legible desde la API (solo país y nombres lo son).

alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name  text,
  add column if not exists birth_date date,
  add column if not exists country    text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_country_iso2') then
    alter table public.profiles add constraint profiles_country_iso2
      check (country is null or country ~ '^[A-Z]{2}$');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_names_length') then
    alter table public.profiles add constraint profiles_names_length
      check ((first_name is null or char_length(first_name) between 1 and 80)
         and (last_name  is null or char_length(last_name)  between 1 and 80));
  end if;
end $$;

-- Devuelve un código de error o null si la fecha es válida.
create or replace function public.birth_date_problem(p_birth date)
returns text
language sql
stable
set search_path = ''
as $$
  select case
    when p_birth is null then null
    when p_birth < date '1900-01-01' then 'invalid_birth_date'
    when p_birth > (current_date - interval '14 years')::date then 'age_under_14'
    else null
  end
$$;

-- Se comprueba al crear la fila o al cambiar la fecha; las filas antiguas sin cambios no se tocan.
create or replace function public.profiles_enforce_personal_data()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_problem text;
begin
  if new.birth_date is not null
     and (tg_op = 'INSERT' or new.birth_date is distinct from old.birth_date) then
    v_problem := public.birth_date_problem(new.birth_date);
    if v_problem is not null then
      raise exception '%', v_problem using errcode = '22023';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_enforce_personal_data on public.profiles;
create trigger profiles_enforce_personal_data
  before insert or update on public.profiles
  for each row execute function public.profiles_enforce_personal_data();

revoke all on function public.profiles_enforce_personal_data() from public, anon, authenticated;

-- Alta de usuario: guarda nombres, apellidos, país y fecha de nacimiento si vienen en los
-- metadatos del registro. Nunca elige el rol: siempre 'student'.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_meta    jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_first   text  := nullif(left(btrim(v_meta ->> 'first_name'), 80), '');
  v_last    text  := nullif(left(btrim(v_meta ->> 'last_name'), 80), '');
  v_country text  := upper(nullif(btrim(v_meta ->> 'country'), ''));
  v_raw     text  := nullif(btrim(v_meta ->> 'birth_date'), '');
  v_birth   date;
begin
  if v_raw is not null then
    begin
      v_birth := v_raw::date;
    exception when others then
      raise exception 'invalid_birth_date' using errcode = '22023';
    end;
  end if;
  if v_country is not null and v_country !~ '^[A-Z]{2}$' then
    v_country := null;
  end if;

  insert into public.profiles (id, full_name, role, first_name, last_name, birth_date, country)
  values (
    new.id,
    coalesce(
      nullif(v_meta ->> 'full_name', ''),
      nullif(btrim(concat_ws(' ', v_first, v_last)), ''),
      nullif(v_meta ->> 'name', ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Sin nombre'
    ),
    'student',
    v_first, v_last, v_birth, v_country
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Para cuentas que no traen estos datos (por ejemplo, las de Google): la pantalla
-- «Completa tus datos» los guarda aquí. La edad se valida con el disparador de arriba.
create or replace function public.complete_my_profile(
  p_first_name text, p_last_name text, p_birth_date date, p_country text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid     uuid := auth.uid();
  v_first   text := nullif(btrim(p_first_name), '');
  v_last    text := nullif(btrim(p_last_name), '');
  v_country text := upper(nullif(btrim(p_country), ''));
  v_row     public.profiles%rowtype;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if v_first is null or v_last is null or char_length(v_first) > 80 or char_length(v_last) > 80 then
    raise exception 'invalid_name' using errcode = '22023';
  end if;
  if v_country is null or v_country !~ '^[A-Z]{2}$' then
    raise exception 'invalid_country' using errcode = '22023';
  end if;
  if p_birth_date is null then raise exception 'invalid_birth_date' using errcode = '22023'; end if;

  update public.profiles
     set first_name = v_first, last_name = v_last, birth_date = p_birth_date, country = v_country,
         full_name = btrim(v_first || ' ' || v_last)
   where id = v_uid
   returning * into v_row;
  if not found then raise exception 'profile_not_found' using errcode = 'P0002'; end if;

  return jsonb_build_object(
    'id', v_row.id, 'full_name', v_row.full_name, 'role', v_row.role, 'created_at', v_row.created_at,
    'first_name', v_row.first_name, 'last_name', v_row.last_name, 'country', v_row.country);
end;
$$;

revoke all on function public.complete_my_profile(text, text, date, text) from public, anon;
grant execute on function public.complete_my_profile(text, text, date, text) to authenticated;

-- La fecha de nacimiento no se puede leer desde la API (ni siquiera un docente asignado ni un
-- administrador); solo la ven las funciones del servidor.
revoke select on public.profiles from authenticated, anon;
grant select (id, full_name, role, created_at, first_name, last_name, country)
  on public.profiles to authenticated;

-- Relleno de cuentas existentes con lo que ya guardaron en los metadatos de registro.
-- Una fecha inválida o de menor de 14 años se deja vacía; nunca se inventa un dato.
do $$
declare
  r record;
begin
  for r in
    select p.id, coalesce(u.raw_user_meta_data, '{}'::jsonb) as m
      from public.profiles p join auth.users u on u.id = p.id
     where p.first_name is null and p.last_name is null and p.birth_date is null and p.country is null
       and coalesce(u.raw_user_meta_data, '{}'::jsonb) ?| array['first_name', 'last_name', 'birth_date', 'country']
  loop
    begin
      update public.profiles set
        first_name = nullif(left(btrim(r.m ->> 'first_name'), 80), ''),
        last_name  = nullif(left(btrim(r.m ->> 'last_name'), 80), ''),
        country    = case when upper(btrim(r.m ->> 'country')) ~ '^[A-Z]{2}$'
                          then upper(btrim(r.m ->> 'country')) end
       where id = r.id;
    exception when others then null;
    end;
    begin
      update public.profiles set birth_date = nullif(btrim(r.m ->> 'birth_date'), '')::date where id = r.id;
    exception when others then null;
    end;
  end loop;
end $$;
