import React, { useEffect, useRef, useState } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { useStore, ChatMsg, preg } from '../store';
import { triage } from '../safety';
import { askMoma, apiBase } from '../ai';
import { EM } from '../content';
import { track } from '../telemetry';
import { Text, FlagCard, Md, Muted } from '../ui';
import { Mo } from '../mascot';
import { IArrow, ISpark } from '../icons';
import { C, F, P as MP, pastel } from '../theme';

export default function Ask({ pending, clearPending }: { pending: string | null; clearPending: () => void }) {
  const { s, set } = useStore();
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const scroll = useRef<ScrollView>(null);
  const P = s.mode === 'pregnant', p = preg(s);
  const chips = P ? ["What's happening this week?", 'Prep my midwife visit', 'Foods to avoid', 'Is this heartburn normal?', 'Safe exercise']
    : ['Prep my health visitor chat', 'Breastfeeding hurts', 'Are the baby blues normal?', 'How often should baby feed?', 'When can I exercise?'];
  const map: Record<string, string> = { 'Prep my midwife visit': 'Summarise my week for my midwife', 'Prep my health visitor chat': 'Summarise my week for my health visitor', 'Foods to avoid': 'Foods to avoid?', 'Safe exercise': 'Safe exercise?' };

  const send = async (text: string) => {
    const t = (map[text] ?? text).trim(); if (!t || busy) return;
    setQ('');
    const tr = triage(t, s.mode, s.country);
    const add: ChatMsg[] = [{ r: 'u', c: t }];
    if (tr) add.push({ r: 'f', c: JSON.stringify(tr) });
    track(s, 'ask'); if (tr) track(s, 'flag', { ids: tr.ids });
    const history = [...s.chat, ...add];
    set(x => ({ ...x, chat: history }));
    setBusy(true);
    try {
      const a = await askMoma(history, { ...s, chat: history });
      set(x => ({ ...x, chat: [...x.chat, { r: 'a', c: a }] }));
    } catch (e: any) {
      set(x => ({ ...x, chat: [...x.chat, { r: 'a', c: `I couldn't reach the AI just now (${e?.message ?? 'network error'}). Try again in a moment. If this is urgent, contact your maternity team or call ${(EM[s.country] ?? EM.Other).e}.` }] }));
    } finally { setBusy(false); }
  };
  useEffect(() => { if (pending) { send(pending); clearPending(); } }, [pending]);
  useEffect(() => { setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50); }, [s.chat.length, busy]);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={10}>
      <View style={{ paddingHorizontal: 20, paddingTop: 8, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Mo size={50} pose={busy ? 'hug' : 'wave'} face={busy ? 'wow' : 'smile'} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 30, fontWeight: '800', color: C.ink, letterSpacing: -1 }}>Ask Moma</Text>
          <Text style={{ fontSize: 13, color: C.muted }}>{apiBase(s) ? 'Private · grounded in NHS and NICE guidance' : 'Offline mode · connect the AI in Me'}</Text>
        </View>
        {P && p ? <View style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: C.butter, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 11, fontWeight: '600', color: C.ink }}>Week</Text><Text style={{ fontSize: 17, fontWeight: '800', color: C.ink, marginTop: -3 }}>{p.w}</Text></View> : null}
      </View>
      <ScrollView ref={scroll} contentContainerStyle={{ padding: 20, gap: 10 }} showsVerticalScrollIndicator={false}>
        {s.chat.length <= 1 && (
          <View style={{ backgroundColor: C.lime, borderRadius: 28, padding: 18, marginBottom: 4 }}>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}><ISpark color={C.ink} size={20} /><Text style={{ fontSize: 17, fontWeight: '700', color: C.ink }}>What's on your mind today?</Text></View>
            <Text style={{ fontSize: 14, color: C.ink, opacity: 0.75, marginTop: 6 }}>Symptoms, food, sleep, scans, feelings. No question is too small, and I'll always tell you when to call someone.</Text>
          </View>
        )}
        {s.chat.map((m, i) => {
          if (m.r === 'f') { try { return <FlagCard key={i} t={JSON.parse(m.c)} />; } catch { return null; } }
          const u = m.r === 'u';
          return (
            <View key={i} style={{ alignSelf: u ? 'flex-end' : 'flex-start', maxWidth: '86%', backgroundColor: u ? C.ink : C.lav, paddingVertical: 12, paddingHorizontal: 15, borderRadius: 24, borderBottomRightRadius: u ? 8 : 24, borderBottomLeftRadius: u ? 24 : 8 }}>
              {u ? <Text style={{ color: C.inv, fontSize: 15, lineHeight: 21 }}>{m.c}</Text> : <Md text={m.c} />}
            </View>
          );
        })}
        {busy && <View style={{ alignSelf: 'flex-start', backgroundColor: C.lav, padding: 14, borderRadius: 24 }}><ActivityIndicator color={C.ink} /></View>}
      </ScrollView>
      <View style={{ paddingHorizontal: 20, paddingBottom: 6 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 10 }} keyboardShouldPersistTaps="handled">
          {chips.map((c, i) => (
            <Pressable key={c} onPress={() => send(c)} style={{ backgroundColor: pastel(i + 2), borderRadius: 99, paddingVertical: 9, paddingHorizontal: 15 }}>
              <Text style={{ fontSize: 13.5, fontWeight: '600', color: C.ink }}>{c}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: C.card, borderRadius: 99, borderWidth: 1.5, borderColor: C.line, paddingLeft: 18, paddingRight: 5, paddingVertical: 5 }}>
          <TextInput value={q} onChangeText={setQ} onSubmitEditing={() => send(q)} placeholder="Ask Moma anything…" placeholderTextColor={C.muted} returnKeyType="send"
            style={{ flex: 1, fontSize: 15, color: C.ink, fontFamily: F.r, paddingVertical: 8 }} />
          <Pressable accessibilityLabel="Send" onPress={() => send(q)} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' }}><IArrow size={20} color={C.inv} /></Pressable>
        </View>
        <Muted style={{ textAlign: 'center', fontSize: 11.5, marginTop: 6 }}>Not medical advice. Emergency: {(EM[s.country] ?? EM.Other).e}</Muted>
      </View>
    </KeyboardAvoidingView>
  );
}
