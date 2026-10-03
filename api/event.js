// Anonymous usage counters. No device id, no names, no message text: only daily totals per event.
const { cors } = require('./_moma');
const { ready, pipe, day, body } = require('./_store');
const { FLAG_IDS } = require('./_safety');
const EVENTS = ['open', 'onboard', 'checkin', 'ask', 'flag', 'install', 'feedback'];
const MODES = ['pregnant', 'postpartum'], COUNTRIES = ['UK', 'Canada', 'US', 'Nigeria', 'Other'];
module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).end();
  if (!ready) return res.status(204).end();
  try {
    const { e, p = {} } = body(req);
    if (!EVENTS.includes(e)) return res.status(400).json({ error: 'unknown event' });
    const key = `moma:ev:${day()}`, f = [e];
    if (MODES.includes(p.mode)) f.push(`${e}:mode:${p.mode}`);
    if (COUNTRIES.includes(p.country)) f.push(`${e}:country:${p.country}`);
    if ([1, 2, 3].includes(p.tri)) f.push(`${e}:tri:${p.tri}`);
    if (e === 'flag' && Array.isArray(p.ids)) p.ids.filter(i => FLAG_IDS.includes(i)).slice(0, 5).forEach(i => f.push(`flag:id:${i}`));
    await pipe([...f.map(x => ['HINCRBY', key, x, 1]), ['EXPIRE', key, 60 * 60 * 24 * 400]]);
    res.status(204).end();
  } catch { res.status(204).end(); }
};
