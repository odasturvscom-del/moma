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

// Mo, Moma's mascot: a coral mum hugging a little mint baby. `grow` (0 to 1) sizes the baby, so it can grow week by week.
export type MoPose = 'hug' | 'wave' | 'sleep';
type MoProps = { size?: number; pose?: MoPose; grow?: number; face?: 'smile' | 'happy' | 'wow'; color?: string; baby?: string };
export function Mo({ size = 80, pose = 'hug', grow = 0.6, face = 'smile', color = '#FF8B74', baby = '#A8E8CB' }: MoProps) {
  const id = React.useMemo(() => `mo${++uid}`, []);
  const ink = '#141414';
  const k = 0.85 + 0.4 * Math.max(0, Math.min(1, grow));
  const arm = shade(color, -0.16);
  const asleep = pose === 'sleep';
  return (
    <Svg width={size} height={size * 1.1} viewBox="0 0 100 110" accessibilityLabel="Mo, the Moma mascot">
      <Defs>
        <RadialGradient id={id} cx="36%" cy="28%" r="78%">
          <Stop offset="0" stopColor={shade(color, 0.55)} /><Stop offset="0.45" stopColor={color} /><Stop offset="1" stopColor={shade(color, -0.22)} />
        </RadialGradient>
        <RadialGradient id={`${id}b`} cx="35%" cy="25%" r="80%">
          <Stop offset="0" stopColor={shade(baby, 0.6)} /><Stop offset="0.5" stopColor={baby} /><Stop offset="1" stopColor={shade(baby, -0.18)} />
        </RadialGradient>
      </Defs>
      <Ellipse cx={50} cy={105} rx={34} ry={4} fill="#000" opacity={0.08} />
      {pose === 'wave' && <Ellipse cx={93} cy={40} rx={8} ry={15} fill={arm} transform="rotate(25 93 40)" />}
      <Path d="M50 4 C78 4 94 30 94 62 C94 92 76 104 50 104 C24 104 6 92 6 62 C6 30 22 4 50 4 Z" fill={`url(#${id})`} />
      <Ellipse cx={34} cy={22} rx={12} ry={7} fill="#fff" opacity={0.45} transform="rotate(-25 34 22)" />
      {asleep
        ? <G><Path d="M31 42 Q37 47 43 42" stroke={ink} strokeWidth={3.6} strokeLinecap="round" fill="none" /><Path d="M57 42 Q63 47 69 42" stroke={ink} strokeWidth={3.6} strokeLinecap="round" fill="none" />
            <Path d="M80 10 L88 10 L80 19 L88 19" stroke={ink} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" fill="none" /></G>
        : <G><Circle cx={37} cy={42} r={5.2} fill={ink} /><Circle cx={63} cy={42} r={5.2} fill={ink} /><Circle cx={38.7} cy={40.3} r={1.6} fill="#fff" /><Circle cx={64.7} cy={40.3} r={1.6} fill="#fff" /></G>}
      <Ellipse cx={27} cy={52} rx={5.5} ry={3.3} fill="#FF6F91" opacity={0.35} /><Ellipse cx={73} cy={52} rx={5.5} ry={3.3} fill="#FF6F91" opacity={0.35} />
      {face === 'wow' && !asleep ? <Ellipse cx={50} cy={53} rx={4} ry={4.8} fill={ink} />
        : face === 'happy' && !asleep ? <Path d="M42 50 L58 50 Q56 61 50 61 Q44 61 42 50 Z" fill={ink} />
        : <Path d={asleep ? 'M45 53 Q50 56 55 53' : 'M43 51 Q50 58 57 51'} stroke={ink} strokeWidth={3.6} strokeLinecap="round" fill="none" />}
      <G transform={`translate(50 79) scale(${k})`}>
        <Path d="M0 -16 C10 -16 16 -6 16 4 C16 13 9 16 0 16 C-9 16 -16 13 -16 4 C-16 -6 -10 -16 0 -16 Z" fill={`url(#${id}b)`} />
        <Ellipse cx={-5} cy={-10} rx={4} ry={2.4} fill="#fff" opacity={0.5} transform="rotate(-25 -5 -10)" />
        {asleep
          ? <G><Path d="M-7.5 1 Q-5 3 -2.5 1" stroke={ink} strokeWidth={1.6} strokeLinecap="round" fill="none" /><Path d="M2.5 1 Q5 3 7.5 1" stroke={ink} strokeWidth={1.6} strokeLinecap="round" fill="none" /></G>
          : <G><Circle cx={-5} cy={1} r={1.9} fill={ink} /><Circle cx={5} cy={1} r={1.9} fill={ink} /></G>}
        <Path d="M-2.6 6 Q0 8.4 2.6 6" stroke={ink} strokeWidth={1.5} strokeLinecap="round" fill="none" />
        <Ellipse cx={-9} cy={5} rx={2.6} ry={1.6} fill="#FF6F91" opacity={0.35} /><Ellipse cx={9} cy={5} rx={2.6} ry={1.6} fill="#FF6F91" opacity={0.35} />
      </G>
      <Path d={pose === 'wave' ? 'M12 74 Q22 100 58 96' : 'M12 74 Q20 99 44 96'} stroke={arm} strokeWidth={10} strokeLinecap="round" fill="none" />
      {pose !== 'wave' && <Path d="M88 74 Q80 99 56 96" stroke={arm} strokeWidth={10} strokeLinecap="round" fill="none" />}
    </Svg>
  );
}
