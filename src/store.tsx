import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { Country } from './content';

export const DAY = 864e5;
export type Mode = 'pregnant' | 'postpartum';
export type Log = { mood?: number; sym?: string[]; note?: string };
export type ChatMsg = { r: 'u' | 'a' | 'f'; c: string; level?: string; call?: string };
export type State = {
  onboarded: boolean; name: string; mode: Mode; lmp: string | null; birth: string | null; country: Country;
  logs: Record<string, Log>; moves: number[]; ctx: { s: number; e?: number }[];
  feeds: { t: number; k: string }[]; nappies: { t: number; k: string }[];
  appts: { id: number; t: string; d: string }[]; chat: ChatMsg[];
  ai: { serverUrl: string };
};
export const DEFAULT: State = {
  onboarded: false, name: '', mode: 'pregnant', lmp: null, birth: null, country: 'UK',
  logs: {}, moves: [], ctx: [], feeds: [], nappies: [], appts: [], chat: [],
  ai: { serverUrl: process.env.EXPO_PUBLIC_MOMA_API_URL ?? '' },
};
const KEY = 'moma.v1';

export const dkey = (d: Date = new Date()) => {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 6e4);
  return z.toISOString().slice(0, 10);
};
export const parseKey = (k: string) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
export const fmtDate = (k: string | Date) => (typeof k === 'string' ? parseKey(k) : k).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
export const fmtTime = (t: number) => new Date(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
export const ago = (t: number) => { const m = Math.round((Date.now() - t) / 6e4); if (m < 1) return 'just now'; if (m < 60) return `${m} min ago`; return `${Math.floor(m / 60)}h ${m % 60}m ago`; };
const daysSince = (k: string) => Math.max(0, Math.floor((parseKey(dkey()).getTime() - parseKey(k).getTime()) / DAY));

export function preg(s: State) {
  if (!s.lmp) return null;
  const d = daysSince(s.lmp);
  return { days: d, w: Math.floor(d / 7), d: d % 7, due: new Date(parseKey(s.lmp).getTime() + 280 * DAY), left: 280 - d, tri: d < 98 ? 1 : d < 196 ? 2 : 3 };
}
export function pp(s: State) {
  if (!s.birth) return null;
  const d = daysSince(s.birth);
  return { days: d, w: Math.floor(d / 7), d: d % 7 };
}
export function last7(s: State) {
  const out = { sym: {} as Record<string, number>, moods: [] as number[], days: 0, notes: [] as string[] };
  Object.entries(s.logs).forEach(([k, v]) => {
    if (daysSince(k) < 7) {
      out.days++;
      (v.sym ?? []).forEach(x => (out.sym[x] = (out.sym[x] ?? 0) + 1));
      if (v.mood) out.moods.push(v.mood);
      if (v.note) out.notes.push(`${k}: ${v.note}`);
    }
  });
  return out;
}

type Ctx = { s: State; set: (fn: (s: State) => State) => void; ready: boolean; reset: () => Promise<void> };
const StoreCtx = createContext<Ctx>(null as unknown as Ctx);
export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [s, setS] = useState<State>(DEFAULT);
  const [ready, setReady] = useState(false);
  const loaded = useRef(false);
  useEffect(() => {
    // Web preview with sample data: add ?demo to the link. Nothing is saved in demo mode.
    if (Platform.OS === 'web' && typeof window !== 'undefined' && /[?&]demo/.test(window.location.search)) {
      const today = new Date(); const back = (n: number) => dkey(new Date(today.getTime() - n * DAY));
      setS({ ...DEFAULT, onboarded: true, name: 'Ada', lmp: back(14 * 7 + 3),
        logs: { [back(1)]: { mood: 4, sym: ['Tired'] }, [back(2)]: { mood: 3, sym: ['Nausea'] }, [back(3)]: { mood: 5 } },
        chat: [{ r: 'a', c: "Hi Ada, I'm Moma. Ask me anything about your pregnancy, day or night. If something feels wrong, I'll always point you to the right person fast." }] });
      setReady(true); return;
    }
    AsyncStorage.getItem(KEY).then(raw => {
      if (raw) { try { const p = JSON.parse(raw); setS({ ...DEFAULT, ...p, ai: { ...DEFAULT.ai, ...(p.ai ?? {}) } }); } catch {} }
      loaded.current = true; setReady(true);
    });
  }, []);
  useEffect(() => { if (loaded.current) AsyncStorage.setItem(KEY, JSON.stringify(s)); }, [s]);
  const set = (fn: (s: State) => State) => setS(prev => fn(prev));
  const reset = async () => { await AsyncStorage.removeItem(KEY); setS(DEFAULT); };
  return <StoreCtx.Provider value={{ s, set, ready, reset }}>{children}</StoreCtx.Provider>;
}
export const useStore = () => useContext(StoreCtx);
