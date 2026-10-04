import React, { useState } from 'react';
import { View, Text as RNText, Pressable, StyleSheet, TextInput, Platform, Linking, ViewStyle, TextStyle } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import DateTimePicker from '@react-native-community/datetimepicker';
import { C, R, F } from './theme';
import { dkey, parseKey, fmtDate } from './store';
import { Triage } from './safety';

// Every piece of text goes through here so the whole app uses Outfit, with the weight picked from fontWeight.
const FW: Record<string, string> = { '300': F.r, '400': F.r, normal: F.r, '500': F.m, '600': F.s, '700': F.b, bold: F.b, '800': F.x, '900': F.x };
// Text with no colour set takes its parent's colour, or the theme ink, so nothing goes black-on-dark in dark mode.
const InkCtx = React.createContext<string | null>(null);
export function Text(props: React.ComponentProps<typeof RNText>) {
  const parent = React.useContext(InkCtx);
  const f = (StyleSheet.flatten(props.style) ?? {}) as TextStyle;
  const fam = f.fontFamily ?? FW[String(f.fontWeight ?? '400')] ?? F.r;
  const color = (f.color as string | undefined) ?? parent ?? C.ink;
  return <InkCtx.Provider value={color}><RNText {...props} style={[{ color }, props.style, { color, fontFamily: fam, fontWeight: undefined }]} /></InkCtx.Provider>;
}
export const Title = ({ children, style }: { children: React.ReactNode; style?: TextStyle }) => (
  <Text style={[{ fontSize: 30, fontWeight: '800', color: C.ink, letterSpacing: -0.8 }, style]}>{children}</Text>
);

export const Card = ({ children, style }: { children: React.ReactNode; style?: ViewStyle | ViewStyle[] }) => (
  <View style={[st.card, style as ViewStyle]}>{children}</View>
);
export const H3 = ({ children, color }: { children: React.ReactNode; color?: string }) => (
  <Text style={[st.h3, color ? { color } : null]}>{children}</Text>
);
export const Muted = ({ children, style }: { children: React.ReactNode; style?: TextStyle }) => <Text style={[st.muted, style]}>{children}</Text>;
export const Label = ({ children }: { children: React.ReactNode }) => <Text style={st.label}>{children}</Text>;

type BtnKind = 'rose' | 'ghost' | 'plum' | 'sage' | 'danger' | 'lav' | 'butter' | 'sky' | 'pink' | 'lime' | 'mint';
export function Btn({ title, onPress, kind = 'rose', big, style }: { title: string; onPress: () => void; kind?: BtnKind; big?: boolean; style?: ViewStyle }) {
  const bg = { rose: C.ink, ghost: C.card, plum: C.lav, sage: C.mint, danger: C.red, lav: C.lav, butter: C.butter, sky: C.sky, pink: C.pink, lime: C.lime, mint: C.mint }[kind];
  const light = kind === 'rose' || kind === 'danger';
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [st.btn, { backgroundColor: bg, opacity: pressed ? 0.85 : 1 }, big && { height: 120, borderRadius: 32 }, kind === 'ghost' && { borderWidth: 1.5, borderColor: C.line }, style]}>
      <Text style={[st.btnT, { color: light ? C.inv : C.ink }, big && { fontSize: 20 }]}>{title}</Text>
    </Pressable>
  );
}
export const Chip = ({ label, on, onPress }: { label: string; on?: boolean; onPress?: () => void }) => (
  <Pressable onPress={onPress} style={[st.chip, on && { backgroundColor: C.plum, borderColor: C.plum }]}>
    <Text style={[{ fontSize: 13.5, fontWeight: '500', color: C.ink }, on && { color: C.inv }]}>{label}</Text>
  </Pressable>
);
export const Row = ({ children, style }: { children: React.ReactNode; style?: ViewStyle }) => <View style={[{ flexDirection: 'row', gap: 8, alignItems: 'center' }, style]}>{children}</View>;
export const Grid2 = ({ children }: { children: React.ReactNode }) => (
  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
    {React.Children.map(children, c => <View style={{ width: '48%', flexGrow: 1 }}>{c}</View>)}
  </View>
);
export function Seg<T extends string>({ items, value, onChange }: { items: [T, string][]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={st.seg}>
      {items.map(([k, l]) => (
        <Pressable key={k} onPress={() => onChange(k)} style={[st.segB, value === k && st.segOn]}>
          <Text style={{ fontSize: 13.5, fontWeight: '600', color: value === k ? C.inv : C.muted }}>{l}</Text>
        </Pressable>
      ))}
    </View>
  );
}
export function Ring({ pct, big, small }: { pct: number; big: string; small: string }) {
  const r = 46, c = 2 * Math.PI * r;
  return (
    <View style={{ width: 108, height: 108 }}>
      <Svg width={108} height={108} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={54} cy={54} r={r} stroke={C.ringTrack} strokeWidth={10} fill="none" />
        <Circle cx={54} cy={54} r={r} stroke={C.rose} strokeWidth={10} fill="none" strokeLinecap="round" strokeDasharray={`${c}`} strokeDashoffset={c * (1 - Math.min(1, Math.max(0, pct)))} />
      </Svg>
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ fontSize: 30, fontWeight: '800', color: C.ink }}>{big}</Text>
        <Text style={{ fontSize: 10, color: C.muted }}>{small}</Text>
      </View>
    </View>
  );
}
export function Notice({ kind, children }: { kind: 'info' | 'warn' | 'danger'; children: React.ReactNode }) {
  const bg = { info: C.sageSoft, warn: C.amberSoft, danger: C.redSoft }[kind];
  return <View style={[st.notice, { backgroundColor: bg }]}>{typeof children === 'string' ? <Text style={st.noticeT}>{children}</Text> : children}</View>;
}
export function FlagCard({ t }: { t: NonNullable<Triage> }) {
  const danger = t.level !== 's';
  return (
    <Notice kind={danger ? 'danger' : 'warn'}>
      <Text style={[st.noticeT, { fontWeight: '800', color: danger ? C.red : C.amber }]}>{t.title}</Text>
      <Text style={st.noticeT}>{t.items.join(' · ')}</Text>
      <Text style={[st.noticeT, { marginTop: 8 }]}>{t.action}</Text>
      {t.call ? <Btn title={`Call ${t.call}`} kind={danger ? 'danger' : 'rose'} style={{ marginTop: 10 }} onPress={() => Linking.openURL(`tel:${t.call}`)} /> : null}
    </Notice>
  );
}
export function Input(props: React.ComponentProps<typeof TextInput>) {
  return <TextInput placeholderTextColor={C.muted} {...props} style={[st.input, props.multiline && { minHeight: 64, textAlignVertical: 'top' }, props.style]} />;
}
const toDMY = (k: string | null) => (k && /^\d{4}-\d{2}-\d{2}$/.test(k) ? `${k.slice(8, 10)}/${k.slice(5, 7)}/${k.slice(0, 4)}` : '');
// Typed date entry for the web app: DD/MM/YYYY with the slashes added automatically.
function WebDate({ value, onChange }: { value: string | null; onChange: (k: string) => void }) {
  const [t, setT] = useState(toDMY(value));
  const [ok, setOk] = useState(!!value);
  const change = (raw: string) => {
    const d = raw.replace(/\D/g, '').slice(0, 8);
    setT(d.length > 4 ? `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}` : d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d);
    if (d.length === 8) {
      const dd = +d.slice(0, 2), mm = +d.slice(2, 4), yy = +d.slice(4);
      const dt = new Date(yy, mm - 1, dd);
      if (yy > 1900 && dt.getDate() === dd && dt.getMonth() === mm - 1) { setOk(true); onChange(dkey(dt)); return; }
    }
    setOk(false);
  };
  return (
    <View>
      <Input value={t} onChangeText={change} placeholder="DD/MM/YYYY" keyboardType="number-pad" maxLength={10} />
      {ok && value ? <Text style={{ fontSize: 13, color: C.muted, marginTop: 6, marginLeft: 6 }}>{fmtDate(value)}</Text>
        : t.length === 10 ? <Text style={{ fontSize: 13, color: C.red, marginTop: 6, marginLeft: 6 }}>That date doesn't look right</Text> : null}
    </View>
  );
}
export function DateField({ value, onChange, max, min }: { value: string | null; onChange: (k: string) => void; max?: Date; min?: Date }) {
  const [open, setOpen] = useState(false);
  if (Platform.OS === 'web') return <WebDate value={value} onChange={onChange} />;
  return (
    <View>
      <Pressable onPress={() => setOpen(o => !o)} style={st.input}>
        <Text style={{ color: value ? C.ink : C.muted, fontSize: 15 }}>{value ? fmtDate(value) : 'Pick a date'}</Text>
      </Pressable>
      {open && (
        <DateTimePicker
          value={value ? parseKey(value) : new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          maximumDate={max}
          minimumDate={min}
          onChange={(e: any, d?: Date) => {
            if (Platform.OS !== 'ios') setOpen(false);
            if (d && e?.type !== 'dismissed') onChange(dkey(d));
          }}
        />
      )}
    </View>
  );
}
export function Md({ text, color = C.ink }: { text: string; color?: string }) {
  const lines = text.split('\n');
  const inline = (l: string, key: number) => {
    const parts = l.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
    return parts.map((p, i) => p.startsWith('**') ? <Text key={`${key}-${i}`} style={{ fontWeight: '800' }}>{p.slice(2, -2)}</Text> : <Text key={`${key}-${i}`}>{p}</Text>);
  };
  return (
    <View>
      {lines.map((l, i) => {
        if (!l.trim()) return <View key={i} style={{ height: 6 }} />;
        const b = /^\s*[-•*]\s+/.test(l);
        return b
          ? <Text key={i} style={{ color, fontSize: 14, lineHeight: 20, paddingLeft: 6 }}>{'•  '}{inline(l.replace(/^\s*[-•*]\s+/, ''), i)}</Text>
          : <Text key={i} style={{ color, fontSize: 14, lineHeight: 20 }}>{inline(l.replace(/^#+\s*/, ''), i)}</Text>;
      })}
    </View>
  );
}
const mk = () => StyleSheet.create({
  card: { backgroundColor: C.card, borderRadius: R, padding: 18, marginVertical: 6 },
  h3: { fontSize: 18, fontWeight: '700', color: C.ink, marginBottom: 10, letterSpacing: -0.3 },
  muted: { color: C.muted, fontSize: 13.5 },
  label: { fontSize: 13, fontWeight: '600', color: C.ink, marginTop: 16, marginBottom: 6 },
  btn: { borderRadius: 99, paddingVertical: 15, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  btnT: { color: '#fff', fontWeight: '600', fontSize: 15, textAlign: 'center' },
  chip: { borderWidth: 1.5, borderColor: C.line, backgroundColor: C.card, borderRadius: 99, paddingVertical: 8, paddingHorizontal: 14 },
  seg: { flexDirection: 'row', backgroundColor: C.surf2, borderRadius: 99, padding: 4, gap: 4, marginVertical: 6 },
  segB: { flex: 1, paddingVertical: 10, borderRadius: 99, alignItems: 'center' },
  segOn: { backgroundColor: C.ink },
  notice: { borderRadius: 22, padding: 14, marginVertical: 8 },
  noticeT: { fontSize: 14, color: C.ink, lineHeight: 20 },
  input: { borderWidth: 1.5, borderColor: C.line, borderRadius: 18, paddingVertical: 13, paddingHorizontal: 16, fontSize: 15, backgroundColor: C.card, color: C.ink, fontFamily: F.r },
  item: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.line },
  counter: { fontSize: 64, fontWeight: '800', textAlign: 'center', color: C.ink, marginVertical: 8, letterSpacing: -2 },
});
// Styles are rebuilt when the theme flips, so every screen picks up the new colours.
export const st = { ...mk() };
export function restyle() { Object.assign(st, mk()); }
