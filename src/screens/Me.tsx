import React, { useState } from 'react';
import { ScrollView, View, Platform, Alert, Share, Switch } from 'react-native';
import { Text } from '../ui';
import { useStore, preg, dkey, parseKey, DAY } from '../store';
import { apiBase } from '../ai';
import { sendFeedback, deleteServerData, VERSION } from '../telemetry';
import { pp } from '../store';
import { C } from '../theme';
import { COUNTRIES, Country } from '../content';
import { Card, H3, Muted, Btn, Input, Label, Chip, DateField, Notice, Grid2 } from '../ui';

const say = (m: string) => (Platform.OS === 'web' ? alert(m) : Alert.alert(m));
export default function Me({ done, openSupport, unread = 0 }: { done: () => void; openSupport: () => void; unread?: number }) {
  const { s, set, reset } = useStore();
  const p = preg(s);
  const [name, setName] = useState(s.name);
  const [country, setCountry] = useState<Country>(s.country);
  const [due, setDue] = useState<string | null>(p ? dkey(p.due) : null);
  const [birth, setBirth] = useState<string | null>(s.birth);
  const [url, setUrl] = useState(s.ai.serverUrl);
  const [testing, setTesting] = useState(false);
  const [fb, setFb] = useState('');
  const [sending, setSending] = useState(false);
  const send = async () => {
    if (fb.trim().length < 2) return;
    setSending(true);
    const q = pp(s);
    const stage = s.mode === 'pregnant' ? (p ? `week ${p.w}` : 'pregnant') : (q ? `postpartum week ${q.w}` : 'postpartum');
    try { await sendFeedback(s, fb.trim(), stage); setFb(''); say('Thank you. The Moma team will read this.'); }
    catch (e: any) { say(e?.message ?? 'Could not send feedback'); }
    finally { setSending(false); }
  };
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
  const confirmServerDelete = () => {
    const go = async () => {
      try { await deleteServerData(s); set(x => ({ ...x, uid: null, usecret: null, stats: false })); say("Done. Your usage record and support chats are deleted from Moma's servers, and usage sharing is off."); }
      catch (e: any) { say(e?.message ?? 'Could not delete right now'); }
    };
    if (Platform.OS === 'web') { if (confirm("Delete your usage record and support chats from Moma's servers? Your logs on this device stay.")) go(); return; }
    Alert.alert('Delete server data?', "Removes your usage record and support chats from Moma's servers. Your logs on this phone stay.", [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: go }]);
  };
  const confirmReset = () => {
    if (Platform.OS === 'web') { if (confirm('Delete all Moma data on this device?')) reset(); return; }
    Alert.alert('Delete all data?', 'This removes everything Moma has stored on this phone.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => reset() }]);
  };
  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <Card style={{ backgroundColor: C.mint }}>
        <H3>Talk to the Moma team</H3>
        <Muted style={{ color: C.ink }}>{unread ? `You have ${unread} new ${unread === 1 ? 'reply' : 'replies'} from the team.` : 'Chat with a real person about the app or anything on your mind.'}</Muted>
        <View style={{ height: 10 }} />
        <Btn title={unread ? 'Read reply' : 'Start a chat'} onPress={openSupport} />
      </Card>
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
        <H3>Send feedback</H3>
        <Muted>Tell us what's working and what isn't. Please don't include medical details. This goes to the Moma team, not your midwife.</Muted>
        <View style={{ height: 10 }} />
        <Input multiline value={fb} onChangeText={setFb} placeholder="What would make Moma better for you?" maxLength={1500} />
        <View style={{ height: 10 }} />
        <Btn title={sending ? 'Sending…' : 'Send feedback'} onPress={send} />
      </Card>
      <Card>
        <H3>Your data</H3>
        <Muted>Everything lives on this phone. Nothing is sold, shared or used for ads.</Muted>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: C.ink }}>Share usage with the Moma team</Text>
            <Muted>Your stage, country and which features you use, linked to a random ID. Never your logs, moods or Ask Moma chats.</Muted>
          </View>
          <Switch value={s.stats !== false} onValueChange={v => set(x => ({ ...x, stats: v }))} trackColor={{ true: C.ink, false: '#DDD7D0' }} thumbColor="#fff" />
        </View>
        <View style={{ height: 10 }} />
        <Grid2>
          <Btn kind="ghost" title="Export" onPress={() => Share.share({ message: JSON.stringify(s, null, 2) })} />
          <Btn kind="ghost" title="Delete all" onPress={confirmReset} />
        </Grid2>
        {s.usecret ? <Btn kind="ghost" title="Delete my data on Moma's servers" style={{ marginTop: 8 }} onPress={confirmServerDelete} /> : null}
      </Card>
      <Notice kind="info">Moma supports, never replaces, your midwife, GP or doctor. In an emergency call your local emergency number.</Notice>
      <Muted style={{ textAlign: 'center' }}>Moma v{VERSION}</Muted>
    </ScrollView>
  );
}
