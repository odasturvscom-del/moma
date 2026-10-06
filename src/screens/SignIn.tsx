// First screen when sign-in is switched on: Google, or a 6-digit code by email.
import React, { useEffect, useState } from 'react';
import { ScrollView, View, Platform, ActivityIndicator } from 'react-native';
import { Mo } from '../mascot';
import { useStore } from '../store';
import { AuthCfg, emailStart, emailVerify, googleSignIn, loadGoogle } from '../auth';
import { Text, Btn, Input, Label, Muted, Notice } from '../ui';
import { NdpaBadge } from '../ndpa';
import { C } from '../theme';
import { Pressable } from 'react-native';
import { IBack } from '../icons';

export default function SignIn({ cfg, onSkip }: { cfg: AuthCfg; onSkip: () => void }) {
  const { s, set } = useStore();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'start' | 'code'>('start');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const run = async (fn: () => Promise<any>) => { setErr(''); setBusy(true); try { await fn(); } catch (e: any) { setErr(e.message || 'Something went wrong. Please try again.'); } setBusy(false); };
  useEffect(() => {
    if (cfg.google && Platform.OS === 'web') loadGoogle(cfg.google, 'moma-google-btn', c => run(() => googleSignIn(s, set, c)));
  }, [cfg.google]);
  const google = !!cfg.google && Platform.OS === 'web';
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {s.signInWhy ? <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onSkip}
        style={{ position: 'absolute', top: 14, left: 14, zIndex: 5, width: 44, height: 44, borderRadius: 22, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' }}>
        <IBack color={C.ink} />
      </Pressable> : null}
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
        <View style={{ width: '100%', maxWidth: 420, alignSelf: 'center' }}>
          <View style={{ alignItems: 'center', marginBottom: 18 }}>
            <Mo size={92} pose="wave" badge />
            <Text style={{ fontSize: 30, fontWeight: '800', color: C.ink, letterSpacing: -1, marginTop: 10 }}>moma</Text>
          </View>
          <Text style={{ fontSize: 24, fontWeight: '700', color: C.ink, textAlign: 'center', letterSpacing: -0.5 }}>{s.signInWhy ? `Sign in to ${s.signInWhy}` : `You're all set${s.name ? ', ' + s.name.split(' ')[0] : ''}!`}</Text>
          <Muted style={{ textAlign: 'center', fontSize: 14.5, marginTop: 6, marginBottom: 20 }}>{s.signInWhy ? 'It takes a few seconds and keeps the community safe for every mum.' : 'Last step: save your Moma so it follows you to a new phone, and you can join the community and book experts.'}</Muted>
          {step === 'start' ? (
            <>
              {google && <View nativeID="moma-google-btn" style={{ minHeight: 44, alignItems: 'center', width: '100%' }} />}
              {google && cfg.email && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 16 }}>
                  <View style={{ flex: 1, height: 1, backgroundColor: C.line }} /><Muted>or use your email</Muted><View style={{ flex: 1, height: 1, backgroundColor: C.line }} />
                </View>
              )}
              {cfg.email && (
                <>
                  {!google && <Label>Your email</Label>}
                  <Input value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
                  <Btn title={busy ? 'Sending…' : 'Email me a code'} big style={{ marginTop: 12 }} onPress={() => !busy && run(async () => { await emailStart(s, set, email.trim()); setStep('code'); })} />
                </>
              )}
            </>
          ) : (
            <>
              <Muted style={{ textAlign: 'center', marginBottom: 6 }}>We sent a 6-digit code to {email.trim()}. It works for 10 minutes.</Muted>
              <Label>Code</Label>
              <Input value={code} onChangeText={t => setCode(t.replace(/\D/g, '').slice(0, 6))} placeholder="123456" keyboardType="number-pad" autoComplete="one-time-code" style={{ fontSize: 22, letterSpacing: 6, textAlign: 'center' }} />
              <Btn title={busy ? 'Checking…' : 'Sign in'} big style={{ marginTop: 12 }} onPress={() => !busy && code.length === 6 && run(() => emailVerify(s, set, email.trim(), code))} />
              <Btn title="Use a different email" kind="ghost" style={{ marginTop: 8 }} onPress={() => { setStep('start'); setCode(''); setErr(''); }} />
            </>
          )}
          {busy && step === 'start' && google && <ActivityIndicator color={C.ink} style={{ marginTop: 12 }} />}
          {!!err && <View style={{ marginTop: 12 }}><Notice kind="warn">{err}</Notice></View>}
          <Btn title={s.signInWhy ? 'Not now' : 'Skip for now'} kind="ghost" style={{ marginTop: 14 }} onPress={onSkip} />
          <View style={{ marginTop: 24, alignItems: 'center' }}>
            <NdpaBadge sub="Your data stays yours" />
            <Muted style={{ textAlign: 'center', fontSize: 12.5, marginTop: 10 }}>We only keep your email address so you can sign back in. No name, photo, phone number or contacts from Google. Your health notes stay on your phone.</Muted>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
