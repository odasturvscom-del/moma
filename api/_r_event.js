// Usage counts. Daily totals per event; when the user allows usage sharing, also marks activation milestones on their random id.
const { cors } = require('./_moma');
const { ready, q, bump, body } = require('./_db');
const { appUser } = require('./_appuser');
const { FLAG_IDS } = require('./_safety');
const EVENTS = ['open', 'onboard', 'checkin', 'ask', 'flag', 'install', 'feedback', 'support'];
const MODES = ['pregnant', 'postpartum'], COUNTRIES = ['Nigeria', 'UK', 'Canada', 'US', 'Other'];
const MILESTONE = { onboard: 'onboarded_at', checkin: 'first_checkin_at', ask: 'first_ask_at' };
module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST' || !ready) return res.status(204).end();
  try {
    const { e, p = {} } = body(req);
    if (!EVENTS.includes(e)) return res.status(400).json({ error: 'unknown event' });
    const f = [e];
    if (MODES.includes(p.mode)) f.push(`${e}:mode:${p.mode}`);
    if (COUNTRIES.includes(p.country)) f.push(`${e}:country:${p.country}`);
    if ([1, 2, 3].includes(p.tri)) f.push(`${e}:tri:${p.tri}`);
    if (e === 'flag' && Array.isArray(p.ids)) p.ids.filter(i => FLAG_IDS.includes(i)).slice(0, 5).forEach(i => f.push(`flag:id:${i}`));
    await bump(f);
    const u = await appUser(req);
    if (u && u.stats && MILESTONE[e]) await q(`update app_users set ${MILESTONE[e]} = coalesce(${MILESTONE[e]}, now()) where id = $1`, [u.id]);
    res.status(204).end();
  } catch { res.status(204).end(); }
};
