import React, { useState } from 'react';
import { ScrollView, View, Platform, Alert, Share } from 'react-native';
import { Text } from '../ui';
import { useStore, preg, dkey, parseKey, DAY } from '../store';
import { apiBase } from '../ai';
import { COUNTRIES, Country } from '../content';
import { Card, H3, Muted, Btn, Input, Label, Chip, DateField, Notice, Grid2 } from '../ui';

const say = (m: string) => (Platform.OS === 'web' ? alert(m) : Alert.alert(m));
export default function Me({ done }: { done: () => void }) {
  const { s, set, reset } = useStore();
  const p = preg(s);
  const [name, setName] = useState(s.name);
  const [country, setCountry] = useState<Country>(s.country);
  const [due, setDue] = useState<string | null>(p ? dkey(p.due) : null);
  const [birth, setBirth] = useState<string | null>(s.birth);
  const [url, setUrl] = useState(s.ai.serverUrl);
  const [testing, setTesting] = useState(false);
  const save = () => {
    set(x => ({ ...x, name: name.trim(), country, lmp: due ? dkey(new Date(parseKey(due).getTime() - 280 * DAY)) : x.lmp, birth: birth || null, mode: birth ? 'postpartum' : 'pregnant' }));
    done();
  };
  const test = async () => {
    setTesting(true);
    try { const base = apiBase({ ...s, ai: { serverUrl: url } }); const r = await fetch(`${base}/health`); const j = await r.json(); say(j.ok ? `Connected. Model: ${j.provider}` : 'Server answered but is not configured'); }
    catch { say("Couldn't reach that address. Is the server running and on the same Wi-Fi?"); }
    finally { setTesting(false); }
  };
  const confirmReset = () => {
    if (Platform.OS === 'web') { if (confirm('Delete all Moma data on this device?')) reset(); return; }
    Alert.alert('Delete all data?', 'This removes everything Moma has stored on this phone.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => reset() }]);
  };
  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <Card>
        <H3>Profile</H3>
        <Label>First name</Label><Input value={name} onChangeText={setName} />
        <Label>Country</Label>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{COUNTRIES.map(c => <Chip key={c} label={c} on={c === country} onPress={() => setCountry(c)} />)}</View>
        <Label>Due date</Label><DateField value={due} onChange={setDue} />
        <Label>Baby's birthday (switches to postpartum)</Label><DateField value={birth} onChange={setBirth} max={new Date()} />
        {birth ? <Btn kind="ghost" title="Clear birthday (back to pregnancy)" style={{ marginTop: 8 }} onPress={() => setBirth(null)} /> : null}
        <View style={{ height: 12 }} /><Btn title="Save" onPress={save} />
      </Card>
      <Card>
        <H3>AI companion</H3>
        <Muted>Without a server Moma answers common questions offline. Connect the Moma server to use a frontier model for everything, personalised to your logs. Your API key lives on the server, never on the phone.</Muted>
        <Label>Moma server address</Label>
        <Input value={url} onChangeText={setUrl} autoCapitalize="none" autoCorrect={false} placeholder={Platform.OS === 'web' ? 'Leave blank to use this site' : 'https://your-moma.vercel.app/api'} />
        <View style={{ height: 10 }} />
        <Grid2>
          <Btn kind="plum" title="Save" onPress={() => { set(x => ({ ...x, ai: { serverUrl: url.trim() } })); say('Saved'); }} />
          <Btn kind="ghost" title={testing ? 'Testing…' : 'Test connection'} onPress={test} />
        </Grid2>
      </Card>
      <Card>
        <H3>Your data</H3>
        <Muted>Everything lives on this phone. Nothing is sold, shared or used for ads.</Muted>
        <View style={{ height: 10 }} />
        <Grid2>
          <Btn kind="ghost" title="Export" onPress={() => Share.share({ message: JSON.stringify(s, null, 2) })} />
          <Btn kind="ghost" title="Delete all" onPress={confirmReset} />
        </Grid2>
      </Card>
      <Notice kind="info">Moma supports, never replaces, your midwife, GP or doctor. In an emergency call your local emergency number.</Notice>
      <Muted style={{ textAlign: 'center' }}>Moma v0.2</Muted>
    </ScrollView>
  );
}
