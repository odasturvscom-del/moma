import React, { useRef } from 'react';
import { ScrollView, View } from 'react-native';
import { useStore, preg, pp } from '../store';
import { WEEKS, MILESTONES, POSTPARTUM, ppInfo } from '../content';
import { Text, Card, Muted, Notice } from '../ui';
import { C, pastel } from '../theme';

const Num = ({ n, cur }: { n: number | string; cur: boolean }) => (
  <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: cur ? C.ink : pastel(Number(n)), alignItems: 'center', justifyContent: 'center' }}>
    <Text style={{ fontWeight: '800', fontSize: 17, color: cur ? C.inv : C.ink }}>{n}</Text>
  </View>
);
export default function Journey() {
  const { s } = useStore();
  const ref = useRef<ScrollView>(null);
  const ys = useRef<Record<number, number>>({});
  if (s.mode === 'pregnant') {
    const p = preg(s), cw = Math.min(42, Math.max(4, p?.w ?? 4));
    return (
      <ScrollView ref={ref} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Text style={{ fontSize: 30, fontWeight: '800', color: C.ink, marginVertical: 8, letterSpacing: -1 }}>Week by week</Text>
        {Object.entries(WEEKS).map(([k, x]) => {
          const w = Number(k), cur = w === cw;
          return (
            <View key={k} onLayout={e => { ys.current[w] = e.nativeEvent.layout.y; if (cur) setTimeout(() => ref.current?.scrollTo({ y: Math.max(0, e.nativeEvent.layout.y - 120), animated: false }), 50); }}>
              <Card style={[{ flexDirection: 'row', gap: 12 }, cur ? { borderWidth: 2, borderColor: C.rose } : {}]}>
                <Num n={w} cur={cur} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '700' }}>Size of {/^[aeiou]/i.test(x[0]) ? 'an' : 'a'} {x[0]}</Text>
                  <Muted style={{ marginTop: 2 }}>{x[1]}</Muted>
                  <Text style={{ marginTop: 6, fontSize: 14 }}>{x[2]}</Text>
                  {MILESTONES.filter(m => m[0] === w).map(m => <Text key={m[1]} style={{ marginTop: 6, fontSize: 12, color: C.ink, fontWeight: '600' }}>📅 {m[1]}</Text>)}
                </View>
              </Card>
            </View>
          );
        })}
      </ScrollView>
    );
  }
  const q = pp(s), curNote = q ? ppInfo(q.w) : null;
  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={{ fontSize: 30, fontWeight: '800', color: C.ink, marginVertical: 8, letterSpacing: -1 }}>Your fourth trimester</Text>
      {Object.entries(POSTPARTUM).map(([k, v]) => (
        <Card key={k} style={[{ flexDirection: 'row', gap: 12 }, curNote === v ? { borderWidth: 2, borderColor: C.rose } : {}]}>
          <Num n={k} cur={curNote === v} />
          <View style={{ flex: 1 }}><Text style={{ fontWeight: '700' }}>{v[0]}</Text><Text style={{ marginTop: 4, fontSize: 14 }}>{v[1]}</Text></View>
        </Card>
      ))}
      <Notice kind="info">Postnatal depression affects many parents, including partners. Talk to your GP or health visitor if you're struggling. It's treatable and nothing to be ashamed of.</Notice>
    </ScrollView>
  );
}
