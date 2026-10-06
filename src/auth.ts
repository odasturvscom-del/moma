// Sign-in with Google or an emailed code. Only the email address is kept on Moma's servers.
import { Platform } from 'react-native';
import { State } from './store';
import { apiBase } from './ai';
import { hello } from './telemetry';

export type AuthCfg = { google: string | null; email: boolean; required: boolean };
type Set = (fn: (x: State) => State) => void;
export let AUTH: AuthCfg | null = null;
// Ask for sign-in only when a feature needs it (community, bookings) and the person skipped it during setup.
export function needSignIn(s: State, set: Set, why: string) {
  if (!AUTH || !AUTH.required || s.account) return false;
  set(x => ({ ...x, authSkipped: false, signInWhy: why })); return true;
}

export async function authConfig(s: State): Promise<AuthCfg | null> {
  const base = apiBase(s); if (!base) return null;
  try {
    const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const t = setTimeout(() => ctl?.abort(), 5000);
    const r = await fetch(`${base}/auth?a=config`, { signal: ctl?.signal as any });
    clearTimeout(t);
    AUTH = r.ok ? await r.json() : null; return AUTH;
  } catch { return null; }
}

async function ax(s: State, set: Set, a: string, b: object) {
  const base = apiBase(s); if (!base) throw new Error('Sign-in needs the Moma server.');
  let st = s;
  if (!st.usecret) { const h = await hello(st, set); if (h) st = h.s; }
  if (!st.uid || !st.usecret) throw new Error("We couldn't reach Moma. Check your connection and try again.");
  const r = await fetch(`${base}/auth?a=${a}`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-moma-id': st.uid, 'x-moma-secret': st.usecret }, body: JSON.stringify(b) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `Error ${r.status}`);
  return j;
}
const done = (set: Set, j: any) => set(x => ({ ...x, account: j.account, authSkipped: false, signInWhy: undefined, ...(j.uid && j.secret ? { uid: j.uid, usecret: j.secret } : {}) }));

export const emailStart = (s: State, set: Set, email: string) => ax(s, set, 'email-start', { email });
export async function emailVerify(s: State, set: Set, email: string, code: string) { const j = await ax(s, set, 'email-verify', { email, code }); done(set, j); return j; }
export async function googleSignIn(s: State, set: Set, credential: string) { const j = await ax(s, set, 'google', { credential }); done(set, j); return j; }
const clear = (set: Set) => {
  set(x => ({ ...x, account: null, uid: null, usecret: null }));
  if (Platform.OS === 'web') try { (window as any).google?.accounts?.id?.disableAutoSelect?.(); } catch {}
};
export async function signOut(s: State, set: Set) { try { await ax(s, set, 'signout', {}); } catch {} clear(set); }
export async function deleteAccount(s: State, set: Set) { await ax(s, set, 'delete-account', {}); clear(set); }

// Loads Google's sign-in button (web only).
export function loadGoogle(clientId: string, el: string, onCredential: (c: string) => void) {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  const draw = () => {
    const g = (window as any).google?.accounts?.id; const node = document.getElementById(el);
    if (!g || !node) return;
    g.initialize({ client_id: clientId, callback: (r: any) => r?.credential && onCredential(r.credential), ux_mode: 'popup', auto_select: false, cancel_on_tap_outside: true });
    node.innerHTML = '';
    g.renderButton(node, { theme: 'outline', size: 'large', shape: 'pill', text: 'continue_with', logo_alignment: 'center', width: Math.min(340, node.clientWidth || 320) });
    try { g.prompt(); } catch {} // One Tap: a returning Google user signs in with a single tap
  };
  if ((window as any).google?.accounts?.id) return draw();
  let sc = document.getElementById('gsi-client') as HTMLScriptElement | null;
  if (!sc) { sc = document.createElement('script'); sc.id = 'gsi-client'; sc.src = 'https://accounts.google.com/gsi/client'; sc.async = true; document.head.appendChild(sc); }
  sc.addEventListener('load', draw);
}
