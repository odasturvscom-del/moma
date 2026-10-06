// Moma sign-in (optional for the app, needed for the community and expert bookings).
// Two ways in: Google (ID token checked with Google) or a 6-digit code sent by email.
// Privacy: we keep only the email address (and Google's account number when Google is used). No name, photo, phone or contacts.
// Health notes never leave the phone. Codes are stored hashed, expire in 10 minutes and allow 5 tries.
const crypto = require('crypto');
const { cors } = require('./_moma');
const { ready, q, body } = require('./_db');
const { appUser } = require('./_appuser');

const GOOGLE = process.env.GOOGLE_CLIENT_ID || '';
const RESEND = process.env.RESEND_API_KEY || '';
const FROM = process.env.AUTH_FROM_EMAIL || 'Moma <hello@moma-app.co.uk>';
const PEPPER = process.env.ADMIN_SECRET || process.env.DATABASE_URL || 'moma';
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,}$/i;
const hash = s => crypto.createHmac('sha256', PEPPER).update(s).digest('hex');
const mask = e => { const [u, d] = String(e || '').split('@'); return u ? `${u[0]}${'•'.repeat(Math.max(2, Math.min(6, u.length - 1)))}@${d}` : null; };
const config = () => ({ google: GOOGLE || null, email: !!RESEND, required: !!(GOOGLE || RESEND) });
const ipOf = req => String(req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || '').split(',')[0].trim();

async function account(u) {
  if (!u || !u.account_id) return null;
  const a = (await q('select * from app_accounts where id = $1', [u.account_id]))[0];
  return a ? { email: mask(a.email), via: a.via || 'email' } : null;
}

// Links this install to the account. If the account already belongs to another install (a new phone, a cleared browser),
// hand back that install's id so the same community name and bookings follow the person.
async function link(u, { email, sub, via }) {
  let a = null;
  if (sub) a = (await q('select * from app_accounts where google_sub = $1', [sub]))[0];
  if (!a && email) a = (await q('select * from app_accounts where email = $1', [email]))[0];
  if (!a) a = (await q('insert into app_accounts (email, google_sub, primary_user, via, last_login) values ($1,$2,$3,$4,now()) returning *', [email || null, sub || null, u.id, via]))[0];
  else a = (await q('update app_accounts set google_sub = coalesce(google_sub, $2), email = coalesce(email, $3), via = $4, last_login = now(), primary_user = coalesce(primary_user, $5) where id = $1 returning *',
    [a.id, sub || null, email || null, via, u.id]))[0];
  let target = u;
  if (a.primary_user && a.primary_user !== u.id) {
    const p = (await q('select * from app_users where id = $1', [a.primary_user]))[0];
    if (p) target = p; else a = (await q('update app_accounts set primary_user = $2 where id = $1 returning *', [a.id, u.id]))[0];
  }
  await q('update app_users set account_id = $2 where id = $1', [target.id, a.id]);
  if (target.id !== u.id && !u.account_id && !u.nick) await q('update app_users set account_id = $2 where id = $1', [u.id, a.id]);
  return { account: { email: mask(a.email), via }, ...(target.id !== u.id ? { uid: target.id, secret: target.secret } : {}) };
}

async function sendCode(email, code) {
  const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { authorization: `Bearer ${RESEND}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from: FROM, to: [email], subject: `${code} is your Moma code`,
      text: `Your Moma sign-in code is ${code}\n\nIt works for 10 minutes. If you didn't ask for it, you can ignore this email.\n\nMoma keeps only your email address so you can sign back in. Your health notes stay on your phone.`,
      html: `<div style="font-family:Arial,sans-serif;max-width:420px;margin:auto;padding:24px;color:#22142B"><h2 style="color:#6B2A8C;margin:0 0 12px">Your Moma code</h2>
<p style="font-size:34px;letter-spacing:8px;font-weight:bold;margin:16px 0">${code}</p><p>It works for 10 minutes. If you didn't ask for it, you can ignore this email.</p>
<p style="color:#6b6475;font-size:13px;margin-top:24px">Moma keeps only your email address so you can sign back in. Your health notes stay on your phone.</p></div>` }) });
  if (!r.ok) throw Object.assign(new Error('We could not send the email just now. Please try again in a minute.'), { code: 502 });
}

module.exports = async (req, res) => {
  cors(res);
  res.setHeader('cache-control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();
  const a = (req.query && req.query.a) || '';
  if (a === 'config') return res.status(200).json(config());
  if (!ready) return res.status(503).json({ error: 'Sign-in is not switched on yet' });
  try {
    const u = await appUser(req);
    if (!u) return res.status(401).json({ error: 'Open Moma once more so we can set up your account, then try again.' });
    const B = req.method === 'GET' ? {} : body(req);
    if (a === 'me') return res.status(200).json({ ...config(), account: await account(u) });

    if (a === 'email-start' && req.method === 'POST') {
      if (!RESEND) return res.status(400).json({ error: 'Email sign-in is not switched on yet.' });
      const email = String(B.email || '').trim().toLowerCase();
      if (!EMAIL.test(email)) return res.status(400).json({ error: 'Please check the email address.' });
      const ip = ipOf(req);
      const recent = (await q(`select (select count(*) from auth_codes where email = $1 and created_at > now() - interval '15 minutes')::int e,
        (select count(*) from auth_codes where ip = $2 and created_at > now() - interval '1 hour')::int i`, [email, ip]))[0];
      if (recent.e >= 3 || recent.i >= 12) return res.status(429).json({ error: 'Too many codes asked for. Please wait a few minutes and try again.' });
      const code = String(crypto.randomInt(0, 1e6)).padStart(6, '0');
      await q(`insert into auth_codes (email, hash, ip, expires_at) values ($1,$2,$3, now() + interval '10 minutes')`, [email, hash(email + ':' + code), ip]);
      await sendCode(email, code);
      return res.status(200).json({ ok: true });
    }

    if (a === 'email-verify' && req.method === 'POST') {
      const email = String(B.email || '').trim().toLowerCase(), code = String(B.code || '').replace(/\D/g, '');
      const c = (await q(`select * from auth_codes where email = $1 and not used and expires_at > now() order by created_at desc limit 1`, [email]))[0];
      if (!c) return res.status(400).json({ error: 'That code has expired. Ask for a new one.' });
      if (c.attempts >= 5) return res.status(429).json({ error: 'Too many tries. Ask for a new code.' });
      const ok = code.length === 6 && crypto.timingSafeEqual(Buffer.from(c.hash), Buffer.from(hash(email + ':' + code)));
      if (!ok) { await q('update auth_codes set attempts = attempts + 1 where id = $1', [c.id]); return res.status(400).json({ error: 'That code is not right. Please check and try again.' }); }
      await q('update auth_codes set used = true where email = $1', [email]);
      return res.status(200).json(await link(u, { email, via: 'email' }));
    }

    if (a === 'google' && req.method === 'POST') {
      if (!GOOGLE) return res.status(400).json({ error: 'Google sign-in is not switched on yet.' });
      const r = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(String(B.credential || '')));
      const t = await r.json().catch(() => ({}));
      const okIss = t.iss === 'accounts.google.com' || t.iss === 'https://accounts.google.com';
      if (!r.ok || t.aud !== GOOGLE || !okIss || +t.exp * 1000 < Date.now() || !t.sub) return res.status(401).json({ error: 'Google sign-in did not work. Please try again.' });
      const email = t.email && (t.email_verified === true || t.email_verified === 'true') ? String(t.email).toLowerCase() : null;
      return res.status(200).json(await link(u, { email, sub: String(t.sub), via: 'google' }));
    }

    if (a === 'signout' && req.method === 'POST') {
      // The phone starts a fresh anonymous install after this, so nobody else on the phone stays signed in as you.
      return res.status(200).json({ ok: true });
    }

    if (a === 'delete-account' && req.method === 'POST') {
      if (!u.account_id) return res.status(200).json({ ok: true });
      const id = u.account_id;
      const users = (await q('select id from app_users where account_id = $1', [id])).map(r => r.id);
      await q(`update community_posts set user_id = null, nick = 'Former member' where user_id = any($1::uuid[])`, [users]);
      await q('delete from community_members where user_id = any($1::uuid[])', [users]);
      await q('update app_users set account_id = null, nick = null, community_ok_at = null where id = any($1::uuid[])', [users]);
      await q('delete from app_accounts where id = $1', [id]);
      return res.status(200).json({ ok: true });
    }
    return res.status(404).json({ error: 'Not found' });
  } catch (e) {
    return res.status(e.code && e.code < 600 ? e.code : 500).json({ error: e.code ? e.message : 'Something went wrong' });
  }
};
module.exports.authConfig = config;
