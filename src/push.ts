// Web push: turn notifications on or off for this phone or browser.
import { Platform } from 'react-native';
import { State } from './store';
import { apiBase } from './ai';

const w: any = typeof window !== 'undefined' ? window : {};
export const pushSupported = () => Platform.OS === 'web' && 'serviceWorker' in (w.navigator || {}) && 'PushManager' in w && 'Notification' in w;
export const isIOS = () => Platform.OS === 'web' && /iPhone|iPad|iPod/.test(w.navigator?.userAgent || '');
export const isInstalled = () => Platform.OS === 'web' && (w.matchMedia?.('(display-mode: standalone)').matches || w.navigator?.standalone === true);

const keyBytes = (b64: string) => { const s = (b64 + '='.repeat((4 - b64.length % 4) % 4)).replace(/-/g, '+').replace(/_/g, '/'); const r = atob(s); return Uint8Array.from(r, c => c.charCodeAt(0)); };
const post = (st: State, a: string, b: object) => fetch(`${apiBase(st)}/push?a=${a}`, { method: 'POST',
  headers: { 'content-type': 'application/json', ...(st.uid && st.usecret ? { 'x-moma-id': st.uid, 'x-moma-secret': st.usecret } : {}) }, body: JSON.stringify(b) });

export async function pushStatus(): Promise<'on' | 'off' | 'blocked' | 'unsupported'> {
  if (!pushSupported()) return 'unsupported';
  if (w.Notification.permission === 'denied') return 'blocked';
  const reg = await w.navigator.serviceWorker.getRegistration('/');
  const sub = reg ? await reg.pushManager.getSubscription() : null;
  return sub ? 'on' : 'off';
}

export async function pushOn(st: State) {
  if (isIOS() && !isInstalled()) throw new Error('On iPhone, add Moma to your Home Screen first (Share, then Add to Home Screen), open it from there and turn this on.');
  if (!pushSupported()) throw new Error('This browser does not support notifications.');
  const k = await (await fetch(`${apiBase(st)}/push?a=key`)).json().catch(() => ({}));
  if (!k.key) throw new Error('Notifications are not switched on yet. Please try again later.');
  const perm = await w.Notification.requestPermission();
  if (perm !== 'granted') throw new Error('Notifications are blocked. You can allow them in your browser settings.');
  const reg = (await w.navigator.serviceWorker.getRegistration('/')) || (await w.navigator.serviceWorker.register('/sw.js'));
  await w.navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(k.key) }));
  const r = await post(st, 'subscribe', { endpoint: sub.endpoint });
  if (!r.ok) throw new Error('Could not turn on notifications. Please try again.');
}

export async function pushOff(st: State) {
  const reg = await w.navigator.serviceWorker.getRegistration('/');
  const sub = reg ? await reg.pushManager.getSubscription() : null;
  if (sub) { await post(st, 'unsubscribe', { endpoint: sub.endpoint }).catch(() => {}); await sub.unsubscribe(); }
}
