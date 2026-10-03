// Moma admin API (/admin). Staff accounts with roles; every action is permission-checked and sensitive ones are audited.
const crypto = require('crypto');
const { provider, MODEL, chat } = require('./_moma');
const { ready, q, getConfig, DEFAULT_CONFIG, body } = require('./_db');
const { triage, FLAG_TITLES } = require('./_safety');

const ROLES = { owner: 'Owner', admin: 'Admin', clinician: 'Clinical lead', support: 'Support agent', analyst: 'Analyst' };
const PERMS = {
  stats: ['owner', 'admin', 'clinician', 'support', 'analyst'],
  reports: ['owner', 'admin', 'analyst'],
  users: ['owner', 'admin', 'clinician', 'support'],
  users_delete: ['owner', 'admin'],
  support: ['owner', 'admin', 'clinician', 'support'],
  safety: ['owner', 'admin', 'clinician'],
  guidance: ['owner', 'admin', 'clinician'],
  settings: ['owner', 'admin'],
  feedback: ['owner', 'admin', 'analyst', 'support'],
  staff: ['owner', 'admin'],
  audit: ['owner', 'admin'],
};
const can = (role, p) => (PERMS[p] || []).includes(role);

// ---- auth
const BOOT_PW = process.env.ADMIN_PASSWORD || '';
const SECRET = process.env.ADMIN_SECRET || (BOOT_PW ? crypto.createHash('sha256').update('moma-admin:' + BOOT_PW + ':' + (process.env.DATABASE_URL || process.env.POSTGRES_URL || '')).digest('hex') : '');
const sign = v => crypto.createHmac('sha256', SECRET).update(v).digest('hex');
const makeToken = id => { const v = `${id}.${Date.now() + 12 * 3600e3}`; return `${v}.${sign(v)}`; };
const readToken = t => {
  if (!SECRET || !t) return null;
  const [id, exp, sig] = String(t).split('.');
  if (!id || !exp || !sig || Number(exp) < Date.now()) return null;
  const a = Buffer.from(sig), b = Buffer.from(sign(`${id}.${exp}`));
  return a.length === b.length && crypto.timingSafeEqual(a, b) ? Number(id) : null;
};
const getCookie = req => (String(req.headers.cookie || '').match(/(?:^|;\s*)moma_admin=([^;]+)/) || [])[1];
const setCookie = (res, v, age) => res.setHeader('set-cookie', `moma_admin=${v}; Path=/api/admin; HttpOnly; Secure; SameSite=Strict; Max-Age=${age}`);
const hash = pw => { const salt = crypto.randomBytes(16).toString('hex'); return `scrypt$${salt}$${crypto.scryptSync(String(pw), salt, 32).toString('hex')}`; };
const verify = (pw, stored) => {
  const [, salt, h] = String(stored).split('$'); if (!salt || !h) return false;
  const a = crypto.scryptSync(String(pw), salt, 32), b = Buffer.from(h, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};
const eqSafe = (x, y) => { const a = crypto.createHash('sha256').update(String(x)).digest(), b = crypto.createHash('sha256').update(String(y)).digest(); return crypto.timingSafeEqual(a, b); };
const tempPw = () => crypto.randomBytes(9).toString('base64').replace(/[+/=]/g, '').slice(0, 12);
const pwRule = p => String(p || '').length >= 10;
const audit = (me, action, target = '', detail = '') => q('insert into audit_log (staff_id, staff_name, action, target, detail) values ($1,$2,$3,$4,$5)', [me ? me.id : null, me ? me.name : 'system', action, String(target).slice(0, 120), String(detail).slice(0, 500)]).catch(() => {});
const pub = s => ({ id: s.id, email: s.email, name: s.name, role: s.role, roleName: ROLES[s.role], active: s.active, mustReset: s.must_reset, lastLogin: s.last_login, createdAt: s.created_at });

// ---- helpers
const fail = (code, msg) => Object.assign(new Error(msg), { code });
const need = (me, p) => { if (!can(me.role, p)) throw fail(403, "Your access level can't do that"); };
const days = n => Math.min(365, Math.max(7, Number(n) || 30));
const stageOf = u => (u.mode === 'postpartum' ? `Postpartum${u.week != null ? ` · week ${u.week}` : ''}` : `Pregnant${u.week != null ? ` · week ${u.week}` : ''}`);
const userRow = u => ({ id: u.id, short: u.id.slice(0, 8), name: u.name, mode: u.mode, week: u.week, stage: stageOf(u), country: u.country, platform: u.platform, version: u.version, stats: u.stats, createdAt: u.created_at, lastSeen: u.last_seen, onboardedAt: u.onboarded_at, firstCheckinAt: u.first_checkin_at, firstAskAt: u.first_ask_at, convs: u.convs != null ? Number(u.convs) : undefined, openConvs: u.open_convs != null ? Number(u.open_convs) : undefined });

async function overview(n) {
  const since = `now() - interval '${n} days'`;
  const [counts, dau, newU, tot, sup] = await Promise.all([
    q(`select day::text d, key, n from event_counts where day > current_date - $1::int`, [n]),
    q(`select day::text d, count(*)::int n from active_days where day > current_date - $1::int group by day`, [n]),
    q(`select created_at::date::text d, count(*)::int n from app_users where created_at > ${since} group by 1`),
    q(`select (select count(*) from app_users)::int users,
       (select count(distinct user_id) from active_days where day = current_date)::int dau,
       (select count(distinct user_id) from active_days where day > current_date - 7)::int wau,
       (select count(distinct user_id) from active_days where day > current_date - 30)::int mau,
       (select count(*) from app_users where created_at > ${since})::int new_users`),
    q(`select count(*) filter (where status = 'open')::int open, count(*) filter (where status = 'open' and priority = 'urgent')::int urgent,
       count(*) filter (where status = 'open' and assigned_to is null)::int unassigned from conversations`),
  ]);
  const list = Array.from({ length: n }, (_, i) => new Date(Date.now() - (n - 1 - i) * 864e5).toISOString().slice(0, 10));
  const by = {}; list.forEach(d => (by[d] = { d, c: {}, dau: 0, newUsers: 0 }));
  const totals = {};
  counts.forEach(r => { if (by[r.d]) by[r.d].c[r.key] = r.n; totals[r.key] = (totals[r.key] || 0) + r.n; });
  dau.forEach(r => by[r.d] && (by[r.d].dau = r.n));
  newU.forEach(r => by[r.d] && (by[r.d].newUsers = r.n));
  return { days: list.map(d => by[d]), totals, headline: tot[0], support: sup[0], flagTitles: FLAG_TITLES };
}

async function reports(n) {
  const since = `now() - interval '${n} days'`;
  const [funnel, cohorts, mix, support, agents, flags] = await Promise.all([
    q(`select count(*)::int registered, count(onboarded_at)::int onboarded, count(first_checkin_at)::int checked_in, count(first_ask_at)::int asked,
       count(*) filter (where exists (select 1 from active_days a where a.user_id = u.id and a.day >= u.created_at::date + 1 and a.day <= u.created_at::date + 7))::int returned_week1
       from app_users u where created_at > ${since} and stats`),
    q(`with c as (select id, date_trunc('week', created_at)::date wk from app_users where created_at > now() - interval '8 weeks' and stats)
       select c.wk::text wk, count(distinct c.id)::int size,
       ${[1, 2, 3, 4].map(w => `count(distinct a.user_id) filter (where a.day >= c.wk + ${7 * w} and a.day < c.wk + ${7 * (w + 1)})::int w${w}`).join(', ')}
       from c left join active_days a on a.user_id = c.id group by c.wk order by c.wk`),
    q(`select mode, country, count(*)::int n from app_users where created_at > ${since} group by mode, country`),
    q(`select count(*)::int opened, count(*) filter (where status = 'resolved')::int resolved, count(*) filter (where flagged is not null)::int flagged,
       percentile_cont(0.5) within group (order by extract(epoch from first_response_at - created_at) / 60) filter (where first_response_at is not null) as median_frt,
       percentile_cont(0.5) within group (order by extract(epoch from resolved_at - created_at) / 3600) filter (where resolved_at is not null) as median_resolve_h
       from conversations where created_at > ${since}`),
    q(`select s.id, s.name, s.role, count(distinct m.conversation_id)::int chats, count(m.id)::int replies,
       (select count(*) from conversations c where c.assigned_to = s.id and c.status = 'resolved' and c.resolved_at > ${since})::int resolved
       from staff s left join messages m on m.staff_id = s.id and m.internal = false and m.created_at > ${since}
       where s.active group by s.id order by replies desc`),
    q(`select key, sum(n)::int n from event_counts where key like 'flag:id:%' and day > current_date - $1::int group by key`, [n]),
  ]);
  return { funnel: funnel[0], cohorts, mix, support: support[0], agents, flags: flags.map(f => ({ id: f.key.slice(8), title: FLAG_TITLES[f.key.slice(8)] || f.key, n: f.n })) };
}

async function convoList(me, filter, search) {
  const where = [], args = [];
  if (filter === 'mine') { args.push(me.id); where.push(`c.assigned_to = $${args.length} and c.status <> 'resolved'`); }
  else if (filter === 'unassigned') where.push(`c.assigned_to is null and c.status <> 'resolved'`);
  else if (filter === 'urgent') where.push(`c.priority = 'urgent' and c.status <> 'resolved'`);
  else if (filter === 'waiting') where.push(`c.status = 'waiting'`);
  else if (filter === 'resolved') where.push(`c.status = 'resolved'`);
  else where.push(`c.status = 'open'`);
  if (search) { args.push(`%${search}%`); where.push(`(u.name ilike $${args.length} or c.last_preview ilike $${args.length} or u.id::text ilike $${args.length})`); }
  const rows = await q(`select c.*, u.name uname, u.mode, u.week, u.country, s.name aname from conversations c join app_users u on u.id = c.user_id
    left join staff s on s.id = c.assigned_to where ${where.join(' and ')} order by (c.priority = 'urgent') desc, c.updated_at desc limit 200`, args);
  const counts = (await q(`select count(*) filter (where status = 'open')::int open, count(*) filter (where status <> 'resolved' and assigned_to = $1)::int mine,
    count(*) filter (where status <> 'resolved' and assigned_to is null)::int unassigned, count(*) filter (where status <> 'resolved' and priority = 'urgent')::int urgent,
    count(*) filter (where status = 'waiting')::int waiting from conversations`, [me.id]))[0];
  return { counts, items: rows.map(c => ({ id: c.id, status: c.status, priority: c.priority, flagged: c.flagged, preview: c.last_preview, updatedAt: c.updated_at, unread: c.staff_unread, assigned: c.aname, assignedTo: c.assigned_to, user: { name: c.uname, stage: stageOf(c), country: c.country } })) };
}

module.exports = async (req, res) => {
  res.setHeader('cache-control', 'no-store');
  const a = (req.query && req.query.a) || '';
  const Q = req.query || {};
  try {
    if (!ready) {
      if (a === 'status') return res.status(200).json({ db: false, ai: !!provider, passwordSet: !!BOOT_PW });
      return res.status(503).json({ error: 'The database is not connected yet. In Vercel, add Neon Postgres under Storage, then redeploy.', setup: true });
    }
    if (a === 'status') return res.status(200).json({ db: true, ai: !!provider, passwordSet: !!BOOT_PW, hasStaff: Number((await q('select count(*)::int n from staff'))[0].n) > 0 });

    if (a === 'login' && req.method === 'POST') {
      const b = body(req), email = String(b.email || '').trim().toLowerCase();
      await new Promise(r => setTimeout(r, 350));
      let s = (await q('select * from staff where email = $1', [email]))[0];
      const none = Number((await q('select count(*)::int n from staff'))[0].n) === 0;
      if (!s && none) {
        if (!BOOT_PW) return res.status(503).json({ error: 'Set ADMIN_PASSWORD in Vercel to create the first owner account' });
        if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'Enter your email address' });
        if (!eqSafe(b.password, BOOT_PW)) return res.status(401).json({ error: 'Wrong email or password' });
        s = (await q(`insert into staff (email, name, role, pw) values ($1, $2, 'owner', $3) returning *`, [email, String(b.name || email.split('@')[0]).slice(0, 60), hash(b.password)]))[0];
        await audit(s, 'created first owner account', s.email);
      } else if (!s || !s.active || !verify(b.password, s.pw)) {
        return res.status(401).json({ error: s && !s.active ? 'This account has been switched off' : 'Wrong email or password' });
      }
      await q('update staff set last_login = now() where id = $1', [s.id]);
      await audit(s, 'signed in');
      setCookie(res, makeToken(s.id), 12 * 3600);
      return res.status(200).json({ ok: true });
    }
    if (a === 'logout') { setCookie(res, '', 0); return res.status(200).json({ ok: true }); }

    const sid = readToken(getCookie(req));
    const me = sid ? (await q('select * from staff where id = $1 and active', [sid]))[0] : null;
    if (!me) return res.status(401).json({ error: 'Please sign in' });
    const B = req.method === 'GET' ? {} : body(req);

    if (a === 'me') {
      const perms = Object.keys(PERMS).filter(p => can(me.role, p));
      return res.status(200).json({ me: pub(me), perms, roles: ROLES, matrix: PERMS, ai: provider ? `${provider} / ${MODEL}` : null, db: true });
    }
    if (a === 'password' && req.method === 'POST') {
      if (!me.must_reset && !verify(B.current, me.pw)) throw fail(401, 'Your current password is wrong');
      if (!pwRule(B.next)) throw fail(400, 'Use at least 10 characters');
      await q('update staff set pw = $2, must_reset = false where id = $1', [me.id, hash(B.next)]);
      await audit(me, 'changed own password');
      return res.status(200).json({ ok: true });
    }

    // ---- stats & reports
    if (a === 'overview') { need(me, 'stats'); return res.status(200).json(await overview(days(Q.days))); }
    if (a === 'reports') { need(me, 'reports'); return res.status(200).json(await reports(days(Q.days))); }

    // ---- users
    if (a === 'users') {
      need(me, 'users');
      const where = ['true'], args = [];
      if (Q.q) { args.push(`%${Q.q}%`); where.push(`(name ilike $${args.length} or id::text ilike $${args.length})`); }
      if (['pregnant', 'postpartum'].includes(Q.mode)) { args.push(Q.mode); where.push(`mode = $${args.length}`); }
      if (Q.country) { args.push(Q.country); where.push(`country = $${args.length}`); }
      if (Q.active === '7') where.push(`last_seen > now() - interval '7 days'`);
      if (Q.active === 'lapsed') where.push(`last_seen <= now() - interval '14 days'`);
      const page = Math.max(0, Number(Q.page) || 0);
      const total = (await q(`select count(*)::int n from app_users where ${where.join(' and ')}`, args))[0].n;
      const rows = await q(`select u.*, (select count(*) from conversations c where c.user_id = u.id) convs,
        (select count(*) from conversations c where c.user_id = u.id and c.status <> 'resolved') open_convs
        from app_users u where ${where.join(' and ')} order by last_seen desc limit 50 offset ${page * 50}`, args);
      return res.status(200).json({ total, page, items: rows.map(userRow) });
    }
    if (a === 'user') {
      need(me, 'users');
      const u = (await q('select * from app_users where id::text = $1', [String(Q.id || B.id || '')]))[0];
      if (!u) throw fail(404, 'User not found');
      if (req.method === 'DELETE') {
        need(me, 'users_delete');
        await q('delete from app_users where id = $1', [u.id]);
        await audit(me, 'deleted user and their support history', u.id.slice(0, 8));
        return res.status(200).json({ ok: true });
      }
      const [act, convs] = await Promise.all([
        q(`select count(*) filter (where day > current_date - 30)::int d30, count(*)::int total, max(day)::text last from active_days where user_id = $1`, [u.id]),
        q(`select c.id, c.status, c.priority, c.flagged, c.created_at, c.updated_at, c.last_preview, s.name assigned from conversations c left join staff s on s.id = c.assigned_to where user_id = $1 order by updated_at desc`, [u.id]),
      ]);
      await audit(me, 'viewed user', u.id.slice(0, 8));
      return res.status(200).json({ user: userRow(u), activity: act[0], conversations: convs });
    }

    // ---- support inbox
    if (a === 'inbox') { need(me, 'support'); return res.status(200).json(await convoList(me, String(Q.filter || 'open'), String(Q.q || '').slice(0, 60))); }
    if (a === 'convo') {
      need(me, 'support');
      const id = Number(Q.id || B.id);
      const c = (await q('select * from conversations where id = $1', [id]))[0];
      if (!c) throw fail(404, 'Conversation not found');
      if (req.method === 'GET') {
        await q('update conversations set staff_unread = 0 where id = $1', [id]);
        const [u, msgs, staff] = await Promise.all([
          q('select * from app_users where id = $1', [c.user_id]),
          q(`select m.*, s.name staff_name from messages m left join staff s on s.id = m.staff_id where conversation_id = $1 order by m.id`, [id]),
          q(`select id, name, role from staff where active and role = any($1) order by name`, [PERMS.support]),
        ]);
        const past = await q(`select id, status, created_at, last_preview from conversations where user_id = $1 and id <> $2 order by created_at desc limit 10`, [c.user_id, id]);
        return res.status(200).json({ convo: { id: c.id, status: c.status, priority: c.priority, flagged: c.flagged, assignedTo: c.assigned_to, createdAt: c.created_at, firstResponseAt: c.first_response_at },
          user: userRow(u[0]), past, staff: staff.map(s => ({ id: s.id, name: s.name, role: ROLES[s.role] })),
          messages: msgs.map(m => ({ id: m.id, from: m.sender, body: m.body, internal: m.internal, at: m.created_at, staff: m.staff_name })) });
      }
      if (req.method === 'POST') {
        const text = String(B.body || '').trim().slice(0, 3000);
        if (!text) throw fail(400, 'Write a message first');
        const internal = !!B.internal;
        await q(`insert into messages (conversation_id, sender, staff_id, body, internal) values ($1, 'staff', $2, $3, $4)`, [id, me.id, text, internal]);
        if (!internal) await q(`update conversations set status = 'waiting', updated_at = now(), user_unread = user_unread + 1, last_preview = $2,
          first_response_at = coalesce(first_response_at, now()), assigned_to = coalesce(assigned_to, $3) where id = $1`, [id, `You: ${text.slice(0, 130)}`, me.id]);
        else await q('update conversations set updated_at = now() where id = $1', [id]);
        return res.status(200).json({ ok: true });
      }
      if (req.method === 'PATCH') {
        const sets = [], args = [id];
        if (B.status && ['open', 'waiting', 'resolved'].includes(B.status)) { args.push(B.status); sets.push(`status = $${args.length}`, `resolved_at = case when $${args.length} = 'resolved' then now() else null end`); }
        if (B.priority && ['normal', 'urgent'].includes(B.priority)) { args.push(B.priority); sets.push(`priority = $${args.length}`); }
        if ('assignedTo' in B) { args.push(B.assignedTo ? Number(B.assignedTo) : null); sets.push(`assigned_to = $${args.length}`); }
        if (!sets.length) throw fail(400, 'Nothing to change');
        await q(`update conversations set ${sets.join(', ')}, updated_at = now() where id = $1`, args);
        const what = Object.entries(B).filter(([k]) => k !== 'id').map(([k, v]) => `${k}: ${v ?? 'nobody'}`).join(', ');
        await q(`insert into messages (conversation_id, sender, staff_id, body, internal) values ($1, 'system', $2, $3, true)`, [id, me.id, `${me.name} changed ${what}`]);
        await audit(me, 'updated conversation', `#${id}`, what);
        return res.status(200).json({ ok: true });
      }
    }

    // ---- app settings
    if (a === 'config' && req.method === 'GET') { need(me, 'guidance'); return res.status(200).json(await getConfig()); }
    if (a === 'config' && req.method === 'PUT') {
      need(me, 'guidance');
      const cur = await getConfig(), full = can(me.role, 'settings');
      const next = { ...DEFAULT_CONFIG, ...cur, guidance: String(B.guidance ?? cur.guidance).slice(0, 2000) };
      if (full) Object.assign(next, {
        announcement: String(B.announcement ?? cur.announcement).slice(0, 280), announcementOn: !!(B.announcementOn ?? cur.announcementOn),
        askEnabled: B.askEnabled === undefined ? cur.askEnabled : !!B.askEnabled, supportOn: B.supportOn === undefined ? cur.supportOn : !!B.supportOn,
        supportHours: String(B.supportHours ?? cur.supportHours).slice(0, 140),
      });
      delete next.updatedAt; delete next.updatedBy;
      await q(`insert into settings (key, value, updated_at, updated_by) values ('app', $1, now(), $2) on conflict (key) do update set value = $1, updated_at = now(), updated_by = $2`, [JSON.stringify(next), me.name]);
      await audit(me, 'changed app settings', '', full ? 'all settings' : 'AI guidance');
      return res.status(200).json(await getConfig());
    }

    // ---- feedback
    if (a === 'feedback' && req.method === 'GET') { need(me, 'feedback'); return res.status(200).json({ items: await q('select id, text, mode, stage, country, version, created_at from feedback order by id desc limit 300') }); }
    if (a === 'feedback' && req.method === 'DELETE') { need(me, 'settings'); await q('delete from feedback'); await audit(me, 'cleared feedback'); return res.status(200).json({ ok: true }); }

    // ---- safety lab & AI console
    if (a === 'triage' && req.method === 'POST') { need(me, 'safety'); return res.status(200).json({ results: (B.cases || []).slice(0, 200).map(c => triage(c.text, c.mode || 'pregnant')) }); }
    if (a === 'test' && req.method === 'POST') {
      need(me, 'safety');
      const cfg = await getConfig(), t0 = Date.now(), mode = B.mode === 'postpartum' ? 'postpartum' : 'pregnant', country = B.country || 'UK';
      const context = `Name: Test user. Country: ${country}. ${mode === 'pregnant' ? `Pregnant: ${Number(B.week) || 20} weeks.` : `Postpartum: baby ${Number(B.week) || 2} weeks old.`} (Admin test message, no real user data.)`;
      const tri = triage(B.message, mode);
      if (!provider) return res.status(200).json({ triage: tri, reply: null, error: 'No AI key set on the server yet' });
      const out = await chat({ messages: [{ role: 'user', content: String(B.message || '') }], context, country, mode }, B.useGuidance === false ? '' : cfg.guidance);
      return res.status(200).json({ triage: tri, reply: out.reply, ms: Date.now() - t0 });
    }

    // ---- team & access
    if (a === 'staff' && req.method === 'GET') { need(me, 'staff'); return res.status(200).json({ items: (await q('select * from staff order by active desc, role, name')).map(pub) }); }
    if (a === 'staff' && req.method === 'POST') {
      need(me, 'staff');
      const email = String(B.email || '').trim().toLowerCase(), name = String(B.name || '').trim().slice(0, 60), role = String(B.role || '');
      if (!/^\S+@\S+\.\S+$/.test(email) || !name) throw fail(400, 'Add a name and a valid email');
      if (!ROLES[role]) throw fail(400, 'Pick an access level');
      if (me.role !== 'owner' && ['owner', 'admin'].includes(role)) throw fail(403, 'Only an owner can add admins or owners');
      if ((await q('select 1 from staff where email = $1', [email]))[0]) throw fail(409, 'Someone with that email is already on the team');
      const pw = tempPw();
      const s = (await q(`insert into staff (email, name, role, pw, must_reset) values ($1,$2,$3,$4,true) returning *`, [email, name, role, hash(pw)]))[0];
      await audit(me, 'added team member', email, ROLES[role]);
      return res.status(200).json({ member: pub(s), tempPassword: pw });
    }
    if (a === 'staff' && req.method === 'PATCH') {
      need(me, 'staff');
      const s = (await q('select * from staff where id = $1', [Number(B.id)]))[0];
      if (!s) throw fail(404, 'Team member not found');
      const owners = Number((await q(`select count(*)::int n from staff where role = 'owner' and active`))[0].n);
      if (me.role !== 'owner' && ['owner', 'admin'].includes(s.role)) throw fail(403, 'Only an owner can change admins or owners');
      if (B.role && me.role !== 'owner' && ['owner', 'admin'].includes(B.role)) throw fail(403, 'Only an owner can make someone an admin or owner');
      if (B.role && !ROLES[B.role]) throw fail(400, 'Unknown access level');
      const losingOwner = s.role === 'owner' && s.active && ((B.role && B.role !== 'owner') || B.active === false);
      if (losingOwner && owners <= 1) throw fail(400, 'Moma needs at least one active owner');
      if (B.resetPassword) {
        const pw = tempPw();
        await q('update staff set pw = $2, must_reset = true where id = $1', [s.id, hash(pw)]);
        await audit(me, 'reset password for', s.email);
        return res.status(200).json({ tempPassword: pw });
      }
      const n = (await q(`update staff set role = coalesce($2, role), active = coalesce($3, active), name = coalesce($4, name) where id = $1 returning *`,
        [s.id, B.role || null, typeof B.active === 'boolean' ? B.active : null, B.name ? String(B.name).slice(0, 60) : null]))[0];
      if (B.active === false) await q(`update conversations set assigned_to = null where assigned_to = $1 and status <> 'resolved'`, [s.id]);
      await audit(me, 'updated team member', s.email, [B.role && `role → ${ROLES[B.role]}`, typeof B.active === 'boolean' && (B.active ? 'switched on' : 'switched off')].filter(Boolean).join(', '));
      return res.status(200).json({ member: pub(n) });
    }

    // ---- audit log
    if (a === 'audit') { need(me, 'audit'); return res.status(200).json({ items: await q('select * from audit_log order by id desc limit 300') }); }

    return res.status(404).json({ error: 'Unknown action' });
  } catch (e) { return res.status(e.code && e.code < 600 ? e.code : 500).json({ error: e.code ? e.message : 'Something went wrong on the server' }); }
};
