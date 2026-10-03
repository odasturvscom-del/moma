import React from 'react';
import { View, Pressable } from 'react-native';
import { Blob, MOOD_BLOBS } from '../mascot';
import { useStore, dkey } from '../store';
import { SYM_PREG, SYM_PP } from '../content';
import { Text, Card, H3, Chip, Input, Label, FlagCard, Notice } from '../ui';
import { triage } from '../safety';
import { C } from '../theme';

export default function CheckIn({ onTalk }: { onTalk: (t: string) => void }) {
  const { s, set } = useStore();
  const k = dkey(), L = s.logs[k] ?? {}, syms = s.mode === 'pregnant' ? SYM_PREG : SYM_PP;
  const upd = (patch: object) => set(x => ({ ...x, logs: { ...x.logs, [k]: { ...(x.logs[k] ?? {}), ...patch } } }));
  const tog = (sym: string) => { const cur = L.sym ?? []; upd({ sym: cur.includes(sym) ? cur.filter(y => y !== sym) : [...cur, sym] }); };
  const spot = (L.sym ?? []).includes('Spotting') ? triage('spotting', s.mode, s.country) : null;
  const low = (L.sym ?? []).includes('Low mood') || (L.mood ?? 5) <= 1;
  return (
    <Card>
      <H3>{L.mood ? "Today's check-in ✓" : 'How are you feeling today?'}</H3>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
        {MOOD_BLOBS.map(([col, face], i) => (
          <Pressable key={i} accessibilityLabel={`Mood ${i + 1} of 5`} onPress={() => upd({ mood: i + 1 })} style={{ padding: 4, borderRadius: 22, borderWidth: 2, borderColor: L.mood === i + 1 ? C.ink : 'transparent', opacity: L.mood && L.mood !== i + 1 ? 0.45 : 1 }}>
            <Blob color={col} face={face} size={48} cheeks={false} />
          </Pressable>
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {syms.map(x => <Chip key={x} label={x} on={(L.sym ?? []).includes(x)} onPress={() => tog(x)} />)}
      </View>
      <Label>Anything else?</Label>
      <Input multiline value={L.note ?? ''} onChangeText={t => upd({ note: t })} placeholder="Optional note just for you" />
      {spot ? <FlagCard t={spot} /> : null}
      {low ? (
        <Notice kind="warn">
          <Text style={{ fontSize: 13 }}>Rough day? That's allowed. If it's been like this for more than two weeks, I can help you prepare to talk to your GP or health visitor. </Text>
          <Text style={{ fontSize: 13, color: C.ink, fontWeight: '700', marginTop: 6, textDecorationLine: 'underline' }} onPress={() => onTalk('I have been feeling low. Can you help me explain it to my GP?')}>Talk it through →</Text>
        </Notice>
      ) : null}
    </Card>
  );
}
