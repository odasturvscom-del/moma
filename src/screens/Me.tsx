import React, { useState } from 'react';
import { ScrollView, View, Platform, Alert, Share, Switch, Linking } from 'react-native';
import { Text } from '../ui';
import { useStore, preg, dkey, parseKey, DAY } from '../store';
import { apiBase } from '../ai';
import { sendFeedback, deleteServerData, VERSION } from '../telemetry';
import { pp } from '../store';
import { C } from '../theme';
import { COUNTRIES, Country } from '../content';
import { Card, H3, Muted, Btn, Input, Label, Chip, DateField, Notice, Grid2, Seg } from '../ui';
import { NdpaBadge } from '../ndpa';
import { signOut, deleteAccount } from '../auth';
import { pushStatus, pushOn, pushOff, pushSupported } from '../push';

function PushCard() {
  const { s } = useStore();
  const [st, setSt] = useState<'on' | 'off' | 'blocked' | 'unsupported' | null>(null);
  const [busy, setBusy] = useState(false), [msg, setMsg] = useState('');
  React.useEffect(() => { pushStatus().then(setSt).catch(() => setSt('unsupported')); }, []);
  if (Platform.OS !== 'web' || st === null) return null;
  const toggle = async () => { setBusy(true); setMsg(''); try { if (st === 'on') { await pushOff(s); setSt('off'); } else { await pushOn(s); setSt('on'); setMsg('Done. You will hear from us about appointments and important updates.'); } } catch (e: any) { setMsg(e.message); } setBusy(false); };
  return (
    <Card>
      <H3>Notifications</H3>
      <Muted style={{ marginTop: 2 }}>{st === 'on' ? 'On for this phone. We send appointment updates and the odd important tip, never spam.' : st === 'blocked' ? 'Notifications are blocked for Moma. Allow them in your browser or phone settings, then come back here.' : 'Get a ping when an appointment is confirmed, and for important updates.'}</Muted>
      {st !== 'blocked' ? <Btn title={busy ? 'One moment…' : st === 'on' ? 'Turn off notifications' : 'Turn on notifications'} kind={st === 'on' ? 'ghost' : undefined} style={{ marginTop: 12 }} onPress={toggle} /> : null}
      {msg ? <Muted style={{ marginTop: 8 }}>{msg}</Muted> : null}
    </Card>
  );
}


const maps = (q: string) => Linking.openURL('https://www.google.com/maps/search/' + encodeURIComponent(q));
const say = (m: string) => (Platform.OS === 'web' ? alert(m) : Alert.alert(m));
export default function Me({ done, openSupport, openBook, unread = 0 }: { done: () => void; openSupport: () => void; openBook?: () => void; unread?: number }) {
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
  const shareFamily = () => {
    const q2 = pp(s);
    const next = [...s.appts].filter(a => a.d >= dkey()).sort((a, b) => a.d.localeCompare(b.d))[0];
    const stageLine = s.mode === 'pregnant' && p ? `I'm ${p.w} weeks pregnant and due around ${p.due.getDate()} ${p.due.toLocaleString('en-GB', { month: 'long' })}.` : q2 ? `Our baby is ${q2.w} weeks old.` : '';
    const help = s.mode === 'pregnant' && p && p.w >= 34 ? 'Please help me finish the hospital bag and plan how we get to the hospital, day or night.'
      : s.mode === 'pregnant' ? 'Help me rest, eat well and get to my antenatal visits. If I have bleeding, a bad headache, blurred vision or baby stops moving, take me to hospital straight away.'
      : 'Help with cooking, washing and night feeds so I can rest. If I have heavy bleeding, fever or feel very low, take me to hospital.';
    const msg = [`Update from ${s.name || 'me'} (via Moma)`, stageLine, next ? `Next appointment: ${next.t}, ${next.d}.` : '', help].filter(Boolean).join('\n');
    if (Platform.OS === 'web') window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank'); else Share.share({ message: msg });
  };
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
    set(x => ({ ...x, name: name.trim(), country, lmp: due ? dkey(new Date(parseKey(due).getTime() - 280 * DAY)) : x.lmp, birth: birth || null, mode: birth ? 'postpartum' : due ? 'pregnant' : x.mode }));
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
      {openBook ? (
        <Card style={{ backgroundColor: C.peach }}>
          <H3>Talk to an expert</H3>
          <Muted style={{ color: C.ink }}>Book a doctor or care expert, and see your appointments.</Muted>
          <View style={{ height: 10 }} />
          <Btn title="My appointments" onPress={openBook} />
        </Card>
      ) : null}
      <Card style={{ backgroundColor: C.mint }}>
        <H3>Talk to the Moma team</H3>
        <Muted style={{ color: C.ink }}>{unread ? `You have ${unread} new ${unread === 1 ? 'reply' : 'replies'} from the team.` : 'Chat with a real person about the app or anything on your mind.'}</Muted>
        <View style={{ height: 10 }} />
        <Btn title={unread ? 'Read reply' : 'Start a chat'} onPress={openSupport} />
      </Card>
      <Card>
        <H3>Find care near you</H3>
        <Muted>Opens a map of places close to where you are right now.</Muted>
        <View style={{ height: 10 }} />
        <Grid2>
          <Btn kind="plum" title="Maternity hospitals" onPress={() => maps('maternity hospital near me')} />
          <Btn kind="ghost" title="Health centres" onPress={() => maps('primary health centre near me')} />
        </Grid2>
        <View style={{ height: 8 }} />
        <Btn kind="ghost" title="Pharmacies" onPress={() => maps('pharmacy near me')} />
        <Muted style={{ marginTop: 8 }}>In an emergency, call 999. For urgent advice, call your maternity unit or NHS 111.</Muted>
      </Card>
      <Card>
        <H3>Keep your family in the loop</H3>
        <Muted>Send your partner or family a short update: how far along you are, your next appointment and how they can help this week.</Muted>
        <View style={{ height: 10 }} />
        <Btn title="Share on WhatsApp" onPress={shareFamily} />
      </Card>
      <Card>
        <H3>Low-data mode</H3>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Muted style={{ flex: 1 }}>Skips product photos and other large pictures so Moma uses less of your data.</Muted>
          <Switch value={!!s.lite} onValueChange={v => set(x => ({ ...x, lite: v }))} trackColor={{ true: C.ink, false: C.trackOff }} thumbColor="#fff" />
        </View>
      </Card>
      <Card>
        <H3>Appearance</H3>
        <Seg items={[['system', 'Auto'], ['light', 'Light'], ['dark', 'Dark']]} value={s.theme ?? 'system'} onChange={v => set(x => ({ ...x, theme: v }))} />
        <Muted style={{ marginTop: 4 }}>Auto follows your phone's light or dark setting.</Muted>
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
      <PushCard />
      {s.account ? (
        <Card>
          <H3>Your account</H3>
          <Muted>Signed in{s.account.email ? ` as ${s.account.email}` : ''}{s.account.via === 'google' ? ' with Google' : ' with your email'}. We keep only your email address.</Muted>
          <View style={{ height: 10 }} />
          <Grid2>
            <Btn kind="ghost" title="Sign out" onPress={() => {
              const go = () => signOut(s, set);
              if (Platform.OS === 'web') { if (confirm('Sign out of Moma on this device?')) go(); return; }
              Alert.alert('Sign out?', 'You can sign back in any time.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Sign out', onPress: go }]);
            }} />
            <Btn kind="ghost" title="Delete account" onPress={() => {
              const go = () => deleteAccount(s, set).catch(e => (Platform.OS === 'web' ? alert(e.message) : Alert.alert(e.message)));
              const msg = 'This deletes your Moma account, your community name and group memberships. Posts you made will show as "Former member". Your notes on this phone are not touched.';
              if (Platform.OS === 'web') { if (confirm(msg)) go(); return; }
              Alert.alert('Delete your account?', msg, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: go }]);
            }} />
          </Grid2>
        </Card>
      ) : null}
      <Card>
        <H3>Your data</H3>
        <Muted>Everything lives on this phone. Nothing is sold, shared or used for ads.</Muted>
        <View style={{ marginTop: 10, padding: 12, borderRadius: 14, backgroundColor: '#F1E6F4' }}>
          <NdpaBadge sub="Your data stays yours" style={{ marginBottom: 10 }} />
          <Muted>Moma is built for UK GDPR and the Data Protection Act 2018. Your health logs stay on your phone, Everything you send travels encrypted, Ask Moma chats are not stored on our servers, and you can export or delete your data at any time.</Muted>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: C.ink }}>Share usage with the Moma team</Text>
            <Muted>Your stage, country and which features you use, linked to a random ID. Never your logs, moods or Ask Moma chats.</Muted>
          </View>
          <Switch value={s.stats !== false} onValueChange={v => set(x => ({ ...x, stats: v }))} trackColor={{ true: C.ink, false: C.trackOff }} thumbColor="#fff" />
        </View>
        <View style={{ height: 10 }} />
        <Grid2>
          <Btn kind="ghost" title="Export" onPress={() => Share.share({ message: JSON.stringify(s, null, 2) })} />
          <Btn kind="ghost" title="Delete all" onPress={confirmReset} />
        </Grid2>
        {s.usecret ? <Btn kind="ghost" title="Delete my data on Moma's servers" style={{ marginTop: 8 }} onPress={confirmServerDelete} /> : null}
      </Card>
      <Notice kind="info">Moma supports, never replaces, your midwife, nurse or doctor. In an emergency call your local emergency number.</Notice>
      <Muted style={{ textAlign: 'center' }}>Moma v{VERSION}</Muted>
    </ScrollView>
  );
}
