// Moma Shop API: product list, orders, and Stripe payments (GBP). Prices are always taken from the server, never the app.
const crypto = require('crypto');
const { cors } = require('./_moma');
const { ready, q, getConfig, body } = require('./_db');

const pay = require('./_stripe');
const PSK = pay.SK;
const SEED = [
  ['hospitalbag', 'Hospital Bag Essentials', 'Maternity pads, breast pads, newborn nappies, wipes and muslins, packed and ready.', 45, 'Hospital bag', 'late', null, '👜'],
  ['pillow', 'Pregnancy Pillow', 'Full-length support for side sleeping from the second trimester.', 35, 'Pregnancy', 'any', null, '🛏️'],
  ['vitamins', 'Pregnancy Vitamins (90 days)', 'Folic acid and vitamin D, as the NHS recommends in pregnancy.', 12, 'Pregnancy', 'any', null, '💊'],
  ['pads', 'Maternity Pads (20)', 'Extra-long, extra-soft pads for the days after birth.', 6, 'Postpartum', 'late', null, '🌸'],
  ['nursingbra', 'Nursing Bra', 'Soft, wire-free, with easy clips for feeding.', 18, 'Postpartum', 'late', null, '🤍'],
  ['recovery', 'Postpartum Recovery Box', 'Pads, perineal spray, nipple balm and treats for the first weeks. A lovely gift for a new mum.', 40, 'Postpartum', 'postpartum', null, '🎁'],
  ['babystarter', 'Newborn Starter Kit', 'Vests, sleepsuits, a hat, scratch mitts and a muslin for the first weeks.', 28, 'Baby', 'late', null, '👶'],
  ['calm', 'Sleep and Calm Pillow Mist', 'A gentle lavender mist for calmer nights.', 10, 'Wellness', 'any', null, '🌙'],
].map(([id, name, blurb, price, cat, stage, img, emoji], i) => ({ id, name, blurb, price, cat, stage, img, emoji, stock: null, active: true, sort: i }));
// Without a database (local preview) orders live in memory only.
const MEM = { orders: [] };
const row = p => ({ id: p.id, name: p.name, blurb: p.blurb, price: p.price, cat: p.cat, stage: p.stage, img: p.img || undefined, emoji: p.emoji || undefined, stock: p.stock == null ? undefined : p.stock, active: p.active });
let seeded = false;
async function products(all = false) {
  if (!ready) return SEED;
  if (!seeded) {
    const n = (await q('select count(*)::int n from products'))[0].n;
    if (!n) for (const p of SEED) await q('insert into products (id,name,blurb,price,cat,stage,img,emoji,sort) values ($1,$2,$3,$4,$5,$6,$7,$8,$9) on conflict do nothing', [p.id, p.name, p.blurb, p.price, p.cat, p.stage, p.img, p.emoji, p.sort]);
    seeded = true;
  }
  return q(`select * from products ${all ? '' : 'where active = true'} order by sort, name`);
}
const clean = (s, n) => String(s || '').trim().slice(0, n);
const newRef = () => 'MOM-' + crypto.randomBytes(4).toString('hex').toUpperCase();
async function getOrder(ref) { return ready ? (await q('select * from orders where ref = $1', [ref]))[0] : MEM.orders.find(o => o.ref === ref); }
async function setStatus(ref, status, extra = {}) {
  if (ready) await q('update orders set status = $2, paystack_ref = coalesce($3, paystack_ref), updated_at = now() where ref = $1', [ref, status, extra.psref || null]);
  else { const o = MEM.orders.find(x => x.ref === ref); if (o) o.status = status; }
}

module.exports = async (req, res) => {
  cors(res);
  res.setHeader('cache-control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();
  const a = (req.query && req.query.a) || '';
  try {
    const cfg = await getConfig();
    const config = { stripe: !!PSK, paystack: !!PSK, deliveryFee: Number(cfg.deliveryFee ?? 4), freeOver: Number(cfg.freeOver ?? 50), db: ready, open: cfg.shopOn !== false };
    if (a === 'products') return res.status(200).json({ items: (await products()).map(row), config });

    if (a === 'order' && req.method === 'POST') {
      if (!config.open) return res.status(503).json({ error: 'The shop is closed for now. Please try again later.' });
      const b = body(req), ship = b.ship || {};
      const list = await products();
      const byId = Object.fromEntries(list.map(p => [p.id, p]));
      const items = (Array.isArray(b.items) ? b.items : []).filter(i => byId[i.id] && Number(i.qty) > 0).slice(0, 30)
        .map(i => ({ id: i.id, name: byId[i.id].name, price: byId[i.id].price, qty: Math.min(20, Math.round(Number(i.qty))) }));
      if (!items.length) return res.status(400).json({ error: 'Your basket is empty' });
      const out = items.find(i => byId[i.id].stock != null && byId[i.id].stock < i.qty);
      if (out) return res.status(409).json({ error: `Sorry, ${out.name} is out of stock` });
      const name = clean(ship.name, 80), phone = clean(ship.phone, 20), address = clean(ship.address, 300), email = clean(ship.email, 120), state = clean(ship.state, 10).toUpperCase();
      if (!name || !/^\+?\d[\d\s-]{9,}$/.test(phone) || address.length < 8) return res.status(400).json({ error: 'Please add your name, phone number and full delivery address' });
      if (!/^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/.test(state)) return res.status(400).json({ error: 'Please add a valid UK postcode' });
      const subtotal = items.reduce((n, i) => n + i.price * i.qty, 0);
      const delivery = config.freeOver && subtotal >= config.freeOver ? 0 : config.deliveryFee;
      const total = subtotal + delivery;
      const online = b.pay === 'online' && PSK;
      if (online && !/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'Online payment needs an email address for the receipt' });
      const ref = newRef(), status = online ? 'awaiting_payment' : 'new';
      const uid = /^[0-9a-f-]{36}$/i.test(String(b.uid || '')) ? b.uid : null;
      const o = { ref, user_id: uid, name, phone, email, address, state, items, subtotal, delivery, total, payment: online ? 'stripe' : 'on_delivery', status, created_at: new Date().toISOString() };
      if (ready) await q(`insert into orders (ref,user_id,name,phone,email,address,state,items,subtotal,delivery,total,payment,status) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [ref, null, name, phone, email || null, address, state, JSON.stringify(items), subtotal, delivery, total, o.payment, status]);
      else MEM.orders.unshift(o);
      if (!online) return res.status(200).json({ ref, total, status });
      const back = /^https?:\/\//.test(String(b.back || '')) ? String(b.back).replace(/\/$/, '') : `https://${req.headers.host}`;
      const ses = await pay.checkout({ ref, email, pence: total * 100, name: `Moma order ${ref} (${items.length} item${items.length > 1 ? 's' : ''})`, success: `${back}/?order=${ref}`, cancel: `${back}/?order=${ref}` });
      await setStatus(ref, status, { psref: ses.id });
      return res.status(200).json({ ref, total, status, payUrl: ses.url });
    }

    if (a === 'verify') {
      const ref = clean(req.query.ref, 40), o = await getOrder(ref);
      if (!o) return res.status(404).json({ error: 'Order not found' });
      let status = o.status;
      if (PSK && o.payment === 'stripe' && status === 'awaiting_payment' && o.paystack_ref) {
        const t = await pay.session(o.paystack_ref).catch(() => null);
        if (pay.isPaid(t, o.total * 100)) { status = 'paid'; await setStatus(ref, 'paid', { psref: t.id }); }
      }
      return res.status(200).json({ ref, total: o.total, status });
    }

    if (a === 'webhook' && req.method === 'POST') {
      // Stripe event: re-read the session from Stripe rather than trusting the body.
      const ev = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const id = ev && ev.data && ev.data.object && ev.data.object.id;
      if (!PSK || !id || !String(ev.type || '').startsWith('checkout.session')) return res.status(200).end();
      const t = await pay.session(id).catch(() => null), ref = t && t.client_reference_id;
      if (!ref) return res.status(200).end();
      if (ref.startsWith('MOB-')) { await require('./booking').markPaid(ref, t); return res.status(200).end(); }
      const o = await getOrder(ref); if (o && pay.isPaid(t, o.total * 100)) await setStatus(o.ref, 'paid', { psref: t.id });
      return res.status(200).end();
    }
    return res.status(404).json({ error: 'Unknown action' });
  } catch (e) { return res.status(e.code || 500).json({ error: e.code ? e.message : 'Something went wrong' }); }
};
module.exports.SEED = SEED; module.exports.MEM = MEM; module.exports.products = products;
