const { cors, chat } = require('./_moma');
const { getConfig, body } = require('./_db');
module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });
  try {
    const cfg = await getConfig();
    if (cfg.askEnabled === false) return res.status(503).json({ error: 'Ask Moma is paused for maintenance. Please try again later.' });
    res.status(200).json(await chat(body(req), cfg.guidance));
  } catch (e) { res.status(e.code || 500).json({ error: e.message }); }
};
