import React from 'react';
import { ScrollView, View, Text, Pressable } from 'react-native';
import { useStore, last7, fmtDate, fmtTime, ago, dkey, DAY, pp } from '../store';
import { MOODS, EM } from '../content';
import { Card, H3, Muted, Btn, Grid2, Seg, Chip, Notice, Input, Label, DateField, st } from '../ui';
import { C } from '../theme';

type Sub = 'log' | 'moves' | 'ctx' | 'appts' | 'feeds' | 'nappies';
export default function Track({ sub, setSub, ask }: { sub: string; setSub: (s: string) => void; ask: (t: string) => void }) {
  const { s, set } = useStore();
  const P = s.mode === 'pregnant';
  const tabs: [Sub, string][] = P ? [['log', 'Symptoms'], ['moves', 'Moves'], ['ctx', 'Contractions'], ['appts', 'Appts']] : [['feeds', 'Feeds'], ['nappies', 'Nappies'], ['log', 'Wellbeing'], ['appts', 'Appts']];
  const cur: Sub = (tabs.find(t => t[0] === sub)?.[0] ?? tabs[0][0]);
  const em = EM[s.country] ?? EM.Other;
  const [apT, setApT] = React.useState('');
  const [apD, setApD] = React.useState<string | null>(null);
  let body: React.ReactNode = null;

  if (cur === 'log') {
    const days = Object.entries(s.logs).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 14);
    const top = Object.entries(last7(s).sym).sort((a, b) => b[1] - a[1]).slice(0, 5);
    body = (<>
      <Card><H3>Last 7 days</H3>{top.length ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{top.map(([k, n]) => <Chip key={k} label={`${k} · ${n}`} />)}</View> : <Muted>Check in daily and patterns will show up here.</Muted>}</Card>
      <Card><H3>History</H3>{days.length ? days.map(([k, v]) => (
        <View key={k} style={st.item}><View style={{ flex: 1 }}><Text>{fmtDate(k)}</Text><Muted>{(v.sym ?? []).join(', ') || 'No symptoms'}</Muted></View><Text style={{ fontSize: 22 }}>{v.mood ? MOODS[v.mood - 1] : ''}</Text></View>
      )) : <Muted>No check-ins yet.</Muted>}</Card>
      <Btn kind="plum" title="✨ Summarise for my next appointment" onPress={() => ask(`Summarise my week for my ${P ? 'midwife' : 'health visitor'}`)} />
    </>);
  }
  if (cur === 'moves') {
    const td = s.moves.filter(t => dkey(new Date(t)) === dkey());
    body = (<>
      <Card>
        <H3>Baby's movements today</H3>
        <Text style={st.counter}>{td.length}</Text>
        <Btn big title="👣 I felt baby move" onPress={() => set(x => ({ ...x, moves: [...x.moves, Date.now()] }))} />
        <Notice kind="info">{`There's no set number of kicks to count. What matters is your baby's usual pattern. If movements slow down, change or stop, contact ${em.u} straight away. Don't wait until the next day.`}</Notice>
        {td.slice(-6).reverse().map(t => <View key={t} style={st.item}><Text>Movement</Text><Muted>{fmtTime(t)}</Muted></View>)}
      </Card>
      <Btn kind="ghost" title="My baby feels different today" onPress={() => ask('My baby is moving less than usual')} />
    </>);
  }
  if (cur === 'ctx') {
    const L = s.ctx.slice(-8), open = s.ctx.length > 0 && !s.ctx[s.ctx.length - 1].e;
    const done = s.ctx.filter(c => c.e).slice(-4);
    let alert: React.ReactNode = null;
    if (done.length >= 4) {
      const gaps = done.slice(1).map((c, i) => (c.s - done[i].s) / 6e4);
      const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
      const avgDur = done.reduce((a, c) => a + ((c.e as number) - c.s) / 1000, 0) / done.length;
      if (avgGap <= 5 && avgDur >= 45) alert = <Notice kind="danger">{`Your contractions look regular and strong (about every ${avgGap.toFixed(0)} min, ${avgDur.toFixed(0)}s long). Call ${em.u} now and follow their advice.`}</Notice>;
    }
    const tap = () => set(x => {
      const c = [...x.ctx];
      if (c.length && !c[c.length - 1].e) c[c.length - 1] = { ...c[c.length - 1], e: Date.now() };
      else c.push({ s: Date.now() });
      return { ...x, ctx: c };
    });
    body = (<Card>
      <H3>Contraction timer</H3>
      <Btn big kind={open ? 'plum' : 'rose'} title={open ? '■ Contraction ended' : '▶ Contraction started'} onPress={tap} />
      {alert}
      {L.length ? L.map((c, i) => ({ c, i })).reverse().map(({ c, i }) => {
        const dur = c.e ? Math.round((c.e - c.s) / 1000) : null, gap = i > 0 ? Math.round((c.s - L[i - 1].s) / 6e4) : null;
        return <View key={c.s} style={st.item}><Text>{fmtTime(c.s)}</Text><Muted>{dur !== null ? `${dur}s long` : 'timing…'}{gap !== null ? ` · every ${gap} min` : ''}</Muted></View>;
      }) : <Muted style={{ marginTop: 10 }}>Tap when a contraction starts and again when it ends.</Muted>}
      {s.ctx.length > 0 && <Btn kind="ghost" title="Clear" style={{ marginTop: 10 }} onPress={() => set(x => ({ ...x, ctx: [] }))} />}
    </Card>);
  }
  if (cur === 'feeds') {
    const td = s.feeds.filter(f => Date.now() - f.t < DAY);
    const log = (k: string) => set(x => ({ ...x, feeds: [...x.feeds, { t: Date.now(), k }] }));
    body = (<Card>
      <H3>Feeds in the last 24h</H3><Text style={st.counter}>{td.length}</Text>
      <Grid2><Btn title="Left" onPress={() => log('Left')} /><Btn title="Right" onPress={() => log('Right')} /><Btn kind="plum" title="Bottle" onPress={() => log('Bottle')} /><Btn kind="plum" title="Expressed" onPress={() => log('Expressed')} /></Grid2>
      {td.slice(-8).reverse().map(f => <View key={f.t} style={st.item}><Text>{f.k}</Text><Muted>{fmtTime(f.t)} · {ago(f.t)}</Muted></View>)}
    </Card>);
  }
  if (cur === 'nappies') {
    const td = s.nappies.filter(n => Date.now() - n.t < DAY), wet = td.filter(n => n.k === 'Wet').length, dirty = td.length - wet, q = pp(s);
    const log = (k: string) => set(x => ({ ...x, nappies: [...x.nappies, { t: Date.now(), k }] }));
    body = (<Card>
      <H3>Nappies in the last 24h</H3>
      <View style={{ flexDirection: 'row' }}><View style={{ flex: 1 }}><Text style={st.counter}>{wet}</Text><Muted style={{ textAlign: 'center' }}>wet</Muted></View><View style={{ flex: 1 }}><Text style={st.counter}>{dirty}</Text><Muted style={{ textAlign: 'center' }}>dirty</Muted></View></View>
      <View style={{ height: 10 }} />
      <Grid2><Btn kind="sage" title="💧 Wet" onPress={() => log('Wet')} /><Btn kind="plum" title="💩 Dirty" onPress={() => log('Dirty')} /></Grid2>
      {q && q.days >= 5 && td.length > 0 && wet < 6 ? <Notice kind="warn">From day 5, most babies have 6 or more wet nappies a day. If it stays lower, mention it to your midwife or health visitor.</Notice> : null}
    </Card>);
  }
  if (cur === 'appts') {
    const up = [...s.appts].sort((a, b) => a.d.localeCompare(b.d));
    body = (<Card>
      <H3>Appointments</H3>
      {up.length ? up.map(a => (
        <View key={a.id} style={st.item}>
          <View style={{ flex: 1 }}><Text>{a.t}</Text><Muted>{fmtDate(a.d)}</Muted></View>
          <Pressable onPress={() => set(x => ({ ...x, appts: x.appts.filter(y => y.id !== a.id) }))}><Text style={{ color: C.muted, fontSize: 18, padding: 6 }}>✕</Text></Pressable>
        </View>
      )) : <Muted>Nothing booked yet.</Muted>}
      <Label>Add</Label>
      <Input value={apT} onChangeText={setApT} placeholder="e.g. 20 week scan" />
      <View style={{ height: 8 }} />
      <DateField value={apD} onChange={setApD} min={new Date()} />
      <View style={{ height: 8 }} />
      <Btn title="Add appointment" onPress={() => { if (!apT.trim() || !apD) return; set(x => ({ ...x, appts: [...x.appts, { id: Date.now(), t: apT.trim(), d: apD }] })); setApT(''); setApD(null); }} />
    </Card>);
  }
  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <Seg items={tabs} value={cur} onChange={v => setSub(v)} />
      {body}
    </ScrollView>
  );
}
