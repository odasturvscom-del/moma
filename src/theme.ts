// Moma design tokens: warm off-white canvas, pastel colour blocks, black ink, chunky rounded type (Outfit).
// Dark mode swaps the pastel tiles for deep tinted versions and flips the ink; the mascots keep their pastels (P).
export const P = {
  lav: '#CFC4FA', butter: '#FFE08A', sky: '#AEDDF6', pink: '#FFB8D6', lime: '#DDF38C',
  coral: '#FF8B74', mint: '#A8E8CB', peach: '#FFC6A3',
};
const LIGHT = {
  bg: '#F6F3EE', card: '#FFFFFF', ink: '#141414', muted: '#6F6A73', line: '#E9E4DE',
  inv: '#FFFFFF', surf2: '#EBE6E0', trackOff: '#DDD7D0', disabled: '#CFCAC4', outer: '#E9E4F2',
  bar: '#141414', barOn: '#FFFFFF', ringTrack: 'rgba(255,255,255,0.7)', peachSoft: '#FFF1E8',
  // legacy names kept so every screen picks up the new look
  rose: '#141414', roseSoft: '#F1ECFF', plum: '#141414', plumSoft: '#EFEAFF',
  sage: '#2E8B62', sageSoft: '#E2F6EC', amber: '#9A6A00', amberSoft: '#FFF3CC',
  red: '#C62F1E', redSoft: '#FFE4DE', ...P,
};
const DARK: typeof LIGHT = {
  bg: '#121113', card: '#1E1C21', ink: '#F4F0F8', muted: '#A7A1AE', line: '#302C34',
  inv: '#141414', surf2: '#26232A', trackOff: '#3A363F', disabled: '#3A363F', outer: '#09080A',
  bar: '#26232A', barOn: '#F4F0F8', ringTrack: 'rgba(255,255,255,0.16)', peachSoft: '#352519',
  rose: '#F4F0F8', roseSoft: '#2A2442', plum: '#F4F0F8', plumSoft: '#2A2442',
  sage: '#5FD3A0', sageSoft: '#173528', amber: '#F2C14E', amberSoft: '#3A2E0E',
  red: '#FF8A7A', redSoft: '#40201B',
  lav: '#362F5E', butter: '#4A3B12', sky: '#183F57', pink: '#4E2441', lime: '#33420F',
  coral: '#5C2B21', mint: '#17463B', peach: '#4F3121',
};
export const C = { ...LIGHT };
export let isDark = false;
export function applyTheme(dark: boolean) { isDark = dark; Object.assign(C, dark ? DARK : LIGHT); }
// Week-number bubbles and suggestion chips: pastels in light mode, tinted tiles in dark.
export const pastel = (i: number) => { const k = ['lav', 'butter', 'sky', 'pink', 'mint', 'lime', 'peach'] as const; return C[k[((i % 7) + 7) % 7]]; };
export const PASTELS = [P.lav, P.butter, P.sky, P.pink, P.mint, P.lime, P.peach];
export const R = 26;
export const F = {
  r: 'Outfit_400Regular', m: 'Outfit_500Medium', s: 'Outfit_600SemiBold', b: 'Outfit_700Bold', x: 'Outfit_800ExtraBold',
};
