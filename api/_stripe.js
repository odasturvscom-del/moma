// Stripe Checkout for the shop and expert bookings (GBP). Works in test mode with an sk_test_ key.
// We never trust a webhook body: every confirmation re-reads the Checkout Session from Stripe.
const SK = process.env.STRIPE_SECRET_KEY || '';
const enc = (o, p = '') => Object.entries(o).flatMap(([k, v]) => {
  const key = p ? `${p}[${k}]` : k;
  return v && typeof v === 'object' ? enc(v, key) : v == null ? [] : [[key, String(v)]];
});
async function stripe(path, params, method = 'POST') {
  const r = await fetch('https://api.stripe.com/v1' + path, {
    method, headers: { authorization: `Bearer ${SK}`, 'content-type': 'application/x-www-form-urlencoded' },
    body: method === 'GET' ? undefined : new URLSearchParams(enc(params || {})).toString(),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error((j.error && j.error.message) || 'The payment service had a problem. Please try again.'), { code: 502 });
  return j;
}
// Returns { id, url } for a hosted Stripe Checkout page.
const checkout = ({ ref, email, pence, name, success, cancel, metadata = {} }) => stripe('/checkout/sessions', {
  mode: 'payment', client_reference_id: ref, customer_email: email || undefined, success_url: success, cancel_url: cancel,
  line_items: { 0: { quantity: 1, price_data: { currency: 'gbp', unit_amount: pence, product_data: { name } } } },
  metadata: { ref, ...metadata }, payment_intent_data: { metadata: { ref } },
});
const session = id => stripe('/checkout/sessions/' + encodeURIComponent(id), null, 'GET');
// True only when Stripe says this exact session is paid, in pounds, for the exact amount.
const isPaid = (s, pence) => !!s && s.payment_status === 'paid' && s.currency === 'gbp' && Number(s.amount_total) === pence;
module.exports = { SK, stripe, checkout, session, isPaid, live: () => !!SK, mode: () => (SK.startsWith('sk_live') ? 'live' : 'test') };
