-- Munchira · SECURITY HOTFIX (safe to apply on its own, ahead of everything else)
--
-- Two holes let anyone become an administrator of the production project:
--   1. handle_new_user() copied `role` from the sign-up metadata, which the
--      client controls:  supabase.auth.signUp({ ..., options: { data: { role: 'admin' } } })
--   2. The profiles_update_own policy has no column limit, so any signed-in
--      user could run:  update profiles set role = 'admin' where id = auth.uid()
--
-- This migration changes nothing else: no data, no policies, no tables.

-- 1. Every sign-up is a student; the role is never read from client input.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Sin nombre'
    ),
    'student'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- 2. The browser may rename itself, nothing else. Roles change only through
--    direct database access (SQL editor / service role).
-- (Skipped on a brand-new database: the baseline migration creates profiles later
-- and the RLS migration applies the same column limit.)
do $$
begin
  if to_regclass('public.profiles') is not null then
    revoke update on public.profiles from anon, authenticated;
    grant update (full_name) on public.profiles to authenticated;
  end if;
end $$;
