// Period and ovulation tracker for women trying to conceive. Data stays on the phone.
import React, { useState } from 'react';
import { View, Pressable, Platform, Alert } from 'react-native';
import { useStore, dkey, fmtDate, DAY } from '../store';
import { cycleOf, kindOn, fromDay, MARKS, CYCLE0 } from '../cycle';
import { Text, Card, H3, Muted, Btn, Chip, Notice, Label, DateField, Seg, st } from '../ui';
import { C } from '../theme';

const COL = { logged: '#F28B9A', period: '#F9C6CE', ov: '#69247C', fertile: '#BDE8C9' } as const;
const WD = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const say = (m: string) => (Platform.OS === 'web' ? alert(m) : Alert.alert(m));

export function CycleSummary({ compact }: { compact?: boolean }) {
  const { s } = useStore();
  const c = cycleOf(s);
  if (!c) return <Muted>Log the first day of your last period to see your fertile window.</Muted>;
  const today = Math.round(new Date(dkey() + 'T12:00:00').getTime() / DAY);
  const until = (n: number) => { const d = n - today; return d === 0 ? 'today' : d === 1 ? 'tomorrow' : d > 0 ? `in ${d} days` : `${-d} days ago`; };
  const label = { period: 'Period days', peak: 'Peak fertility', high: 'Fertile window', low: 'Low chance today' }[c.status];
  return (
    <View>
      <Text style={{ fontSize: compact ? 40 : 44, fontWeight: '800', color: C.ink, letterSpacing: -1.5, lineHeight: 46 }}>Day {c.cd}</Text>
      <Text style={{ fontSize: 17, fontWeight: '600', color: C.ink, marginTop: 4 }}>{label}</Text>
      <Text style={{ fontSize: 13.5, color: C.ink, marginTop: 8, lineHeight: 19 }}>
        {c.status === 'low' && c.fw0 > today ? `Fertile window starts ${until(c.fw0)} (${fmtDate(fromDay(c.fw0))})` : `Likely ovulation ${until(c.ov)} (${fmtDate(fromDay(c.ov))})`}
        {'\n'}Next period {until(c.next)} · {fmtDate(fromDay(c.next))}
      </Text>
    </View>
  );
}

export default function Cycle({ ask, toPregnant }: { ask: (t: string) => void; toPregnant: () => void }) {
  const { s, set } = useStore();
  const cy = s.cycle ?? CYCLE0;
  const c = cycleOf(s);
  const [pick, setPick] = useState<string | null>(null);
  const [len, setLen] = useState(String(cy.len));
  const [plen, setPlen] = useState(String(cy.plen));
  const today = dkey();
  const upd = (f: (x: typeof cy) => typeof cy) => set(x => ({ ...x, cycle: f(x.cycle ?? CYCLE0) }));
  const logStart = (k: string) => {
    if (k > today) return say("That date hasn't happened yet");
    upd(x => ({ ...x, periods: Array.from(new Set([...x.periods, k])).sort() }));
    setPick(null);
  };
  const marks = cy.marks[today] ?? [];
  const toggle = (m: string) => upd(x => { const cur = x.marks[today] ?? []; return { ...x, marks: { ...x.marks, [today]: cur.includes(m) ? cur.filter(y => y !== m) : [...cur, m] } }; });
  // Calendar: this week's Monday, five weeks ahead.
  const t0 = Math.round(new Date(today + 'T12:00:00').getTime() / DAY);
  const mon = t0 - ((new Date(today + 'T12:00:00').getDay() + 6) % 7) - 7;
  const days = Array.from({ length: 42 }, (_, i) => mon + i);
  const hist = [...cy.periods].sort().reverse();

  return (<>
    <Card style={{ backgroundColor: C.pink }}>
      <CycleSummary />
      {c && c.lateDays > 0 ? <View style={{ marginTop: 12 }}><Notice kind="info">{`Your period is ${c.lateDays} day${c.lateDays === 1 ? '' : 's'} late. If you're trying, a home pregnancy test is most accurate from the day your period is due. Log your period if it has started.`}</Notice></View> : null}
    </Card>

    <Card>
      <H3>Your cycle</H3>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
        {WD.map((w, i) => <Text key={i} style={{ width: '13.5%', textAlign: 'center', fontSize: 12, color: C.muted, fontWeight: '600' }}>{w}</Text>)}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 6 }}>
        {days.map(n => {
          const k = kindOn(s, n), d = fromDay(n), isT = n === t0;
          const bg = k ? COL[k] : 'transparent';
          return (
            <View key={n} style={{ width: '13.5%', aspectRatio: 1, borderRadius: 999, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', borderWidth: isT ? 2 : 0, borderColor: C.ink, opacity: n < t0 && !k ? 0.45 : 1 }}>
              <Text style={{ fontSize: 13.5, fontWeight: isT || k === 'ov' ? '800' : '500', color: k === 'ov' ? '#fff' : C.ink }}>{d.getDate()}</Text>
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12 }}>
        {([['logged', 'Period'], ['period', 'Expected period'], ['fertile', 'Fertile'], ['ov', 'Ovulation']] as [keyof typeof COL, string][]).map(([k, l]) => (
          <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: COL[k] }} /><Muted style={{ fontSize: 12.5 }}>{l}</Muted></View>
        ))}
      </View>
    </Card>

    <Card>
      <H3>Log your period</H3>
      <Btn big title="🩸 My period started today" onPress={() => logStart(today)} />
      <View style={{ height: 10 }} />
      {pick === null ? <Btn kind="ghost" title="It started on another day" onPress={() => setPick('')} /> : (<>
        <Label>First day of bleeding</Label>
        <DateField value={pick || null} onChange={setPick} max={new Date()} />
        <View style={{ height: 8 }} />
        <Btn title="Save" onPress={() => pick ? logStart(pick) : say('Please pick a date')} />
      </>)}
    </Card>

    <Card>
      <H3>Today's signs</H3>
      <Muted style={{ marginBottom: 8 }}>Tap what applies. It helps you and Moma spot your pattern.</Muted>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {MARKS.map(([k, l]) => <Chip key={k} label={l} on={marks.includes(k)} onPress={() => toggle(k)} />)}
      </View>
    </Card>

    <Card style={{ backgroundColor: C.mint }}>
      <H3>Got a positive pregnancy test? 🎉</H3>
      <Muted style={{ color: C.ink, marginBottom: 10 }}>Switch to your pregnancy guide. Moma dates it from your last period, and you can change it after your first scan.</Muted>
      <Btn title="I'm pregnant" onPress={toPregnant} />
    </Card>

    <Card>
      <H3>Period history</H3>
      {hist.length ? hist.slice(0, 8).map((k, i) => {
        const prev = hist[i + 1];
        const g = prev ? Math.round((new Date(k + 'T12:00:00').getTime() - new Date(prev + 'T12:00:00').getTime()) / DAY) : null;
        return (
          <View key={k} style={st.item}>
            <View style={{ flex: 1 }}><Text>{fmtDate(k)}</Text><Muted>{g ? `${g}-day cycle` : 'First logged'}</Muted></View>
            <Pressable hitSlop={10} accessibilityLabel="Remove" onPress={() => upd(x => ({ ...x, periods: x.periods.filter(p => p !== k) }))}><Text style={{ color: C.muted, fontSize: 16 }}>✕</Text></Pressable>
          </View>
        );
      }) : <Muted>No periods logged yet.</Muted>}
      {c && c.gaps.length ? <Muted style={{ marginTop: 8 }}>{`Average cycle: ${c.len} days from your last ${c.gaps.length + 1} periods.`}</Muted> : null}
      <Label>Usual cycle length (days)</Label>
      <Seg items={[['24', '24'], ['26', '26'], ['28', '28'], ['30', '30'], ['32', '32'], ['35', '35']]} value={(['24', '26', '28', '30', '32', '35'].includes(len) ? len : '28') as any} onChange={v => { setLen(v); upd(x => ({ ...x, len: Number(v) })); }} />
      <Label>Period usually lasts (days)</Label>
      <Seg items={[['3', '3'], ['4', '4'], ['5', '5'], ['6', '6'], ['7', '7']]} value={(['3', '4', '5', '6', '7'].includes(plen) ? plen : '5') as any} onChange={v => { setPlen(v); upd(x => ({ ...x, plen: Number(v) })); }} />
    </Card>

    {c && c.irregular ? <Notice kind="info">Your cycles vary by more than a week, so predictions are less certain. Ovulation tests can help you find your fertile days.</Notice> : null}
    <Notice kind="info">These are estimates, not a method of contraception. Start folic acid (400 mcg a day) now if you can. See a doctor if you've been trying for 12 months (6 months if you're 35 or older), or sooner if your periods are very irregular, very painful or very heavy.</Notice>
    <Btn kind="plum" title="✨ Ask Moma about my fertile days" onPress={() => ask('When are my most fertile days this cycle, and what can I do to improve our chances?')} />
  </>);
}
