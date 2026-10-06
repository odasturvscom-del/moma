// Voice and translation helpers. Recording uses the browser's microphone (web app); playback uses
// Moma's spoken voice from the server, or the phone's own voice if that isn't available.
import { Platform } from 'react-native';
import { State } from './store';
import { apiBase } from './ai';

export const LANGS = ['English', 'Welsh', 'Polish', 'Romanian', 'Urdu', 'Punjabi', 'Bengali', 'Arabic'];
const idH = (s: State): Record<string, string> => (s.uid && s.usecret ? { 'x-moma-id': s.uid, 'x-moma-secret': s.usecret } : {});
async function post(s: State, a: string, b: object) {
  const base = apiBase(s); if (!base) throw new Error('Voice needs the Moma server');
  const r = await fetch(`${base}/voice?a=${a}`, { method: 'POST', headers: { 'content-type': 'application/json', ...idH(s) }, body: JSON.stringify(b) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `Error ${r.status}`);
  return j;
}

export const canRecord = () => Platform.OS === 'web' && typeof window !== 'undefined' && !!(navigator as any).mediaDevices?.getUserMedia && typeof (window as any).MediaRecorder !== 'undefined';

export type Rec = { stop: () => Promise<{ b64: string; mime: string } | null>; cancel: () => void };
export async function startRecording(maxMs = 60000): Promise<Rec> {
  const stream = await (navigator as any).mediaDevices.getUserMedia({ audio: true });
  const MR = (window as any).MediaRecorder;
  const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'].find(m => MR.isTypeSupported?.(m)) || '';
  const rec = new MR(stream, mime ? { mimeType: mime } : undefined);
  const chunks: Blob[] = [];
  rec.ondataavailable = (e: any) => e.data && e.data.size && chunks.push(e.data);
  rec.start();
  let done: ((v: { b64: string; mime: string } | null) => void) | null = null;
  const finished = new Promise<{ b64: string; mime: string } | null>(r => (done = r));
  let cancelled = false;
  rec.onstop = async () => {
    stream.getTracks().forEach((t: any) => t.stop());
    if (cancelled || !chunks.length) return done!(null);
    const blob = new Blob(chunks, { type: rec.mimeType || mime || 'audio/webm' });
    const buf = new Uint8Array(await blob.arrayBuffer());
    let bin = ''; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
    done!({ b64: btoa(bin), mime: blob.type });
  };
  const timer = setTimeout(() => rec.state !== 'inactive' && rec.stop(), maxMs);
  return {
    stop: () => { clearTimeout(timer); if (rec.state !== 'inactive') rec.stop(); return finished; },
    cancel: () => { cancelled = true; clearTimeout(timer); if (rec.state !== 'inactive') rec.stop(); },
  };
}

export async function transcribe(s: State, rec: { b64: string; mime: string }): Promise<string> {
  const j = await post(s, 'stt', { audio: rec.b64, mime: rec.mime, lang: s.lang });
  return String(j.text || '').trim();
}

let current: any = null;
export function stopSpeaking() {
  try { current?.pause?.(); } catch {}
  current = null;
  try { (window as any).speechSynthesis?.cancel(); } catch {}
}
export async function speak(s: State, text: string, onEnd?: () => void) {
  stopSpeaking();
  try {
    const j = await post(s, 'tts', { text, lang: s.lang });
    if (j.audio && Platform.OS === 'web') {
      const a = new (window as any).Audio(`data:${j.mime || 'audio/mpeg'};base64,${j.audio}`);
      current = a; a.onended = () => { current = null; onEnd?.(); };
      await a.play(); return;
    }
  } catch {}
  const ss = Platform.OS === 'web' ? (window as any).speechSynthesis : null;
  if (!ss) { onEnd?.(); throw new Error("This device can't read aloud yet"); }
  const u = new (window as any).SpeechSynthesisUtterance(text.replace(/[*#_`>]/g, ''));
  u.lang = 'en-GB'; u.rate = 0.98; u.onend = () => onEnd?.();
  ss.speak(u);
}

export async function translate(s: State, text: string, to: string): Promise<string> {
  const j = await post(s, 'translate', { text, to });
  return String(j.text || '');
}
