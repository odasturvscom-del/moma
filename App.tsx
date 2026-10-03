import React, { useState } from 'react';
import { View, Pressable, ActivityIndicator, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useFonts, Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold, Outfit_800ExtraBold } from '@expo-google-fonts/outfit';
import { StoreProvider, useStore, preg, pp } from './src/store';
import { C } from './src/theme';
import { Text } from './src/ui';
import { IHome, IChart, ISpark, ICal, IUser } from './src/icons';
import Onboarding from './src/screens/Onboarding';
import Welcome from './src/screens/Welcome';
import Today from './src/screens/Today';
import Track from './src/screens/Track';
import Ask from './src/screens/Ask';
import Journey from './src/screens/Journey';
import Me from './src/screens/Me';

type Tab = 'today' | 'track' | 'ask' | 'journey' | 'me';
const TABS: [Tab, string, (p: { color: string }) => React.ReactElement][] = [
  ['today', 'Today', IHome], ['track', 'Track', IChart], ['ask', 'Ask Moma', ISpark], ['journey', 'Journey', ICal], ['me', 'Me', IUser],
];

function Header({ onMe }: { onMe: () => void }) {
  const { s } = useStore();
  const p = preg(s), q = pp(s);
  const h = new Date().getHours();
  const sub = s.mode === 'pregnant' && p ? `Week ${p.w} · ${['1st', '2nd', '3rd'][p.tri - 1]} trimester` : q ? `Day ${q.days + 1} with your baby` : 'Welcome to Moma';
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 6, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <Pressable onPress={onMe} style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: C.pink, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 19, fontWeight: '700', color: C.ink }}>{(s.name || 'M').slice(0, 1).toUpperCase()}</Text>
      </Pressable>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 20, fontWeight: '700', color: C.ink, letterSpacing: -0.4 }}>{h < 12 ? 'Good morning' : h < 18 ? 'Hello' : 'Good evening'}{s.name ? `, ${s.name}` : ''}</Text>
        <Text style={{ fontSize: 13.5, color: C.muted }}>{sub}</Text>
      </View>
      <Text style={{ fontSize: 22, fontWeight: '800', color: C.ink, letterSpacing: -0.8 }}>moma</Text>
    </View>
  );
}

function Shell() {
  const { s, ready } = useStore();
  const [tab, setTab] = useState<Tab>('today');
  const [sub, setSub] = useState('');
  const [pending, setPending] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  if (!ready) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg }}><ActivityIndicator color={C.ink} /></View>;
  if (!s.onboarded) return started ? <View style={{ flex: 1, backgroundColor: C.bg }}><Onboarding /></View> : <Welcome onStart={() => setStarted(true)} />;
  const go = (t: string, sb?: string) => { setTab(t as Tab); if (sb) setSub(sb); };
  const ask = (t: string) => { setPending(t); setTab('ask'); };
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: C.bg }}>
      {tab !== 'ask' && <Header onMe={() => setTab('me')} />}
      <View style={{ flex: 1 }}>
        {tab === 'today' && <Today go={go} ask={ask} />}
        {tab === 'track' && <Track sub={sub} setSub={setSub} ask={ask} />}
        {tab === 'ask' && <Ask pending={pending} clearPending={() => setPending(null)} />}
        {tab === 'journey' && <Journey />}
        {tab === 'me' && <Me done={() => setTab('today')} />}
      </View>
      <SafeAreaView edges={['bottom']} style={{ backgroundColor: C.bg }}>
        <View style={{ marginHorizontal: 20, marginTop: 6, marginBottom: Platform.OS === 'web' ? 14 : 4, backgroundColor: C.ink, borderRadius: 99, padding: 6, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          {TABS.map(([k, l, Icon]) => {
            const on = tab === k;
            return (
              <Pressable key={k} accessibilityRole="tab" accessibilityLabel={l} accessibilityState={{ selected: on }}
                onPress={() => { Haptics.selectionAsync().catch(() => {}); setTab(k); }}
                style={{ width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? '#fff' : 'transparent' }}>
                <Icon color={on ? C.ink : '#fff'} />
              </Pressable>
            );
          })}
        </View>
      </SafeAreaView>
    </SafeAreaView>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({ Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold, Outfit_800ExtraBold });
  if (!fontsLoaded) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <StatusBar style="dark" />
        <View style={{ flex: 1, backgroundColor: Platform.OS === 'web' ? '#E9E4F2' : C.bg }}>
          <View style={{ flex: 1, width: '100%', maxWidth: 480, alignSelf: 'center', backgroundColor: C.bg, overflow: 'hidden' }}>
            <Shell />
          </View>
        </View>
      </StoreProvider>
    </SafeAreaProvider>
  );
}
