// Anonymous usage counts for the admin portal: event name plus stage and country. No ids, names or message text.
import { State, preg } from './store';
import { apiBase } from './ai';
export function track(s: State, e: string, extra: Record<string, unknown> = {}) {
  if (s.stats === false) return;
  const base = apiBase(s); if (!base) return;
  const p = preg(s);
  const props = { mode: s.mode, country: s.country, tri: s.mode === 'pregnant' && p ? p.tri : undefined, ...extra };
  fetch(`${base}/event`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ e, p: props }), keepalive: true } as RequestInit).catch(() => {});
}
export async function getConfig(s: State): Promise<{ announcement: string; askEnabled: boolean } | null> {
  const base = apiBase(s); if (!base) return null;
  try { const r = await fetch(`${base}/config`); if (!r.ok) return null; return await r.json(); } catch { return null; }
}
export async function sendFeedback(s: State, text: string, stage: string) {
  const base = apiBase(s); if (!base) throw new Error('Feedback needs the Moma server. Connect it above.');
  const r = await fetch(`${base}/feedback`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text, mode: s.mode, country: s.country, stage, version: '0.3' }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'Could not send feedback');
}
