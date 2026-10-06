import React, { useEffect, useState } from 'react';
import { View, Pressable, ActivityIndicator, Platform, useColorScheme, useWindowDimensions, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useFonts, Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold, Outfit_800ExtraBold } from '@expo-google-fonts/outfit';
import { StoreProvider, useStore, preg, pp, dkey } from './src/store';
import { track, hello } from './src/telemetry';
import { C, P, applyTheme } from './src/theme';
import { Text, restyle } from './src/ui';
import { IHome, IChart, ISpark, ICal, IUser, IBag, IUsers } from './src/icons';
import { Mo } from './src/mascot';
import Onboarding from './src/screens/Onboarding';
import Welcome from './src/screens/Welcome';
import SignIn from './src/screens/SignIn';
import { authConfig, AuthCfg } from './src/auth';
import Today from './src/screens/Today';
import Track from './src/screens/Track';
import { cycleOf } from './src/cycle';
import Ask from './src/screens/Ask';
import Journey from './src/screens/Journey';
import Me from './src/screens/Me';
import Support from './src/screens/Support';
import Shop from './src/screens/Shop';
import Community from './src/screens/Community';
import Book from './src/screens/Book';
import { NdpaBadge } from './src/ndpa';

type Tab = 'today' | 'track' | 'ask' | 'community' | 'shop' | 'journey' | 'me';
const TABS: [Tab, string, (p: { color: string }) => React.ReactElement][] = [
  ['today', 'Today', IHome], ['ask', 'Ask Moma', ISpark], ['community', 'Community', IUsers], ['shop', 'Shop', IBag], ['track', 'Track', IChart], ['journey', 'Journey', ICal], ['me', 'Me', IUser],
];
// Phones get five tabs; Track and Journey open from the Today screen (and show in the desktop side panel).
const MOBILE_ORDER: Tab[] = ['today', 'community', 'ask', 'shop', 'me']; // Ask Moma sits in the centre
const MOBILE_TABS = MOBILE_ORDER.map(k => TABS.find(t => t[0] === k)!);

function Header({ onMe, wide }: { onMe: () => void; wide?: boolean }) {
  const { s } = useStore();
  const p = preg(s), q = pp(s);
  const h = new Date().getHours();
  const cy = s.mode === 'ttc' ? cycleOf(s) : null;
  const sub = cy ? `Cycle day ${cy.cd} · ${{ period: 'period days', peak: 'peak fertility', high: 'fertile window', low: 'trying for a baby' }[cy.status]}` : s.mode === 'ttc' ? 'Trying for a baby' : s.mode === 'pregnant' && p ? `Week ${p.w} · ${['1st', '2nd', '3rd'][p.tri - 1]} trimester` : q ? `Day ${q.days + 1} with your baby` : 'Welcome to Moma';
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 6, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <Pressable onPress={onMe} style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: P.lav, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 19, fontWeight: '700', color: '#69247C' }}>{(s.name || 'M').slice(0, 1).toUpperCase()}</Text>
      </Pressable>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 20, fontWeight: '700', color: C.ink, letterSpacing: -0.4 }}>{h < 12 ? 'Good morning' : h < 18 ? 'Hello' : 'Good evening'}{s.name ? `, ${s.name}` : ''}</Text>
        <Text style={{ fontSize: 13.5, color: C.muted }}>{sub}</Text>
      </View>
      {wide ? null : <Mo size={40} badge />}
    </View>
  );
}


// Desktop and large tablets: a plum side rail with labels replaces the floating bottom bar.
function Side({ tab, setTab, cartN, unread }: { tab: Tab; setTab: (t: Tab) => void; cartN: number; unread: number }) {
  return (
    <View style={{ width: 248, backgroundColor: P.brand, paddingHorizontal: 14, paddingTop: 26, paddingBottom: 20 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10, marginBottom: 26 }}>
        <Mo size={38} color="#FFFFFF" />
        <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800', letterSpacing: 1.5 }}>SÒLÁYÒ</Text>
      </View>
      {TABS.map(([k, l, Icon]) => {
        const on = tab === k;
        return (
          <Pressable key={k} accessibilityRole="tab" accessibilityLabel={l} accessibilityState={{ selected: on }} onPress={() => setTab(k)}
            style={({ hovered }: any) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingHorizontal: 14, borderRadius: 99, marginBottom: 4, backgroundColor: on ? '#FFFFFF' : hovered ? 'rgba(255,255,255,0.12)' : 'transparent' })}>
            <Icon color={on ? '#69247C' : '#fff'} />
            <Text style={{ color: on ? '#69247C' : '#fff', fontSize: 15, fontWeight: on ? '700' : '500', flex: 1 }}>{l}</Text>
            {k === 'shop' && cartN > 0 ? <View style={{ minWidth: 20, height: 20, borderRadius: 10, backgroundColor: P.gold, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 }}><Text style={{ fontSize: 11, fontWeight: '800', color: '#24142B' }}>{cartN}</Text></View> : null}
            {k === 'me' && unread > 0 ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: P.coral }} /> : null}
          </Pressable>
        );
      })}
      <View style={{ flex: 1 }} />
      <NdpaBadge small style={{ marginHorizontal: 10, marginBottom: 12 }} />
      <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, paddingHorizontal: 10, lineHeight: 17 }}>Moma supports, never replaces, your midwife or doctor.</Text>
    </View>
  );
}

const TAB_KEYS = TABS.map(t => t[0]);
function Shell() {
  const { s, set, ready } = useStore();
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const [tab, setTab] = useState<Tab>(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return 'today';
    const q = new URLSearchParams(window.location.search);
    if (/[?&]booking=/.test(window.location.search)) return 'today';
    if (/[?&](order|reference|trxref)=/.test(window.location.search)) return 'shop';
    const t = q.get('tab') as Tab | null; // deep links from the landing page, e.g. /app/?tab=shop
    return t && (TAB_KEYS as string[]).includes(t) ? t : 'today';
  });
  const [sub, setSub] = useState('');
  // Positive test: switch a trying-to-conceive user to her pregnancy guide, dated from her last period.
  const toPregnant = () => {
    const last = [...(s.cycle?.periods ?? [])].sort().pop() ?? null;
    set(x => ({ ...x, mode: 'pregnant', lmp: last ?? x.lmp }));
    setTab('today');
  };
  const [pending, setPending] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [support, setSupport] = useState(false);
  const urlQ = Platform.OS === 'web' && typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const [bookRef] = useState<string | null>(() => urlQ?.get('booking') || null);
  const [book, setBook] = useState(() => !!(urlQ?.get('booking') || urlQ?.get('book') || urlQ?.get('tab') === 'experts'));
  const [unread, setUnread] = useState(0);
  const demo = !!urlQ && urlQ.has('demo');
  const [authCfg, setAuthCfg] = useState<AuthCfg | null | undefined>(demo ? null : undefined);
  useEffect(() => { if (ready && authCfg === undefined) authConfig(s).then(c => setAuthCfg(c)); }, [ready]);
  useEffect(() => {
    if (ready && s.onboarded && s.lastOpen !== dkey()) { track(s, 'open'); set(x => ({ ...x, lastOpen: dkey() })); }
  }, [ready, s.onboarded]);
  useEffect(() => {
    // Register this install when the user shares usage, or already uses support, so replies from the team can reach them.
    if (ready && s.onboarded && (s.stats !== false || s.usecret)) hello(s, set).then(r => r && setUnread(r.unread));
  }, [ready, s.onboarded, s.stats, s.mode, s.country]);
  if (!ready || authCfg === undefined) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg }}><ActivityIndicator color={C.ink} /></View>;
  if (!s.onboarded) return started ? <View style={{ flex: 1, backgroundColor: C.bg }}><View style={{ flex: 1, width: '100%', maxWidth: 560, alignSelf: 'center' }}><Onboarding /></View></View> : <Welcome onStart={() => setStarted(true)} />;
  // Sign-in is the last step of setup (skippable). Community and bookings ask again when they need it.
  if (authCfg && authCfg.required && !s.account && !s.authSkipped) return <SignIn cfg={authCfg} onSkip={() => set(x => ({ ...x, authSkipped: true, signInWhy: undefined }))} />;
  const go = (t: string, sb?: string) => { setTab(t as Tab); if (sb) setSub(sb); };
  const ask = (t: string) => { setPending(t); setTab('ask'); };
  if (support) return <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: C.bg }}><View style={{ flex: 1, width: '100%', maxWidth: 760, alignSelf: 'center' }}><Support close={() => { setSupport(false); setUnread(0); }} /></View></SafeAreaView>;
  if (book) return <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: C.bg }}><View style={{ flex: 1, width: '100%', maxWidth: 760, alignSelf: 'center' }}><Book returnRef={bookRef} close={() => setBook(false)} openSupport={() => { setBook(false); setSupport(true); }} /></View></SafeAreaView>;
  const cartN = s.cart.reduce((n, c) => n + c.qty, 0);
  const screens = (
    <>
      {tab === 'today' && <Today go={go} ask={ask} book={() => setBook(true)} />}
      {tab === 'track' && <Track sub={sub} setSub={setSub} ask={ask} toPregnant={toPregnant} />}
      {tab === 'ask' && <Ask pending={pending} clearPending={() => setPending(null)} />}
      {tab === 'community' && <Community />}
      {tab === 'shop' && <Shop />}
      {tab === 'journey' && <Journey />}
      {tab === 'me' && <Me done={() => setTab('today')} openSupport={() => setSupport(true)} openBook={() => setBook(true)} unread={unread} />}
    </>
  );
  if (wide) return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: C.bg }}>
      <Side tab={tab} setTab={setTab} cartN={cartN} unread={unread} />
      <View style={{ flex: 1 }}>
        <View style={{ flex: 1, width: '100%', maxWidth: 860, alignSelf: 'center', paddingTop: 12 }}>
          {tab !== 'ask' && <Header onMe={() => setTab('me')} wide />}
          <View style={{ flex: 1 }}>{screens}</View>
        </View>
      </View>
    </View>
  );
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ flex: 1, width: '100%', maxWidth: 680, alignSelf: 'center' }}>
        {tab !== 'ask' && <Header onMe={() => setTab('me')} />}
        <View style={{ flex: 1 }}>{screens}</View>
      </View>
      <SafeAreaView edges={['bottom']} style={{ backgroundColor: C.bg }}>
        <View style={{ width: '100%', maxWidth: 520, alignSelf: 'center', paddingHorizontal: 20 }}>
        <View style={{ marginTop: 6, marginBottom: Platform.OS === 'web' ? 14 : 4, backgroundColor: C.bar, borderRadius: 99, padding: 6, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          {MOBILE_TABS.map(([k, l, Icon]) => {
            const on = tab === k;
            return (
              <Pressable key={k} accessibilityRole="tab" accessibilityLabel={l} accessibilityState={{ selected: on }}
                onPress={() => { Haptics.selectionAsync().catch(() => {}); setTab(k); }}
                style={k === 'ask'
                  ? { width: 62, height: 62, borderRadius: 31, marginTop: -22, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? C.barOn : P.gold, borderWidth: 4, borderColor: C.bg, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 6 }
                  : { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? C.barOn : 'transparent' }}>
                <Icon color={k === 'ask' ? '#69247C' : on ? '#69247C' : '#fff'} />
                {k === 'shop' && s.cart.length > 0 ? <View style={{ position: 'absolute', top: 6, right: 6, minWidth: 17, height: 17, borderRadius: 9, backgroundColor: P.gold, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}><Text style={{ fontSize: 10.5, fontWeight: '800', color: '#24142B' }}>{s.cart.reduce((n, c) => n + c.qty, 0)}</Text></View> : null}
                {k === 'me' && unread > 0 ? <View style={{ position: 'absolute', top: 10, right: 12, width: 11, height: 11, borderRadius: 6, backgroundColor: C.coral, borderWidth: 2, borderColor: on ? C.barOn : C.bar }} /> : null}
              </Pressable>
            );
          })}
        </View>
        </View>
      </SafeAreaView>
    </SafeAreaView>
  );
}

// Picks light or dark from the Me setting (Auto follows the phone), repaints every screen when it changes.
function Themed() {
  const { s } = useStore();
  const sys = useColorScheme();
  const url = Platform.OS === 'web' && typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('theme') : null;
  const pref = url === 'dark' || url === 'light' ? url : s.theme ?? 'system';
  const dark = pref === 'dark' || (pref === 'system' && sys === 'dark');
  applyTheme(dark); restyle();
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    document.body.style.backgroundColor = C.bg;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#121113' : '#69247C');
  }, [dark]);
  return (
    <View key={dark ? 'dark' : 'light'} style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <Shell />
    </View>
  );
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({ Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold, Outfit_800ExtraBold });
  if (!fontsLoaded && !fontError) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <Themed />
      </StoreProvider>
    </SafeAreaProvider>
  );
}
