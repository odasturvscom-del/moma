// Feedback the user chooses to send from the Me screen.
const { cors } = require('./_moma');
const { ready, q, bump, body } = require('./_db');
const { appUser } = require('./_appuser');
module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).end();
  if (!ready) return res.status(503).json({ error: 'Feedback is not switched on yet' });
  try {
    const b = body(req), text = String(b.text || '').trim().slice(0, 1500);
    if (text.length < 2) return res.status(400).json({ error: 'Please write a little more' });
    const u = await appUser(req).catch(() => null);
    await q('insert into feedback (user_id, text, mode, stage, country, version) values ($1,$2,$3,$4,$5,$6)',
      [u ? u.id : null, text, ['pregnant', 'postpartum'].includes(b.mode) ? b.mode : null, String(b.stage || '').slice(0, 30), String(b.country || '').slice(0, 12), String(b.version || '').slice(0, 10)]);
    await bump(['feedback']);
    res.status(200).json({ ok: true });
  } catch { res.status(500).json({ error: 'Could not save feedback' }); }
};
