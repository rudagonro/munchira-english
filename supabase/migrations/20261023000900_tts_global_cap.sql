-- 0900 · Tope global diario de audio.
--
-- El límite por usuario ya existía (tts_consume). Este añade un techo para TODA la
-- plataforma: si entre todos los usuarios se superan p_global_cap caracteres
-- generados hoy, no se pide más audio a ElevenLabs hasta el día siguiente (UTC).
-- Los audios ya guardados en caché siguen sirviéndose y no cuentan. La app cae a
-- la voz del dispositivo cuando se alcanza el tope. p_global_cap null = sin tope global.

drop function if exists public.tts_consume(uuid, integer, integer);

create or replace function public.tts_consume(
  p_user uuid, p_chars integer, p_daily_cap integer, p_global_cap integer default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  used integer;
  v_today date := (now() at time zone 'utc')::date;
begin
  if p_global_cap is not null then
    -- Serializa la comprobación global para que dos peticiones simultáneas no se la salten.
    perform pg_advisory_xact_lock(hashtext('nivelo:tts_global'));
    if coalesce((select sum(chars) from public.tts_usage where day = v_today), 0) + p_chars > p_global_cap then
      return false;
    end if;
  end if;

  insert into public.tts_usage (user_id, day, requests, chars)
  values (p_user, v_today, 0, 0)
  on conflict (user_id, day) do nothing;

  update public.tts_usage
     set requests = requests + 1, chars = chars + p_chars
   where user_id = p_user and day = v_today
     and chars + p_chars <= p_daily_cap
  returning chars into used;

  return used is not null;
end;
$$;

revoke all on function public.tts_consume(uuid, integer, integer, integer) from public, anon, authenticated;
grant execute on function public.tts_consume(uuid, integer, integer, integer) to service_role;
