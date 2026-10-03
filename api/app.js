// App-facing API: register an install, and the human support chat ("Talk to the Moma team").
const crypto = require('crypto');
const { cors } = require('./_moma');
const { ready, q, bump, getConfig, body } = require('./_db');
const { appUser, UUID } = require('./_appuser');
const { triage, FLAG_TITLES } = require('./_safety');
const EM = { UK: ['999', 'your maternity triage line or NHS 111', 'Samaritans on 116 123'], Canada: ['911', 'your birthing unit or Health Link 811', 'the 988 Suicide Crisis Helpline'], US: ['911', 'your OB or labor & delivery unit', 'the 988 Lifeline'], Nigeria: ['112', 'your antenatal clinic or nearest hospital', 'your nearest hospital'], Other: ['your local emergency number', 'your midwife or maternity unit', 'a local crisis line'] };
const COUNTRIES = Object.keys(EM);
const clean = (s, n) => String(s || '').trim().slice(0, n);
const today = () => new Date().toISOString().slice(0, 10);

function emergencyText(t, country) {
  const e = EM[country] || EM.Other;
  if (t.level === 'm') return `Thank you for telling us. If you might act on these thoughts, please call ${e[0]} now, or talk to ${e[2]}. A member of our team will reply here, but please don't wait for us.`;
  if (t.level === 'e') return `This could be an emergency: ${t.titles.join(', ')}. Please call ${e[0]} now. Our team will see your message, but don't wait for a reply here.`;
  if (t.level === 'u') return `${t.titles.join(', ')} needs checking by a professional now. Please contact ${e[1]} straight away, day or night. Our team will still reply here.`;
  return `Any bleeding should be checked. Please contact ${e[1]} today, and call ${e[0]} if it gets heavy or you feel unwell.`;
}

async function thread(u) {
  const c = (await q(`select * from conversations where user_id = $1 order by (status <> 'resolved') desc, updated_at desc limit 1`, [u.id]))[0];
  if (!c) return { conversation: null, messages: [] };
  const m = await q(`select m.id, m.sender, m.body, m.created_at, s.name as staff_name from messages m left join staff s on s.id = m.staff_id
    where m.conversation_id = $1 and m.internal = false order by m.id asc limit 300`, [c.id]);
  await q('update conversations set user_unread = 0 where id = $1', [c.id]);
  return { conversation: { id: c.id, status: c.status }, messages: m.map(x => ({ id: x.id, from: x.sender, body: x.body, at: x.created_at, name: x.sender === 'staff' ? (x.staff_name || 'Moma team').split(' ')[0] : null })) };
}

module.exports = async (req, res) => {
  cors(res);
  res.setHeader('cache-control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!ready) return res.status(503).json({ error: 'Support is not switched on yet' });
  const a = (req.query && req.query.a) || '';
  try {
    if (a === 'hello' && req.method === 'POST') {
      const b = body(req), id = String(b.id || '');
      if (!UUID.test(id)) return res.status(400).json({ error: 'bad id' });
      const vals = [b.mode === 'postpartum' ? 'postpartum' : 'pregnant', Number.isFinite(+b.week) ? Math.max(0, Math.min(60, Math.round(+b.week))) : null,
        COUNTRIES.includes(b.country) ? b.country : 'Other', clean(b.platform, 12), clean(b.version, 10), b.stats !== false];
      let u = await appUser(req);
      if (!u) {
        const exists = (await q('select 1 from app_users where id = $1', [id]))[0];
        if (exists) return res.status(401).json({ error: 'id taken' });
        const secret = crypto.randomBytes(24).toString('hex');
        u = (await q(`insert into app_users (id, secret, mode, week, country, platform, version, stats, onboarded_at) values ($1,$2,$3,$4,$5,$6,$7,$8, case when $9 then now() end) returning *`, [id, secret, ...vals, !!b.onboarded]))[0];
      } else {
        u = (await q(`update app_users set mode=$2, week=$3, country=$4, platform=$5, version=$6, stats=$7, last_seen=now() where id=$1 returning *`, [u.id, ...vals]))[0];
      }
      await q('insert into active_days (user_id, day) values ($1, $2) on conflict do nothing', [u.id, today()]);
      const unread = (await q(`select coalesce(sum(user_unread),0)::int as n from conversations where user_id = $1`, [u.id]))[0].n;
      return res.status(200).json({ secret: u.secret, unread });
    }

    const u = await appUser(req);
    if (!u) return res.status(401).json({ error: 'Not registered' });

    if (a === 'thread') return res.status(200).json(await thread(u));

    if (a === 'send' && req.method === 'POST') {
      const cfg = await getConfig();
      if (cfg.supportOn === false) return res.status(503).json({ error: 'Live support is closed right now. For anything urgent, contact your maternity team.' });
      const b = body(req), text = clean(b.body, 3000);
      if (!text) return res.status(400).json({ error: 'Empty message' });
      if (b.name !== undefined) await q('update app_users set name = $2 where id = $1', [u.id, clean(b.name, 40) || null]);
      const t = triage(text, u.mode || 'pregnant');
      let c = (await q(`select * from conversations where user_id = $1 and status <> 'resolved' order by updated_at desc limit 1`, [u.id]))[0];
      if (!c) { c = (await q(`insert into conversations (user_id) values ($1) returning *`, [u.id]))[0]; await bump(['support', 'support:new']); }
      await q(`insert into messages (conversation_id, sender, body) values ($1, 'user', $2)`, [c.id, text]);
      const urgent = t.level && t.level !== 's';
      await q(`update conversations set status = 'open', updated_at = now(), staff_unread = staff_unread + 1, last_preview = $2,
        flagged = coalesce($3, flagged), priority = case when $4 then 'urgent' else priority end where id = $1`,
        [c.id, text.slice(0, 140), t.level ? t.titles.join(', ') : null, !!urgent]);
      if (t.level) {
        await q(`insert into messages (conversation_id, sender, body) values ($1, 'system', $2)`, [c.id, emergencyText(t, u.country)]);
        await bump(['support:flag']);
      }
      await bump(['support:msg']);
      return res.status(200).json(await thread(u));
    }

    if (a === 'delete' && req.method === 'POST') {
      await q('delete from app_users where id = $1', [u.id]);
      return res.status(200).json({ ok: true });
    }
    return res.status(404).json({ error: 'Unknown action' });
  } catch (e) { return res.status(e.code || 500).json({ error: e.code === 503 ? e.message : 'Something went wrong' }); }
};
