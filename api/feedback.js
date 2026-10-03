// Feedback the user chooses to send from the Me screen. Text only, no account or device id.
const { cors } = require('./_moma');
const { ready, pipe, day, body } = require('./_store');
module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).end();
  if (!ready) return res.status(503).json({ error: 'Feedback is not switched on yet' });
  try {
    const b = body(req), text = String(b.text || '').trim().slice(0, 1500);
    if (text.length < 2) return res.status(400).json({ error: 'Please write a little more' });
    const item = { t: Date.now(), text, mode: ['pregnant', 'postpartum'].includes(b.mode) ? b.mode : null, country: String(b.country || '').slice(0, 12), stage: String(b.stage || '').slice(0, 30), version: String(b.version || '').slice(0, 10) };
    await pipe([['LPUSH', 'moma:feedback', JSON.stringify(item)], ['LTRIM', 'moma:feedback', 0, 999], ['HINCRBY', `moma:ev:${day()}`, 'feedback', 1]]);
    res.status(200).json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Could not save feedback' }); }
};
