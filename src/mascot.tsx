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

// Mo, Moma's mascot, drawn to match the approved concept: an outlined coral gumdrop mum hugging a mint baby.
// `grow` (0 to 1) sizes the baby so it can grow week by week.
export type MoPose = 'hug' | 'wave' | 'sleep';
type MoProps = { size?: number; pose?: MoPose; grow?: number; face?: 'smile' | 'happy' | 'wow'; color?: string; baby?: string };
export function Mo({ size = 80, pose = 'hug', grow = 0.6, face = 'smile', color = '#F7967E', baby = '#A6E6C4' }: MoProps) {
  const id = React.useMemo(() => `mo${++uid}`, []);
  const ink = '#1E1A1A', line = 2.6;
  const k = 1.05 + 0.3 * Math.max(0, Math.min(1, grow));
  const asleep = pose === 'sleep';
  const body = 'M48 8 C74 8 90 34 92 64 C94 90 80 102 50 102 C20 102 6 92 7 66 C8 36 24 8 48 8 Z';
  // An outlined limb: two outline edges that open into the body, with a rounded hand at the end.
  const limb = (d: string, end: [number, number], w: number) => (
    <G>
      <Path d={d} stroke={ink} strokeWidth={w + line * 2} strokeLinecap="butt" fill="none" />
      <Circle cx={end[0]} cy={end[1]} r={w / 2 + line} fill={ink} />
      <Path d={d} stroke={color} strokeWidth={w} strokeLinecap="butt" fill="none" />
      <Circle cx={end[0]} cy={end[1]} r={w / 2} fill={color} />
    </G>
  );
  const eyesOpen = (
    <G>
      <Circle cx={37} cy={46} r={4.3} fill={ink} /><Circle cx={63} cy={46} r={4.3} fill={ink} />
      <Circle cx={38.4} cy={44.5} r={1.4} fill="#fff" /><Circle cx={64.4} cy={44.5} r={1.4} fill="#fff" />
    </G>
  );
  const eyesShut = (
    <G>
      <Path d="M32.5 45 Q37 49.5 41.5 45" stroke={ink} strokeWidth={2.4} strokeLinecap="round" fill="none" />
      <Path d="M58.5 45 Q63 49.5 67.5 45" stroke={ink} strokeWidth={2.4} strokeLinecap="round" fill="none" />
    </G>
  );
  const mouth = face === 'wow' && !asleep ? <Ellipse cx={50} cy={55} rx={3.2} ry={3.8} fill={ink} />
    : face === 'happy' && !asleep ? <Path d="M44 52 L56 52 Q55 60 50 60 Q45 60 44 52 Z" fill={ink} />
    : <Path d="M45.5 52.5 Q50 56.5 54.5 52.5" stroke={ink} strokeWidth={2.4} strokeLinecap="round" fill="none" />;
  return (
    <Svg width={size} height={size * 1.1} viewBox="0 0 100 110" accessibilityLabel="Mo, the Moma mascot">
      <Defs>
        <RadialGradient id={id} cx="35%" cy="25%" r="85%">
          <Stop offset="0" stopColor={shade(color, 0.18)} /><Stop offset="0.6" stopColor={color} /><Stop offset="1" stopColor={shade(color, -0.1)} />
        </RadialGradient>
        <RadialGradient id={`${id}b`} cx="35%" cy="25%" r="85%">
          <Stop offset="0" stopColor={shade(baby, 0.35)} /><Stop offset="0.6" stopColor={baby} /><Stop offset="1" stopColor={shade(baby, -0.08)} />
        </RadialGradient>
      </Defs>
      {pose === 'wave' && limb('M22 52 L9 30', [9, 30], 11)}
      <Path d={body} fill={`url(#${id})`} stroke={ink} strokeWidth={line} strokeLinejoin="round" />
      {pose === 'wave' && <Path d="M23 54 L16 42" stroke={color} strokeWidth={11} strokeLinecap="butt" />}
      <Ellipse cx={33} cy={21} rx={7} ry={4.2} fill="#fff" opacity={0.85} transform="rotate(-30 33 21)" />
      <Circle cx={26} cy={30} r={1.8} fill="#fff" opacity={0.85} />
      <Ellipse cx={27} cy={55} rx={5.5} ry={3.4} fill="#FFD9CF" opacity={0.75} /><Ellipse cx={73} cy={55} rx={5.5} ry={3.4} fill="#FFD9CF" opacity={0.75} />
      {asleep ? eyesShut : eyesOpen}
      {mouth}
      {asleep && <Path d="M6 6 L12 6 L6 12 L12 12" stroke={ink} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />}
      {pose === 'wave'
        ? limb('M80 80 L90 91', [90, 91], 9)
        : (
          <G>
            <G transform={`translate(50 74) scale(${k})`}>
              <Path d="M0 -15 C9 -15 14 -6 14 3 C14 12 8 15 0 15 C-8 15 -14 12 -14 3 C-14 -6 -9 -15 0 -15 Z" fill={`url(#${id}b)`} stroke={ink} strokeWidth={line / k} />
              <Ellipse cx={5} cy={-9} rx={2.6} ry={1.6} fill="#fff" opacity={0.8} transform="rotate(25 5 -9)" />
              {asleep
                ? <G><Path d="M-6.5 0 Q-4.5 2 -2.5 0" stroke={ink} strokeWidth={1.3} strokeLinecap="round" fill="none" /><Path d="M2.5 0 Q4.5 2 6.5 0" stroke={ink} strokeWidth={1.3} strokeLinecap="round" fill="none" /></G>
                : <G><Circle cx={-4.5} cy={0} r={1.4} fill={ink} /><Circle cx={4.5} cy={0} r={1.4} fill={ink} /></G>}
              <Path d="M-2 3.5 Q0 5.5 2 3.5" stroke={ink} strokeWidth={1.2} strokeLinecap="round" fill="none" />
              <Ellipse cx={-8} cy={3.5} rx={2.2} ry={1.3} fill="#FFB8C4" opacity={0.7} /><Ellipse cx={8} cy={3.5} rx={2.2} ry={1.3} fill="#FFB8C4" opacity={0.7} />
            </G>
            {limb('M26 72 Q29 87 42 89', [42, 89], 7)}
            {limb('M74 72 Q71 87 58 89', [58, 89], 7)}
          </G>
        )}
    </Svg>
  );
}
