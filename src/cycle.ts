// Period and ovulation estimates for women trying to conceive. Everything stays on the phone.
// Ovulation is estimated at 14 days before the next expected period; the fertile window is
// the 5 days before ovulation plus ovulation day. These are estimates, not a contraceptive method.
import { State, DAY, dkey, parseKey } from './store';

export type Cycle = { periods: string[]; len: number; plen: number; marks: Record<string, string[]> };
export const CYCLE0: Cycle = { periods: [], len: 28, plen: 5, marks: {} };
export const MARKS: [string, string][] = [
  ['spot', 'Spotting'], ['opk', 'Positive ovulation test'], ['cm', 'Egg-white discharge'],
  ['cramp', 'Cramps'], ['bd', 'Baby dance 💜'], ['test-', 'Negative pregnancy test'],
];
const day = (k: string) => Math.round(parseKey(k).getTime() / DAY);

export function cycleOf(s: State) {
  const c = s.cycle ?? CYCLE0;
  const ps = [...c.periods].sort();
  if (!ps.length) return null;
  const gaps = ps.slice(1).map((k, i) => day(k) - day(ps[i])).filter(g => g >= 18 && g <= 60).slice(-6);
  const len = gaps.length ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length) : c.len;
  const irregular = gaps.length >= 3 && Math.max(...gaps) - Math.min(...gaps) > 8;
  const last = ps[ps.length - 1];
  const today = day(dkey());
  let start = day(last);
  while (start + len <= today) start += len; // roll forward when a period wasn't logged
  const cd = today - start + 1;
  const next = start + len, ov = next - 14, fw0 = ov - 5, fw1 = ov + 1;
  const status: 'period' | 'peak' | 'high' | 'low' = cd <= c.plen ? 'period' : today === ov || today === ov - 1 ? 'peak' : today >= fw0 && today <= fw1 ? 'high' : 'low';
  const late = day(last) + len < today && start === day(last) ? today - (day(last) + len) : 0;
  const lateDays = today - (day(last) + len) > 0 ? today - (day(last) + len) : 0;
  return { cd, len, plen: c.plen, next, ov, fw0, fw1, status, irregular, gaps, last, lateDays, late, startDay: start };
}
export const fromDay = (n: number) => new Date(n * DAY + 12 * 36e5);
export function kindOn(s: State, n: number): 'period' | 'ov' | 'fertile' | 'logged' | null {
  const c = cycleOf(s); if (!c) return null;
  const ps = (s.cycle ?? CYCLE0).periods.map(day);
  if (ps.some(p => n >= p && n < p + c.plen)) return 'logged';
  let st = c.startDay; while (st > n) st -= c.len; while (st + c.len <= n) st += c.len;
  const nx = st + c.len, ov = nx - 14;
  if (n >= st && n < st + c.plen && n > day(dkey())) return 'period';
  if (n === ov) return 'ov';
  if (n >= ov - 5 && n <= ov + 1) return 'fertile';
  return null;
}
