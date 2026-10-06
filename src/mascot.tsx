import { Image as RNImage } from 'react-native';
import React from 'react';
import Svg, { Path, Circle, Ellipse, Defs, RadialGradient, Stop, G } from 'react-native-svg';

const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
export function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const f = (c: number) => clamp(amt >= 0 ? c + (255 - c) * amt : c * (1 + amt));
  return '#' + [f(r), f(g), f(b)].map(c => c.toString(16).padStart(2, '0')).join('');
}
let uid = 0;
export type Face = 'smile' | 'happy' | 'wink' | 'calm' | 'meh' | 'sad' | 'wow';
type Props = { color: string; size?: number; face?: Face; arms?: boolean; wave?: boolean; leaf?: boolean; cheeks?: boolean };

// A soft, glossy gumdrop character with a hand-drawn black line face.
export function Blob({ color, size = 80, face = 'smile', arms, wave, leaf, cheeks = true }: Props) {
  const id = React.useMemo(() => `b${++uid}`, []);
  const ink = '#141414';
  const eyes = (open = true) => open ? (
    <G>
      <Circle cx={38} cy={50} r={5.6} fill={ink} /><Circle cx={62} cy={50} r={5.6} fill={ink} />
      <Circle cx={39.8} cy={48.2} r={1.7} fill="#fff" /><Circle cx={63.8} cy={48.2} r={1.7} fill="#fff" />
    </G>
  ) : null;
  const mouth: Record<Face, React.ReactNode> = {
    smile: <Path d="M40 63 Q50 73 60 63" stroke={ink} strokeWidth={4.2} strokeLinecap="round" fill="none" />,
    calm: <Path d="M43 64 Q50 69 57 64" stroke={ink} strokeWidth={4} strokeLinecap="round" fill="none" />,
    happy: <Path d="M39 61 Q50 61 61 61 Q59 76 50 76 Q41 76 39 61 Z" fill={ink} />,
    wink: <Path d="M40 63 Q50 73 60 63" stroke={ink} strokeWidth={4.2} strokeLinecap="round" fill="none" />,
    meh: <Path d="M42 66 L58 66" stroke={ink} strokeWidth={4} strokeLinecap="round" />,
    sad: <Path d="M41 69 Q50 61 59 69" stroke={ink} strokeWidth={4.2} strokeLinecap="round" fill="none" />,
    wow: <Ellipse cx={50} cy={67} rx={5} ry={6} fill={ink} />,
  };
  return (
    <Svg width={size} height={size * 1.1} viewBox="0 0 100 110">
      <Defs>
        <RadialGradient id={id} cx="36%" cy="28%" r="78%">
          <Stop offset="0" stopColor={shade(color, 0.55)} />
          <Stop offset="0.45" stopColor={color} />
          <Stop offset="1" stopColor={shade(color, -0.22)} />
        </RadialGradient>
      </Defs>
      <Ellipse cx={50} cy={105} rx={34} ry={4} fill="#000" opacity={0.08} />
      {arms && <Ellipse cx={12} cy={80} rx={8} ry={12} fill={shade(color, -0.1)} transform="rotate(20 12 80)" />}
      {(arms || wave) && (wave
        ? <Ellipse cx={94} cy={44} rx={8} ry={15} fill={shade(color, -0.08)} transform="rotate(25 94 44)" />
        : <Ellipse cx={88} cy={80} rx={8} ry={12} fill={shade(color, -0.1)} transform="rotate(-20 88 80)" />)}
      <Path d="M50 6 C78 6 94 32 94 64 C94 92 76 104 50 104 C24 104 6 92 6 64 C6 32 22 6 50 6 Z" fill={`url(#${id})`} />
      <Ellipse cx={34} cy={24} rx={12} ry={7} fill="#fff" opacity={0.45} transform="rotate(-25 34 24)" />
      {leaf && <Path d="M50 8 C54 -2 66 -3 70 2 C64 8 56 10 50 8 Z" fill="#5DBB63" />}
      {face === 'wink'
        ? <G><Path d="M32 51 Q38 45 44 51" stroke={ink} strokeWidth={4} strokeLinecap="round" fill="none" /><Circle cx={62} cy={50} r={5.6} fill={ink} /><Circle cx={63.8} cy={48.2} r={1.7} fill="#fff" /></G>
        : face === 'calm'
          ? <G><Path d="M32 50 Q38 55 44 50" stroke={ink} strokeWidth={4} strokeLinecap="round" fill="none" /><Path d="M56 50 Q62 55 68 50" stroke={ink} strokeWidth={4} strokeLinecap="round" fill="none" /></G>
          : eyes()}
      {face === 'sad' && <G><Path d="M31 43 L43 39" stroke={ink} strokeWidth={3.5} strokeLinecap="round" /><Path d="M69 43 L57 39" stroke={ink} strokeWidth={3.5} strokeLinecap="round" /></G>}
      {cheeks && <G><Ellipse cx={28} cy={62} rx={6} ry={3.6} fill="#FF6F91" opacity={0.35} /><Ellipse cx={72} cy={62} rx={6} ry={3.6} fill="#FF6F91" opacity={0.35} /></G>}
      {mouth[face]}
    </Svg>
  );
}
export const MOOD_BLOBS: [string, Face][] = [['#9CC9F5', 'sad'], ['#CFC4FA', 'meh'], ['#FFE08A', 'calm'], ['#A8E8CB', 'smile'], ['#FFB8D6', 'happy']];

// Mo, Moma's mascot: the approved concept artwork, one cut-out image per pose.
export type MoPose = 'hug' | 'wave' | 'sleep';
type MoProps = { size?: number; pose?: MoPose; grow?: number; face?: 'smile' | 'happy' | 'wow'; color?: string; baby?: string; badge?: boolean };
const MO_ART: Record<MoPose, { src: any; ratio: number }> = {
  wave: { src: require('../assets/mo-wave.png'), ratio: 412 / 374 },
  hug: { src: require('../assets/mo-hug.png'), ratio: 353 / 370 },
  sleep: { src: require('../assets/mo-sleep.png'), ratio: 354 / 370 },
};
export function Mo({ size = 80, pose = 'hug' }: MoProps) {
  const art = MO_ART[pose];
  const h = size * 1.1;
  return (
    <RNImage source={art.src} style={{ width: h * art.ratio, height: h }} resizeMode="contain" accessibilityLabel="Mo, the Moma mascot" />
  );
}
