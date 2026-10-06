// One function for the small endpoints (config, event, feedback, health), so the
// project stays inside Vercel's function limit. vercel.json rewrites
// /api/config, /api/event, /api/feedback and /api/health here with ?r=<name>.
const routes = {
  config: require('./_r_config'),
  event: require('./_r_event'),
  feedback: require('./_r_feedback'),
  health: require('./_r_health'),
};
module.exports = (req, res) => {
  const r = String((req.query && req.query.r) || '');
  const h = routes[r];
  if (!h) return res.status(404).json({ error: 'not found' });
  return h(req, res);
};
