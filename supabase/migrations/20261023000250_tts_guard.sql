-- Munchira · cost guard for the tts-generate edge function
--
-- The function runs with the service role. These helpers are callable only by
-- it, so a browser can neither read usage nor bypass the daily cap.

create table if not exists public.tts_usage (
  user_id  uuid not null references auth.users (id) on delete cascade,
  day      date not null default (now() at time zone 'utc')::date,
  requests integer not null default 0,
  chars    integer not null default 0,
  primary key (user_id, day)
);
alter table public.tts_usage enable row level security;
revoke all on public.tts_usage from anon, authenticated;

-- Atomically reserves p_chars of today's budget. Returns false when the cap
-- would be exceeded (nothing is reserved in that case).
create or replace function public.tts_consume(p_user uuid, p_chars integer, p_daily_cap integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare used integer;
begin
  insert into public.tts_usage (user_id, day, requests, chars)
  values (p_user, (now() at time zone 'utc')::date, 0, 0)
  on conflict (user_id, day) do nothing;

  update public.tts_usage
     set requests = requests + 1, chars = chars + p_chars
   where user_id = p_user and day = (now() at time zone 'utc')::date
     and chars + p_chars <= p_daily_cap
  returning chars into used;

  return used is not null;
end;
$$;

-- Only text that belongs to course content may be synthesised (lesson audio,
-- dialogue turns, quoted practice text, vocabulary). Keeps the endpoint from
-- being used as a free general-purpose TTS.
create or replace function public.tts_text_allowed(p_text text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_text is not null and length(btrim(p_text)) > 0 and (
    exists (
      select 1 from public.lessons l
      where l.audio_text = p_text
         or position(p_text in coalesce(l.practice_content, '')) > 0
         or exists (
           select 1 from jsonb_array_elements(
             case when jsonb_typeof(l.dialogue_turns) = 'array' then l.dialogue_turns else '[]'::jsonb end
           ) t where t ->> 'text' = p_text)
    )
    or exists (
      select 1 from public.vocab_items v
      where v.english = p_text or v.example_sentence = p_text
    )
  )
$$;

revoke all on function public.tts_consume(uuid, integer, integer), public.tts_text_allowed(text)
  from public, anon, authenticated;
grant execute on function public.tts_consume(uuid, integer, integer), public.tts_text_allowed(text)
  to service_role;
