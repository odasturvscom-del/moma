import React, { useState } from 'react';
import { ScrollView, Text, View, Pressable, Alert, Platform } from 'react-native';
import { useStore, dkey, parseKey, DAY, Mode } from '../store';
import { COUNTRIES, Country } from '../content';
import { Btn, Input, Label, Muted, Seg, DateField, Chip } from '../ui';
import { C } from '../theme';

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
    set(s => ({
      ...s, name: name.trim(), mode, country, onboarded: true, lmp, birth: mode === 'postpartum' ? date : null,
      chat: [{ r: 'a', c: `Hi${name.trim() ? ' ' + name.trim() : ''}, I'm Moma. Ask me anything about ${mode === 'pregnant' ? 'your pregnancy' : 'recovery and your baby'}, day or night. If something feels wrong, I'll always point you to the right person fast.` }],
    }));
  };
  const Toggle = ({ k, label }: { k: Mode; label: string }) => (
    <Pressable onPress={() => setMode(k)} style={{ flex: 1, borderWidth: 2, borderColor: mode === k ? C.rose : C.line, backgroundColor: mode === k ? C.roseSoft : '#fff', borderRadius: 16, padding: 14, alignItems: 'center' }}>
      <Text style={{ fontWeight: '700', color: C.ink }}>{label}</Text>
    </Pressable>
  );
  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 60, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
      <Text style={{ fontSize: 40, fontWeight: '800', color: C.plum, letterSpacing: -1 }}>mo<Text style={{ color: C.rose }}>ma</Text></Text>
      <Muted style={{ fontSize: 15, marginBottom: 8 }}>Your companion from the first scan to the first year. Private by default: everything stays on this phone.</Muted>
      <Label>Your first name</Label>
      <Input value={name} onChangeText={setName} placeholder="e.g. Ada" />
      <Label>Where are you?</Label>
      <View style={{ flexDirection: 'row', gap: 8 }}><Toggle k="pregnant" label="🤰 I'm pregnant" /><Toggle k="postpartum" label="👶 Baby's here" /></View>
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
    </ScrollView>
  );
}
