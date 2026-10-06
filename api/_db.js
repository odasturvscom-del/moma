// Postgres access for the API (Cloudflare Pages Functions, or Node locally). Works with Neon (Vercel Storage), Supabase or any Postgres via DATABASE_URL.
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
create table if not exists products (id text primary key, name text not null, blurb text not null default '', price int not null, cat text not null default 'Other',
  stage text not null default 'any', img text, emoji text, stock int, active boolean not null default true, sort int not null default 0, updated_at timestamptz not null default now());
create table if not exists orders (id serial primary key, ref text unique not null, user_id uuid, name text not null, phone text not null, email text, address text not null,
  state text, items jsonb not null, subtotal int not null, delivery int not null, total int not null, payment text not null, status text not null,
  paystack_ref text, note text, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists community_groups (id serial primary key, slug text unique not null, name text not null, blurb text not null default '', emoji text not null default '💜',
  official boolean not null default false, created_by uuid, members int not null default 0, posts int not null default 0, hidden boolean not null default false,
  created_at timestamptz not null default now(), last_at timestamptz not null default now());
create table if not exists community_members (group_id int not null references community_groups(id) on delete cascade, user_id uuid not null references app_users(id) on delete cascade,
  joined_at timestamptz not null default now(), primary key (group_id, user_id));
create table if not exists community_posts (id serial primary key, group_id int not null references community_groups(id) on delete cascade, parent_id int references community_posts(id) on delete cascade,
  user_id uuid references app_users(id) on delete set null, nick text not null, title text, body text not null, status text not null default 'live', flag text, hold_reason text,
  replies int not null default 0, hugs int not null default 0, reports int not null default 0, pinned boolean not null default false,
  created_at timestamptz not null default now(), last_at timestamptz not null default now());
create table if not exists community_reacts (post_id int not null references community_posts(id) on delete cascade, user_id uuid not null references app_users(id) on delete cascade,
  primary key (post_id, user_id));
create table if not exists community_reports (id serial primary key, post_id int not null references community_posts(id) on delete cascade, user_id uuid, reason text not null,
  resolved boolean not null default false, created_at timestamptz not null default now());
create table if not exists care_providers (id serial primary key, slug text unique not null, name text not null, title text not null default '', bio text not null default '',
  mdcn text, verified boolean not null default false, languages text not null default 'English', photo text, fees jsonb not null default '{}', clinic_address text,
  hours jsonb not null default '{}', slot_min int not null default 30, lead_hours int not null default 3, off jsonb not null default '[]', active boolean not null default true,
  sort int not null default 0, created_at timestamptz not null default now());
create table if not exists bookings (id serial primary key, ref text unique not null, user_id uuid references app_users(id) on delete set null, provider_id int not null references care_providers(id),
  kind text not null, starts_at timestamptz not null, mins int not null, fee int not null, name text not null, phone text not null, email text, reason text not null, note text,
  status text not null, payment text not null, paystack_ref text, hold_until timestamptz, link text, staff_note text, refund_due boolean not null default false,
  cancelled_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table care_providers add column if not exists role text not null default 'Physician';
alter table care_providers add column if not exists licence_body text not null default 'NMC';
create unique index if not exists bookings_slot_uq on bookings (provider_id, starts_at) where status in ('awaiting_payment','requested','confirmed');
create index if not exists bookings_user_idx on bookings (user_id, starts_at desc);
create index if not exists bookings_start_idx on bookings (starts_at);
alter table app_users add column if not exists nick text;
alter table app_users add column if not exists community_ok_at timestamptz;
alter table community_posts add column if not exists sample boolean not null default false;
alter table app_users add column if not exists banned boolean not null default false;
create index if not exists cposts_group_idx on community_posts (group_id, parent_id, last_at desc);
create index if not exists cposts_parent_idx on community_posts (parent_id, id);
create index if not exists cposts_status_idx on community_posts (status);
create index if not exists orders_created_idx on orders (created_at desc);
create index if not exists conv_status_idx on conversations (status, updated_at desc);
create index if not exists conv_user_idx on conversations (user_id);
create index if not exists msg_conv_idx on messages (conversation_id, id);
create index if not exists active_day_idx on active_days (day);
create table if not exists app_accounts (id serial primary key, email text unique, google_sub text unique, primary_user uuid references app_users(id) on delete set null,
  via text, created_at timestamptz not null default now(), last_login timestamptz);
create table if not exists auth_codes (id serial primary key, email text not null, hash text not null, ip text, attempts int not null default 0,
  expires_at timestamptz not null, used boolean not null default false, created_at timestamptz not null default now());
create index if not exists auth_codes_email_idx on auth_codes (email, created_at desc);
alter table app_users add column if not exists account_id int references app_accounts(id) on delete set null;
create index if not exists users_seen_idx on app_users (last_seen desc);
create table if not exists push_subs (id serial primary key, user_id uuid references app_users(id) on delete cascade, endpoint text unique not null,
  created_at timestamptz not null default now(), last_ok timestamptz, fails int not null default 0);
create table if not exists push_messages (id serial primary key, user_id uuid references app_users(id) on delete cascade, title text not null, body text not null,
  url text, created_by text, sent int not null default 0, failed int not null default 0, created_at timestamptz not null default now());
create table if not exists push_seen (sub_id int not null references push_subs(id) on delete cascade, message_id int not null references push_messages(id) on delete cascade,
  primary key (sub_id, message_id));
`;
// On Cloudflare a connection can't be shared between requests: two requests using one
// pool crashes the worker (error 1101) and every API call in flight fails. So each
// request gets its own pool through AsyncLocalStorage, and the adapter closes it after.
const { AsyncLocalStorage } = require('node:async_hooks');
const ON_CF = typeof navigator !== 'undefined' && navigator.userAgent === 'Cloudflare-Workers';
const als = new AsyncLocalStorage();
const mkPool = max => { const p = new Pool({ connectionString: URL_, max, idleTimeoutMillis: 10000, connectionTimeoutMillis: 15000, ssl: /localhost|127\.0\.0\.1/.test(URL_) ? false : { rejectUnauthorized: false } }); p.on('error', () => {}); return p; };
function db() {
  if (ON_CF) {
    const st = als.getStore();
    if (st) { if (!st.pool) st.pool = mkPool(1); return st.pool; }
    return mkPool(1); // outside a request scope (should not happen): never reuse
  }
  if (!pool) pool = mkPool(3);
  return pool;
}
const runRequest = fn => als.run({}, fn);
const requestStore = () => als.getStore();
async function endRequest(st) { if (st && st.pool) { const p = st.pool; st.pool = null; await p.end().catch(() => {}); } }
let schemaOK = false;
async function migrate() {
  if (schemaOK) return;
  if (ON_CF) { // per request until it has succeeded once in this worker
    const st = als.getStore() || {};
    if (!st.migrated) st.migrated = db().query(SCHEMA).then(() => { schemaOK = true; });
    return st.migrated;
  }
  if (!migrated) migrated = db().query(SCHEMA).then(() => { schemaOK = true; }).catch(e => { migrated = null; throw e; });
  return migrated;
}
async function q(text, params = []) {
  if (!ready) throw Object.assign(new Error('Database is not connected yet'), { code: 503 });
  await migrate();
  return (await db().query(text, params)).rows;
}
const DEFAULT_CONFIG = { announcement: '', announcementOn: false, askEnabled: true, guidance: '', supportOn: true, supportHours: 'We usually reply within a few hours, 8am to 8pm UK time.', deliveryFee: 4, freeOver: 50, shopOn: true, updatedAt: null, updatedBy: null };
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
module.exports = { ready, q, getConfig, DEFAULT_CONFIG, bump, body, endRequest, runRequest, requestStore };
