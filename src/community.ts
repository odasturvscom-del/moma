// Community forum API calls.
import { State } from './store';
import { apiBase } from './ai';
import { hello } from './telemetry';

export type Group = { id: number; name: string; blurb: string; emoji: string; official: boolean; members: number; posts?: number; joined: boolean };
export type Post = { id: number; group: number; parent: number | null; nick: string; title: string | null; body: string; flag: { level: string; titles: string[] } | null;
  replies: number; hugs: number; hugged: boolean; pinned: boolean; at: string; last: string; mine: boolean; status: string };

export async function cx(s: State, set: (fn: (x: State) => State) => void, a: string, b?: object, qs = ''): Promise<any> {
  const base = apiBase(s); if (!base) throw new Error('The community needs the Moma server.');
  let st = s;
  if (!st.usecret) { const h = await hello(st, set); if (h) st = h.s; }
  const r = await fetch(`${base}/community?a=${a}${qs}`, { method: b ? 'POST' : 'GET',
    headers: { 'content-type': 'application/json', ...(st.uid && st.usecret ? { 'x-moma-id': st.uid, 'x-moma-secret': st.usecret } : {}) }, body: b ? JSON.stringify(b) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(j.error || `Error ${r.status}`), { needJoin: !!j.needJoin });
  return j;
}

export function ago(iso: string) {
  const m = Math.max(0, (Date.now() - new Date(iso).getTime()) / 6e4);
  if (m < 1) return 'just now'; if (m < 60) return `${Math.round(m)}m ago`;
  const h = m / 60; if (h < 24) return `${Math.round(h)}h ago`;
  const d = h / 24; if (d < 7) return `${Math.round(d)}d ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
