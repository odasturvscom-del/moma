import React, { useEffect, useState } from 'react';
import { ScrollView, View, Pressable } from 'react-native';
import { useStore, preg, pp, fmtDate, ago, dkey, DAY } from '../store';
import { weekInfo, ppInfo, MILESTONES } from '../content';
import { Text, Muted } from '../ui';
import { Blob, Mo, MOOD_BLOBS } from '../mascot';
import { ISpark, IGo, IStetho } from '../icons';
import CheckIn from './CheckIn';
import { getConfig } from '../telemetry';
import { C, P } from '../theme';
import { NdpaBadge } from '../ndpa';
import { CycleSummary } from './Cycle';
import { cycleOf } from '../cycle';

const Tile = ({ bg, children, onPress, h, style }: { bg: string; children: React.ReactNode; onPress?: () => void; h?: number; style?: object }) => (
  <Pressable onPress={onPress} style={({ pressed }) => [{ backgroundColor: bg, borderRadius: 28, padding: 18, minHeight: h, overflow: 'hidden', transform: [{ scale: pressed ? 0.98 : 1 }] }, style]}>{children}</Pressable>
);
const Big = ({ children, size = 22 }: { children: React.ReactNode; size?: number }) => <Text style={{ fontSize: size, fontWeight: '700', color: C.ink, letterSpacing: -0.5, lineHeight: size * 1.1 }}>{children}</Text>;
const Small = ({ children }: { children: React.ReactNode }) => <Text style={{ fontSize: 13.5, color: C.ink, opacity: 0.75, marginTop: 4 }}>{children}</Text>;

function WeekStrip() {
  const { s } = useStore();
  const today = new Date(); const dow = (today.getDay() + 6) % 7;
  const days = Array.from({ length: 7 }, (_, i) => new Date(today.getTime() + (i - dow) * DAY));
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginVertical: 14 }}>
      {days.map(d => {
        const k = dkey(d), on = k === dkey(), logged = !!s.logs[k]?.mood;
        return (
          <View key={k} style={{ width: 44, paddingVertical: 10, borderRadius: 22, alignItems: 'center', backgroundColor: on ? C.ink : C.card, borderWidth: on ? 0 : 1.5, borderColor: C.line }}>
            <Text style={{ fontSize: 12, color: on ? C.inv : C.muted }}>{d.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 3)}</Text>
            <Text style={{ fontSize: 16, fontWeight: '700', color: on ? C.inv : C.ink, marginTop: 2 }}>{d.getDate()}</Text>
            <View style={{ width: 5, height: 5, borderRadius: 3, marginTop: 4, backgroundColor: logged ? (on ? C.inv : C.ink) : 'transparent' }} />
          </View>
        );
      })}
    </View>
  );
}

export default function Today({ go, ask, book }: { go: (tab: string, sub?: string) => void; ask: (t: string) => void; book?: () => void }) {
  const { s, set } = useStore();
  const L = s.logs[dkey()];
  const [open, setOpen] = useState(false);
  const [news, setNews] = useState('');
  useEffect(() => { getConfig(s).then(c => setNews(c?.announcement ?? '')); }, []);
  const logFeed = (k: string) => set(x => ({ ...x, feeds: [...x.feeds, { t: Date.now(), k }] }));
  const logNappy = (k: string) => set(x => ({ ...x, nappies: [...x.nappies, { t: Date.now(), k }] }));
  const checkTile = (
    <Tile bg={C.butter} h={196} onPress={() => setOpen(o => !o)}>
      <Big>Daily{'\n'}check-in</Big>
      <Small>{L?.mood ? 'Done today. Tap to edit' : 'How are you feeling?'}</Small>
      <View style={{ flexDirection: 'row', position: 'absolute', bottom: 10, left: 10 }}>
        {(L?.mood ? [MOOD_BLOBS[L.mood - 1]] : [MOOD_BLOBS[2], MOOD_BLOBS[3], MOOD_BLOBS[4]]).map(([c, f], i) => (
          <View key={i} style={{ marginLeft: i ? -14 : 0 }}><Blob color={c} face={f} size={52} cheeks={false} /></View>
        ))}
      </View>
    </Tile>
  );
  const askTile = (
    <Tile bg={C.pink} h={92} onPress={() => go('ask')}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Big>Ask{'\n'}Moma</Big><ISpark color={C.ink} size={26} /></View>
    </Tile>
  );
  let body: React.ReactNode = null;
  if (s.mode === 'ttc') {
    const cy = cycleOf(s);
    const tip = !cy ? 'Log your last period to see your fertile window.'
      : cy.status === 'period' ? 'Rest, stay hydrated and keep taking folic acid. Your fertile window comes after your period.'
      : cy.status === 'peak' ? 'Today and tomorrow are your most fertile days. Every one to two days through your window gives you the best chance.'
      : cy.status === 'high' ? "You're in your fertile window. Sex every one to two days now gives you a good chance."
      : 'A calm stretch. Good time to eat well, move your body and keep up your folic acid.';
    body = (
      <>
        <Tile bg={C.pink} h={190} onPress={() => go('track', 'cycle')}>
          <View style={{ width: '64%' }}><CycleSummary compact /></View>
          <View style={{ position: 'absolute', right: 0, top: 22 }}><Mo size={104} pose="wave" /></View>
        </Tile>
        <Text style={{ fontSize: 22, fontWeight: '700', color: C.ink, letterSpacing: -0.5, marginBottom: 12, marginTop: 16 }}>Today for you</Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>{checkTile}</View>
          <View style={{ flex: 1, gap: 12 }}>
            <Tile bg={C.mint} h={92} onPress={() => go('track', 'cycle')}><Big size={17}>{'Log my\nperiod'}</Big></Tile>
            {askTile}
          </View>
        </View>
        {(open || !L?.mood) && <View style={{ marginTop: 12 }}><CheckIn onTalk={ask} /></View>}
        <View style={{ backgroundColor: C.card, borderRadius: 28, padding: 18, marginTop: 12 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: C.ink, marginBottom: 8 }}>This part of your cycle</Text>
          <Text style={{ fontSize: 14.5, color: C.ink, lineHeight: 20 }}>{tip}</Text>
        </View>
        <Tile bg={C.sky} style={{ marginTop: 12 }} onPress={() => go('community')}>
          <Big size={17}>Trying to conceive group</Big>
          <Small>Talk with women on the same journey</Small>
        </Tile>
      </>
    );
  } else if (s.mode === 'pregnant') {
    const p = preg(s);
    if (p) {
      const w = weekInfo(p.w), next = MILESTONES.filter(m => m[0] >= p.w)[0];
      body = (
        <>
          <Tile bg={C.lav} h={200}>
            <View style={{ width: '62%' }}>
              <Text style={{ fontSize: 44, fontWeight: '800', color: C.ink, letterSpacing: -1.5, lineHeight: 46 }}>Week {p.w}</Text>
              <Text style={{ fontSize: 18, fontWeight: '600', color: C.ink, marginTop: 6, lineHeight: 22 }}>Baby is the size of {/^[aeiou]/i.test(w[0]) ? 'an' : 'a'} {w[0]}</Text>
            </View>
            <View style={{ position: 'absolute', right: 0, top: 22 }}><Mo size={112} pose="hug" grow={p.w / 40} /></View>
            <View style={{ marginTop: 18, height: 8, borderRadius: 4, backgroundColor: C.ringTrack }}>
              <View style={{ width: `${Math.min(100, (p.days / 280) * 100)}%`, height: 8, borderRadius: 4, backgroundColor: C.ink }} />
            </View>
            <Text style={{ fontSize: 13, color: C.ink, marginTop: 8, fontWeight: '500' }}>{p.left > 0 ? `${p.left} days to go · due ${fmtDate(p.due)}` : 'Due any day now'}</Text>
          </Tile>
          <WeekStrip />
          <Text style={{ fontSize: 22, fontWeight: '700', color: C.ink, letterSpacing: -0.5, marginBottom: 12 }}>Today for you</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>{checkTile}</View>
            <View style={{ flex: 1, gap: 12 }}>
              <Tile bg={C.sky} h={92} onPress={() => go('journey')}>
                <Text style={{ fontSize: 12.5, fontWeight: '600', color: C.ink, opacity: 0.7 }}>{next ? `Around week ${next[0]}` : 'Coming up'}</Text>
                <Text numberOfLines={3} style={{ fontSize: 15, fontWeight: '700', color: C.ink, marginTop: 4, lineHeight: 18 }}>{next ? next[1] : 'Your birth plan'}</Text>
              </Tile>
              {askTile}
            </View>
          </View>
          {(open || !L?.mood) && <View style={{ marginTop: 12 }}><CheckIn onTalk={ask} /></View>}
          {p.w >= 24 && (
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
              <Tile bg={C.mint} style={{ flex: 1 }} onPress={() => go('track', 'moves')}><Big size={17}>Baby's{'\n'}movements</Big></Tile>
              <Tile bg={C.lime} style={{ flex: 1 }} onPress={() => go('track', 'ctx')}><Big size={17}>Contraction{'\n'}timer</Big></Tile>
            </View>
          )}
          <View style={{ backgroundColor: C.card, borderRadius: 28, padding: 18, marginTop: 12 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: C.ink, marginBottom: 12 }}>This week</Text>
            <View style={{ backgroundColor: C.peachSoft, borderRadius: 18, padding: 14, marginBottom: 8 }}><Text style={{ fontSize: 12.5, fontWeight: '700', color: C.ink, marginBottom: 4 }}>BABY</Text><Text style={{ fontSize: 14.5, color: C.ink, lineHeight: 20 }}>{w[1]}</Text></View>
            <View style={{ backgroundColor: C.roseSoft, borderRadius: 18, padding: 14 }}><Text style={{ fontSize: 12.5, fontWeight: '700', color: C.ink, marginBottom: 4 }}>YOU</Text><Text style={{ fontSize: 14.5, color: C.ink, lineHeight: 20 }}>{w[2]}</Text></View>
          </View>
        </>
      );
    }
  } else {
    const q = pp(s);
    if (q) {
      const n = ppInfo(q.w), lf = s.feeds[s.feeds.length - 1];
      const td = (arr: { t: number }[]) => arr.filter(f => dkey(new Date(f.t)) === dkey()).length;
      body = (
        <>
          <Tile bg={C.mint} h={190}>
            <View style={{ width: '60%' }}>
              <Text style={{ fontSize: 44, fontWeight: '800', color: C.ink, letterSpacing: -1.5, lineHeight: 46 }}>Day {q.days + 1}</Text>
              <Text style={{ fontSize: 17, fontWeight: '600', color: C.ink, marginTop: 6 }}>Week {q.w + 1} of your fourth trimester</Text>
              <Text style={{ fontSize: 13, color: C.ink, marginTop: 10, fontWeight: '500' }}>Last feed: {lf ? `${ago(lf.t)} (${lf.k})` : 'not logged yet'}</Text>
            </View>
            <View style={{ position: 'absolute', right: 6, top: 24 }}><Mo size={104} pose="sleep" grow={1} /></View>
          </Tile>
          <WeekStrip />
          <Text style={{ fontSize: 22, fontWeight: '700', color: C.ink, letterSpacing: -0.5, marginBottom: 12 }}>Quick log</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {([['Left', C.butter, () => logFeed('Left')], ['Right', C.pink, () => logFeed('Right')], ['Bottle', C.sky, () => logFeed('Bottle')], ['Nappy', C.lime, () => logNappy('Wet')]] as [string, string, () => void][]).map(([l, bg, fn]) => (
              <Tile key={l} bg={bg} style={{ width: '47.5%', flexGrow: 1 }} onPress={fn}>
                <Big size={19}>{l}</Big>
                <Small>{l === 'Nappy' ? `${td(s.nappies)} today` : `Tap to log feed`}</Small>
              </Tile>
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
            <View style={{ flex: 1 }}>{checkTile}</View>
            <View style={{ flex: 1, gap: 12 }}>
              <Tile bg={C.lav} h={92}><Text style={{ fontSize: 12.5, fontWeight: '600', color: C.ink, opacity: 0.7 }}>{td(s.feeds)} feeds today</Text><Text style={{ fontSize: 15, fontWeight: '700', color: C.ink, marginTop: 4 }}>{n[0]}</Text></Tile>
              {askTile}
            </View>
          </View>
          {(open || !L?.mood) && <View style={{ marginTop: 12 }}><CheckIn onTalk={ask} /></View>}
          <View style={{ backgroundColor: C.card, borderRadius: 28, padding: 18, marginTop: 12 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: C.ink, marginBottom: 8 }}>{n[0]}</Text>
            <Text style={{ fontSize: 14.5, color: C.ink, lineHeight: 20 }}>{n[1]}</Text>
          </View>
        </>
      );
    }
  }
  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 10, paddingBottom: 30 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      {news ? (
        <View style={{ backgroundColor: C.butter, borderRadius: 22, padding: 14, marginBottom: 12, flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          <ISpark color={C.ink} size={20} />
          <Text style={{ flex: 1, fontSize: 14, color: C.ink, lineHeight: 19, fontWeight: '500' }}>{news}</Text>
          <Pressable accessibilityLabel="Dismiss" onPress={() => setNews('')} hitSlop={10}><Text style={{ fontSize: 16, color: C.ink }}>✕</Text></Pressable>
        </View>
      ) : null}
      {body ?? <View style={{ backgroundColor: C.card, borderRadius: 28, padding: 18 }}><Text>Add your dates in Me to get started.</Text></View>}
      {book ? (
        <Tile bg={C.peach} onPress={book} style={{ marginTop: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' }}><IStetho color={C.ink} size={24} /></View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 17, fontWeight: '700', color: C.ink }}>Talk to an expert</Text>
              <Text style={{ fontSize: 13.5, color: C.ink, opacity: 0.75, marginTop: 2 }}>Book a doctor or care expert by video, phone or in person</Text>
            </View>
            <IGo size={20} color={C.ink} />
          </View>
        </Tile>
      ) : null}
      <Pressable onPress={() => ask(s.mode === 'pregnant' ? "What's happening this week?" : s.mode === 'ttc' ? 'How can I boost my chances of getting pregnant?' : 'Summarise my week for my postnatal clinic')}
        style={{ marginTop: 12, backgroundColor: C.ink, borderRadius: 28, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Mo size={44} pose="wave" />
        <View style={{ flex: 1 }}>
          <Text style={{ color: C.inv, fontSize: 16, fontWeight: '700' }}>{s.mode === 'pregnant' ? "What's happening this week?" : s.mode === 'ttc' ? 'Boost my chances' : 'Prep my postnatal visit'}</Text>
          <Text style={{ color: C.inv, opacity: 0.7, fontSize: 13 }}>Moma knows where you are in your journey</Text>
        </View>
        <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: C.lime, alignItems: 'center', justifyContent: 'center' }}><IGo size={18} color={C.ink} /></View>
      </Pressable>
      <NdpaBadge small style={{ alignSelf: 'center', marginTop: 20 }} />
      <Muted style={{ textAlign: 'center', marginTop: 10, fontSize: 12 }}>Moma supports, never replaces, your midwife or doctor.</Muted>
    </ScrollView>
  );
}
