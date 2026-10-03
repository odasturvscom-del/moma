import React from 'react';
import { ScrollView, View, Text } from 'react-native';
import { useStore, preg, pp, fmtDate, ago } from '../store';
import { weekInfo, ppInfo, MILESTONES } from '../content';
import { Card, H3, Muted, Ring, Btn, Grid2 } from '../ui';
import CheckIn from './CheckIn';
import { C } from '../theme';

export default function Today({ go, ask }: { go: (tab: string, sub?: string) => void; ask: (t: string) => void }) {
  const { s, set } = useStore();
  const logFeed = (k: string) => set(x => ({ ...x, feeds: [...x.feeds, { t: Date.now(), k }] }));
  const logNappy = (k: string) => set(x => ({ ...x, nappies: [...x.nappies, { t: Date.now(), k }] }));
  const hero = { flexDirection: 'row' as const, gap: 16, alignItems: 'center' as const, backgroundColor: '#F3E0E8' };
  let body: React.ReactNode = null;
  if (s.mode === 'pregnant') {
    const p = preg(s);
    if (p) {
      const w = weekInfo(p.w), next = MILESTONES.filter(m => m[0] >= p.w).slice(0, 2);
      body = (
        <>
          <Card style={hero}>
            <Ring pct={p.days / 280} big={`${p.w}`} small={`weeks ${p.d}d`} />
            <View style={{ flex: 1 }}>
              <Muted>Trimester {p.tri}</Muted>
              <Text style={{ fontSize: 24, fontWeight: '800', color: C.plum }}>{p.left > 0 ? `${p.left} days to go` : 'Due any day'}</Text>
              <Muted>Due {fmtDate(p.due)}</Muted>
              <View style={{ alignSelf: 'flex-start', backgroundColor: '#fff', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 3, marginTop: 6 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: C.plum }}>Baby ≈ {w[0]}</Text>
              </View>
            </View>
          </Card>
          <Card><H3>This week</H3><Text style={{ marginBottom: 8 }}><Text style={{ fontWeight: '700' }}>Baby: </Text>{w[1]}</Text><Text><Text style={{ fontWeight: '700' }}>You: </Text>{w[2]}</Text></Card>
          <CheckIn onTalk={ask} />
          {next.length > 0 && (
            <Card>
              <H3>Coming up</H3>
              {next.map(m => <View key={m[0]} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}><Text style={{ flex: 1 }}>{m[1]}</Text><Muted>wk {m[0]}</Muted></View>)}
              <Muted style={{ marginTop: 6 }}>Timings vary by country and clinic. Your midwife will confirm.</Muted>
            </Card>
          )}
          {p.w >= 24 && <Grid2><Btn kind="ghost" title="👣 Log a movement" onPress={() => go('track', 'moves')} /><Btn kind="ghost" title="⏱ Contractions" onPress={() => go('track', 'ctx')} /></Grid2>}
        </>
      );
    }
  } else {
    const q = pp(s);
    if (q) {
      const n = ppInfo(q.w), lf = s.feeds[s.feeds.length - 1];
      body = (
        <>
          <Card style={hero}>
            <Ring pct={q.days / 84} big={`${q.w}`} small={`weeks ${q.d}d`} />
            <View style={{ flex: 1 }}>
              <Muted>Fourth trimester</Muted>
              <Text style={{ fontSize: 24, fontWeight: '800', color: C.plum }}>Day {q.days + 1}</Text>
              <Muted>Last feed: {lf ? `${ago(lf.t)} (${lf.k})` : 'not logged'}</Muted>
            </View>
          </Card>
          <Card><H3>{n[0]}</H3><Text>{n[1]}</Text></Card>
          <Card><H3>Quick log</H3><Grid2><Btn title="🍼 Left" onPress={() => logFeed('Left')} /><Btn title="🍼 Right" onPress={() => logFeed('Right')} /><Btn kind="plum" title="🍼 Bottle" onPress={() => logFeed('Bottle')} /><Btn kind="sage" title="💧 Nappy" onPress={() => logNappy('Wet')} /></Grid2></Card>
          <CheckIn onTalk={ask} />
        </>
      );
    }
  }
  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      {body ?? <Card><Text>Add your dates in Me to get started.</Text></Card>}
      <Card style={{ backgroundColor: C.plum }}>
        <H3 color="#fff">Ask Moma</H3>
        <Text style={{ color: '#fff', opacity: 0.9, marginBottom: 10 }}>Worried about something, or just curious? I know where you are in your journey.</Text>
        <Btn title="Start a conversation" onPress={() => go('ask')} />
      </Card>
    </ScrollView>
  );
}
