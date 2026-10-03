import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, TextInput, Platform, Linking, ViewStyle, TextStyle } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import DateTimePicker from '@react-native-community/datetimepicker';
import { C, R } from './theme';
import { dkey, parseKey, fmtDate } from './store';
import { Triage } from './safety';

export const Card = ({ children, style }: { children: React.ReactNode; style?: ViewStyle | ViewStyle[] }) => (
  <View style={[st.card, style as ViewStyle]}>{children}</View>
);
export const H3 = ({ children, color }: { children: React.ReactNode; color?: string }) => (
  <Text style={[st.h3, color ? { color } : null]}>{children}</Text>
);
export const Muted = ({ children, style }: { children: React.ReactNode; style?: TextStyle }) => <Text style={[st.muted, style]}>{children}</Text>;
export const Label = ({ children }: { children: React.ReactNode }) => <Text style={st.label}>{children}</Text>;

type BtnKind = 'rose' | 'ghost' | 'plum' | 'sage';
export function Btn({ title, onPress, kind = 'rose', big, style }: { title: string; onPress: () => void; kind?: BtnKind; big?: boolean; style?: ViewStyle }) {
  const bg = { rose: C.rose, ghost: C.roseSoft, plum: C.plum, sage: C.sage }[kind];
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [st.btn, { backgroundColor: bg, opacity: pressed ? 0.85 : 1 }, big && { height: 110, borderRadius: 24 }, style]}>
      <Text style={[st.btnT, kind === 'ghost' && { color: C.plum }, big && { fontSize: 18 }]}>{title}</Text>
    </Pressable>
  );
}
export const Chip = ({ label, on, onPress }: { label: string; on?: boolean; onPress?: () => void }) => (
  <Pressable onPress={onPress} style={[st.chip, on && { backgroundColor: C.plum, borderColor: C.plum }]}>
    <Text style={[{ fontSize: 13, color: C.ink }, on && { color: '#fff' }]}>{label}</Text>
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
          <Text style={{ fontSize: 13, fontWeight: '600', color: value === k ? C.plum : C.muted }}>{l}</Text>
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
        <Circle cx={54} cy={54} r={r} stroke="#fff" strokeWidth={10} fill="none" />
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
      {t.call ? <Btn title={`Call ${t.call}`} kind={danger ? 'rose' : 'plum'} style={{ marginTop: 10 }} onPress={() => Linking.openURL(`tel:${t.call}`)} /> : null}
    </Notice>
  );
}
export function Input(props: React.ComponentProps<typeof TextInput>) {
  return <TextInput placeholderTextColor={C.muted} {...props} style={[st.input, props.multiline && { minHeight: 64, textAlignVertical: 'top' }, props.style]} />;
}
export function DateField({ value, onChange, max, min }: { value: string | null; onChange: (k: string) => void; max?: Date; min?: Date }) {
  const [open, setOpen] = useState(false);
  if (Platform.OS === 'web') {
    return <Input value={value ?? ''} onChangeText={t => onChange(t)} placeholder="YYYY-MM-DD" />;
  }
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
export const st = StyleSheet.create({
  card: { backgroundColor: C.card, borderRadius: R, padding: 16, marginVertical: 6, shadowColor: '#3c1e3c', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 1 },
  h3: { fontSize: 15, fontWeight: '700', color: C.plum, marginBottom: 8 },
  muted: { color: C.muted, fontSize: 13 },
  label: { fontSize: 12, fontWeight: '700', color: C.muted, marginTop: 12, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.4 },
  btn: { borderRadius: 14, paddingVertical: 13, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  btnT: { color: '#fff', fontWeight: '700', fontSize: 14, textAlign: 'center' },
  chip: { borderWidth: 1, borderColor: C.line, backgroundColor: '#fff', borderRadius: 99, paddingVertical: 7, paddingHorizontal: 12 },
  seg: { flexDirection: 'row', backgroundColor: '#F1E8E3', borderRadius: 12, padding: 3, gap: 3, marginVertical: 6 },
  segB: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  segOn: { backgroundColor: '#fff' },
  notice: { borderRadius: 14, padding: 12, marginVertical: 8 },
  noticeT: { fontSize: 13, color: C.ink, lineHeight: 19 },
  input: { borderWidth: 1, borderColor: C.line, borderRadius: 12, paddingVertical: 11, paddingHorizontal: 12, fontSize: 15, backgroundColor: '#fff', color: C.ink },
  item: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.line },
  counter: { fontSize: 56, fontWeight: '800', textAlign: 'center', color: C.plum, marginVertical: 8 },
});
