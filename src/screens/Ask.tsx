import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { useStore, ChatMsg } from '../store';
import { triage } from '../safety';
import { askMoma, apiBase } from '../ai';
import { EM } from '../content';
import { Chip, FlagCard, Md, Muted } from '../ui';
import { C } from '../theme';

export default function Ask({ pending, clearPending }: { pending: string | null; clearPending: () => void }) {
  const { s, set } = useStore();
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const scroll = useRef<ScrollView>(null);
  const P = s.mode === 'pregnant';
  const chips = P ? ["What's happening this week?", 'Summarise my week for my midwife', 'Foods to avoid?', 'Is this heartburn normal?', 'Safe exercise?']
    : ['Summarise my week for my health visitor', 'Breastfeeding hurts', 'Are the baby blues normal?', 'How often should baby feed?', 'When can I exercise?'];

  const send = async (text: string) => {
    const t = text.trim(); if (!t || busy) return;
    setQ('');
    const tr = triage(t, s.mode, s.country);
    const add: ChatMsg[] = [{ r: 'u', c: t }];
    if (tr) add.push({ r: 'f', c: JSON.stringify(tr) });
    const history = [...s.chat, ...add];
    set(x => ({ ...x, chat: history }));
    setBusy(true);
    try {
      const a = await askMoma(history, { ...s, chat: history });
      set(x => ({ ...x, chat: [...x.chat, { r: 'a', c: a }] }));
    } catch (e: any) {
      set(x => ({ ...x, chat: [...x.chat, { r: 'a', c: `I couldn't reach the AI just now (${e?.message ?? 'network error'}). Check the server address in Me, or try again. If this is urgent, contact your maternity team or call ${(EM[s.country] ?? EM.Other).e}.` }] }));
    } finally { setBusy(false); }
  };
  useEffect(() => { if (pending) { send(pending); clearPending(); } }, [pending]);
  useEffect(() => { setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50); }, [s.chat.length, busy]);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <ScrollView ref={scroll} contentContainerStyle={{ padding: 16, gap: 10 }}>
        {s.chat.map((m, i) => {
          if (m.r === 'f') { try { return <FlagCard key={i} t={JSON.parse(m.c)} />; } catch { return null; } }
          const u = m.r === 'u';
          return (
            <View key={i} style={{ alignSelf: u ? 'flex-end' : 'flex-start', maxWidth: '86%', backgroundColor: u ? C.plum : '#fff', padding: 12, borderRadius: 18, borderBottomRightRadius: u ? 6 : 18, borderBottomLeftRadius: u ? 18 : 6 }}>
              {u ? <Text style={{ color: '#fff', fontSize: 14 }}>{m.c}</Text> : <Md text={m.c} />}
            </View>
          );
        })}
        {busy && <View style={{ alignSelf: 'flex-start', backgroundColor: '#fff', padding: 12, borderRadius: 18 }}><ActivityIndicator color={C.rose} /></View>}
      </ScrollView>
      <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingBottom: 8 }} keyboardShouldPersistTaps="handled">
          {chips.map(c => <Chip key={c} label={c} onPress={() => send(c)} />)}
        </ScrollView>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TextInput value={q} onChangeText={setQ} onSubmitEditing={() => send(q)} placeholder="Ask Moma anything…" placeholderTextColor={C.muted} returnKeyType="send"
            style={{ flex: 1, backgroundColor: '#fff', borderRadius: 99, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: C.line, fontSize: 15, color: C.ink }} />
          <Pressable onPress={() => send(q)} style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: C.rose, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#fff', fontSize: 18, fontWeight: '800' }}>↑</Text></Pressable>
        </View>
        <Muted style={{ textAlign: 'center', fontSize: 11, marginTop: 6 }}>{apiBase(s) ? 'AI on' : 'Offline mode · connect the Moma server in Me for full answers'}. Not medical advice. Emergency: {(EM[s.country] ?? EM.Other).e}</Muted>
      </View>
    </KeyboardAvoidingView>
  );
}
