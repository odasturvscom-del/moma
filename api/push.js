// Web push notifications. The push itself carries no content (so no encryption is needed);
// the phone's service worker wakes up and fetches its unread messages from /api/push?a=inbox.
const { cors } = require('./_moma');
const { ready, q, body } = require('./_db');
const { appUser } = require('./_appuser');

const PUB = process.env.VAPID_PUBLIC_KEY || '', PRIV = process.env.VAPID_PRIVATE_KEY || '';
const SUBJECT = process.env.VAPID_SUBJECT || 'mailto:hello@moma-app.co.uk';
const b64u = buf => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64u = s => Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64');
let KEY = null;
async function signingKey() {
  if (KEY) return KEY;
  const raw = fromB64u(PUB); // 65 bytes: 0x04 | x | y
  const jwk = { kty: 'EC', crv: 'P-256', d: PRIV, x: b64u(raw.subarray(1, 33)), y: b64u(raw.subarray(33, 65)), ext: true };
  KEY = await globalThis.crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  return KEY;
}
async function vapidJwt(aud) {
  const enc = o => b64u(Buffer.from(JSON.stringify(o)));
  const data = enc({ typ: 'JWT', alg: 'ES256' }) + '.' + enc({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: SUBJECT });
  const sig = await globalThis.crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, await signingKey(), Buffer.from(data));
  return data + '.' + b64u(new Uint8Array(sig));
}
async function poke(endpoint) {
  const aud = new URL(endpoint).origin;
  const r = await fetch(endpoint, { method: 'POST', headers: { Authorization: `vapid t=${await vapidJwt(aud)}, k=${PUB}`, TTL: '86400', Urgency: 'high', 'Content-Length': '0' } });
  return r.status;
}
const enabled = () => !!(ready && PUB && PRIV);

// Queue a message for one user (userId) or everyone (null), then wake their devices.
async function send(userId, { title, body: text, url }, by) {
  if (!enabled()) return { sent: 0, failed: 0, off: true };
  const m = (await q('insert into push_messages (user_id, title, body, url, created_by) values ($1,$2,$3,$4,$5) returning id',
    [userId || null, String(title).slice(0, 80), String(text).slice(0, 240), url ? String(url).slice(0, 300) : null, by || null]))[0];
  const subs = await q(userId ? 'select id, endpoint from push_subs where user_id = $1' : 'select id, endpoint from push_subs', userId ? [userId] : []);
  let sent = 0, failed = 0;
  for (let i = 0; i < subs.length; i += 20) {
    await Promise.all(subs.slice(i, i + 20).map(async s => {
      try {
        const st = await poke(s.endpoint);
        if (st >= 200 && st < 300) { sent++; await q('update push_subs set last_ok = now(), fails = 0 where id = $1', [s.id]); }
        else { failed++; if (st === 404 || st === 410) await q('delete from push_subs where id = $1', [s.id]); else await q('update push_subs set fails = fails + 1 where id = $1', [s.id]); }
      } catch { failed++; }
    }));
  }
  await q('update push_messages set sent = $2, failed = $3 where id = $1', [m.id, sent, failed]);
  return { sent, failed, id: m.id };
}

async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  const a = String((req.query || {}).a || '');
  try {
    if (a === 'key') return res.status(200).json({ key: enabled() ? PUB : null });
    if (!enabled()) return res.status(503).json({ error: 'Notifications are not switched on yet' });
    const b = body(req), endpoint = String(b.endpoint || '');
    if (!/^https:\/\//.test(endpoint) || endpoint.length > 1000) return res.status(400).json({ error: 'Bad subscription' });
    if (a === 'subscribe' && req.method === 'POST') {
      const u = await appUser(req).catch(() => null);
      await q(`insert into push_subs (user_id, endpoint) values ($1,$2) on conflict (endpoint) do update set user_id = coalesce(excluded.user_id, push_subs.user_id), fails = 0`, [u ? u.id : null, endpoint]);
      return res.status(200).json({ ok: true });
    }
    if (a === 'unsubscribe' && req.method === 'POST') { await q('delete from push_subs where endpoint = $1', [endpoint]); return res.status(200).json({ ok: true }); }
    if (a === 'inbox' && req.method === 'POST') {
      const s = (await q('select * from push_subs where endpoint = $1', [endpoint]))[0];
      if (!s) return res.status(200).json({ items: [] });
      const items = await q(`select m.id, m.title, m.body, m.url from push_messages m
        where (m.user_id is null or m.user_id = $2) and m.created_at > greatest($3::timestamptz - interval '1 minute', now() - interval '3 days')
          and not exists (select 1 from push_seen x where x.sub_id = $1 and x.message_id = m.id) order by m.id limit 5`, [s.id, s.user_id, s.created_at]);
      for (const m of items) await q('insert into push_seen (sub_id, message_id) values ($1,$2) on conflict do nothing', [s.id, m.id]);
      return res.status(200).json({ items });
    }
    return res.status(404).json({ error: 'Not found' });
  } catch (e) { return res.status(500).json({ error: 'Something went wrong' }); }
}
module.exports = handler;
module.exports.send = send;
module.exports.enabled = enabled;
