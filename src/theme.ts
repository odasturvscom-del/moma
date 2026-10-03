// Moma design tokens: warm off-white canvas, pastel colour blocks, black ink, chunky rounded type (Outfit).
export const P = {
  lav: '#CFC4FA', butter: '#FFE08A', sky: '#AEDDF6', pink: '#FFB8D6', lime: '#DDF38C',
  coral: '#FF8B74', mint: '#A8E8CB', peach: '#FFC6A3',
};
export const PASTELS = [P.lav, P.butter, P.sky, P.pink, P.mint, P.lime, P.peach];
export const C = {
  bg: '#F6F3EE', card: '#FFFFFF', ink: '#141414', muted: '#6F6A73', line: '#E9E4DE',
  // legacy names kept so every screen picks up the new look
  rose: '#141414', roseSoft: '#F1ECFF', plum: '#141414', plumSoft: '#EFEAFF',
  sage: '#2E8B62', sageSoft: '#E2F6EC', amber: '#9A6A00', amberSoft: '#FFF3CC',
  red: '#C62F1E', redSoft: '#FFE4DE', ...P,
};
export const R = 26;
export const F = {
  r: 'Outfit_400Regular', m: 'Outfit_500Medium', s: 'Outfit_600SemiBold', b: 'Outfit_700Bold', x: 'Outfit_800ExtraBold',
};
