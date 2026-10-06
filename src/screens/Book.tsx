// Talk to an expert: book a paid appointment with one of Moma's recommended care experts (physician, midwife, lactation consultant, nutritionist, therapist...). Opens over the app so the tabs stay as they are.
import React, { useEffect, useState } from 'react';
import { View, ScrollView, Pressable, ActivityIndicator, Modal, Platform, Linking, Image } from 'react-native';
import { useStore } from '../store';
import { needSignIn } from '../auth';
import { Text, Muted, Btn, Input } from '../ui';
import { Mo } from '../mascot';
import { IBack, IStetho, ICheck } from '../icons';
import { C, P } from '../theme';
import { Provider, Day, Booking, Config, Kind, getProviders, getSlots, myBookings, book, verifyBooking, cancelBooking, icsFor, gbp, dayShort, dayLong, t12, STATUS, isDemo } from '../booking';

type Step = 'home' | 'type' | 'time' | 'details' | 'review' | 'done';
type Dlg = { title: string; body: string; ok?: string; onOk?: () => void; cancel?: string; danger?: boolean; extra?: React.ReactNode } | null;
const FLOW: Step[] = ['type', 'time', 'details', 'review'];
const REASONS = ['Pregnancy check-in', 'Pain or bleeding (not severe)', "Baby's health", 'Feeding', 'Recovery after birth', 'Mood and sleep', 'Medicine question', 'Something else'];
const KIND_INFO: Record<string, string> = { video: 'Face to face from home. We send the link before your time.', phone: 'Your expert calls the number you give us.', clinic: 'Meet in person at the partner clinic.' };
const tone = (k: string) => ({ ok: [C.mint, C.sage], wait: [C.butter, C.amber], off: [C.surf2, C.muted], bad: [C.redSoft, C.red] } as Record<string, string[]>)[k];

function Dialog({ d, close }: { d: Dlg; close: () => void }) {
  if (!d) return null;
  return (
    <Modal transparent animationType="fade" visible onRequestClose={close}>
      <Pressable onPress={close} style={{ flex: 1, backgroundColor: 'rgba(20,12,24,0.45)', alignItems: 'center', justifyContent: 'center', padding: 22 }}>
        <Pressable onPress={() => {}} style={{ width: '100%', maxWidth: 420, backgroundColor: C.card, borderRadius: 28, padding: 22 }}>
          <Text style={{ fontSize: 20, fontWeight: '700', color: C.ink, marginBottom: 8 }}>{d.title}</Text>
          <Text style={{ fontSize: 15, color: C.ink, lineHeight: 21, opacity: 0.85 }}>{d.body}</Text>
          {d.extra}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
            {d.cancel !== '' ? <Btn kind="ghost" title={d.cancel || (d.onOk ? 'Not now' : 'OK')} onPress={close} style={{ flex: 1 }} /> : null}
            {d.onOk ? <Btn kind={d.danger ? 'danger' : 'rose'} title={d.ok || 'Continue'} onPress={() => { close(); d.onOk!(); }} style={{ flex: 1 }} /> : null}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
const Pill = ({ status }: { status: string }) => { const [l, k] = STATUS[status] || [status, 'off']; const [bg, fg] = tone(k); return <View style={{ backgroundColor: bg, borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' }}><Text style={{ fontSize: 12, fontWeight: '700', color: fg }}>{l}</Text></View>; };
const Line = ({ l, v }: { l: string; v: string }) => <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: C.line }}><Text style={{ color: C.muted, fontSize: 14.5 }}>{l}</Text><Text style={{ color: C.ink, fontSize: 14.5, fontWeight: '600', flexShrink: 1, textAlign: 'right' }}>{v}</Text></View>;
const Box = ({ children, bg, style }: { children: React.ReactNode; bg?: string; style?: object }) => <View style={[{ backgroundColor: bg || C.card, borderRadius: 26, padding: 18, marginBottom: 12 }, style]}>{children}</View>;
const Choice = ({ on, onPress, children, disabled }: { on?: boolean; onPress: () => void; children: React.ReactNode; disabled?: boolean }) => (
  <Pressable disabled={disabled} onPress={onPress} style={({ pressed }) => ({ backgroundColor: on ? C.lav : C.card, borderRadius: 22, padding: 16, marginBottom: 10, borderWidth: 2, borderColor: on ? P.brand : 'transparent', opacity: disabled ? 0.4 : 1, transform: [{ scale: pressed ? 0.99 : 1 }] })}>{children}</Pressable>
);
function Avatar({ p, size = 64 }: { p: Provider; size?: number }) {
  if (p.photo) return <Image source={{ uri: p.photo }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: P.brand, alignItems: 'center', justifyContent: 'center' }}><IStetho color="#fff" size={size * 0.45} /></View>;
}

export default function Book({ close, openSupport, returnRef }: { close: () => void; openSupport: () => void; returnRef?: string | null }) {
  const { s, set } = useStore();
  useEffect(() => { if (!isDemo() && !returnRef) needSignIn(s, set, 'book an expert'); }, []);
  const [step, setStep] = useState<Step>('home');
  const [provs, setProvs] = useState<Provider[]>([]);
  const [prov, setProv] = useState<Provider | null>(null);
  const [role, setRole] = useState('All');
  const [cfg, setCfg] = useState<Config | null>(null);
  const [mine, setMine] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState('');
  const [kind, setKind] = useState<Kind | null>(null);
  const [days, setDays] = useState<Day[] | null>(null);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [name, setName] = useState(s.ship?.name || s.name || '');
  const [phone, setPhone] = useState(s.ship?.phone || '');
  const [email, setEmail] = useState(s.ship?.email || '');
  const [consent, setConsent] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Booking | null>(null);
  const [dlg, setDlg] = useState<Dlg>(null);

  const load = async () => {
    setLoading(true); setLoadErr('');
    try {
      const r = await getProviders(s, set); setProvs(r.items); setProv(r.items[0] || null); setCfg(r.config);
      setMine(await myBookings(s, set).catch(() => []));
    } catch (e: any) { setLoadErr(e.message); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);
  // Back from Stripe: check the payment, then show the result.
  useEffect(() => {
    if (!returnRef) return;
    if (Platform.OS === 'web' && typeof window !== 'undefined') window.history.replaceState({}, '', window.location.pathname);
    verifyBooking(s, set, returnRef).then(b => {
      if (b.status === 'confirmed') { setDone(b); setStep('done'); }
      else if (b.status === 'paid_rebook') setDlg({ title: 'Payment received', body: 'Your payment came through, but your time was taken while you were paying. The Moma team will call you to pick a new time or refund you in full.', cancel: '', ok: 'OK', onOk: () => {} });
      else setDlg({ title: 'Payment not finished', body: b.status === 'expired' ? 'Your 30 minute hold ran out before the payment finished, so nothing was charged. Please pick a time again.' : "We haven't received your payment yet. If you paid, it can take a minute to show. Otherwise you can pay again from your appointment.", ok: 'Pick a time', onOk: () => setStep('type') });
      myBookings(s, set).then(setMine).catch(() => {});
    }).catch(e => setDlg({ title: 'We could not check your payment', body: `${e.message} If money left your account, message the Moma team with your booking reference ${returnRef}.` }));
  }, [returnRef]);

  useEffect(() => {
    if (step !== 'time' || !prov) return;
    setDays(null); setErr('');
    getSlots(s, set, prov.id).then(d => { setDays(d); const first = d.find(x => x.slots.length); if (!date || !d.find(x => x.date === date && x.slots.length)) { setDate(first ? first.date : ''); setTime(''); } })
      .catch(e => { setErr(e.message); setDays([]); });
  }, [step]);

  const idx = FLOW.indexOf(step);
  const back = () => {
    if (step === 'home' || step === 'done') return close();
    if (step === 'type') return setStep('home');
    setStep(FLOW[idx - 1]); setErr('');
  };
  const leave = () => {
    if (idx >= 1) setDlg({ title: 'Leave booking?', body: "Your choices so far won't be saved and the time won't be held.", ok: 'Leave', cancel: 'Keep booking', onOk: close });
    else close();
  };
  const next = () => {
    setErr('');
    if (step === 'type') { if (!kind) return setErr('Pick how you want to meet.'); setStep('time'); }
    else if (step === 'time') { if (!date || !time) return setErr('Pick a day and a time.'); setStep('details'); }
    else if (step === 'details') {
      if (!reason) return setErr('Tell us what the appointment is about.');
      if (name.trim().length < 2) return setErr('Add your name.');
      if (!/^\+?\d[\d\s-]{9,}$/.test(phone.trim())) return setErr('Add a phone number we can reach you on, like 0803 123 4567.');
      if ((cfg?.stripe || cfg?.paystack) && !/^\S+@\S+\.\S+$/.test(email.trim())) return setErr('Add your email so we can send your receipt.');
      if (!consent) return setErr('Please tick the box to confirm you understand this is not for emergencies.');
      setStep('review');
    }
  };
  const submit = async () => {
    if (!prov || !kind) return;
    setBusy(true); setErr('');
    try {
      const back = Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin + '/app' : '';
      const r = await book(s, set, { provider: prov.id, kind: kind.id, date, time, name: name.trim(), phone: phone.trim(), email: email.trim(), reason, note: note.trim(), consent, back });
      if (!isDemo()) set(x => ({ ...x, ship: { ...x.ship, name: x.ship.name || name.trim(), phone: x.ship.phone || phone.trim(), email: x.ship.email || email.trim() } }));
      if (r.payUrl) { if (Platform.OS === 'web') window.location.href = r.payUrl; else Linking.openURL(r.payUrl); return; }
      setDone(r.booking); setStep('done');
      myBookings(s, set).then(setMine).catch(() => {});
    } catch (e: any) {
      if (e.status === 409) setDlg({ title: 'That time just went', body: 'Someone else booked it a moment ago. Your details are saved, so just pick another time.', ok: 'Pick another time', cancel: '', onOk: () => { setTime(''); setStep('time'); } });
      else setErr(e.message);
    }
    setBusy(false);
  };
  const cancel = (b: Booking) => {
    const hrs = cfg?.cancelHours ?? 24;
    const late = new Date(`${b.date}T${b.time}:00+01:00`).getTime() - Date.now() < hrs * 3600e3;
    setDlg({ title: 'Cancel this appointment?', danger: true, ok: 'Yes, cancel', cancel: 'Keep it',
      body: b.status === 'confirmed' ? (late ? `It's less than ${hrs} hours away, so this payment may not be refunded. The Moma team will be in touch.` : `You cancelled more than ${hrs} hours before, so the team will refund your ${gbp(b.fee)}.`) : 'Your time will be freed for someone else.',
      onOk: async () => {
        try { const r = await cancelBooking(s, set, b.ref); setMine(await myBookings(s, set).catch(() => mine));
          setDlg({ title: 'Appointment cancelled', body: r.refund ? `Your refund of ${gbp(b.fee)} will be sent to the card or account you paid with. It usually takes 3 to 5 working days.` : 'Done. You can book again any time.', cancel: '', ok: 'OK', onOk: () => {} }); }
        catch (e: any) { setDlg({ title: "Couldn't cancel", body: e.message }); }
      } });
  };
  const detail = (b: Booking) => setDlg({ title: `${b.kindLabel} · ${dayLong(b.date)}`, body: `${t12(b.time)} UK time, ${b.mins} minutes, ${gbp(b.fee)}. About: ${b.reason}.`, cancel: 'Close',
    extra: (
      <View style={{ marginTop: 12, gap: 8 }}>
        <Pill status={b.status} />
        <Muted style={{ fontSize: 13 }}>Reference {b.ref}</Muted>
        {b.link ? <Btn title="Join the call" onPress={() => Linking.openURL(b.link!)} /> : null}
        {['confirmed', 'requested'].includes(b.status) && Platform.OS === 'web' ? <Btn kind="ghost" title="Add to my calendar" onPress={() => icsFor(b)} /> : null}
        {['confirmed', 'requested', 'awaiting_payment'].includes(b.status) ? <Btn kind="ghost" title="Cancel appointment" onPress={() => { setDlg(null); setTimeout(() => cancel(b), 250); }} /> : null}
        <Btn kind="ghost" title="Message the Moma team" onPress={() => { setDlg(null); openSupport(); }} />
      </View>
    ) });

  const upcoming = mine.filter(b => ['requested', 'awaiting_payment', 'confirmed', 'paid_rebook'].includes(b.status));
  const past = mine.filter(b => !upcoming.includes(b)).slice(0, 6);
  const roles = ['All', ...Array.from(new Set(provs.map(p => p.role)))];
  const shown = provs.filter(p => role === 'All' || p.role === role);
  const startWith = (p: Provider) => { if (cfg && !cfg.open) return setDlg({ title: 'Bookings are paused', body: 'Our experts are not taking new bookings right now. Please check back soon, or message the Moma team.' }); if (prov?.id !== p.id) { setKind(null); setDate(''); setTime(''); } setProv(p); setStep('type'); };
  const day = days?.find(d => d.date === date);
  const am = day?.slots.filter(t => t < '12:00') || [], pm = day?.slots.filter(t => t >= '12:00') || [];
  const titles: Record<Step, string> = { home: 'Talk to an expert', type: 'How would you like to meet?', time: 'Pick a day and time', details: 'About you', review: 'Check and confirm', done: 'You\'re booked in' };

  const apptRow = (b: Booking) => (
    <Pressable key={b.ref} onPress={() => detail(b)} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: 1, borderTopColor: C.line, opacity: pressed ? 0.7 : 1 })}>
      <View style={{ width: 52, borderRadius: 16, backgroundColor: C.lav, alignItems: 'center', paddingVertical: 6 }}>
        <Text style={{ fontSize: 11.5, fontWeight: '700', color: C.ink, opacity: 0.7 }}>{dayShort(b.date).m.toUpperCase()}</Text>
        <Text style={{ fontSize: 20, fontWeight: '800', color: C.ink }}>{dayShort(b.date).n}</Text>
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: C.ink }}>{b.kindLabel} · {t12(b.time)}</Text>
        <Muted style={{ fontSize: 13 }} >{b.reason}</Muted>
      </View>
      <Pill status={b.status} />
    </Pressable>
  );

  let body: React.ReactNode = null;
  if (loading) body = <View style={{ paddingVertical: 60, alignItems: 'center' }}><ActivityIndicator color={C.ink} /><Muted style={{ marginTop: 10 }}>Loading…</Muted></View>;
  else if (loadErr || !provs.length || !prov) body = (
    <Box><Text style={{ fontSize: 17, fontWeight: '700', color: C.ink }}>Bookings aren't available right now</Text><Muted style={{ marginTop: 6 }}>{loadErr || 'No expert is taking bookings at the moment. Please check back soon.'}</Muted><Btn title="Try again" onPress={load} style={{ marginTop: 14 }} /></Box>
  );
  else if (step === 'home') body = (
    <>
      <Muted style={{ marginBottom: 12, fontSize: 14.5, lineHeight: 20 }}>Private appointments with experts Moma recommends, by video, phone or in person.</Muted>
      {roles.length > 2 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }} style={{ marginBottom: 12 }}>
          {roles.map(r => { const on = r === role; return <Pressable key={r} onPress={() => setRole(r)} style={{ paddingVertical: 9, paddingHorizontal: 14, borderRadius: 99, backgroundColor: on ? C.ink : C.card, borderWidth: on ? 0 : 1.5, borderColor: C.line }}><Text style={{ fontSize: 13.5, fontWeight: '600', color: on ? C.inv : C.ink }}>{r === 'All' ? 'All experts' : r}</Text></Pressable>; })}
        </ScrollView>
      ) : null}
      {shown.map((p, i) => (
        <Box key={p.id} bg={[C.lav, C.sky, C.peach, C.mint][i % 4]}>
          <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
            <Avatar p={p} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: C.ink, opacity: 0.6, letterSpacing: 0.6 }}>{p.role.toUpperCase()}</Text>
              <Text style={{ fontSize: 18, fontWeight: '700', color: C.ink, marginTop: 1 }}>{p.name}</Text>
              <Text style={{ fontSize: 13.5, color: C.ink, opacity: 0.75, marginTop: 2 }}>{p.title}</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
            <View style={{ backgroundColor: C.card, borderRadius: 99, paddingHorizontal: 10, paddingVertical: 5, flexDirection: 'row', alignItems: 'center', gap: 4 }}><ICheck size={14} color={C.sage} /><Text style={{ fontSize: 12.5, fontWeight: '600', color: C.ink }}>{p.verified && p.licence ? `Licence checked · ${p.licence}` : 'Recommended by Moma'}</Text></View>
            <View style={{ backgroundColor: C.card, borderRadius: 99, paddingHorizontal: 10, paddingVertical: 5 }}><Text style={{ fontSize: 12.5, fontWeight: '600', color: C.ink }}>{p.languages}</Text></View>
            <View style={{ backgroundColor: C.card, borderRadius: 99, paddingHorizontal: 10, paddingVertical: 5 }}><Text style={{ fontSize: 12.5, fontWeight: '600', color: C.ink }}>{p.mins} min</Text></View>
          </View>
          <Text style={{ fontSize: 14.5, color: C.ink, lineHeight: 20, marginTop: 12 }}>{p.bio}</Text>
          <Btn title={`Book · from ${gbp(Math.min(...p.kinds.map(k => k.fee)))}`} onPress={() => startWith(p)} style={{ marginTop: 16 }} />
        </Box>
      ))}
      <Box bg={C.redSoft}>
        <Text style={{ fontSize: 14.5, color: C.ink, lineHeight: 20 }}><Text style={{ fontWeight: '700', color: C.red }}>Not for emergencies. </Text>Heavy bleeding, fits, a severe headache, blurred vision, or your baby moving less: call 112 or go to the nearest hospital now.</Text>
        <Btn kind="danger" title="Call 999" onPress={() => Linking.openURL('tel:999')} style={{ marginTop: 10 }} />
      </Box>
      <Box>
        <Text style={{ fontSize: 17, fontWeight: '700', color: C.ink, marginBottom: 4 }}>Your appointments</Text>
        {upcoming.length ? upcoming.map(apptRow) : <Muted style={{ marginTop: 4 }}>Nothing booked yet. Your appointments will show here.</Muted>}
        {past.length ? <><Text style={{ fontSize: 13, fontWeight: '700', color: C.muted, marginTop: 14 }}>EARLIER</Text>{past.map(apptRow)}</> : null}
      </Box>
    </>
  );
  else if (step === 'type') body = (
    <>
      {prov.kinds.map(k => (
        <Choice key={k.id} on={kind?.id === k.id} onPress={() => { setKind(k); setErr(''); }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 17, fontWeight: '700', color: C.ink }}>{k.label}</Text>
            <Text style={{ fontSize: 17, fontWeight: '800', color: C.ink }}>{gbp(k.fee)}</Text>
          </View>
          <Muted style={{ marginTop: 4, fontSize: 14 }}>{KIND_INFO[k.id]}{k.id === 'clinic' && prov.clinic ? ` ${prov.clinic}.` : ''}</Muted>
          <Muted style={{ marginTop: 6, fontSize: 13 }}>{prov.mins} minutes</Muted>
        </Choice>
      ))}
    </>
  );
  else if (step === 'time') body = !days ? <View style={{ paddingVertical: 50, alignItems: 'center' }}><ActivityIndicator color={C.ink} /><Muted style={{ marginTop: 10 }}>Finding open times…</Muted></View> : !days.some(d => d.slots.length) ? (
    <Box><Text style={{ fontSize: 16, fontWeight: '700', color: C.ink }}>No open times in the next two weeks</Text><Muted style={{ marginTop: 6 }}>{prov.name} is fully booked. Message the Moma team and we'll find you a time.</Muted><Btn kind="ghost" title="Message the team" onPress={openSupport} style={{ marginTop: 12 }} /></Box>
  ) : (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 6 }} style={{ marginBottom: 12 }}>
        {days.map(d => { const on = d.date === date, n = d.slots.length, x = dayShort(d.date); return (
          <Pressable key={d.date} disabled={!n} onPress={() => { setDate(d.date); setTime(''); setErr(''); }}
            style={{ width: 64, paddingVertical: 10, borderRadius: 22, alignItems: 'center', backgroundColor: on ? C.ink : C.card, opacity: n ? 1 : 0.35, borderWidth: on ? 0 : 1.5, borderColor: C.line }}>
            <Text style={{ fontSize: 12, color: on ? C.inv : C.muted }}>{x.wd}</Text>
            <Text style={{ fontSize: 19, fontWeight: '800', color: on ? C.inv : C.ink }}>{x.n}</Text>
            <Text style={{ fontSize: 11, color: on ? C.inv : C.muted }}>{n ? `${n} free` : 'Full'}</Text>
          </Pressable>
        ); })}
      </ScrollView>
      {[['Morning', am], ['Afternoon', pm]].map(([l, list]) => (list as string[]).length ? (
        <View key={l as string} style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: C.muted, marginBottom: 8 }}>{(l as string).toUpperCase()}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {(list as string[]).map(t => { const on = t === time; return (
              <Pressable key={t} onPress={() => { setTime(t); setErr(''); }} style={{ minWidth: 92, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 16, alignItems: 'center', backgroundColor: on ? P.brand : C.card, borderWidth: 1.5, borderColor: on ? P.brand : C.line }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: on ? '#fff' : C.ink }}>{t12(t)}</Text>
              </Pressable>
            ); })}
          </View>
        </View>
      ) : null)}
      <Muted style={{ fontSize: 12.5 }}>All times are UK time.</Muted>
    </>
  );
  else if (step === 'details') body = (
    <>
      <Box>
        <Text style={{ fontSize: 16, fontWeight: '700', color: C.ink, marginBottom: 10 }}>What is it about?</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {REASONS.map(r => { const on = r === reason; return <Pressable key={r} onPress={() => { setReason(r); setErr(''); }} style={{ paddingVertical: 9, paddingHorizontal: 14, borderRadius: 99, backgroundColor: on ? P.brand : C.surf2 }}><Text style={{ fontSize: 13.5, fontWeight: '600', color: on ? '#fff' : C.ink }}>{r}</Text></Pressable>; })}
        </View>
        <Input value={note} onChangeText={setNote} multiline maxLength={800} placeholder="Anything your expert should know before? (optional)" style={{ marginTop: 12 }} />
        <Muted style={{ fontSize: 12.5, marginTop: 6 }}>Only your expert and the Moma care team see this.</Muted>
      </Box>
      <Box>
        <Text style={{ fontSize: 16, fontWeight: '700', color: C.ink, marginBottom: 10 }}>Your details</Text>
        <Input value={name} onChangeText={setName} placeholder="Your name" autoComplete="name" maxLength={80} />
        <Input value={phone} onChangeText={setPhone} placeholder="Phone number, e.g. 0803 123 4567" keyboardType="phone-pad" autoComplete="tel" maxLength={20} style={{ marginTop: 10 }} />
        <Input value={email} onChangeText={setEmail} placeholder={(cfg?.stripe || cfg?.paystack) ? 'Email for your receipt' : 'Email (optional)'} keyboardType="email-address" autoCapitalize="none" autoComplete="email" maxLength={120} style={{ marginTop: 10 }} />
        <Pressable onPress={() => { setConsent(c => !c); setErr(''); }} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginTop: 14 }}>
          <View style={{ width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: P.brand, backgroundColor: consent ? P.brand : 'transparent', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>{consent ? <ICheck size={16} color="#fff" /> : null}</View>
          <Text style={{ flex: 1, fontSize: 14, color: C.ink, lineHeight: 20 }}>I understand this is not an emergency service. If I'm in danger I'll call 999 or my maternity unit.</Text>
        </Pressable>
      </Box>
    </>
  );
  else if (step === 'review' && kind) body = (
    <>
      <Box>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 8 }}><Avatar p={prov} size={44} /><View style={{ flex: 1 }}><Text style={{ fontSize: 16, fontWeight: '700', color: C.ink }}>{prov.name}</Text><Muted style={{ fontSize: 13 }}>{prov.title}</Muted></View></View>
        <Line l="Type" v={kind.label} />
        <Line l="When" v={`${dayLong(date)}, ${t12(time)}`} />
        <Line l="Length" v={`${prov.mins} minutes`} />
        <Line l="About" v={reason} />
        <Line l="Name" v={name.trim()} />
        <Line l="Phone" v={phone.trim()} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12 }}><Text style={{ fontSize: 17, fontWeight: '700', color: C.ink }}>Total</Text><Text style={{ fontSize: 20, fontWeight: '800', color: C.ink }}>{gbp(kind.fee)}</Text></View>
      </Box>
      <Box bg={(cfg?.stripe || cfg?.paystack) ? C.mint : C.butter}>
        <Text style={{ fontSize: 14.5, color: C.ink, lineHeight: 20 }}>{(cfg?.stripe || cfg?.paystack)
          ? "You'll pay securely with Stripe by card, Apple Pay or Google Pay. We hold your time for 30 minutes while you pay."
          : "Online payment is coming soon. Send your request now and the Moma team will call you to confirm your time and how to pay. Nothing is charged yet."}</Text>
      </Box>
      <Muted style={{ fontSize: 12.5, textAlign: 'center' }}>Cancel free up to {cfg?.cancelHours ?? 24} hours before your appointment.</Muted>
    </>
  );
  else if (step === 'done' && done) body = (
    <>
      <Box bg={C.mint} style={{ alignItems: 'center', paddingVertical: 24 }}>
        <Mo size={96} pose="hug" />
        <Text style={{ fontSize: 22, fontWeight: '800', color: C.ink, marginTop: 10, textAlign: 'center' }}>{done.status === 'confirmed' ? "You're booked in!" : 'Request sent!'}</Text>
        <Text style={{ fontSize: 15, color: C.ink, marginTop: 6, textAlign: 'center' }}>{done.kindLabel} · {dayLong(done.date)} at {t12(done.time)}</Text>
        <Text style={{ fontSize: 13, color: C.ink, opacity: 0.7, marginTop: 6 }}>Reference {done.ref}</Text>
      </Box>
      <Box>
        <Text style={{ fontSize: 16, fontWeight: '700', color: C.ink, marginBottom: 8 }}>What happens next</Text>
        {(done.status === 'confirmed'
          ? ['Your payment went through and your time is held.', done.kind === 'video' ? "We'll send the video link here before your appointment." : done.kind === 'phone' ? `${done.provider || 'Your expert'} will call ${phone.trim() || 'you'} at your time.` : "We'll send the clinic address here before your visit.", 'Write down any questions so you remember them on the day.']
          : ['The Moma team will call you to confirm your time.', "They'll explain how to pay. Nothing has been charged.", 'Your appointment shows as confirmed here once it\'s sorted.']).map((t, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}><View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: C.lav, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 12, fontWeight: '800', color: C.ink }}>{i + 1}</Text></View><Text style={{ flex: 1, fontSize: 14.5, color: C.ink, lineHeight: 20 }}>{t}</Text></View>
        ))}
      </Box>
      {Platform.OS === 'web' ? <Btn kind="ghost" title="Add to my calendar" onPress={() => icsFor(done)} style={{ marginBottom: 10 }} /> : null}
      <Btn title="See my appointments" onPress={() => { setStep('home'); setKind(null); setTime(''); setReason(''); setNote(''); setConsent(false); setDone(null); }} />
    </>
  );

  const showFooter = !loading && prov && FLOW.includes(step);
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8 }}>
        <Pressable accessibilityLabel="Back" onPress={back} hitSlop={10} style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' }}><IBack color={C.ink} size={22} /></Pressable>
        <Text style={{ flex: 1, fontSize: 20, fontWeight: '700', color: C.ink, letterSpacing: -0.4 }}>{titles[step]}</Text>
        {FLOW.includes(step) ? <Pressable onPress={leave} hitSlop={10}><Text style={{ fontSize: 14.5, fontWeight: '600', color: C.muted }}>Close</Text></Pressable> : null}
      </View>
      {FLOW.includes(step) ? (
        <View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: 20, marginBottom: 6 }}>
          {FLOW.map((f, i) => <View key={f} style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: i <= idx ? P.brand : C.line }} />)}
        </View>
      ) : null}
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 10, paddingBottom: 30 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {FLOW.includes(step) ? <Muted style={{ marginBottom: 12, fontSize: 13 }}>Step {idx + 1} of {FLOW.length}</Muted> : null}
        {body}
      </ScrollView>
      {showFooter ? (
        <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: Platform.OS === 'web' ? 18 : 10, borderTopWidth: 1, borderTopColor: C.line, backgroundColor: C.bg }}>
          {err ? <Text style={{ color: C.red, fontSize: 14, marginBottom: 8, fontWeight: '500' }}>{err}</Text> : null}
          {step === 'time' && date && time ? <Muted style={{ fontSize: 13, marginBottom: 8 }}>{dayLong(date)} at {t12(time)} · {kind ? gbp(kind.fee) : ''}</Muted> : null}
          {step === 'review'
            ? (busy ? <View style={{ height: 56, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={C.ink} /></View>
              : <Btn title={(cfg?.stripe || cfg?.paystack) ? `Pay ${kind ? gbp(kind.fee) : ''}` : 'Send booking request'} onPress={submit} />)
            : <Btn title="Continue" onPress={next} />}
        </View>
      ) : null}
      <Dialog d={dlg} close={() => setDlg(null)} />
    </View>
  );
}
