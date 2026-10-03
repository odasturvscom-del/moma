// Tiny Redis client over the Upstash REST API (Vercel Marketplace > Upstash Redis sets these variables).
const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOK = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const ready = !!(URL_ && TOK);
async function pipe(cmds) {
  if (!ready) throw Object.assign(new Error('Storage is not connected'), { code: 503 });
  const r = await fetch(`${URL_.replace(/\/$/, '')}/pipeline`, { method: 'POST', headers: { authorization: `Bearer ${TOK}`, 'content-type': 'application/json' }, body: JSON.stringify(cmds) });
  if (!r.ok) throw new Error(`Storage error ${r.status}`);
  const j = await r.json();
  return j.map(x => (x.error ? null : x.result));
}
const one = async (...cmd) => (await pipe([cmd]))[0];
const DEFAULT_CONFIG = { announcement: '', announcementOn: false, askEnabled: true, guidance: '', updatedAt: null };
async function getConfig() {
  if (!ready) return { ...DEFAULT_CONFIG };
  try { const raw = await one('GET', 'moma:config'); return { ...DEFAULT_CONFIG, ...(raw ? JSON.parse(raw) : {}) }; }
  catch { return { ...DEFAULT_CONFIG }; }
}
const day = (d = new Date()) => d.toISOString().slice(0, 10);
const body = req => (typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {});
module.exports = { ready, pipe, one, getConfig, DEFAULT_CONFIG, day, body };
