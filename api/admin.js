// Admin API for the Moma portal at /admin. Protected by ADMIN_PASSWORD (set in Vercel > Settings > Environment Variables).
const crypto = require('crypto');
const { provider, MODEL, chat } = require('./_moma');
const { ready, pipe, one, getConfig, DEFAULT_CONFIG, body } = require('./_store');
const { triage, FLAG_TITLES } = require('./_safety');

const PW = process.env.ADMIN_PASSWORD || '';
const SECRET = process.env.ADMIN_SECRET || (PW ? crypto.createHash('sha256').update('moma-admin:' + PW).digest('hex') : '');
const sign = v => crypto.createHmac('sha256', SECRET).update(v).digest('hex');
const token = () => { const exp = String(Date.now() + 12 * 3600e3); return `${exp}.${sign(exp)}`; };
const valid = t => {
  if (!SECRET || !t) return false;
  const [exp, sig] = String(t).split('.');
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  const a = Buffer.from(sig), b = Buffer.from(sign(exp));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};
const cookie = req => (String(req.headers.cookie || '').match(/(?:^|;\s*)moma_admin=([^;]+)/) || [])[1];
const setCookie = (res, v, maxAge) => res.setHeader('set-cookie', `moma_admin=${v}; Path=/api/admin; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`);
const pwOk = p => { const a = crypto.createHash('sha256').update(String(p || '')).digest(), b = crypto.createHash('sha256').update(PW).digest(); return !!PW && crypto.timingSafeEqual(a, b); };

const hgetall = arr => { const o = {}; for (let i = 0; arr && i < arr.length; i += 2) o[arr[i]] = Number(arr[i + 1]); return o; };

async function stats(days) {
  const list = Array.from({ length: days }, (_, i) => new Date(Date.now() - (days - 1 - i) * 864e5).toISOString().slice(0, 10));
  const rows = ready ? await pipe(list.map(d => ['HGETALL', `moma:ev:${d}`])) : list.map(() => []);
  const series = list.map((d, i) => ({ d, c: hgetall(rows[i]) }));
  const totals = {};
  series.forEach(s => Object.entries(s.c).forEach(([k, v]) => (totals[k] = (totals[k] || 0) + v)));
  return { days: series, totals, flagTitles: FLAG_TITLES };
}

module.exports = async (req, res) => {
  res.setHeader('cache-control', 'no-store');
  const a = (req.query && req.query.a) || '';
  try {
    if (a === 'login' && req.method === 'POST') {
      if (!PW) return res.status(503).json({ error: 'ADMIN_PASSWORD is not set in Vercel yet' });
      await new Promise(r => setTimeout(r, 400));
      if (!pwOk(body(req).password)) return res.status(401).json({ error: 'Wrong password' });
      setCookie(res, token(), 12 * 3600);
      return res.status(200).json({ ok: true });
    }
    if (a === 'logout') { setCookie(res, '', 0); return res.status(200).json({ ok: true }); }
    if (!valid(cookie(req))) return res.status(401).json({ error: 'Please sign in', passwordSet: !!PW });

    if (a === 'me') return res.status(200).json({ ok: true, storage: ready, ai: provider ? `${provider} / ${MODEL}` : null });
    if (a === 'stats') return res.status(200).json(await stats(Math.min(90, Math.max(7, Number(req.query.days) || 30))));
    if (a === 'config' && req.method === 'GET') return res.status(200).json(await getConfig());
    if (a === 'config' && req.method === 'PUT') {
      if (!ready) return res.status(503).json({ error: 'Connect storage first to save settings' });
      const b = body(req), cur = await getConfig();
      const next = {
        ...DEFAULT_CONFIG, ...cur,
        announcement: String(b.announcement ?? cur.announcement).slice(0, 280),
        announcementOn: !!(b.announcementOn ?? cur.announcementOn),
        askEnabled: b.askEnabled === undefined ? cur.askEnabled : !!b.askEnabled,
        guidance: String(b.guidance ?? cur.guidance).slice(0, 2000),
        updatedAt: new Date().toISOString(),
      };
      await one('SET', 'moma:config', JSON.stringify(next));
      return res.status(200).json(next);
    }
    if (a === 'feedback' && req.method === 'GET') {
      if (!ready) return res.status(200).json({ items: [] });
      const raw = (await one('LRANGE', 'moma:feedback', 0, 199)) || [];
      return res.status(200).json({ items: raw.map(x => { try { return JSON.parse(x); } catch { return null; } }).filter(Boolean) });
    }
    if (a === 'feedback' && req.method === 'DELETE') { if (ready) await one('DEL', 'moma:feedback'); return res.status(200).json({ ok: true }); }
    if (a === 'triage' && req.method === 'POST') {
      const { cases = [] } = body(req);
      return res.status(200).json({ results: cases.slice(0, 200).map(c => ({ ...triage(c.text, c.mode || 'pregnant') })) });
    }
    if (a === 'test' && req.method === 'POST') {
      const b = body(req), cfg = await getConfig(), t0 = Date.now();
      const mode = b.mode === 'postpartum' ? 'postpartum' : 'pregnant', country = b.country || 'UK';
      const context = `Name: Test user. Country: ${country}. ${mode === 'pregnant' ? `Pregnant: ${Number(b.week) || 20} weeks.` : `Postpartum: baby ${Number(b.week) || 2} weeks old.`} (Admin test message, no real user data.)`;
      const tri = triage(b.message, mode);
      if (!provider) return res.status(200).json({ triage: tri, reply: null, error: 'No AI key set on the server yet' });
      const out = await chat({ messages: [{ role: 'user', content: String(b.message || '') }], context, country, mode }, b.useGuidance === false ? '' : cfg.guidance);
      return res.status(200).json({ triage: tri, reply: out.reply, flagged: out.flagged, ms: Date.now() - t0 });
    }
    return res.status(404).json({ error: 'Unknown action' });
  } catch (e) { return res.status(e.code || 500).json({ error: e.message }); }
};
