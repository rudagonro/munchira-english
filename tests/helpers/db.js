// In-process Postgres (PGlite) with the minimum Supabase surface the migrations
// need: roles, auth.users / auth.uid() and storage.buckets. Lets CI execute the
// real SQL, including RLS, without a Supabase project.
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { PGlite } from '@electric-sql/pglite'

const migrationsDir = fileURLToPath(new URL('../../supabase/migrations/', import.meta.url))

const SUPABASE_STUBS = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  grant usage on schema public to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;

  create schema auth;
  create table auth.users (
    id uuid primary key default gen_random_uuid(),
    email text,
    raw_user_meta_data jsonb not null default '{}'::jsonb
  );
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create function auth.role() returns text language sql stable as
    $$ select case when nullif(current_setting('request.jwt.claim.sub', true), '') is null then 'anon' else 'authenticated' end $$;
  grant usage on schema auth to anon, authenticated, service_role;
  grant execute on function auth.uid(), auth.role() to anon, authenticated, service_role;

  create schema storage;
  create table storage.buckets (id text primary key, name text not null, public boolean not null default false);
`

export function migrationFiles() {
  return readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort()
}

export async function createDb({ migrate = true, legacy = false } = {}) {
  const db = new PGlite()
  await db.exec(SUPABASE_STUBS)
  if (legacy) await db.exec(readFileSync(new URL('./fixtures/legacy-schema.sql'.replace('./fixtures', '../fixtures'), import.meta.url), 'utf8'))
  if (migrate) {
    for (const file of migrationFiles()) {
      await db.exec(readFileSync(migrationsDir + file, 'utf8'))
    }
  }
  return db
}

/** Creates an auth user (the trigger creates the profile) and returns its id. */
export async function addUser(db, { email, metadata = {}, role } = {}) {
  const { rows } = await db.query(
    'insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id',
    [email, JSON.stringify(metadata)],
  )
  const id = rows[0].id
  if (role) await db.query('update public.profiles set role = $1 where id = $2', [role, id])
  return id
}

/** Runs fn while acting as the given user through the `authenticated` role. */
export async function asUser(db, userId, fn) {
  await db.query('set role authenticated')
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [userId])
  try {
    return await fn(db)
  } finally {
    await db.query('reset role')
    await db.query("select set_config('request.jwt.claim.sub', '', false)")
  }
}

export async function asAnon(db, fn) {
  await db.query('set role anon')
  try {
    return await fn(db)
  } finally {
    await db.query('reset role')
  }
}

export async function asServiceRole(db, fn) {
  await db.query('set role service_role')
  try {
    return await fn(db)
  } finally {
    await db.query('reset role')
  }
}

/** One cycle with `modules` modules (3 quiz questions each, answer index 1). */
export async function seedCycle(db, { level = 'A1', modules = 2, checkpointAfter = [], minScore = 70 } = {}) {
  const cycle = (await db.query(
    'insert into public.cycles (cefr_level, title, duration_weeks_min, duration_weeks_max) values ($1, $2, 8, 10) returning id', [level, `Ciclo ${level}`],
  )).rows[0].id
  const moduleIds = []
  for (let i = 1; i <= modules; i++) {
    const m = (await db.query(
      "insert into public.modules (cycle_id, order_index, title, skill_type) values ($1, $2, $3, 'grammar') returning id",
      [cycle, i, `Módulo ${i}`],
    )).rows[0].id
    moduleIds.push(m)
    await db.query(
      "insert into public.lessons (module_id, order_index, title, theory_content, practice_content) values ($1, 1, 'L1', 'Teoría', $2)",
      [m, `Listen: 'Good morning ${level}${i}'`],
    )
    for (let q = 1; q <= 3; q++) {
      await db.query(
        'insert into public.quiz_questions (module_id, question, options, correct_idx) values ($1, $2, $3, 1)',
        [m, `Q${q}`, JSON.stringify(['a', 'b', 'c'])],
      )
    }
  }
  const checkpointIds = []
  for (const after of checkpointAfter) {
    checkpointIds.push((await db.query(
      'insert into public.checkpoints (cycle_id, after_module_order, title, min_score_to_pass) values ($1, $2, $3, $4) returning id',
      [cycle, after, `Checkpoint ${after}`, minScore],
    )).rows[0].id)
  }
  return { cycle, moduleIds, checkpointIds }
}
