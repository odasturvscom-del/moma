const { getProvider, getModel, cors } = require('./_moma');
module.exports = (req, res) => { cors(res); const p = getProvider(); res.status(200).json({ ok: !!p, provider: p ? `${p} / ${getModel()}` : 'none' }); };
