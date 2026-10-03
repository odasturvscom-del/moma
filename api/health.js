const { provider, MODEL, cors } = require('./_moma');
module.exports = (req, res) => { cors(res); res.status(200).json({ ok: !!provider, provider: provider ? `${provider} / ${MODEL}` : 'none' }); };
