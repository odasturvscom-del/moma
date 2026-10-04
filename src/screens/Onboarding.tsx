import React, { useState } from 'react';
import { ScrollView, View, Pressable, Alert, Platform } from 'react-native';
import { Mo } from '../mascot';
import { useStore, dkey, parseKey, DAY, Mode, State } from '../store';
import { track } from '../telemetry';
import { COUNTRIES, Country } from '../content';
import { Text, Btn, Input, Label, Muted, Seg, DateField, Chip } from '../ui';
import { C, P } from '../theme';

export default function Onboarding() {
  const { set } = useStore();
  const [name, setName] = useState('');
  const [mode, setMode] = useState<Mode>('pregnant');
  const [dt, setDt] = useState<'due' | 'lmp'>('due');
  const [date, setDate] = useState<string | null>(null);
  const [country, setCountry] = useState<Country>('UK');
  const finish = () => {
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) { const m = 'Please pick a date'; Platform.OS === 'web' ? alert(m) : Alert.alert(m); return; }
    const lmp = mode === 'pregnant' ? (dt === 'due' ? dkey(new Date(parseKey(date).getTime() - 280 * DAY)) : date) : null;
    set(s => {
      const next: State = {
      ...s, name: name.trim(), mode, country, onboarded: true, lmp, birth: mode === 'postpartum' ? date : null, lastOpen: dkey(),
      chat: [{ r: 'a', c: `Hi${name.trim() ? ' ' + name.trim() : ''}, I'm Moma. Ask me anything about ${mode === 'pregnant' ? 'your pregnancy' : 'recovery and your baby'}, day or night. If something feels wrong, I'll always point you to the right person fast.` }],
      };
      track(next, 'onboard'); track(next, 'open');
      return next;
    });
  };
  const Toggle = ({ k, label }: { k: Mode; label: string }) => (
    <Pressable onPress={() => setMode(k)} style={{ flex: 1, borderWidth: 2, borderColor: mode === k ? C.ink : C.line, backgroundColor: mode === k ? (k === 'pregnant' ? C.lav : C.mint) : C.card, borderRadius: 22, padding: 16, alignItems: 'center' }}>
      <Text style={{ fontWeight: '600', color: C.ink, fontSize: 15 }}>{label}</Text>
    </Pressable>
  );
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
      <View style={{ paddingTop: 56, paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Mo size={54} pose="wave" />
        <Text style={{ fontSize: 30, fontWeight: '800', color: C.ink, letterSpacing: -1 }}>moma</Text>
      </View>
      <View style={{ padding: 22 }}>
      <Text style={{ fontSize: 26, fontWeight: '700', color: C.ink, letterSpacing: -0.6 }}>Let's set things up</Text>
      <Muted style={{ fontSize: 14.5, marginBottom: 8, marginTop: 6 }}>Three quick questions so Moma knows where you are. It all stays on this phone.</Muted>
      <Label>Your first name</Label>
      <Input value={name} onChangeText={setName} placeholder="e.g. Ada" />
      <Label>Where are you?</Label>
      <View style={{ flexDirection: 'row', gap: 8 }}><Toggle k="pregnant" label="I'm pregnant" /><Toggle k="postpartum" label="Baby's here" /></View>
      {mode === 'pregnant' ? (
        <>
          <Label>I know my</Label>
          <Seg items={[['due', 'Due date'], ['lmp', 'Last period']]} value={dt} onChange={setDt} />
          <DateField value={date} onChange={setDate} />
        </>
      ) : (
        <>
          <Label>Baby's birthday</Label>
          <DateField value={date} onChange={setDate} max={new Date()} />
        </>
      )}
      <Label>Country (local guidance and emergency numbers)</Label>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {COUNTRIES.map(c => <Chip key={c} label={c} on={c === country} onPress={() => setCountry(c)} />)}
      </View>
      <View style={{ height: 22 }} />
      <Btn title="Start my journey" onPress={finish} />
      <Muted style={{ textAlign: 'center', marginTop: 14 }}>Moma supports, it doesn't replace, your midwife or doctor.</Muted>
      </View>
    </ScrollView>
  );
}
