import React, { useState } from 'react';
import { ScrollView, View, Pressable, Alert, Platform } from 'react-native';
import { Blob } from '../mascot';
import { useStore, dkey, parseKey, DAY, Mode } from '../store';
import { COUNTRIES, Country } from '../content';
import { Text, Btn, Input, Label, Muted, Seg, DateField, Chip } from '../ui';
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
    <Pressable onPress={() => setMode(k)} style={{ flex: 1, borderWidth: 2, borderColor: mode === k ? C.ink : C.line, backgroundColor: mode === k ? (k === 'pregnant' ? C.lav : C.mint) : '#fff', borderRadius: 22, padding: 16, alignItems: 'center' }}>
      <Text style={{ fontWeight: '600', color: C.ink, fontSize: 15 }}>{label}</Text>
    </Pressable>
  );
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
      <View style={{ backgroundColor: C.sky, paddingTop: 70, paddingBottom: 26, borderBottomLeftRadius: 40, borderBottomRightRadius: 40, overflow: 'hidden' }}>
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '55%', backgroundColor: C.lav, opacity: 0.55 }} />
        <Text style={{ fontSize: 76, fontWeight: '800', color: C.ink, letterSpacing: -3, textAlign: 'center', lineHeight: 80 }}>moma</Text>
        <View style={{ height: 220, marginTop: 6 }}>
          <View style={{ position: 'absolute', left: '50%', marginLeft: -150, top: 30 }}><Blob color={C.coral} face="calm" size={140} arms /></View>
          <View style={{ position: 'absolute', left: '50%', marginLeft: -102, top: 108 }}><Blob color={C.peach} face="smile" size={50} leaf /></View>
          <View style={{ position: 'absolute', left: '50%', marginLeft: 4, top: 50 }}><Blob color={C.lav} face="smile" size={80} wave /></View>
          <View style={{ position: 'absolute', left: '50%', marginLeft: 60, top: 118 }}><Blob color={C.mint} face="wink" size={74} /></View>
          <View style={{ position: 'absolute', left: '50%', marginLeft: -6, top: 140 }}><Blob color={C.butter} face="happy" size={62} /></View>
          <View style={{ position: 'absolute', left: '50%', marginLeft: 20, top: 0, backgroundColor: C.ink, borderRadius: 99, paddingVertical: 9, paddingHorizontal: 16, transform: [{ rotate: '-6deg' }] }}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Hi mama~</Text>
          </View>
        </View>
      </View>
      <View style={{ padding: 22 }}>
      <Text style={{ fontSize: 24, fontWeight: '700', color: C.ink, letterSpacing: -0.6, textAlign: 'center' }}>Your pregnancy, made lighter</Text>
      <Muted style={{ fontSize: 14.5, marginBottom: 8, textAlign: 'center', marginTop: 6 }}>From the first scan to the first year. Private by default: everything stays on this phone.</Muted>
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
