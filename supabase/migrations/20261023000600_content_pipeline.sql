-- NIVelo · content pipeline (seed, readiness gate, publish)
--
-- Course content lives in the repository (content/*.json) and is loaded with
-- seed_cycle / seed_module. New modules are drafts; publish_cycle only flips a
-- whole cycle to published when it passes the readiness checks, so students
-- never land in a half-written level.

-- ---------------------------------------------------------------- seeding
-- Callable only by the database owner / service role (seed scripts, migrations).
create or replace function public.seed_cycle(
  p_level text, p_title text, p_weeks_min integer, p_weeks_max integer, p_checkpoints jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cycle uuid;
  cp jsonb;
begin
  insert into public.cycles (cefr_level, title, duration_weeks_min, duration_weeks_max)
  values (p_level, p_title, p_weeks_min, p_weeks_max)
  on conflict (cefr_level) do nothing;
  select id into v_cycle from public.cycles where cefr_level = p_level;

  for cp in select * from jsonb_array_elements(coalesce(p_checkpoints, '[]'::jsonb)) loop
    insert into public.checkpoints (cycle_id, after_module_order, title, min_score_to_pass)
    values (v_cycle, (cp ->> 'after_module_order')::integer, cp ->> 'title',
            coalesce((cp ->> 'min_score_to_pass')::numeric, 70))
    on conflict (cycle_id, after_module_order)
    do update set title = excluded.title, min_score_to_pass = excluded.min_score_to_pass;
  end loop;
end;
$$;

-- p_module: { title, skill_type, lessons: [...], quiz: [...], vocab: [...] }
-- Replaces the module's children. Refuses to touch a published module.
create or replace function public.seed_module(p_level text, p_order integer, p_module jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cycle uuid;
  v_module uuid;
  v_published boolean;
begin
  select id into v_cycle from public.cycles where cefr_level = p_level;
  if v_cycle is null then raise exception 'cycle_not_found: %', p_level using errcode = 'P0002'; end if;

  select id, published into v_module, v_published
    from public.modules where cycle_id = v_cycle and order_index = p_order;
  if v_module is not null and v_published then
    raise exception 'module_published: % module % is live; unpublish the cycle before re-seeding', p_level, p_order
      using errcode = '42501';
  end if;

  if v_module is null then
    insert into public.modules (cycle_id, order_index, title, skill_type, published)
    values (v_cycle, p_order, p_module ->> 'title', p_module ->> 'skill_type', false)
    returning id into v_module;
  else
    update public.modules set title = p_module ->> 'title', skill_type = p_module ->> 'skill_type'
     where id = v_module;
  end if;

  delete from public.lessons where module_id = v_module;
  insert into public.lessons (module_id, order_index, title, theory_content, theory_table,
                              practice_content, exercises, audio_text, dialogue_turns, image_url)
  select v_module, (l ->> 'order')::integer, l ->> 'title', l ->> 'theory_content', l -> 'theory_table',
         l ->> 'practice_content', l -> 'exercises', l ->> 'audio_text', l -> 'dialogue_turns', l ->> 'image_url'
    from jsonb_array_elements(coalesce(p_module -> 'lessons', '[]'::jsonb)) l;

  delete from public.quiz_questions where module_id = v_module;
  insert into public.quiz_questions (module_id, question, options, correct_idx)
  select v_module, q ->> 'question', q -> 'options', (q ->> 'correct_idx')::integer
    from jsonb_array_elements(coalesce(p_module -> 'quiz', '[]'::jsonb)) q;

  delete from public.vocab_items where module_id = v_module;
  insert into public.vocab_items (module_id, order_index, english, spanish, example_sentence)
  select v_module, row_number() over ()::integer, v ->> 'english', v ->> 'spanish', v ->> 'example_sentence'
    from jsonb_array_elements(coalesce(p_module -> 'vocab', '[]'::jsonb)) v;

  return v_module;
end;
$$;

-- ------------------------------------------------------------- readiness
-- Thresholds mirror content/lib/validate.js (MIN_*). One row per problem.
create or replace function public.content_readiness(p_level text)
returns table (problem text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_cycle uuid;
  v_max_order integer;
  m record;
  v_lessons integer;
  v_questions integer;
  v_bad_questions integer;
  v_vocab integer;
  v_no_audio integer;
begin
  if auth.uid() is not null and not public.is_staff() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select id into v_cycle from public.cycles where cefr_level = p_level;
  if v_cycle is null then
    return query select format('%s: el ciclo no existe', p_level);
    return;
  end if;

  select max(order_index) into v_max_order from public.modules where cycle_id = v_cycle;
  if (select count(*) from public.modules where cycle_id = v_cycle) < 4 then
    return query select format('%s: faltan módulos (tiene %s, mínimo 4)', p_level,
      (select count(*) from public.modules where cycle_id = v_cycle));
  end if;

  for m in select * from public.modules where cycle_id = v_cycle order by order_index loop
    select count(*) into v_lessons from public.lessons where module_id = m.id;
    if v_lessons < 4 then
      return query select format('%s · módulo %s (%s): faltan lecciones (tiene %s, mínimo 4)',
        p_level, m.order_index, m.skill_type, v_lessons);
    end if;

    select count(*),
           count(*) filter (where jsonb_typeof(to_jsonb(options)) <> 'array'
                              or jsonb_array_length(to_jsonb(options)) < 2
                              or correct_idx >= jsonb_array_length(to_jsonb(options)))
      into v_questions, v_bad_questions
      from public.quiz_questions where module_id = m.id;
    if v_questions < 5 then
      return query select format('%s · módulo %s (%s): faltan preguntas de quiz (tiene %s, mínimo 5)',
        p_level, m.order_index, m.skill_type, v_questions);
    end if;
    if v_bad_questions > 0 then
      return query select format('%s · módulo %s (%s): %s pregunta(s) con opciones o respuesta inválidas',
        p_level, m.order_index, m.skill_type, v_bad_questions);
    end if;

    if m.skill_type = 'vocabulary' then
      select count(*) into v_vocab from public.vocab_items where module_id = m.id;
      if v_vocab < 10 then
        return query select format('%s · módulo %s (vocabulary): faltan palabras (tiene %s, mínimo 10)',
          p_level, m.order_index, v_vocab);
      end if;
    end if;

    if m.skill_type = 'listening' then
      select count(*) into v_no_audio from public.lessons
       where module_id = m.id
         and coalesce(btrim(audio_text), '') = ''
         and (dialogue_turns is null or jsonb_typeof(dialogue_turns) <> 'array' or jsonb_array_length(dialogue_turns) = 0);
      if v_no_audio > 0 then
        return query select format('%s · módulo %s (listening): %s lección(es) sin audio_text ni dialogue_turns',
          p_level, m.order_index, v_no_audio);
      end if;
    end if;
  end loop;

  if v_max_order is not null and not exists (
    select 1 from public.checkpoints where cycle_id = v_cycle and after_module_order = v_max_order
  ) then
    return query select format('%s: falta el checkpoint final (después del módulo %s)', p_level, v_max_order);
  end if;
end;
$$;

-- One row per cycle for the staff dashboard.
create or replace function public.content_status()
returns table (
  cefr_level text, title text, total_modules integer, published_modules integer, problems text[]
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
  select c.cefr_level, c.title,
         (select count(*)::integer from public.modules m where m.cycle_id = c.id),
         (select count(*)::integer from public.modules m where m.cycle_id = c.id and m.published),
         coalesce(array(select r.problem from public.content_readiness(c.cefr_level) r), '{}'::text[])
    from public.cycles c
   order by c.cefr_level;
end;
$$;

-- Publishes every module of a cycle atomically, only if it passes the checks.
create or replace function public.publish_cycle(p_level text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_problems text[];
begin
  if auth.uid() is null or public.app_role() is distinct from 'admin' then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  v_problems := array(select r.problem from public.content_readiness(p_level) r);
  if cardinality(v_problems) > 0 then
    return jsonb_build_object('published', false, 'problems', to_jsonb(v_problems));
  end if;
  update public.modules set published = true
   where cycle_id = (select id from public.cycles where cefr_level = p_level);
  return jsonb_build_object('published', true, 'problems', '[]'::jsonb);
end;
$$;

create or replace function public.unpublish_cycle(p_level text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or public.app_role() is distinct from 'admin' then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update public.modules set published = false
   where cycle_id = (select id from public.cycles where cefr_level = p_level);
end;
$$;

revoke all on function public.seed_cycle(text, text, integer, integer, jsonb),
  public.seed_module(text, integer, jsonb), public.content_readiness(text), public.content_status(),
  public.publish_cycle(text), public.unpublish_cycle(text) from public, anon, authenticated;
grant execute on function public.seed_cycle(text, text, integer, integer, jsonb),
  public.seed_module(text, integer, jsonb) to service_role;
grant execute on function public.content_readiness(text), public.content_status(),
  public.publish_cycle(text), public.unpublish_cycle(text) to authenticated, service_role;
