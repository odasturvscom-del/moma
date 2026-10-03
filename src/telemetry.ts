// Talks to the Moma server: usage counts, app config, feedback and the human support chat.
// Health logs and Ask Moma chats never leave the phone. The server only knows a random id, stage, week and country.
import { Platform } from 'react-native';
import { State, preg, pp } from './store';
import { apiBase } from './ai';

export const VERSION = '0.4';
export function uuid() {
  const b = new Uint8Array(16);
  const c: any = (globalThis as any).crypto;
  if (c?.getRandomValues) c.getRandomValues(b); else for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256);
  b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map(x => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
const idHeaders = (s: State): Record<string, string> => (s.uid && s.usecret ? { 'x-moma-id': s.uid, 'x-moma-secret': s.usecret } : {});
const week = (s: State) => { const p = preg(s), q = pp(s); return s.mode === 'pregnant' ? p?.w ?? null : q?.w ?? null; };

export function track(s: State, e: string, extra: Record<string, unknown> = {}) {
  if (s.stats === false) return;
  const base = apiBase(s); if (!base) return;
  const p = preg(s);
  const props = { mode: s.mode, country: s.country, tri: s.mode === 'pregnant' && p ? p.tri : undefined, ...extra };
  fetch(`${base}/event`, { method: 'POST', headers: { 'content-type': 'application/json', ...idHeaders(s) }, body: JSON.stringify({ e, p: props }), keepalive: true } as RequestInit).catch(() => {});
}

// Registers this install (random id) and refreshes stage, week and country. Returns unread support replies.
export async function hello(s: State, set: (fn: (x: State) => State) => void): Promise<{ s: State; unread: number } | null> {
  const base = apiBase(s); if (!base) return null;
  const uid = s.uid || uuid();
  try {
    const r = await fetch(`${base}/app?a=hello`, { method: 'POST', headers: { 'content-type': 'application/json', ...idHeaders({ ...s, uid }) },
      body: JSON.stringify({ id: uid, mode: s.mode, week: week(s), country: s.country, platform: Platform.OS, version: VERSION, stats: s.stats !== false, onboarded: s.onboarded }) });
    if (r.status === 401 && !s.usecret) { set(x => ({ ...x, uid: null })); return null; }
    if (!r.ok) return null;
    const j = await r.json();
    const next = { ...s, uid, usecret: j.secret };
    set(x => ({ ...x, uid, usecret: j.secret }));
    return { s: next, unread: j.unread || 0 };
  } catch { return null; }
}

export async function getConfig(s: State): Promise<{ announcement: string; askEnabled: boolean; supportOn: boolean; supportHours: string } | null> {
  const base = apiBase(s); if (!base) return null;
  try { const r = await fetch(`${base}/config`); if (!r.ok) return null; return await r.json(); } catch { return null; }
}

export type SupportMsg = { id: number; from: 'user' | 'staff' | 'system'; body: string; at: string; name: string | null };
async function call(s: State, path: string, init: RequestInit = {}) {
  const base = apiBase(s); if (!base) throw new Error('Support needs the Moma server. Connect it in Me.');
  const r = await fetch(`${base}/app?a=${path}`, { ...init, headers: { 'content-type': 'application/json', ...idHeaders(s), ...(init.headers as any) } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `Error ${r.status}`);
  return j;
}
export const supportThread = (s: State): Promise<{ messages: SupportMsg[]; conversation: { id: number; status: string } | null }> => call(s, 'thread');
export const supportSend = (s: State, body: string, name?: string) => call(s, 'send', { method: 'POST', body: JSON.stringify({ body, name }) });
export const deleteServerData = (s: State) => call(s, 'delete', { method: 'POST' });

export async function sendFeedback(s: State, text: string, stage: string) {
  const base = apiBase(s); if (!base) throw new Error('Feedback needs the Moma server. Connect it above.');
  const r = await fetch(`${base}/feedback`, { method: 'POST', headers: { 'content-type': 'application/json', ...idHeaders(s) }, body: JSON.stringify({ text, mode: s.mode, country: s.country, stage, version: VERSION }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'Could not send feedback');
}
