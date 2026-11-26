-- A1, cuestionarios v2 (aditiva). No modifica migraciones anteriores ni borra progreso.
-- 1. submit_a1_unit_quiz_v2: claves de los nuevos cuestionarios (content/cycles/A1.json). La versión
--    anterior, submit_a1_unit_quiz, queda intacta para las pestañas abiertas con el cuestionario viejo.
--    Misma regla: 70% o más completa la unidad; completed_at se conserva (coalesce) y best_score solo sube.
-- 2. Las 5 palabras rescatadas (live, order, recommend, straight ahead, on the corner) entran en Repaso
--    con word_index 100+n de su unidad.
-- 3. El catálogo de Repaso muestra el español revisado (carro, tiquete, bus, tuteo…).
begin;
create or replace function public.submit_a1_unit_quiz_v2(p_unit integer, p_answers jsonb)
returns public.a1_unit_progress language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_keys jsonb := '{"1": [3, 2, 0, 1, 2, 3, 1, 0, 1, 0], "2": [2, 1, 0, 2, 1, 3, 0, 1, 2, 3], "3": [0, 2, 1, 2, 1, 3, 0, 2, 3, 3], "4": [2, 3, 1, 0, 0, 3, 3, 1, 0, 2], "5": [0, 0, 1, 3, 0, 1, 1, 3, 2, 2], "6": [1, 3, 2, 1, 0, 3, 2, 1, 0, 2], "7": [2, 3, 2, 2, 3, 0, 0, 1, 1, 3], "8": [0, 1, 0, 1, 2, 3, 0, 2, 3, 3]}'::jsonb;
  v_options jsonb := '{"1": [4, 4, 4, 4, 4, 4, 4, 4, 4, 4], "2": [4, 4, 4, 4, 4, 4, 4, 4, 4, 4], "3": [4, 4, 4, 4, 4, 4, 4, 4, 4, 4], "4": [4, 4, 4, 4, 4, 4, 4, 4, 4, 4], "5": [4, 4, 4, 4, 4, 4, 4, 4, 4, 4], "6": [4, 4, 4, 4, 4, 4, 4, 4, 4, 4], "7": [4, 4, 4, 4, 4, 4, 4, 4, 4, 4], "8": [4, 4, 4, 4, 4, 4, 4, 4, 4, 4]}'::jsonb;
  v_key jsonb;
  v_limits jsonb;
  v_answer jsonb;
  v_correct integer := 0;
  v_score integer;
  v_count integer;
  v_row public.a1_unit_progress%rowtype;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if p_unit is null or p_unit not between 1 and 8 then raise exception 'invalid_a1_unit' using errcode = '22023'; end if;
  v_key := v_keys -> p_unit::text; v_limits := v_options -> p_unit::text;
  v_count := jsonb_array_length(v_key);
  if p_answers is null or jsonb_typeof(p_answers) <> 'array' then raise exception 'invalid_answers' using errcode = '22023'; end if;
  if jsonb_array_length(p_answers) <> v_count then raise exception 'invalid_answers' using errcode = '22023'; end if;
  for i in 0..v_count-1 loop
    v_answer := p_answers -> i;
    if jsonb_typeof(v_answer) <> 'number' or (v_answer #>> '{}') !~ '^[0-9]+$' then raise exception 'invalid_answers' using errcode = '22023'; end if;
    if (v_answer #>> '{}')::numeric >= (v_limits ->> i)::integer then raise exception 'invalid_answers' using errcode = '22023'; end if;
    if v_answer = v_key -> i then v_correct := v_correct + 1; end if;
  end loop;
  v_score := round(v_correct * 100.0 / v_count)::integer;
  insert into public.a1_unit_progress(user_id, unit_number, best_score, last_score, completed_at)
  values (v_uid, p_unit, v_score, v_score, case when v_score >= 70 then now() else null end)
  on conflict(user_id, unit_number) do update
    set best_score = greatest(public.a1_unit_progress.best_score, excluded.best_score),
        last_score = excluded.last_score,
        completed_at = coalesce(public.a1_unit_progress.completed_at, excluded.completed_at),
        updated_at = now()
  returning * into v_row;
  return v_row;
end;
$$;
revoke all on function public.submit_a1_unit_quiz_v2(integer, jsonb) from public, anon;
grant execute on function public.submit_a1_unit_quiz_v2(integer, jsonb) to authenticated;

insert into public.a1_vocab_items(id,unit_number,word_index,english,spanish) values
('8b5f02fb-2bd2-5793-83f6-aa672f8e8f49',1,100,'live','vivir'),
('b84c23d2-080e-5b67-8b32-ed96b91c3896',5,100,'order','pedir (en un restaurante)'),
('0e0e5e49-c304-51b4-addc-d2cc9952a771',5,101,'recommend','recomendar'),
('76e1e7f8-49e1-5aa4-8543-040ff4da2925',7,100,'straight ahead','todo derecho'),
('1a576dc3-e239-5451-ae5d-fa696e9b75a4',7,101,'on the corner','en la esquina')
on conflict (unit_number,word_index) do nothing;

update public.a1_vocab_items v set spanish = c.spanish
from (values
(2,17,'This is','este es'),
(2,22,'Have','tener (I, you, we, they)'),
(2,23,'Has','tener (he, she, it)'),
(3,4,'Go to school','ir al colegio'),
(3,10,'Go to bed','acostarse'),
(4,2,'Room','cuarto'),
(4,5,'Bedroom','habitación'),
(4,13,'Under','debajo de'),
(5,24,'Can I have','¿me das?'),
(7,2,'Bus','bus'),
(7,5,'Car','carro'),
(7,9,'Ticket','tiquete'),
(7,20,'Excuse me','disculpa'),
(7,22,'Take the bus','tomar el bus')
) as c(unit_number,word_index,english,spanish)
where v.unit_number = c.unit_number and v.word_index = c.word_index and v.english = c.english;
commit;
