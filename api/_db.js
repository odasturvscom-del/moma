// Postgres access for the Vercel functions. Works with Neon (Vercel Storage), Supabase or any Postgres via DATABASE_URL.
const { Pool } = require('pg');
const URL_ = process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
const ready = !!URL_;
let pool, migrated;
const SCHEMA = `
create table if not exists staff (id serial primary key, email text unique not null, name text not null, role text not null, pw text not null,
  active boolean not null default true, must_reset boolean not null default false, created_at timestamptz not null default now(), last_login timestamptz);
create table if not exists app_users (id uuid primary key, secret text not null, name text, mode text, week int, country text, platform text, version text,
  stats boolean not null default true, created_at timestamptz not null default now(), last_seen timestamptz not null default now(),
  onboarded_at timestamptz, first_checkin_at timestamptz, first_ask_at timestamptz);
create table if not exists active_days (user_id uuid not null references app_users(id) on delete cascade, day date not null, primary key (user_id, day));
create table if not exists conversations (id serial primary key, user_id uuid not null references app_users(id) on delete cascade,
  status text not null default 'open', priority text not null default 'normal', assigned_to int references staff(id) on delete set null,
  flagged text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), first_response_at timestamptz,
  resolved_at timestamptz, user_unread int not null default 0, staff_unread int not null default 0, last_preview text);
create table if not exists messages (id serial primary key, conversation_id int not null references conversations(id) on delete cascade,
  sender text not null, staff_id int references staff(id) on delete set null, body text not null, internal boolean not null default false,
  created_at timestamptz not null default now());
create table if not exists event_counts (day date not null, key text not null, n int not null default 0, primary key (day, key));
create table if not exists feedback (id serial primary key, user_id uuid references app_users(id) on delete set null, text text not null,
  mode text, stage text, country text, version text, created_at timestamptz not null default now());
create table if not exists settings (key text primary key, value jsonb not null, updated_at timestamptz not null default now(), updated_by text);
create table if not exists audit_log (id serial primary key, staff_id int, staff_name text, action text not null, target text, detail text,
  created_at timestamptz not null default now());
create index if not exists conv_status_idx on conversations (status, updated_at desc);
create index if not exists conv_user_idx on conversations (user_id);
create index if not exists msg_conv_idx on messages (conversation_id, id);
create index if not exists active_day_idx on active_days (day);
create index if not exists users_seen_idx on app_users (last_seen desc);
`;
function db() {
  if (!pool) pool = new Pool({ connectionString: URL_, max: 3, idleTimeoutMillis: 10000, ssl: /localhost|127\.0\.0\.1/.test(URL_) ? false : { rejectUnauthorized: false } });
  return pool;
}
async function migrate() {
  if (!migrated) migrated = db().query(SCHEMA).catch(e => { migrated = null; throw e; });
  return migrated;
}
async function q(text, params = []) {
  if (!ready) throw Object.assign(new Error('Database is not connected yet'), { code: 503 });
  await migrate();
  return (await db().query(text, params)).rows;
}
const DEFAULT_CONFIG = { announcement: '', announcementOn: false, askEnabled: true, guidance: '', supportOn: true, supportHours: 'We usually reply within a few hours, 8am to 8pm UK time.', updatedAt: null, updatedBy: null };
async function getConfig() {
  if (!ready) return { ...DEFAULT_CONFIG };
  try { const r = await q(`select value, updated_at, updated_by from settings where key = 'app'`); return r[0] ? { ...DEFAULT_CONFIG, ...r[0].value, updatedAt: r[0].updated_at, updatedBy: r[0].updated_by } : { ...DEFAULT_CONFIG }; }
  catch { return { ...DEFAULT_CONFIG }; }
}
async function bump(keys, day) {
  if (!keys.length) return;
  const d = day || new Date().toISOString().slice(0, 10);
  const vals = keys.map((_, i) => `($1, $${i + 2}, 1)`).join(',');
  await q(`insert into event_counts (day, key, n) values ${vals} on conflict (day, key) do update set n = event_counts.n + 1`, [d, ...keys]);
}
const body = req => { try { return typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}; } catch { return {}; } };
module.exports = { ready, q, getConfig, DEFAULT_CONFIG, bump, body };
