// Identifies an app install: a random id plus a server-issued secret, sent as headers. No names, emails or phone numbers needed.
const crypto = require('crypto');
const { q } = require('./_db');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
async function appUser(req) {
  const id = String(req.headers['x-moma-id'] || ''), secret = String(req.headers['x-moma-secret'] || '');
  if (!UUID.test(id) || !secret) return null;
  const r = await q('select * from app_users where id = $1', [id]);
  if (!r[0]) return null;
  const a = Buffer.from(r[0].secret), b = Buffer.from(secret);
  return a.length === b.length && crypto.timingSafeEqual(a, b) ? r[0] : null;
}
module.exports = { appUser, UUID };
