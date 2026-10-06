import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, View, Pressable, Image, Linking, Platform, ActivityIndicator, TextInput, useWindowDimensions } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { useStore, preg, pp } from '../store';
import { apiBase } from '../ai';
import { Text, Muted, Input, Label, Chip, Btn } from '../ui';
import { Mo } from '../mascot';
import { C, P, isDark } from '../theme';

// Moma Shop: mama and baby essentials, priced in naira. Prices always come from the server at checkout.
export type Product = { id: string; name: string; blurb: string; price: number; cat: string; stage: string; img?: string; emoji?: string; stock?: number; active?: boolean };
export const SEED: Product[] = [
  { id: 'hospitalbag', name: 'Hospital Bag Essentials', blurb: 'Maternity pads, breast pads, newborn nappies, wipes and muslins, packed and ready.', price: 45, cat: 'Hospital bag', stage: 'late', emoji: '👜' },
  { id: 'pillow', name: 'Pregnancy Pillow', blurb: 'Full-length support for side sleeping from the second trimester.', price: 35, cat: 'Pregnancy', stage: 'any', emoji: '🛏️' },
  { id: 'vitamins', name: 'Pregnancy Vitamins (90 days)', blurb: 'Folic acid and vitamin D, as the NHS recommends in pregnancy.', price: 12, cat: 'Pregnancy', stage: 'any', emoji: '💊' },
  { id: 'pads', name: 'Maternity Pads (20)', blurb: 'Extra-long, extra-soft pads for the days after birth.', price: 6, cat: 'Postpartum', stage: 'late', emoji: '🌸' },
  { id: 'nursingbra', name: 'Nursing Bra', blurb: 'Soft, wire-free, with easy clips for feeding.', price: 18, cat: 'Postpartum', stage: 'late', emoji: '🤍' },
  { id: 'recovery', name: 'Postpartum Recovery Box', blurb: 'Pads, perineal spray, nipple balm and treats for the first weeks. A lovely gift for a new mum.', price: 40, cat: 'Postpartum', stage: 'postpartum', emoji: '🎁' },
  { id: 'babystarter', name: 'Newborn Starter Kit', blurb: 'Vests, sleepsuits, a hat, scratch mitts and a muslin for the first weeks.', price: 28, cat: 'Baby', stage: 'late', emoji: '👶' },
  { id: 'calm', name: 'Sleep and Calm Pillow Mist', blurb: 'A gentle lavender mist for calmer nights.', price: 10, cat: 'Wellness', stage: 'any', emoji: '🌙' },
];
export const gbp = (n: number) => '£' + (Number.isInteger(n) ? n.toLocaleString('en-GB') : n.toFixed(2));

// Clean, Flawle-style product tiles: the product sits on a soft square tile, never edge to edge.
const tile = () => (isDark ? C.surf2 : '#F3EEE8');
function Pic({ p, h, r = 18 }: { p: Product; h: number; r?: number }) {
  const { s } = useStore();
  const showImg = !!p.img && !s.lite; // Low-data mode: skip photo downloads, show a light icon instead
  return (
    <View style={{ width: '100%', height: h, borderRadius: r, backgroundColor: tile(), overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
      {showImg ? <Image source={{ uri: p.img! }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        : <Text style={{ fontSize: h * 0.34 }}>{p.emoji || '🛍️'}</Text>}
    </View>
  );
}
const I = ({ d, size = 20, color = C.ink, fill = 'none', w = 2 }: { d: string; size?: number; color?: string; fill?: string; w?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d={d} stroke={color} fill={fill} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" /></Svg>
);
const HEART = 'M12 20.5s-7.5-4.6-7.5-10.1A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.8c0 5.5-7.5 10.1-7.5 10.1z';
const BAG = 'M5 8h14l-1.2 11.2a1.5 1.5 0 0 1-1.5 1.3H7.7a1.5 1.5 0 0 1-1.5-1.3zM9 10V7a3 3 0 0 1 6 0v3';
const BACK = 'M15 5l-7 7 7 7';
function Search() { return <Svg width={18} height={18} viewBox="0 0 24 24" fill="none"><Circle cx={11} cy={11} r={6.5} stroke={C.muted} strokeWidth={2} /><Path d="M20 20l-4-4" stroke={C.muted} strokeWidth={2} strokeLinecap="round" /></Svg>; }
const RoundBtn = ({ onPress, label, children, size = 40, bg }: { onPress: () => void; label: string; children: React.ReactNode; size?: number; bg?: string }) => (
  <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={6}
    style={({ pressed }) => ({ width: size, height: size, borderRadius: size / 2, backgroundColor: bg ?? C.card, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } })}>
    {children}
  </Pressable>
);
const Pill = ({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) => (
  <Pressable onPress={onPress} style={{ paddingVertical: 9, paddingHorizontal: 16, borderRadius: 99, backgroundColor: on ? C.ink : C.card, borderWidth: 1, borderColor: on ? C.ink : C.line }}>
    <Text style={{ fontSize: 13.5, fontWeight: '600', color: on ? C.inv : C.ink }}>{label}</Text>
  </Pressable>
);
const Qty = ({ n, set }: { n: number; set: (n: number) => void }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.surf2, borderRadius: 99 }}>
    <Pressable accessibilityLabel="One less" onPress={() => set(n - 1)} style={{ width: 34, height: 34, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 18, fontWeight: '700' }}>−</Text></Pressable>
    <Text style={{ minWidth: 20, textAlign: 'center', fontWeight: '700' }}>{n}</Text>
    <Pressable accessibilityLabel="One more" onPress={() => set(n + 1)} style={{ width: 34, height: 34, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 18, fontWeight: '700' }}>+</Text></Pressable>
  </View>
);

export default function Shop() {
  const { s, set } = useStore();
  const [items, setItems] = useState<Product[]>(SEED);
  const [cfg, setCfg] = useState<{ paystack: boolean; deliveryFee: number; freeOver: number; db: boolean }>({ paystack: false, deliveryFee: 4, freeOver: 50, db: false });
  const [cat, setCat] = useState('All');
  const [view, setView] = useState<'list' | 'cart' | 'checkout' | 'done'>('list');
  const [pay, setPay] = useState<'online' | 'delivery'>('delivery');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState<{ ref: string; total: number; status: string } | null>(null);
  const [open, setOpen] = useState<Product | null>(null);
  const [qText, setQText] = useState('');
  const [more, setMore] = useState(true);
  // Baby list: a mum shares her saved items; family (at home or abroad) open the link and buy for her.
  const [list, setList] = useState<{ ids: string[]; who: string } | null>(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
    const q = new URLSearchParams(window.location.search); const l = q.get('list');
    return l ? { ids: l.split(',').filter(Boolean).slice(0, 40), who: (q.get('for') || '').slice(0, 40) } : null;
  });
  const { width: winW } = useWindowDimensions();
  const [cw, setCw] = useState(Math.min(winW, 680));
  const onLay = (e: any) => { const w = e.nativeEvent.layout.width; if (w && Math.abs(w - cw) > 2) setCw(w); };
  const width = cw;
  const base = apiBase(s);

  useEffect(() => {
    if (!base) return;
    fetch(`${base}/shop?a=products`).then(r => r.json()).then(j => { if (Array.isArray(j.items) && j.items.length) setItems(j.items); if (j.config) { setCfg(j.config); if (j.config.stripe || j.config.paystack) setPay('online'); } }).catch(() => {});
    // Back from Stripe: confirm the payment and show the receipt.
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const q = new URLSearchParams(window.location.search); const ref = q.get('order') || q.get('reference') || q.get('trxref');
      if (ref) fetch(`${base}/shop?a=verify&ref=${encodeURIComponent(ref)}`).then(r => r.json()).then(j => {
        if (j.ref) { setDone({ ref: j.ref, total: j.total, status: j.status }); setView('done'); if (j.status === 'paid') set(x => ({ ...x, cart: [], orders: x.orders.map(o => (o.ref === j.ref ? { ...o, status: 'paid' } : o)) })); }
        window.history.replaceState({}, '', window.location.pathname);
      }).catch(() => {});
    }
  }, [base]);

  const byId = useMemo(() => Object.fromEntries(items.map(p => [p.id, p])), [items]);
  const cart = s.cart.filter(c => byId[c.id]);
  const sub = cart.reduce((n, c) => n + byId[c.id].price * c.qty, 0);
  const fee = sub === 0 || (cfg.freeOver && sub >= cfg.freeOver) ? 0 : cfg.deliveryFee;
  const count = cart.reduce((n, c) => n + c.qty, 0);
  const setQty = (id: string, qty: number) => set(x => ({ ...x, cart: qty <= 0 ? x.cart.filter(c => c.id !== id) : x.cart.some(c => c.id === id) ? x.cart.map(c => (c.id === id ? { ...c, qty: Math.min(20, qty) } : c)) : [...x.cart, { id, qty }] }));
  const inCart = (id: string) => s.cart.find(c => c.id === id)?.qty ?? 0;
  const favs = s.favs ?? [];
  const isFav = (id: string) => favs.includes(id);
  const togFav = (id: string) => set(x => ({ ...x, favs: (x.favs ?? []).includes(id) ? (x.favs ?? []).filter(f => f !== id) : [...(x.favs ?? []), id] }));

  const shareList = () => {
    const origin = Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin : 'https://moma-app-web.vercel.app';
    const url = `${origin}/app/?tab=shop&list=${encodeURIComponent(favs.join(','))}&for=${encodeURIComponent(s.name || '')}`;
    const msg = `${s.name ? s.name + "'s" : 'My'} baby list on Moma. If you'd like to help, you can buy anything on it and have it delivered to me: ${url}`;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const nav: any = (window as any).navigator;
      if (nav?.share) nav.share({ text: msg }).catch(() => {}); else window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank');
    } else Linking.openURL('https://wa.me/?text=' + encodeURIComponent(msg));
  };
  const p = preg(s), q = pp(s);
  const stage = s.mode === 'postpartum' ? 'postpartum' : p && p.w >= 28 ? 'late' : 'early';
  const picks = items.filter(x => x.active !== false && (stage === 'postpartum' ? ['postpartum', 'late'].includes(x.stage) : stage === 'late' ? ['late', 'any'].includes(x.stage) : x.stage === 'any')).slice(0, 4);
  const cats = ['All', ...(favs.length ? ['Saved'] : []), ...Array.from(new Set(items.map(x => x.cat)))];
  const needle = qText.trim().toLowerCase();
  const shown = items.filter(x => x.active !== false && (!list || list.ids.includes(x.id)) && (cat === 'All' || (cat === 'Saved' ? isFav(x.id) : x.cat === cat)) && (!needle || `${x.name} ${x.blurb} ${x.cat}`.toLowerCase().includes(needle)));
  const hero = picks[0] || items.find(x => x.img) || items[0];
  const cols = cw >= 820 ? 4 : cw >= 600 ? 3 : 2;
  const cardW = Math.floor((cw - 40 - 12 * (cols - 1)) / cols);
  const ship = s.ship;
  const setShip = (k: keyof typeof ship, v: string) => set(x => ({ ...x, ship: { ...x.ship, [k]: v } }));

  const place = async () => {
    setErr('');
    if (!ship.name.trim() || !/^\+?\d[\d\s-]{9,}$/.test(ship.phone.trim()) || ship.address.trim().length < 8) { setErr('Please add your name, a working phone number and your full delivery address.'); return; }
    if (pay === 'online' && !/^\S+@\S+\.\S+$/.test(ship.email.trim())) { setErr('Card payment needs an email address for your receipt.'); return; }
    if (!base) { setErr('Ordering needs an internet connection to the Moma server.'); return; }
    setBusy(true);
    try {
      const r = await fetch(`${base}/shop?a=order`, { method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ items: cart, ship, pay, uid: s.uid, back: Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin + '/app' : '' }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || 'Something went wrong');
      set(x => ({ ...x, orders: [{ ref: j.ref, total: j.total, at: Date.now(), status: j.status, items: count }, ...x.orders].slice(0, 30), cart: j.payUrl ? x.cart : [] }));
      if (j.payUrl) { if (Platform.OS === 'web') window.location.href = j.payUrl; else Linking.openURL(j.payUrl); return; }
      setDone({ ref: j.ref, total: j.total, status: j.status }); setView('done');
    } catch (e: any) { setErr(e.message || 'Could not place your order'); } finally { setBusy(false); }
  };

  const Head = ({ title, back }: { title: string; back?: () => void }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
      {back ? <RoundBtn onPress={back} label="Back"><I d={BACK} /></RoundBtn> : null}
      <Text style={{ fontSize: 24, fontWeight: '700', color: C.ink, letterSpacing: -0.5, flex: 1 }}>{title}</Text>
    </View>
  );

  if (open) {
    const n = inCart(open.id);
    const free = cfg.freeOver ? `Free delivery over ${gbp(cfg.freeOver)}` : 'UK delivery in 2 to 4 working days';
    return (
      <View style={{ flex: 1 }} onLayout={onLay}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
          <View>
            <Pic p={open} h={Math.min(width - 40, 440)} r={28} />
            <View style={{ position: 'absolute', top: 12, left: 12, right: 12, flexDirection: 'row', justifyContent: 'space-between' }}>
              <RoundBtn onPress={() => setOpen(null)} label="Back to shop"><I d={BACK} /></RoundBtn>
              <RoundBtn onPress={() => togFav(open.id)} label={isFav(open.id) ? 'Remove from saved' : 'Save'}><I d={HEART} color={isFav(open.id) ? C.brand : C.ink} fill={isFav(open.id) ? C.brand : 'none'} /></RoundBtn>
            </View>
          </View>
          <Text style={{ fontSize: 12, fontWeight: '600', color: C.muted, letterSpacing: 1.2, marginTop: 20 }}>{open.cat.toUpperCase()}</Text>
          <Text style={{ fontSize: 24, fontWeight: '700', color: C.ink, letterSpacing: -0.4, marginTop: 4 }}>{open.name}</Text>
          <Text style={{ fontSize: 22, fontWeight: '700', color: C.ink, marginTop: 10 }}>{gbp(open.price)}</Text>
          <View style={{ backgroundColor: C.card, borderRadius: 20, padding: 16, marginTop: 18, gap: 12 }}>
            {[[open.stock === 0 ? '○' : '✓', open.stock === 0 ? 'Sold out right now' : 'In stock', open.stock === 0 ? C.muted : C.sage], ['🚚', free, C.ink], ['💳', 'Pay securely by card, Apple Pay or Google Pay', C.ink]].map(([ic, t, col]) => (
              <View key={t} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={{ width: 20, textAlign: 'center', color: col, fontWeight: '700' }}>{ic}</Text>
                <Text style={{ fontSize: 14, color: col }}>{t}</Text>
              </View>
            ))}
          </View>
          <Pressable onPress={() => setMore(!more)} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, paddingVertical: 14, borderTopWidth: 1, borderBottomWidth: more ? 0 : 1, borderColor: C.line }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: C.ink }}>Description</Text>
            <Text style={{ fontSize: 18, color: C.muted }}>{more ? '−' : '+'}</Text>
          </Pressable>
          {more ? <Muted style={{ fontSize: 15, lineHeight: 23, paddingBottom: 14, borderBottomWidth: 1, borderColor: C.line }}>{open.blurb}</Muted> : null}
          <Muted style={{ fontSize: 12, marginTop: 16 }}>Products support your care. They don't replace your midwife or GP.</Muted>
        </ScrollView>
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, paddingBottom: 18, backgroundColor: C.bg, borderTopWidth: 1, borderColor: C.line, flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          {n ? <Qty n={n} set={v => setQty(open.id, v)} />
            : <Pressable accessibilityLabel="Save" onPress={() => togFav(open.id)} style={{ width: 54, height: 54, borderRadius: 18, borderWidth: 1, borderColor: C.line, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' }}><I d={HEART} size={22} color={isFav(open.id) ? C.brand : C.ink} fill={isFav(open.id) ? C.brand : 'none'} /></Pressable>}
          <Pressable disabled={open.stock === 0} onPress={() => (n ? (setOpen(null), setView('cart')) : setQty(open.id, 1))}
            style={({ pressed }) => ({ flex: 1, height: 54, borderRadius: 18, backgroundColor: open.stock === 0 ? C.disabled : C.brand, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.85 : 1 })}>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>{open.stock === 0 ? 'Sold out' : n ? `Go to basket · ${gbp(sub)}` : `Add to basket · ${gbp(open.price)}`}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (view === 'done' && done) return (
    <ScrollView contentContainerStyle={{ padding: 20, alignItems: 'center' }}>
      <Mo size={150} pose="wave" badge />
      <Text style={{ fontSize: 26, fontWeight: '800', marginTop: 14, textAlign: 'center' }}>{done.status === 'paid' ? 'Paid, thank you!' : done.status === 'awaiting_payment' ? 'Payment not finished' : 'Order received!'}</Text>
      <Muted style={{ textAlign: 'center', fontSize: 15, marginTop: 8 }}>Order {done.ref} · {gbp(done.total)}</Muted>
      <Muted style={{ textAlign: 'center', fontSize: 14.5, marginTop: 12, lineHeight: 21 }}>{done.status === 'awaiting_payment' ? "We couldn't confirm your payment yet. If money left your account, don't pay again; the Moma team will check it." : `${done.status === 'paid' ? 'We\'ll email your receipt and tracking once it ships' : 'We\'ll email you a secure payment link to finish your order'}. UK delivery takes 2 to 4 working days.`}</Muted>
      <View style={{ height: 20 }} /><Btn title="Back to shop" onPress={() => { setView('list'); setDone(null); }} style={{ alignSelf: 'stretch' }} />
    </ScrollView>
  );

  if (view === 'checkout') return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <Head title="Checkout" back={() => setView('cart')} />
      <Label>Full name</Label><Input value={ship.name} onChangeText={v => setShip('name', v)} placeholder="e.g. Amelia Jones" />
      <Label>Phone number</Label><Input value={ship.phone} onChangeText={v => setShip('phone', v)} placeholder="e.g. 07700 900123" keyboardType="phone-pad" />
      <Label>Email {pay === 'online' ? '(for your receipt)' : '(optional)'}</Label><Input value={ship.email} onChangeText={v => setShip('email', v)} placeholder="you@example.com" autoCapitalize="none" keyboardType="email-address" />
      <Label>Delivery address</Label><Input multiline value={ship.address} onChangeText={v => setShip('address', v)} placeholder="House number, street, town or city" />
      <Label>Postcode</Label><Input value={ship.state} onChangeText={v => setShip('state', v.toUpperCase())} placeholder="e.g. B1 1AA" autoCapitalize="characters" maxLength={8} />
      <Label>Payment</Label>
      <View style={{ gap: 8 }}>
        {cfg.paystack && <Pressable onPress={() => setPay('online')} style={{ borderWidth: 2, borderColor: pay === 'online' ? C.brand : C.line, backgroundColor: C.card, borderRadius: 20, padding: 14 }}><Text style={{ fontWeight: '700' }}>Pay now</Text><Muted>Card, Apple Pay or Google Pay, secured by Stripe</Muted></Pressable>}
        <Pressable onPress={() => setPay('delivery')} style={{ borderWidth: 2, borderColor: pay === 'delivery' ? C.brand : C.line, backgroundColor: C.card, borderRadius: 20, padding: 14 }}><Text style={{ fontWeight: '700' }}>Pay by link</Text><Muted>We email you a secure payment link once we confirm stock</Muted></Pressable>
      </View>
      <View style={{ backgroundColor: C.card, borderRadius: 22, padding: 16, marginTop: 16, gap: 6 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Muted>Items ({count})</Muted><Text>{gbp(sub)}</Text></View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Muted>Delivery</Muted><Text>{fee ? gbp(fee) : 'Free'}</Text></View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}><Text style={{ fontWeight: '800', fontSize: 17 }}>Total</Text><Text style={{ fontWeight: '800', fontSize: 17 }}>{gbp(sub + fee)}</Text></View>
      </View>
      {err ? <Text style={{ color: C.red, marginTop: 12 }}>{err}</Text> : null}
      <View style={{ height: 14 }} />
      {busy ? <ActivityIndicator color={C.brand} /> : <Btn title={pay === 'online' ? `Pay ${gbp(sub + fee)}` : `Place order · ${gbp(sub + fee)}`} onPress={place} />}
    </ScrollView>
  );

  if (view === 'cart') return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      <Head title="Your basket" back={() => setView('list')} />
      {!cart.length ? <Muted style={{ fontSize: 15 }}>Your basket is empty.</Muted> : cart.map(c => { const it = byId[c.id]; return (
        <View key={c.id} style={{ flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: C.card, borderRadius: 20, padding: 10, marginBottom: 10 }}>
          <View style={{ width: 72 }}><Pic p={it} h={72} r={14} /></View>
          <View style={{ flex: 1 }}><Text style={{ fontWeight: '700' }} numberOfLines={2}>{it.name}</Text><Muted>{gbp(it.price)}</Muted></View>
          <Qty n={c.qty} set={n => setQty(c.id, n)} />
        </View>); })}
      {cart.length ? <>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}><Muted>Subtotal</Muted><Text style={{ fontWeight: '700' }}>{gbp(sub)}</Text></View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}><Muted>Delivery</Muted><Text>{fee ? gbp(fee) : 'Free'}</Text></View>
        {cfg.freeOver && sub < cfg.freeOver ? <Muted style={{ marginTop: 6 }}>Free delivery on orders over {gbp(cfg.freeOver)}.</Muted> : null}
        <View style={{ height: 16 }} /><Btn title={`Checkout · ${gbp(sub + fee)}`} onPress={() => setView('checkout')} />
      </> : null}
      {s.orders.length ? <View style={{ marginTop: 26 }}><Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 8 }}>Your orders</Text>
        {s.orders.slice(0, 5).map(o => <View key={o.ref} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderColor: C.line }}><Text>{o.ref}</Text><Muted>{gbp(o.total)} · {o.status.replace('_', ' ')}</Muted></View>)}</View> : null}
    </ScrollView>
  );

  const Card = ({ x, w }: { x: Product; w: number }) => (
    <Pressable onPress={() => setOpen(x)} style={{ width: w }}>
      <View>
        <Pic p={x} h={w} r={20} />
        <View style={{ position: 'absolute', top: 8, right: 8 }}>
          <RoundBtn size={32} onPress={() => togFav(x.id)} label={isFav(x.id) ? `Remove ${x.name} from saved` : `Save ${x.name}`}><I d={HEART} size={16} color={isFav(x.id) ? C.brand : C.ink} fill={isFav(x.id) ? C.brand : 'none'} /></RoundBtn>
        </View>
        {x.stock === 0 ? <View style={{ position: 'absolute', top: 10, left: 10, backgroundColor: C.ink, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}><Text style={{ color: C.inv, fontSize: 10.5, fontWeight: '700' }}>Sold out</Text></View> : null}
      </View>
      <Text style={{ fontSize: 11, fontWeight: '600', color: C.muted, letterSpacing: 1, marginTop: 10 }}>{x.cat.toUpperCase()}</Text>
      <Text numberOfLines={1} style={{ fontSize: 15, fontWeight: '600', color: C.ink, marginTop: 2 }}>{x.name}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: C.ink }}>{gbp(x.price)}</Text>
        {x.stock === 0 ? null : inCart(x.id)
          ? <View style={{ minWidth: 30, height: 30, paddingHorizontal: 8, borderRadius: 15, backgroundColor: C.roseSoft, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: C.brand, fontWeight: '700', fontSize: 13 }}>{inCart(x.id)}</Text></View>
          : <Pressable accessibilityLabel={`Add ${x.name} to basket`} hitSlop={6} onPress={() => setQty(x.id, 1)} style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: C.brand, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#fff', fontSize: 18, fontWeight: '600', marginTop: -2 }}>+</Text></Pressable>}
      </View>
    </Pressable>
  );
  const heroTitle = stage === 'postpartum' ? `For you and baby${q ? `, day ${q.days + 1}` : ''}` : stage === 'late' ? `Get ready for baby${p ? `, week ${p.w}` : ''}` : `Picked for you${p ? `, week ${p.w}` : ''}`;

  return (
    <View style={{ flex: 1 }} onLayout={onLay}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: count ? 110 : 40 }} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Muted style={{ fontSize: 14 }}>Mama and baby essentials</Muted>
            <Text style={{ fontSize: 28, fontWeight: '700', color: C.ink, letterSpacing: -0.6 }}>Shop</Text>
          </View>
          <View>
            <RoundBtn size={46} onPress={() => setView('cart')} label={`Basket, ${count} items`}><I d={BAG} size={21} /></RoundBtn>
            {count ? <View style={{ position: 'absolute', top: -2, right: -2, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, backgroundColor: C.brand, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#fff', fontSize: 10.5, fontWeight: '700' }}>{count}</Text></View> : null}
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.card, borderRadius: 16, paddingHorizontal: 14, height: 48, marginTop: 16, borderWidth: 1, borderColor: C.line }}>
          <Search />
          <TextInput value={qText} onChangeText={setQText} placeholder="Search nappies, pads, kits…" placeholderTextColor={C.muted} style={{ flex: 1, fontSize: 15, color: C.ink, fontFamily: 'Outfit_400Regular', outlineStyle: 'none' } as any} returnKeyType="search" />
          {qText ? <Pressable onPress={() => setQText('')} accessibilityLabel="Clear search"><Text style={{ color: C.muted, fontSize: 16 }}>✕</Text></Pressable> : null}
        </View>

        {!needle && hero ? (
          <Pressable onPress={() => setOpen(hero)} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: P.brand, borderRadius: 26, padding: 18, marginTop: 18, gap: 14, overflow: 'hidden' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '600', letterSpacing: 1 }}>{heroTitle.toUpperCase()}</Text>
              <Text style={{ color: '#fff', fontSize: 19, fontWeight: '700', marginTop: 6, lineHeight: 24 }} numberOfLines={2}>{hero.name}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 4, lineHeight: 18 }} numberOfLines={2}>{hero.blurb}</Text>
              <View style={{ alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 99, paddingHorizontal: 14, paddingVertical: 8, marginTop: 12 }}>
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>{gbp(hero.price)}  ·  Shop now</Text>
              </View>
            </View>
            <View style={{ width: 112, height: 132 }}><Pic p={hero} h={132} r={20} /></View>
          </Pressable>
        ) : null}

        {list ? (
          <View style={{ backgroundColor: C.card, borderRadius: 20, padding: 16, marginTop: 16, borderWidth: 1.5, borderColor: C.line }}>
            <Text style={{ fontSize: 17, fontWeight: '700', color: C.ink }}>{list.who ? `${list.who}'s baby list` : 'Baby list'}</Text>
            <Muted style={{ marginTop: 4 }}>Add anything below to your cart and enter {list.who || 'her'} delivery details at checkout. We deliver across the UK.</Muted>
            <Pressable onPress={() => { setList(null); if (Platform.OS === 'web' && typeof window !== 'undefined') window.history.replaceState({}, '', window.location.pathname + '?tab=shop'); }} style={{ marginTop: 10 }}>
              <Text style={{ fontWeight: '700', color: C.ink, textDecorationLine: 'underline' }}>See the whole shop</Text>
            </Pressable>
          </View>
        ) : null}
        {!list && cat === 'Saved' && favs.length ? (
          <Pressable onPress={shareList} style={{ backgroundColor: C.ink, borderRadius: 99, paddingVertical: 12, paddingHorizontal: 18, marginTop: 16, alignSelf: 'flex-start' }}>
            <Text style={{ color: C.inv, fontWeight: '700' }}>Share as a baby list with family</Text>
          </Pressable>
        ) : null}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 20, marginBottom: 4 }}>
          {cats.map(c => <Pill key={c} label={c} on={cat === c} onPress={() => setCat(c)} />)}
        </ScrollView>

        {!needle && cat === 'All' && picks.length > 1 ? <>
          <Text style={{ fontSize: 18, fontWeight: '700', color: C.ink, marginTop: 20, marginBottom: 12 }}>For this stage</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
            {picks.map(x => <Card key={x.id} x={x} w={150} />)}
          </ScrollView>
        </> : null}

        <Text style={{ fontSize: 18, fontWeight: '700', color: C.ink, marginTop: 24, marginBottom: 12 }}>{needle ? `Results (${shown.length})` : cat === 'All' ? 'All essentials' : cat}</Text>
        {shown.length ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: 22 }}>
            {shown.map(x => <Card key={x.id} x={x} w={cardW} />)}
          </View>
        ) : <Muted style={{ fontSize: 15 }}>{cat === 'Saved' ? 'Tap the heart on anything you like to save it here.' : 'Nothing matches that yet. Try another word.'}</Muted>}

        <Muted style={{ textAlign: 'center', marginTop: 28, fontSize: 12 }}>UK delivery · Secure card payment{cfg.freeOver ? ` · Free over ${gbp(cfg.freeOver)}` : ''}</Muted>
        <Muted style={{ textAlign: 'center', marginTop: 4, fontSize: 12 }}>Products support your care. They don't replace your midwife or GP.</Muted>
      </ScrollView>
      {count ? <Pressable onPress={() => setView('cart')} style={{ position: 'absolute', left: 20, right: 20, bottom: 12, backgroundColor: C.ink, borderRadius: 18, height: 56, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ color: C.inv, fontWeight: '700', fontSize: 15.5 }}>View basket · {count} {count === 1 ? 'item' : 'items'}</Text><Text style={{ color: C.inv, fontWeight: '700', fontSize: 15.5 }}>{gbp(sub)}</Text>
      </Pressable> : null}
    </View>
  );
}
