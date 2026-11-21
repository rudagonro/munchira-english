-- Munchira · persistent vocabulary review (spaced repetition) and lesson progress
--
-- Both tables are written only through the functions below, which derive the
-- user from the session. Reading is limited to the owner, an assigned teacher
-- or an admin (same rule as the rest of the student data).

create table if not exists public.word_progress (
  user_id          uuid not null references public.profiles (id) on delete cascade,
  vocab_item_id    uuid not null references public.vocab_items (id) on delete cascade,
  ease_factor      numeric not null default 2.5 check (ease_factor between 1.3 and 3.0),
  interval_days    integer not null default 0 check (interval_days between 0 and 365),
  repetitions      integer not null default 0 check (repetitions >= 0),
  correct_count    integer not null default 0,
  incorrect_count  integer not null default 0,
  next_review      timestamptz not null default now(),
  last_reviewed_at timestamptz,
  primary key (user_id, vocab_item_id)
);
create index if not exists word_progress_due_idx on public.word_progress (user_id, next_review);

create table if not exists public.lesson_progress (
  user_id      uuid not null references public.profiles (id) on delete cascade,
  lesson_id    uuid not null references public.lessons (id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

alter table public.word_progress   enable row level security;
alter table public.lesson_progress enable row level security;

drop policy if exists word_progress_select   on public.word_progress;
drop policy if exists lesson_progress_select on public.lesson_progress;
create policy word_progress_select on public.word_progress
  for select to authenticated using (public.can_view_student(user_id));
create policy lesson_progress_select on public.lesson_progress
  for select to authenticated using (public.can_view_student(user_id));

revoke all on public.word_progress, public.lesson_progress from anon, authenticated;
grant select on public.word_progress, public.lesson_progress to authenticated;

-- ------------------------------------------------------ record_vocab_review
-- Simplified SM-2 for a two-button grade ("Repasar" / "¡Lo sé!"):
--   known   -> repetitions + 1; interval 1 day, then 6 days, then interval * ease (max 365 days);
--              ease grows by 0.05 (max 3.0)
--   unknown -> repetitions reset; due again in 10 minutes; ease drops by 0.2 (min 1.3)
create or replace function public.record_vocab_review(p_vocab_item_id uuid, p_known boolean)
returns public.word_progress
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.word_progress%rowtype;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if p_known is null then raise exception 'invalid_grade' using errcode = '22023'; end if;
  if not exists (select 1 from public.vocab_items where id = p_vocab_item_id) then
    raise exception 'vocab_item_not_found' using errcode = 'P0002';
  end if;

  insert into public.word_progress (user_id, vocab_item_id) values (v_uid, p_vocab_item_id)
  on conflict (user_id, vocab_item_id) do nothing;

  select * into v_row from public.word_progress
   where user_id = v_uid and vocab_item_id = p_vocab_item_id for update;

  if p_known then
    v_row.repetitions := v_row.repetitions + 1;
    v_row.interval_days := case v_row.repetitions
      when 1 then 1
      when 2 then 6
      else least(greatest(round(v_row.interval_days * v_row.ease_factor)::integer, 1), 365)
    end;
    v_row.ease_factor := least(3.0, v_row.ease_factor + 0.05);
    v_row.correct_count := v_row.correct_count + 1;
    v_row.next_review := now() + make_interval(days => v_row.interval_days);
  else
    v_row.repetitions := 0;
    v_row.interval_days := 0;
    v_row.ease_factor := greatest(1.3, v_row.ease_factor - 0.2);
    v_row.incorrect_count := v_row.incorrect_count + 1;
    v_row.next_review := now() + interval '10 minutes';
  end if;
  v_row.last_reviewed_at := now();

  update public.word_progress
     set repetitions = v_row.repetitions, interval_days = v_row.interval_days,
         ease_factor = v_row.ease_factor, correct_count = v_row.correct_count,
         incorrect_count = v_row.incorrect_count, next_review = v_row.next_review,
         last_reviewed_at = v_row.last_reviewed_at
   where user_id = v_uid and vocab_item_id = p_vocab_item_id
  returning * into v_row;
  return v_row;
end;
$$;

-- ----------------------------------------------------------- get_due_vocab
-- Words the student has already studied whose review date has arrived.
create or replace function public.get_due_vocab(p_limit integer default 20)
returns table (
  id uuid, module_id uuid, english text, spanish text, example_sentence text, next_review timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  select v.id, v.module_id, v.english, v.spanish, v.example_sentence, w.next_review
    from public.word_progress w
    join public.vocab_items v on v.id = w.vocab_item_id
   where w.user_id = auth.uid() and w.next_review <= now()
   order by w.next_review, v.id
   limit greatest(least(coalesce(p_limit, 20), 100), 1)
$$;

-- --------------------------------------------------------- complete_lesson
create or replace function public.complete_lesson(p_lesson_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_enrollment uuid;
  v_module uuid;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;

  select e.id, l.module_id into v_enrollment, v_module
    from public.lessons l
    join public.modules m on m.id = l.module_id
    join public.enrollments e on e.cycle_id = m.cycle_id and e.user_id = v_uid and e.status = 'active'
   where l.id = p_lesson_id;
  if v_enrollment is null then raise exception 'lesson_not_in_cycle' using errcode = 'P0002'; end if;
  if not public.module_is_available(v_enrollment, v_module) then
    raise exception 'module_locked' using errcode = '42501';
  end if;

  insert into public.lesson_progress (user_id, lesson_id) values (v_uid, p_lesson_id)
  on conflict (user_id, lesson_id) do nothing;
end;
$$;

revoke all on function public.record_vocab_review(uuid, boolean), public.get_due_vocab(integer),
  public.complete_lesson(uuid) from public, anon;
grant execute on function public.record_vocab_review(uuid, boolean), public.get_due_vocab(integer),
  public.complete_lesson(uuid) to authenticated;
