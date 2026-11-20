-- 1000 · Audios como archivos fijos.
--
-- Bucket público `lesson-audio`: el audio de cada frase vive en una ruta que lleva el
-- hash de su texto y su voz, así que nunca cambia y el navegador lo guarda para siempre.
-- Los alumnos lo descargan directo (CDN de Supabase): sin función, sin ElevenLabs, sin espera.
-- Solo docentes y admin lo escriben, y solo a través de staff_save_lesson_audio.

insert into storage.buckets (id, name, public)
values ('lesson-audio', 'lesson-audio', true)
on conflict (id) do update set public = true;

-- Guarda las URLs de audio de una lección.
--   · Con dialogue_turns: p_urls tiene una URL por turno, en orden, y se guarda en cada turno.
--   · Con solo audio_text: p_urls tiene una URL y se guarda en lessons.audio_url.
create or replace function public.staff_save_lesson_audio(p_lesson uuid, p_urls jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_turns jsonb;
  v_text text;
  v_url jsonb;
  v_pattern constant text := '^https://[^/]+/storage/v1/object/public/lesson-audio/[a-z_0-9]+/[0-9a-f]{64}\.mp3$';
begin
  if auth.uid() is null or not public.is_staff() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_urls is null or jsonb_typeof(p_urls) <> 'array' or jsonb_array_length(p_urls) = 0 then
    raise exception 'invalid_urls' using errcode = '22023';
  end if;
  for v_url in select * from jsonb_array_elements(p_urls) loop
    if jsonb_typeof(v_url) <> 'string' or (v_url #>> '{}') !~ v_pattern then
      raise exception 'invalid_urls' using errcode = '22023';
    end if;
  end loop;

  select l.dialogue_turns, l.audio_text into v_turns, v_text from public.lessons l where l.id = p_lesson;
  if not found then raise exception 'lesson_not_found' using errcode = 'P0002'; end if;

  if jsonb_typeof(v_turns) = 'array' and jsonb_array_length(v_turns) > 0 then
    if jsonb_array_length(p_urls) <> jsonb_array_length(v_turns) then
      raise exception 'urls_do_not_match_turns' using errcode = '22023';
    end if;
    update public.lessons l
       set dialogue_turns = (
         select jsonb_agg(t.value || jsonb_build_object('audio_url', p_urls -> (t.ord::int - 1)) order by t.ord)
           from jsonb_array_elements(l.dialogue_turns) with ordinality as t(value, ord))
     where l.id = p_lesson;
  elsif coalesce(btrim(v_text), '') <> '' then
    if jsonb_array_length(p_urls) <> 1 then
      raise exception 'urls_do_not_match_turns' using errcode = '22023';
    end if;
    update public.lessons set audio_url = p_urls ->> 0 where id = p_lesson;
  else
    raise exception 'lesson_without_audio' using errcode = 'P0002';
  end if;
  return jsonb_array_length(p_urls);
end;
$$;

revoke all on function public.staff_save_lesson_audio(uuid, jsonb) from public, anon;
grant execute on function public.staff_save_lesson_audio(uuid, jsonb) to authenticated;
