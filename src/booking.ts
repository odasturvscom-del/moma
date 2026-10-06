// Talk to an expert (Moma Care). Times are UK time. In ?demo mode nothing touches the server.
import { Platform } from 'react-native';
import { State } from './store';
import { apiBase } from './ai';
import { hello } from './telemetry';

export type Kind = { id: 'video' | 'phone' | 'clinic'; label: string; fee: number };
export type Provider = { id: number; role: string; name: string; title: string; bio: string; verified: boolean; licence: string | null; languages: string; photo: string | null; clinic: string | null; mins: number; kinds: Kind[] };
export type Day = { date: string; slots: string[] };
export type Booking = { ref: string; kind: string; kindLabel: string; at: string; date: string; time: string; mins: number; fee: number; status: string; reason: string; note: string | null;
  provider: string | null; link: string | null; holdUntil: string | null; refundDue: boolean; payment: string };
export type Config = { stripe?: boolean; paystack: boolean; open: boolean; cancelHours: number };

export const isDemo = () => Platform.OS === 'web' && typeof window !== 'undefined' && /[?&]demo/.test(window.location.search);
export const gbp = (n: number) => '£' + Number(n || 0).toLocaleString('en-GB');
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const ud = (date: string) => new Date(date + 'T12:00:00Z');
export const dayShort = (date: string) => { const d = ud(date); return { wd: WD[d.getUTCDay()], n: d.getUTCDate(), m: MON[d.getUTCMonth()] }; };
export const dayLong = (date: string) => { const d = ud(date); return `${WD[d.getUTCDay()]} ${d.getUTCDate()} ${MON[d.getUTCMonth()]}`; };
export const t12 = (hm: string) => { const [h, m] = hm.split(':').map(Number); return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`; };
export const STATUS: Record<string, [string, 'ok' | 'wait' | 'off' | 'bad']> = {
  requested: ['Request sent', 'wait'], awaiting_payment: ['Awaiting payment', 'wait'], confirmed: ['Confirmed', 'ok'], completed: ['Completed', 'off'],
  cancelled: ['Cancelled', 'off'], expired: ['Not paid in time', 'off'], no_show: ['Missed', 'bad'], paid_rebook: ['Paid, team will rebook', 'bad'],
};

// ---- demo data (preview only)
const DEMO_P: Provider = { id: 0, role: 'Midwife', name: 'Moma Partner Midwife', title: 'Independent midwife · Pregnancy, birth and postnatal care', verified: false, licence: null, languages: 'English', photo: null,
  bio: "Moma's recommended independent midwife. Book a private chat about your pregnancy, birth preferences, recovery after birth, feeding, or anything worrying you. This sits alongside your NHS care, never instead of it.",
  clinic: 'London (address shared after booking)', mins: 30, kinds: [{ id: 'video', label: 'Video call', fee: 45 }, { id: 'phone', label: 'Phone call', fee: 35 }, { id: 'clinic', label: 'Clinic visit', fee: 65 }] };
// UK clock (GMT or BST) for any moment.
const ukOff = (t: number) => { const p: any = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(t)).map(x => [x.type, x.value])); return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute) - Math.floor(t / 60000) * 60000; };
const ukToday = () => new Date(Date.now() + ukOff(Date.now())).toISOString().slice(0, 10);
const plus = (d: string, n: number) => new Date(Date.parse(d + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10);
function demoDays(): Day[] {
  const out: Day[] = [], t0 = ukToday();
  for (let i = 0; i < 14; i++) {
    const d = plus(t0, i), w = ud(d).getUTCDay();
    const hrs = w === 0 ? [] : w === 6 ? [10, 14] : [9, 17];
    const slots: string[] = [];
    if (hrs.length) for (let m = hrs[0] * 60; m + 30 <= hrs[1] * 60; m += 30) if ((m / 30 + i) % 4 !== 1 && !(i === 0 && m < 15 * 60)) slots.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
    out.push({ date: d, slots });
  }
  return out;
}
let DEMO_B: Booking[] = [];

async function bx(s: State, set: (fn: (x: State) => State) => void, a: string, b?: object, qs = ''): Promise<any> {
  const base = apiBase(s); if (!base) throw new Error('Booking needs the Moma server.');
  let st = s;
  if (!st.usecret && !['providers', 'slots'].includes(a)) { const h = await hello(st, set); if (h) st = h.s; }
  const r = await fetch(`${base}/booking?a=${a}${qs}`, { method: b ? 'POST' : 'GET',
    headers: { 'content-type': 'application/json', ...(st.uid && st.usecret ? { 'x-moma-id': st.uid, 'x-moma-secret': st.usecret } : {}) }, body: b ? JSON.stringify(b) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(j.error || 'Something went wrong. Please try again.'), { status: r.status });
  return j;
}
const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

export async function getProviders(s: State, set: any): Promise<{ items: Provider[]; config: Config }> {
  if (isDemo()) { await wait(300); return { items: [DEMO_P], config: { paystack: false, open: true, cancelHours: 24 } }; }
  return bx(s, set, 'providers');
}
export async function getSlots(s: State, set: any, p: number): Promise<Day[]> {
  if (isDemo()) { await wait(350); return demoDays(); }
  return (await bx(s, set, 'slots', undefined, `&p=${p}`)).days;
}
export async function myBookings(s: State, set: any): Promise<Booking[]> {
  if (isDemo()) return DEMO_B;
  if (!s.usecret) return [];
  return (await bx(s, set, 'mine')).items;
}
export async function book(s: State, set: any, b: Record<string, unknown>): Promise<{ booking: Booking; payUrl?: string }> {
  if (isDemo()) {
    await wait(700);
    const p = DEMO_P, k = p.kinds.find(x => x.id === b.kind)!;
    const bk: Booking = { ref: 'SLB-DEMO' + Math.floor(Math.random() * 90 + 10), kind: k.id, kindLabel: k.label, at: new Date().toISOString(), date: String(b.date), time: String(b.time), mins: 30, fee: k.fee,
      status: 'requested', reason: String(b.reason), note: String(b.note || '') || null, provider: p.name, link: null, holdUntil: null, refundDue: false, payment: 'arranged' };
    DEMO_B = [bk, ...DEMO_B];
    return { booking: bk };
  }
  return bx(s, set, 'book', b);
}
export async function verifyBooking(s: State, set: any, ref: string): Promise<Booking> {
  return (await bx(s, set, 'verify', undefined, `&ref=${encodeURIComponent(ref)}`)).booking;
}
export async function cancelBooking(s: State, set: any, ref: string): Promise<{ refund: boolean; paid: boolean }> {
  if (isDemo()) { await wait(400); DEMO_B = DEMO_B.map(x => (x.ref === ref ? { ...x, status: 'cancelled' } : x)); return { refund: false, paid: false }; }
  return bx(s, set, 'cancel', { ref });
}
// Calendar file for the web app (UK time, GMT or BST).
export function icsFor(b: Booking) {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  const g = Date.parse(`${b.date}T${b.time}:00Z`), st = new Date(g - ukOff(g - ukOff(g))), en = new Date(st.getTime() + b.mins * 6e4);
  const f = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Moma//Care//EN', 'BEGIN:VEVENT', `UID:${b.ref}@moma`, `DTSTAMP:${f(new Date())}`, `DTSTART:${f(st)}`, `DTEND:${f(en)}`,
    `SUMMARY:Moma appointment with ${b.provider || 'your expert'} (${b.kindLabel})`, `DESCRIPTION:Booking ${b.ref}. ${b.link ? 'Join: ' + b.link : 'Open Moma for details.'}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' })); a.download = `moma-${b.ref}.ics`; a.click();
}
