import React, { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { StoreProvider, useStore } from './src/store';
import { C } from './src/theme';
import Onboarding from './src/screens/Onboarding';
import Today from './src/screens/Today';
import Track from './src/screens/Track';
import Ask from './src/screens/Ask';
import Journey from './src/screens/Journey';
import Me from './src/screens/Me';

type Tab = 'today' | 'track' | 'ask' | 'journey' | 'me';
const TABS: [Tab, string, string][] = [['today', '🏠', 'Today'], ['track', '📈', 'Track'], ['ask', '💬', 'Ask Moma'], ['journey', '🗓', 'Journey'], ['me', '👤', 'Me']];

function Shell() {
  const { s, ready } = useStore();
  const [tab, setTab] = useState<Tab>('today');
  const [sub, setSub] = useState('');
  const [pending, setPending] = useState<string | null>(null);
  if (!ready) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg }}><ActivityIndicator color={C.rose} /></View>;
  if (!s.onboarded) return <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}><Onboarding /></SafeAreaView>;
  const go = (t: string, sb?: string) => { setTab(t as Tab); if (sb) setSub(sb); };
  const ask = (t: string) => { setPending(t); setTab('ask'); };
  const h = new Date().getHours();
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ paddingHorizontal: 18, paddingTop: 6, paddingBottom: 4, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View>
          <Text style={{ fontSize: 24, fontWeight: '800', color: C.plum, letterSpacing: -0.6 }}>mo<Text style={{ color: C.rose }}>ma</Text></Text>
          <Text style={{ color: C.muted, fontSize: 13 }}>{h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'}{s.name ? `, ${s.name}` : ''}</Text>
        </View>
      </View>
      <View style={{ flex: 1 }}>
        {tab === 'today' && <Today go={go} ask={ask} />}
        {tab === 'track' && <Track sub={sub} setSub={setSub} ask={ask} />}
        {tab === 'ask' && <Ask pending={pending} clearPending={() => setPending(null)} />}
        {tab === 'journey' && <Journey />}
        {tab === 'me' && <Me done={() => setTab('today')} />}
      </View>
      <SafeAreaView edges={['bottom']} style={{ backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: C.line }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', paddingTop: 8, paddingBottom: 4 }}>
          {TABS.map(([k, ic, l]) => {
            const on = tab === k, center = k === 'ask';
            return (
              <Pressable key={k} accessibilityRole="tab" accessibilityLabel={l} onPress={() => { Haptics.selectionAsync().catch(() => {}); setTab(k); }} style={{ alignItems: 'center', minWidth: 60 }}>
                {center
                  ? <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: C.rose, alignItems: 'center', justifyContent: 'center', marginTop: -24, shadowColor: C.rose, shadowOpacity: 0.45, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4 }}><Text style={{ fontSize: 22 }}>{ic}</Text></View>
                  : <Text style={{ fontSize: 21 }}>{ic}</Text>}
                <Text style={{ fontSize: 11, color: on ? C.rose : C.muted, fontWeight: on ? '700' : '400', marginTop: 2 }}>{l}</Text>
              </Pressable>
            );
          })}
        </View>
      </SafeAreaView>
    </SafeAreaView>
  );
}
export default function App() {
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <StatusBar style="dark" />
        <Shell />
      </StoreProvider>
    </SafeAreaProvider>
  );
}
