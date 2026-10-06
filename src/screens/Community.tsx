import React, { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, Pressable, ActivityIndicator, TextInput, Linking } from 'react-native';
import { useStore } from '../store';
import { Text, Muted, Btn, Notice } from '../ui';
import { cx, Group, Post, ago } from '../community';
import { needSignIn } from '../auth';
import { translate, LANGS, speak } from '../voice';
import { EM } from '../content';
import { Mo } from '../mascot';
import { IBack, IGlobe, ISpeaker, IUsers } from '../icons';
import { C, F, pastel } from '../theme';

type View_ = { k: 'home' } | { k: 'group'; id: number } | { k: 'thread'; id: number };
const RULES = ['Be kind. Every mum is doing her best.', 'No medical diagnoses. Share experiences, and point each other to a doctor or clinic.',
  'No selling, adverts, links, phone numbers or asking for money.', 'Keep it private: no full names, addresses or photos of other people.',
  'If you are worried about yourself or your baby right now, call 999, or call your maternity unit straight away.'];

function Field(p: React.ComponentProps<typeof TextInput>) {
  return <TextInput placeholderTextColor={C.muted} {...p} style={[{ backgroundColor: C.card, borderWidth: 1.5, borderColor: C.line, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: C.ink, fontFamily: F.r }, p.style as object]} />;
}
const Check = ({ on, set, label }: { on: boolean; set: (v: boolean) => void; label: string }) => (
  <Pressable onPress={() => set(!on)} style={{ flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 10 }}>
    <View style={{ width: 24, height: 24, borderRadius: 8, borderWidth: 2, borderColor: '#69247C', backgroundColor: on ? '#69247C' : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
      {on ? <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>✓</Text> : null}
    </View>
    <Text style={{ flex: 1, fontSize: 14.5, color: C.ink }}>{label}</Text>
  </Pressable>
);
const Pill = ({ label, onPress, on, bg }: { label: string; onPress: () => void; on?: boolean; bg?: string }) => (
  <Pressable onPress={onPress} style={{ backgroundColor: on ? C.ink : bg || C.card, borderWidth: on || bg ? 0 : 1.5, borderColor: C.line, borderRadius: 99, paddingVertical: 8, paddingHorizontal: 14 }}>
    <Text style={{ fontSize: 13.5, fontWeight: '600', color: on ? C.inv : C.ink }}>{label}</Text>
  </Pressable>
);

function SafetyNote({ titles, country }: { titles: string[]; country: string }) {
  const n = (EM[country as keyof typeof EM] ?? EM.Other).e;
  return (
    <Notice kind="danger">
      <Text style={{ fontWeight: '800', color: C.red, fontSize: 14.5 }}>If this is happening now, don't wait for replies</Text>
      <Text style={{ fontSize: 14, color: C.ink, marginTop: 4 }}>{titles.join(' · ')} can need urgent care. Go to your nearest hospital or call {n}.</Text>
      <Btn title={`Call ${n}`} kind="danger" style={{ marginTop: 10 }} onPress={() => Linking.openURL(`tel:${n}`)} />
    </Notice>
  );
}

function Translate({ text }: { text: string }) {
  const { s } = useStore();
  const [open, setOpen] = useState(false), [out, setOut] = useState(''), [busy, setBusy] = useState(false), [to, setTo] = useState('');
  const go = async (l: string) => { setTo(l); setBusy(true); try { setOut(await translate(s, text, l)); } catch (e: any) { setOut(e.message); } finally { setBusy(false); } };
  return (
    <View>
      <View style={{ flexDirection: 'row', gap: 14, marginTop: 10 }}>
        <Pressable onPress={() => setOpen(!open)} style={{ flexDirection: 'row', gap: 5, alignItems: 'center' }}><IGlobe size={16} color={C.muted} /><Text style={{ fontSize: 13, color: C.muted, fontWeight: '600' }}>Translate</Text></Pressable>
        <Pressable onPress={() => speak(s, out || text).catch(() => {})} style={{ flexDirection: 'row', gap: 5, alignItems: 'center' }}><ISpeaker size={16} color={C.muted} /><Text style={{ fontSize: 13, color: C.muted, fontWeight: '600' }}>Listen</Text></Pressable>
      </View>
      {open && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>{LANGS.map(l => <Pill key={l} label={l} on={to === l} onPress={() => go(l)} />)}</View>}
      {busy ? <ActivityIndicator color={C.ink} style={{ marginTop: 8, alignSelf: 'flex-start' }} /> : out ? <View style={{ marginTop: 8, backgroundColor: C.bg, borderRadius: 14, padding: 12 }}><Muted style={{ fontSize: 12 }}>{to} · translated by AI</Muted><Text style={{ fontSize: 14.5, color: C.ink, marginTop: 4, lineHeight: 20 }}>{out}</Text></View> : null}
    </View>
  );
}

export default function Community() {
  const { s, set } = useStore();
  const [view, setView] = useState<View_>({ k: 'home' });
  const [me, setMe] = useState<{ nick: string | null; joined: boolean; banned: boolean } | null>(null);
  const [err, setErr] = useState('');
  const call = useCallback((a: string, b?: object, qs = '') => cx(s, set, a, b, qs), [s.uid, s.usecret]);
  useEffect(() => { call('me').then(setMe).catch(e => setErr(e.message)); }, []);

  if (err && !me) return <ScrollView contentContainerStyle={{ padding: 20 }}><Notice kind="warn"><Text>{err}</Text></Notice><Btn title="Try again" style={{ marginTop: 12 }} onPress={() => { setErr(''); call('me').then(setMe).catch(e => setErr(e.message)); }} /></ScrollView>;
  if (!me) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={C.ink} /></View>;
  if (!me.joined) return <Join call={call} done={setMe} />;
  if (view.k === 'group') return <GroupView id={view.id} call={call} back={() => setView({ k: 'home' })} open={id => setView({ k: 'thread', id })} me={me} />;
  if (view.k === 'thread') return <Thread id={view.id} call={call} back={(g?: number) => setView(g ? { k: 'group', id: g } : { k: 'home' })} me={me} />;
  return <Home call={call} open={id => setView({ k: 'group', id })} me={me} />;
}

function Join({ call, done }: { call: any; done: (m: any) => void }) {
  const { s, set } = useStore();
  const [nick, setNick] = useState(s.name ? `${s.name.split(' ')[0]}` : ''), [adult, setAdult] = useState(false), [rules, setRules] = useState(false), [busy, setBusy] = useState(false), [err, setErr] = useState('');
  const go = async () => { if (needSignIn(s, set, 'join the community')) return; setBusy(true); setErr(''); try { done(await call('join-community', { nick, adult, rules })); } catch (e: any) { setErr(e.message); } finally { setBusy(false); } };
  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 10, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <View style={{ backgroundColor: C.lav, borderRadius: 28, padding: 20, flexDirection: 'row', gap: 14, alignItems: 'center' }}>
        <Mo size={64} pose="hug" />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 24, fontWeight: '800', color: C.ink, letterSpacing: -0.6 }}>Moma community</Text>
          <Text style={{ fontSize: 14, color: C.ink, opacity: 0.75, marginTop: 4 }}>Join groups of mums at your stage and near you. Ask, share and support each other.</Text>
        </View>
      </View>
      <View style={{ backgroundColor: C.card, borderRadius: 28, padding: 18, marginTop: 12 }}>
        <Text style={{ fontSize: 16, fontWeight: '700', color: C.ink }}>Pick a nickname</Text>
        <Muted style={{ marginTop: 2 }}>This is all other mums will see. You can use your first name or something else.</Muted>
        <Field value={nick} onChangeText={setNick} placeholder="e.g. Ada, Mama Tobi" maxLength={24} style={{ marginTop: 10 }} />
        <Text style={{ fontSize: 16, fontWeight: '700', color: C.ink, marginTop: 18 }}>Community rules</Text>
        {RULES.map((r, i) => <Text key={i} style={{ fontSize: 14, color: C.ink, marginTop: 6, lineHeight: 20 }}>{i + 1}. {r}</Text>)}
        <Check on={adult} set={setAdult} label="I am 18 or over" />
        <Check on={rules} set={setRules} label="I agree to the community rules" />
        <Muted style={{ marginTop: 10, fontSize: 12.5 }}>Posts are checked by AI before they appear, and the Moma team reviews anything reported. You can delete your posts at any time.</Muted>
        {err ? <Text style={{ color: C.red, marginTop: 10 }}>{err}</Text> : null}
        <Btn title={busy ? 'Joining…' : 'Join the community'} style={{ marginTop: 14 }} onPress={go} />
      </View>
    </ScrollView>
  );
}

function GroupCard({ g, onPress, i }: { g: Group; onPress: () => void; i: number }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ backgroundColor: g.joined ? pastel(i + 1) : C.card, borderRadius: 24, padding: 16, flexDirection: 'row', gap: 12, alignItems: 'center', transform: [{ scale: pressed ? 0.98 : 1 }] })}>
      <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 24 }}>{g.emoji}</Text></View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, fontWeight: '700', color: C.ink }}>{g.name}{g.official ? '  ✓' : ''}</Text>
        <Text numberOfLines={1} style={{ fontSize: 13, color: C.ink, opacity: 0.7, marginTop: 2 }}>{g.blurb || `${g.members} members`}</Text>
      </View>
      <Text style={{ fontSize: 12.5, color: C.ink, opacity: 0.7 }}>{g.members} {g.members === 1 ? 'mum' : 'mums'}</Text>
    </Pressable>
  );
}

function Home({ call, open, me }: { call: any; open: (id: number) => void; me: any }) {
  const [groups, setGroups] = useState<Group[] | null>(null), [err, setErr] = useState(''), [make, setMake] = useState(false), [q, setQ] = useState('');
  const [name, setName] = useState(''), [blurb, setBlurb] = useState(''), [emoji, setEmoji] = useState('💜'), [busy, setBusy] = useState(false);
  const load = () => call('groups').then((j: any) => setGroups(j.groups)).catch((e: any) => setErr(e.message));
  useEffect(() => { load(); }, []);
  const create = async () => { setBusy(true); setErr(''); try { const j = await call('create-group', { name, blurb, emoji }); setMake(false); setName(''); setBlurb(''); open(j.id); } catch (e: any) { setErr(e.message); } finally { setBusy(false); } };
  const f = (g: Group) => !q || (g.name + ' ' + g.blurb).toLowerCase().includes(q.toLowerCase());
  const mine = (groups || []).filter(g => g.joined && f(g)), rest = (groups || []).filter(g => !g.joined && f(g));
  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 10, paddingBottom: 40, gap: 10 }} keyboardShouldPersistTaps="handled">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 30, fontWeight: '800', color: C.ink, letterSpacing: -1 }}>Community</Text>
          <Muted>Hi {me.nick}. You're among friends here.</Muted>
        </View>
        <Pressable onPress={() => setMake(!make)} style={{ backgroundColor: C.ink, borderRadius: 99, paddingVertical: 10, paddingHorizontal: 16 }}><Text style={{ color: C.inv, fontWeight: '700', fontSize: 14 }}>{make ? 'Cancel' : '+ New group'}</Text></Pressable>
      </View>
      {me.banned ? <Notice kind="warn"><Text>Your posting is paused. You can still read. Contact the Moma team in Me if you think this is a mistake.</Text></Notice> : null}
      {make && (
        <View style={{ backgroundColor: C.card, borderRadius: 24, padding: 16, gap: 10 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: C.ink }}>Start a group</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Field value={emoji} onChangeText={setEmoji} maxLength={4} style={{ width: 64, textAlign: 'center' }} />
            <Field value={name} onChangeText={setName} placeholder="Group name, e.g. Enugu mums" maxLength={50} style={{ flex: 1 }} />
          </View>
          <Field value={blurb} onChangeText={setBlurb} placeholder="What is it for? (one line)" maxLength={160} />
          <Btn title={busy ? 'Creating…' : 'Create group'} onPress={create} />
        </View>
      )}
      {err ? <Text style={{ color: C.red }}>{err}</Text> : null}
      <Field value={q} onChangeText={setQ} placeholder="Search groups" />
      {!groups ? <ActivityIndicator color={C.ink} style={{ marginTop: 20 }} /> : (
        <>
          {mine.length ? <Text style={{ fontSize: 18, fontWeight: '700', color: C.ink, marginTop: 6 }}>Your groups</Text> : null}
          {mine.map((g, i) => <GroupCard key={g.id} g={g} i={i} onPress={() => open(g.id)} />)}
          <Text style={{ fontSize: 18, fontWeight: '700', color: C.ink, marginTop: 6 }}>{mine.length ? 'Discover more' : 'Find your people'}</Text>
          {rest.map((g, i) => <GroupCard key={g.id} g={g} i={i} onPress={() => open(g.id)} />)}
          {!rest.length && !mine.length ? <Muted>No groups match that search.</Muted> : null}
        </>
      )}
    </ScrollView>
  );
}

function Composer({ onSend, title, placeholder }: { onSend: (t: string, b: string) => Promise<void>; title?: boolean; placeholder: string }) {
  const [t, setT] = useState(''), [b, setB] = useState(''), [busy, setBusy] = useState(false), [err, setErr] = useState('');
  const go = async () => { setBusy(true); setErr(''); try { await onSend(t, b); setT(''); setB(''); } catch (e: any) { setErr(e.message); } finally { setBusy(false); } };
  return (
    <View style={{ backgroundColor: C.card, borderRadius: 24, padding: 14, gap: 8 }}>
      {title && <Field value={t} onChangeText={setT} placeholder="Title, e.g. Swollen feet at 32 weeks?" maxLength={120} />}
      <Field value={b} onChangeText={setB} placeholder={placeholder} multiline maxLength={4000} style={{ minHeight: title ? 90 : 56, textAlignVertical: 'top' }} />
      {err ? <Text style={{ color: C.red, fontSize: 13.5 }}>{err}</Text> : null}
      <Btn title={busy ? 'Posting…' : title ? 'Post' : 'Reply'} onPress={go} />
    </View>
  );
}

function PostCard({ p, onPress }: { p: Post; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ backgroundColor: C.card, borderRadius: 24, padding: 16, transform: [{ scale: pressed ? 0.98 : 1 }] })}>
      <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
        {p.pinned ? <Text style={{ fontSize: 12, fontWeight: '700', color: '#69247C' }}>📌 Pinned ·</Text> : null}
        <Text style={{ fontSize: 12.5, color: C.muted }}>{p.nick} · {ago(p.at)}{p.status === 'held' ? ' · waiting for a check' : ''}</Text>
      </View>
      <Text style={{ fontSize: 16, fontWeight: '700', color: C.ink, marginTop: 4 }}>{p.title}</Text>
      <Text numberOfLines={2} style={{ fontSize: 14, color: C.ink, opacity: 0.8, marginTop: 4, lineHeight: 20 }}>{p.body}</Text>
      <Text style={{ fontSize: 12.5, color: C.muted, marginTop: 8 }}>💬 {p.replies}   💜 {p.hugs}</Text>
    </Pressable>
  );
}

function GroupView({ id, call, back, open, me }: { id: number; call: any; back: () => void; open: (id: number) => void; me: any }) {
  const [d, setD] = useState<{ group: Group; posts: Post[] } | null>(null), [err, setErr] = useState(''), [compose, setCompose] = useState(false), [note, setNote] = useState('');
  const load = () => call('group', undefined, `&id=${id}`).then(setD).catch((e: any) => setErr(e.message));
  useEffect(() => { load(); }, [id]);
  const toggle = async () => { if (!d) return; await call(d.group.joined ? 'leave' : 'join', { group: id }).catch(() => {}); load(); };
  const post = async (title: string, body: string) => { const j = await call('post', { group: id, title, body }); setCompose(false); setNote(j.held ? 'Thanks! Your post is waiting for a quick check by the Moma team before others can see it.' : ''); load(); };
  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 10, paddingBottom: 40, gap: 10 }} keyboardShouldPersistTaps="handled">
      <Pressable onPress={back} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><IBack size={18} color={C.ink} /><Text style={{ fontSize: 14, fontWeight: '600', color: C.ink }}>All groups</Text></Pressable>
      {!d ? (err ? <Notice kind="warn"><Text>{err}</Text></Notice> : <ActivityIndicator color={C.ink} style={{ marginTop: 20 }} />) : (
        <>
          <View style={{ backgroundColor: C.lav, borderRadius: 28, padding: 18 }}>
            <Text style={{ fontSize: 34 }}>{d.group.emoji}</Text>
            <Text style={{ fontSize: 24, fontWeight: '800', color: C.ink, letterSpacing: -0.6, marginTop: 4 }}>{d.group.name}</Text>
            {d.group.blurb ? <Text style={{ fontSize: 14, color: C.ink, opacity: 0.75, marginTop: 4 }}>{d.group.blurb}</Text> : null}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, alignItems: 'center' }}>
              <Pill label={d.group.joined ? 'Joined ✓' : 'Join group'} on={!d.group.joined} onPress={toggle} />
              {!me.banned && <Pill label="+ Start a conversation" bg={C.butter} onPress={() => setCompose(!compose)} />}
              <Text style={{ fontSize: 12.5, color: C.ink, opacity: 0.7, marginLeft: 'auto' }}>{d.group.members} mums</Text>
            </View>
          </View>
          {note ? <Notice kind="info"><Text>{note}</Text></Notice> : null}
          {compose && <Composer title placeholder="Share what's on your mind. Other mums can reply." onSend={post} />}
          {d.posts.length ? d.posts.map(p => <PostCard key={p.id} p={p} onPress={() => open(p.id)} />) : <View style={{ alignItems: 'center', padding: 24 }}><Mo size={60} pose="wave" /><Muted style={{ marginTop: 8, textAlign: 'center' }}>No conversations yet. Be the first to say hello.</Muted></View>}
        </>
      )}
    </ScrollView>
  );
}

function Thread({ id, call, back, me }: { id: number; call: any; back: (g?: number) => void; me: any }) {
  const { s } = useStore();
  const [d, setD] = useState<{ post: Post; replies: Post[] } | null>(null), [err, setErr] = useState(''), [note, setNote] = useState('');
  const load = () => call('thread', undefined, `&id=${id}`).then(setD).catch((e: any) => setErr(e.message));
  useEffect(() => { load(); }, [id]);
  const hug = async (p: Post) => { const j = await call('hug', { post: p.id }).catch(() => null); if (j) load(); };
  const report = async (p: Post) => { await call('report', { post: p.id, reason: 'Reported by a member' }).catch(() => {}); setNote('Thanks. The Moma team will take a look.'); };
  const del = async (p: Post) => { await call('delete', { post: p.id }).catch(() => {}); if (p.id === id) back(d?.post.group); else load(); };
  const reply = async (_: string, body: string) => { const j = await call('post', { parent: id, body }); setNote(j.held ? 'Your reply is waiting for a quick check before others can see it.' : ''); load(); };
  const Item = ({ p, top }: { p: Post; top?: boolean }) => (
    <View style={{ backgroundColor: top ? C.card : C.bg, borderRadius: 24, padding: 16, borderWidth: top ? 0 : 1.5, borderColor: C.line }}>
      <Text style={{ fontSize: 12.5, color: C.muted }}>{p.nick} · {ago(p.at)}{p.status === 'held' ? ' · waiting for a check' : ''}</Text>
      {top && p.title ? <Text style={{ fontSize: 20, fontWeight: '800', color: C.ink, marginTop: 4, letterSpacing: -0.4 }}>{p.title}</Text> : null}
      <Text style={{ fontSize: 15, color: C.ink, marginTop: 6, lineHeight: 22 }}>{p.body}</Text>
      {p.flag ? <View style={{ marginTop: 10 }}><SafetyNote titles={p.flag.titles} country={s.country} /></View> : null}
      <Translate text={`${top && p.title ? p.title + '\n' : ''}${p.body}`} />
      <View style={{ flexDirection: 'row', gap: 16, marginTop: 10, alignItems: 'center' }}>
        <Pressable onPress={() => hug(p)}><Text style={{ fontSize: 13.5, fontWeight: '700', color: p.hugged ? '#69247C' : C.muted }}>💜 {p.hugged ? 'Hugged' : 'Send a hug'} {p.hugs ? `(${p.hugs})` : ''}</Text></Pressable>
        {p.mine ? <Pressable onPress={() => del(p)}><Text style={{ fontSize: 13, color: C.muted }}>Delete</Text></Pressable> : <Pressable onPress={() => report(p)}><Text style={{ fontSize: 13, color: C.muted }}>Report</Text></Pressable>}
      </View>
    </View>
  );
  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 10, paddingBottom: 40, gap: 10 }} keyboardShouldPersistTaps="handled">
      <Pressable onPress={() => back(d?.post.group)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><IBack size={18} color={C.ink} /><Text style={{ fontSize: 14, fontWeight: '600', color: C.ink }}>Back to group</Text></Pressable>
      {!d ? (err ? <Notice kind="warn"><Text>{err}</Text></Notice> : <ActivityIndicator color={C.ink} style={{ marginTop: 20 }} />) : (
        <>
          <Item p={d.post} top />
          {note ? <Notice kind="info"><Text>{note}</Text></Notice> : null}
          <Text style={{ fontSize: 16, fontWeight: '700', color: C.ink, marginTop: 4 }}>{d.replies.length ? `${d.replies.length} ${d.replies.length === 1 ? 'reply' : 'replies'}` : 'No replies yet'}</Text>
          {d.replies.map(p => <Item key={p.id} p={p} />)}
          {!me.banned && <Composer placeholder="Write a kind reply…" onSend={reply} />}
        </>
      )}
    </ScrollView>
  );
}
