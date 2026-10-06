import React, { useEffect, useRef, useState } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { useStore, ChatMsg, preg } from '../store';
import { triage } from '../safety';
import { askMoma, apiBase } from '../ai';
import { EM } from '../content';
import { track } from '../telemetry';
import { Text, FlagCard, Md, Muted } from '../ui';
import { Mo } from '../mascot';
import { IArrow, ISpark, IMic, ISpeaker, IGlobe } from '../icons';
import { canRecord, startRecording, transcribe, speak, stopSpeaking, translate, LANGS, Rec } from '../voice';
import { C, F, P as MP, pastel } from '../theme';

export default function Ask({ pending, clearPending }: { pending: string | null; clearPending: () => void }) {
  const { s, set } = useStore();
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [rec, setRec] = useState<Rec | null>(null);
  const [hearing, setHearing] = useState(false);
  const [vErr, setVErr] = useState('');
  const [playing, setPlaying] = useState<number | null>(null);
  const [tr, setTr] = useState<Record<number, { to: string; text: string; busy?: boolean; open?: boolean }>>({});
  const [langOpen, setLangOpen] = useState(false);
  const mic = canRecord();
  const scroll = useRef<ScrollView>(null);
  const P = s.mode === 'pregnant', p = preg(s);
  const chips = P ? ["What's happening this week?", 'Prep my midwife visit', 'Foods to avoid', 'Is this heartburn normal?', 'Safe exercise']
    : ['Prep my postnatal visit', 'Breastfeeding hurts', 'Are the baby blues normal?', 'How often should baby feed?', 'When can I exercise?'];
  const map: Record<string, string> = { 'Prep my midwife visit': 'Summarise my week for my midwife', 'Prep my postnatal visit': 'Summarise my week for my postnatal clinic', 'Foods to avoid': 'Foods to avoid?', 'Safe exercise': 'Safe exercise?' };

  const send = async (text: string, viaVoice = false) => {
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
      let idx = 0;
      set(x => { idx = x.chat.length; return { ...x, chat: [...x.chat, { r: 'a', c: a }] }; });
      if (viaVoice) { setPlaying(idx); speak(s, a, () => setPlaying(null)).catch(() => setPlaying(null)); }
    } catch (e: any) {
      set(x => ({ ...x, chat: [...x.chat, { r: 'a', c: `I couldn't reach the AI just now (${e?.message ?? 'network error'}). Try again in a moment. If this is urgent, contact your maternity team or call ${(EM[s.country] ?? EM.Other).e}.` }] }));
    } finally { setBusy(false); }
  };
  const toggleMic = async () => {
    setVErr('');
    if (rec) {
      const r = rec; setRec(null); setHearing(true);
      try { const clip = await r.stop(); if (!clip) return; const t = await transcribe(s, clip); if (t) send(t, true); else setVErr("I didn't catch that. Try again a little closer to the phone."); }
      catch (e: any) { setVErr(e?.message || "I couldn't hear that"); } finally { setHearing(false); }
      return;
    }
    stopSpeaking(); setPlaying(null);
    try { setRec(await startRecording()); track(s, 'voice'); } catch { setVErr('Allow microphone access in your browser to talk to Moma.'); }
  };
  const listen = (i: number, text: string) => {
    if (playing === i) { stopSpeaking(); setPlaying(null); return; }
    setPlaying(i); speak(s, text, () => setPlaying(null)).catch(e => { setPlaying(null); setVErr(e.message); });
  };
  const doTr = async (i: number, text: string, to: string) => {
    setTr(x => ({ ...x, [i]: { to, text: '', busy: true, open: true } }));
    try { const out = await translate(s, text, to); setTr(x => ({ ...x, [i]: { to, text: out, open: true } })); }
    catch (e: any) { setTr(x => ({ ...x, [i]: { to, text: e?.message || 'Could not translate', open: true } })); }
  };
  useEffect(() => { if (pending) { send(pending); clearPending(); } }, [pending]);
  useEffect(() => { setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50); }, [s.chat.length, busy]);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={10}>
      <View style={{ paddingHorizontal: 20, paddingTop: 8, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Mo size={50} pose={busy ? 'hug' : 'wave'} face={busy ? 'wow' : 'smile'} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 30, fontWeight: '800', color: C.ink, letterSpacing: -1 }}>Ask Moma</Text>
          <Text style={{ fontSize: 13, color: C.muted }}>{apiBase(s) ? 'Type or talk · English, Welsh, Polish, Urdu and more' : 'Offline mode · connect the AI in Me'}</Text>
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
              {!u && i > 0 && (
                <View style={{ marginTop: 8 }}>
                  <View style={{ flexDirection: 'row', gap: 14 }}>
                    <Pressable accessibilityLabel="Listen" onPress={() => listen(i, tr[i]?.text && !tr[i]?.busy ? tr[i].text : m.c)} style={{ flexDirection: 'row', gap: 5, alignItems: 'center' }}><ISpeaker size={16} color={C.ink} /><Text style={{ fontSize: 12.5, fontWeight: '700', color: C.ink, opacity: 0.75 }}>{playing === i ? 'Stop' : 'Listen'}</Text></Pressable>
                    <Pressable accessibilityLabel="Translate" onPress={() => setTr(x => ({ ...x, [i]: { ...(x[i] || { to: '', text: '' }), open: !x[i]?.open } }))} style={{ flexDirection: 'row', gap: 5, alignItems: 'center' }}><IGlobe size={16} color={C.ink} /><Text style={{ fontSize: 12.5, fontWeight: '700', color: C.ink, opacity: 0.75 }}>Translate</Text></Pressable>
                  </View>
                  {tr[i]?.open && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                      {LANGS.map(l => <Pressable key={l} onPress={() => doTr(i, m.c, l)} style={{ backgroundColor: tr[i]?.to === l ? C.ink : 'rgba(255,255,255,0.7)', borderRadius: 99, paddingVertical: 6, paddingHorizontal: 12 }}><Text style={{ fontSize: 12.5, fontWeight: '600', color: tr[i]?.to === l ? C.inv : C.ink }}>{l}</Text></Pressable>)}
                    </View>
                  )}
                  {tr[i]?.busy ? <ActivityIndicator color={C.ink} style={{ alignSelf: 'flex-start', marginTop: 8 }} /> : tr[i]?.text ? (
                    <View style={{ marginTop: 8, backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 16, padding: 12 }}>
                      <Text style={{ fontSize: 11.5, color: C.ink, opacity: 0.6, marginBottom: 4 }}>{tr[i].to} · translated by AI</Text>
                      <Md text={tr[i].text} />
                    </View>
                  ) : null}
                </View>
              )}
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
        {langOpen && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingBottom: 10 }}>
            <Text style={{ fontSize: 13, color: C.muted, alignSelf: 'center', marginRight: 2 }}>I'll speak in:</Text>
            {LANGS.map(l => <Pressable key={l} onPress={() => { set(x => ({ ...x, lang: l })); setLangOpen(false); }} style={{ backgroundColor: s.lang === l ? C.ink : C.card, borderWidth: s.lang === l ? 0 : 1.5, borderColor: C.line, borderRadius: 99, paddingVertical: 7, paddingHorizontal: 13 }}><Text style={{ fontSize: 13, fontWeight: '600', color: s.lang === l ? C.inv : C.ink }}>{l}</Text></Pressable>)}
          </View>
        )}
        {rec || hearing || vErr ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 8, paddingHorizontal: 4 }}>
            {rec ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: C.red }} /> : hearing ? <ActivityIndicator color={C.ink} size="small" /> : null}
            <Text style={{ fontSize: 13.5, color: vErr && !rec && !hearing ? C.red : C.ink, fontWeight: '600', flex: 1 }}>{rec ? `Listening in ${s.lang || 'English'}… tap the mic again when you're done` : hearing ? 'Getting your words…' : vErr}</Text>
          </View>
        ) : null}
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: C.card, borderRadius: 99, borderWidth: 1.5, borderColor: rec ? C.red : C.line, paddingLeft: 8, paddingRight: 5, paddingVertical: 5 }}>
          <Pressable accessibilityLabel="Choose language" onPress={() => setLangOpen(!langOpen)} style={{ height: 36, borderRadius: 18, paddingHorizontal: 10, flexDirection: 'row', gap: 4, alignItems: 'center', backgroundColor: C.bg }}>
            <IGlobe size={16} color={C.ink} /><Text style={{ fontSize: 12, fontWeight: '700', color: C.ink }}>{(s.lang || 'English').slice(0, 3).toUpperCase()}</Text>
          </Pressable>
          <TextInput value={q} onChangeText={setQ} onSubmitEditing={() => send(q)} placeholder={mic ? 'Type or tap the mic…' : 'Ask Moma anything…'} placeholderTextColor={C.muted} returnKeyType="send"
            style={{ flex: 1, fontSize: 15, color: C.ink, fontFamily: F.r, paddingVertical: 8 }} />
          {mic && !q.trim() ? (
            <Pressable accessibilityLabel={rec ? 'Stop and send' : 'Talk to Moma'} onPress={toggleMic} disabled={hearing || busy}
              style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: rec ? C.red : '#69247C', alignItems: 'center', justifyContent: 'center', opacity: hearing || busy ? 0.5 : 1 }}><IMic size={20} color="#fff" /></Pressable>
          ) : null}
          {(!mic || q.trim()) && <Pressable accessibilityLabel="Send" onPress={() => send(q)} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' }}><IArrow size={20} color={C.inv} /></Pressable>}
        </View>
        <Muted style={{ textAlign: 'center', fontSize: 11.5, marginTop: 6 }}>Not medical advice. Emergency: {(EM[s.country] ?? EM.Other).e}</Muted>
      </View>
    </KeyboardAvoidingView>
  );
}
