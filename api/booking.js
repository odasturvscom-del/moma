// Moma Care, "Talk to an expert": paid appointments with Moma's recommended care experts (physicians, midwives, lactation consultants, nutritionists, therapists and more).
// Times are UK time (Europe/London, so GMT or BST). Fees always come from the server, in whole pounds.
// Stripe takes payment when STRIPE_SECRET_KEY is set; until then a booking is sent as a request and the team confirms it and arranges payment.
const crypto = require('crypto');
const { cors } = require('./_moma');
const { ready, q, getConfig, body } = require('./_db');
const { appUser } = require('./_appuser');

const pay = require('./_stripe');
const PSK = pay.SK;
const HOLD_MIN = 30, DAYS_AHEAD = 14;
const KINDS = { video: 'Video call', phone: 'Phone call', clinic: 'Clinic visit' };
const ACTIVE = ['awaiting_payment', 'requested', 'confirmed'];
const WEEK = { 1: ['09:00', '17:00'], 2: ['09:00', '17:00'], 3: ['09:00', '17:00'], 4: ['09:00', '17:00'], 5: ['09:00', '17:00'], 6: ['10:00', '14:00'] };
const SEED = { slug: 'partner', role: 'Midwife', name: 'Moma Partner Midwife', title: 'Independent midwife · Pregnancy, birth and postnatal care',
  bio: "Moma's recommended independent midwife. Book a private chat about your pregnancy, birth preferences, recovery after birth, feeding, or anything worrying you. This sits alongside your NHS care, never instead of it.",
  languages: 'English', fees: { video: 45, phone: 35, clinic: 65 }, clinic_address: 'London (address shared after booking)', hours: WEEK, licence_body: 'NMC' };

const fail = (code, msg) => Object.assign(new Error(msg), { code });
const clean = (s, n) => String(s || '').trim().slice(0, n);
const newRef = () => 'MOB-' + crypto.randomBytes(4).toString('hex').toUpperCase();
// UK clock: works out the GMT/BST offset for any moment.
const UKF = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
const OFF = t => { const p = Object.fromEntries(UKF.formatToParts(new Date(t)).map(x => [x.type, x.value])); return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute) - Math.floor(t / 60000) * 60000; };
const ukDay = (t = Date.now()) => new Date(t + OFF(t)).toISOString().slice(0, 10);
const toInstant = (day, hm) => { const [y, m, d] = day.split('-').map(Number), [h, mi] = hm.split(':').map(Number); const g = Date.UTC(y, m - 1, d, h, mi); return new Date(g - OFF(g - OFF(g))); };
const ukHM = t => { const ms = new Date(t).getTime(); return new Date(ms + OFF(ms)).toISOString().slice(11, 16); };
const addDays = (day, n) => new Date(Date.parse(day + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10);
const dow = day => new Date(day + 'T00:00:00Z').getUTCDay();
const mins = hm => { const [h, m] = hm.split(':').map(Number); return h * 60 + m; };
const hm = n => `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;

let seeded = false;
async function providers(all = false) {
  if (!seeded) {
    const n = (await q('select count(*)::int n from care_providers'))[0].n;
    if (!n) await q(`insert into care_providers (slug,name,title,bio,languages,fees,clinic_address,hours) values ($1,$2,$3,$4,$5,$6,$7,$8) on conflict do nothing`,
      [SEED.slug, SEED.name, SEED.title, SEED.bio, SEED.languages, JSON.stringify(SEED.fees), SEED.clinic_address, JSON.stringify(SEED.hours)]);
    seeded = true;
  }
  return q(`select * from care_providers ${all ? '' : 'where active'} order by sort, id`);
}
const kindsOf = p => Object.keys(KINDS).filter(k => Number((p.fees || {})[k]) > 0);
const pubProvider = p => ({ id: p.id, role: p.role || 'Expert', name: p.name, title: p.title, bio: p.bio, verified: p.verified, licence: p.verified && p.mdcn ? `${p.licence_body || ''} ${p.mdcn}`.trim() : null, languages: p.languages, photo: p.photo || null,
  clinic: p.clinic_address || null, mins: p.slot_min, kinds: kindsOf(p).map(k => ({ id: k, label: KINDS[k], fee: Number(p.fees[k]) })) });
const expire = () => q(`update bookings set status = 'expired', updated_at = now() where status = 'awaiting_payment' and hold_until < now()`);

// Open slots for the next two weeks, as UK dates and times, minus anything taken.
async function slots(p) {
  await expire();
  const start = ukDay(), end = addDays(start, DAYS_AHEAD);
  const taken = new Set((await q(`select starts_at from bookings where provider_id = $1 and status = any($2) and starts_at >= now()`, [p.id, ACTIVE])).map(r => new Date(r.starts_at).getTime()));
  const off = new Set(Array.isArray(p.off) ? p.off : []), hours = p.hours || {}, step = Math.max(15, p.slot_min || 30), earliest = Date.now() + (p.lead_hours ?? 3) * 3600e3;
  const days = [];
  for (let day = start; day < end; day = addDays(day, 1)) {
    const h = hours[dow(day)];
    const list = [];
    if (h && !off.has(day)) for (let m = mins(h[0]); m + step <= mins(h[1]); m += step) {
      const t = toInstant(day, hm(m)).getTime();
      if (t >= earliest && !taken.has(t)) list.push(hm(m));
    }
    days.push({ date: day, slots: list });
  }
  return days;
}
const pubBooking = b => ({ ref: b.ref, kind: b.kind, kindLabel: KINDS[b.kind] || b.kind, at: new Date(b.starts_at).toISOString(), date: ukDay(new Date(b.starts_at).getTime()), time: ukHM(b.starts_at),
  mins: b.mins, fee: b.fee, status: b.status, reason: b.reason, note: b.note, provider: b.provider_name || null, link: b.status === 'confirmed' ? b.link || null : null,
  holdUntil: b.hold_until, refundDue: b.refund_due, payment: b.payment });

// Called by verify and by the Stripe webhook (shared with the shop). Confirms only when Stripe shows the exact amount in pounds.
async function markPaid(ref, ses) {
  const b = (await q('select * from bookings where ref = $1', [ref]))[0];
  if (!b || !pay.isPaid(ses, b.fee * 100)) return null;
  const psref = ses.id;
  if (b.status === 'confirmed') return b;
  try {
    return (await q(`update bookings set status = 'confirmed', paystack_ref = $2, hold_until = null, updated_at = now() where ref = $1 and status in ('awaiting_payment','expired') returning *`, [ref, String(psref || '')]))[0] || b;
  } catch (e) {
    // Paid after the hold ran out and someone else took the time: keep the money on record and let the team rebook or refund.
    return (await q(`update bookings set status = 'paid_rebook', paystack_ref = $2, updated_at = now() where ref = $1 returning *`, [ref, String(psref || '')]))[0];
  }
}

module.exports = async (req, res) => {
  cors(res);
  res.setHeader('cache-control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();
  const a = (req.query && req.query.a) || '';
  try {
    if (!ready) throw fail(503, 'Booking needs the Moma server.');
    const cfg = await getConfig();
    const config = { stripe: !!PSK, paystack: !!PSK, open: cfg.bookingOn !== false, cancelHours: Number(cfg.bookingCancelHours ?? 24), tz: 'Europe/London' };
    if (a === 'providers') return res.status(200).json({ items: (await providers()).map(pubProvider), config });
    if (a === 'slots') {
      const p = (await q('select * from care_providers where id = $1 and active', [Number(req.query.p)]))[0];
      if (!p) throw fail(404, 'This expert is not taking bookings right now.');
      return res.status(200).json({ days: await slots(p), mins: p.slot_min });
    }
    const u = await appUser(req);
    if (!u) return res.status(401).json({ error: 'Please open Moma again and retry.' });

    if (a === 'mine') {
      await expire();
      const rows = await q(`select b.*, p.name provider_name from bookings b join care_providers p on p.id = b.provider_id where b.user_id = $1 order by b.starts_at desc limit 50`, [u.id]);
      return res.status(200).json({ items: rows.map(pubBooking), config });
    }

    if (a === 'book' && req.method === 'POST') {
      if (require('./auth').authConfig().required && !u.account_id) throw fail(401, 'Please sign in to Moma first.');
      if (!config.open) throw fail(503, 'Bookings are paused for now. Please try again later.');
      const b = body(req);
      const p = (await q('select * from care_providers where id = $1 and active', [Number(b.provider)]))[0];
      if (!p) throw fail(404, 'This expert is not taking bookings right now.');
      const kind = String(b.kind || ''), fee = Number((p.fees || {})[kind]);
      if (!KINDS[kind] || !(fee > 0)) throw fail(400, 'Please pick how you want to meet.');
      const day = clean(b.date, 10), time = clean(b.time, 5);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !/^\d{2}:\d{2}$/.test(time)) throw fail(400, 'Please pick a day and time.');
      const open = (await slots(p)).find(d => d.date === day);
      if (!open || !open.slots.includes(time)) throw fail(409, 'Sorry, that time was just taken. Please pick another.');
      const name = clean(b.name, 80), phone = clean(b.phone, 20), email = clean(b.email, 120).toLowerCase(), reason = clean(b.reason, 120), note = clean(b.note, 800);
      if (name.length < 2) throw fail(400, 'Please add your name.');
      if (!/^\+?\d[\d\s-]{9,}$/.test(phone)) throw fail(400, 'Please add a phone number we can reach you on.');
      if (!reason) throw fail(400, 'Please tell us what the appointment is about.');
      if (!b.consent) throw fail(400, 'Please tick the box to confirm you understand this is not for emergencies.');
      const online = !!PSK;
      if (online && !/^\S+@\S+\.\S+$/.test(email)) throw fail(400, 'Paying online needs an email address for your receipt.');
      const recent = (await q(`select count(*)::int n from bookings where user_id = $1 and status = any($2) and starts_at > now()`, [u.id, ACTIVE]))[0].n;
      if (recent >= 3) throw fail(429, 'You already have 3 upcoming appointments. Please cancel one before booking another.');
      const ref = newRef(), starts = toInstant(day, time);
      let row;
      try {
        row = (await q(`insert into bookings (ref,user_id,provider_id,kind,starts_at,mins,fee,name,phone,email,reason,note,status,payment,hold_until)
          values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14, case when $15 then now() + interval '${HOLD_MIN} minutes' end) returning *`,
          [ref, u.id, p.id, kind, starts, p.slot_min, fee, name, phone, email || null, reason, note || null, online ? 'awaiting_payment' : 'requested', online ? 'stripe' : 'arranged', online]))[0];
      } catch (e) { if (String(e.code) === '23505') throw fail(409, 'Sorry, that time was just taken. Please pick another.'); throw e; }
      row.provider_name = p.name;
      if (!online) return res.status(200).json({ booking: pubBooking(row) });
      const back = /^https?:\/\//.test(String(b.back || '')) ? String(b.back).replace(/\/$/, '') : `https://${req.headers.host}/app`;
      try {
        const ses = await pay.checkout({ ref, email, pence: fee * 100, name: `${KINDS[kind]} with ${p.name}, ${day} ${time} UK time`, success: `${back}/?booking=${ref}`, cancel: `${back}/?booking=${ref}`, metadata: { type: 'booking', kind } });
        await q('update bookings set paystack_ref = $2 where ref = $1', [ref, ses.id]);
        return res.status(200).json({ booking: pubBooking(row), payUrl: ses.url });
      } catch (e) { await q(`update bookings set status = 'expired' where ref = $1`, [ref]); throw e; }
    }

    if (a === 'verify') {
      const ref = clean(req.query.ref, 20);
      let b = (await q('select b.*, p.name provider_name from bookings b join care_providers p on p.id = b.provider_id where b.ref = $1 and b.user_id = $2', [ref, u.id]))[0];
      if (!b) throw fail(404, 'We could not find that booking.');
      if (PSK && b.payment === 'stripe' && ['awaiting_payment', 'expired'].includes(b.status) && b.paystack_ref) {
        const t = await pay.session(b.paystack_ref).catch(() => null);
        const m = t ? await markPaid(ref, t) : null; if (m) b = { ...b, ...m };
      }
      return res.status(200).json({ booking: pubBooking(b) });
    }

    if (a === 'cancel' && req.method === 'POST') {
      const ref = clean(body(req).ref, 20);
      const b = (await q('select * from bookings where ref = $1 and user_id = $2', [ref, u.id]))[0];
      if (!b || !ACTIVE.includes(b.status)) throw fail(400, 'This appointment can no longer be cancelled here. Message the Moma team for help.');
      if (new Date(b.starts_at).getTime() < Date.now()) throw fail(400, 'This appointment has already started.');
      const early = new Date(b.starts_at).getTime() - Date.now() >= config.cancelHours * 3600e3;
      const refund = b.status === 'confirmed' && early;
      await q(`update bookings set status = 'cancelled', cancelled_at = now(), refund_due = $2, hold_until = null, updated_at = now() where ref = $1`, [ref, refund]);
      return res.status(200).json({ ok: true, refund, paid: b.status === 'confirmed' });
    }
    return res.status(404).json({ error: 'Unknown action' });
  } catch (e) { return res.status(e.code || 500).json({ error: e.code ? e.message : 'Something went wrong. Please try again.' }); }
};
module.exports.markPaid = markPaid; module.exports.providers = providers; module.exports.KINDS = KINDS; module.exports.ukDay = ukDay; module.exports.ukHM = ukHM;
