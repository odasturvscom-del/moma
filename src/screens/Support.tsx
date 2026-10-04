import React, { useEffect, useRef, useState } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { useStore } from '../store';
import { Text, Muted, FlagCard, Btn, Input } from '../ui';
import { triage } from '../safety';
import { EM } from '../content';
import { hello, supportThread, supportSend, getConfig, SupportMsg, track } from '../telemetry';
import { Blob } from '../mascot';
import { IArrow } from '../icons';
import { C, F, P } from '../theme';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const stamp = (d: string) => { const x = new Date(d); const same = x.toDateString() === new Date().toDateString(); return `${same ? '' : `${x.getDate()} ${MONTHS[x.getMonth()]}, `}${x.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`; };

export default function Support({ close }: { close: () => void }) {
  const { s, set } = useStore();
  const [msgs, setMsgs] = useState<SupportMsg[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [text, setText] = useState('');
  const [name, setName] = useState(s.name);
  const [busy, setBusy] = useState(false);
  const [cfg, setCfg] = useState<{ supportOn: boolean; supportHours: string } | null>(null);
  const [flag, setFlag] = useState<ReturnType<typeof triage>>(null);
  const live = useRef(s);
  live.current = s;
  const scroll = useRef<ScrollView>(null);
  const e = EM[s.country] ?? EM.Other;

  const refresh = async (st = live.current) => {
    try { const r = await supportThread(st); setMsgs(r.messages); setErr(''); }
    catch (x: any) { setErr(x?.message ?? 'Could not load your chat'); }
    finally { setLoading(false); }
  };
  useEffect(() => {
    let on = true, timer: any;
    (async () => {
      getConfig(s).then(c => on && c && setCfg(c));
      let st = s;
      if (!s.usecret) { const h = await hello(s, set); if (h) st = h.s; }
      if (!on) return;
      if (!st.usecret) { setLoading(false); setErr("Couldn't reach the Moma team just now. Check your connection and try again."); return; }
      await refresh(st);
      timer = setInterval(() => refresh(), 5000);
    })();
    return () => { on = false; clearInterval(timer); };
  }, []);
  useEffect(() => { setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50); }, [msgs.length]);

  const first = !msgs.some(m => m.from === 'user');
  const send = async () => {
    const t = text.trim(); if (!t || busy) return;
    setBusy(true);
    setFlag(triage(t, s.mode, s.country));
    try {
      const r = await supportSend(live.current, t, first ? name.trim() : undefined);
      if (first && name.trim()) set(x => ({ ...x, name: x.name || name.trim() }));
      setMsgs(r.messages); setText(''); setErr('');
      if (first) track(live.current, 'support');
    } catch (x: any) { setErr(x?.message ?? 'Message not sent. Try again.'); }
    finally { setBusy(false); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 }}>
        <Pressable accessibilityLabel="Back" onPress={close} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 20, color: C.ink }}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 19, fontWeight: '700', color: C.ink }}>Moma team</Text>
          <Muted style={{ fontSize: 13 }}>{cfg?.supportOn === false ? 'Offline right now' : cfg?.supportHours ?? 'Real people, here to help'}</Muted>
        </View>
        <Blob color={P.mint} face="happy" size={40} />
      </View>
      <ScrollView ref={scroll} contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 20 }} keyboardShouldPersistTaps="handled">
        <View style={{ backgroundColor: C.butter, borderRadius: 22, padding: 14 }}>
          <Text style={{ fontSize: 14, color: C.ink, lineHeight: 20 }}>Chat with a real person about the app, your account or anything that's bothering you. Our team aren't midwives or doctors, so for anything about your health, contact your maternity team. In an emergency call {e.e}.</Text>
        </View>
        {loading ? <ActivityIndicator color={C.ink} style={{ marginTop: 30 }} /> : null}
        {msgs.map(m => (
          <View key={m.id} style={{ alignSelf: m.from === 'user' ? 'flex-end' : m.from === 'system' ? 'center' : 'flex-start', maxWidth: m.from === 'system' ? '95%' : '82%' }}>
            {m.from === 'staff' && m.name ? <Text style={{ fontSize: 12, color: C.muted, marginBottom: 3, marginLeft: 6 }}>{m.name} · Moma team</Text> : null}
            <View style={{ backgroundColor: m.from === 'user' ? C.ink : m.from === 'system' ? C.redSoft : C.card, borderRadius: 22, padding: 13,
              borderBottomRightRadius: m.from === 'user' ? 6 : 22, borderBottomLeftRadius: m.from === 'staff' ? 6 : 22 }}>
              <Text style={{ fontSize: 15, lineHeight: 21, color: m.from === 'user' ? C.inv : C.ink }}>{m.body}</Text>
            </View>
            <Text style={{ fontSize: 11.5, color: C.muted, marginTop: 3, alignSelf: m.from === 'user' ? 'flex-end' : 'flex-start', marginHorizontal: 6 }}>{stamp(m.at)}</Text>
          </View>
        ))}
        {flag ? <FlagCard t={flag} /> : null}
        {!loading && !msgs.length && !err ? <Muted style={{ textAlign: 'center', marginTop: 10 }}>Say hello and someone from the team will reply here.</Muted> : null}
        {err ? <Text style={{ color: C.red, textAlign: 'center', fontSize: 14 }}>{err}</Text> : null}
      </ScrollView>
      <View style={{ padding: 12, paddingBottom: 16, gap: 8 }}>
        {first ? <Input value={name} onChangeText={setName} placeholder="Your first name (optional)" maxLength={40} /> : null}
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, backgroundColor: C.card, borderRadius: 26, padding: 6, paddingLeft: 16 }}>
          <TextInput value={text} onChangeText={setText} placeholder="Write a message" placeholderTextColor={C.muted} multiline maxLength={3000}
            style={{ flex: 1, fontFamily: F.r, fontSize: 15.5, color: C.ink, paddingVertical: 10, maxHeight: 120 }} />
          <Pressable accessibilityLabel="Send" onPress={send} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: text.trim() ? C.ink : C.disabled, alignItems: 'center', justifyContent: 'center' }}>
            {busy ? <ActivityIndicator color={C.inv} /> : <IArrow color={C.inv} />}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
