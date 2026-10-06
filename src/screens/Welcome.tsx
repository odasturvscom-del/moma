import React, { useEffect, useState } from 'react';
import { View, Image, Pressable, Platform, useWindowDimensions } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '../ui';
import { C } from '../theme';
import { NdpaBadge } from '../ndpa';

const ART = require('../../assets/welcome.webp');
const RATIO = 985 / 624;

// Web install support: the beforeinstallprompt event is caught early in index.html and parked on window.
function useInstall() {
  const [can, setCan] = useState(false);
  const [ios, setIos] = useState(false);
  const [installed, setInstalled] = useState(false);
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const w = window as any;
    const standalone = window.matchMedia?.('(display-mode: standalone)').matches || w.navigator?.standalone;
    setInstalled(!!standalone);
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent) && !standalone);
    setCan(!!w.__momaInstall);
    const on = () => setCan(!!w.__momaInstall);
    window.addEventListener('moma-installable', on);
    return () => window.removeEventListener('moma-installable', on);
  }, []);
  const install = async () => {
    const w = window as any, e = w.__momaInstall; if (!e) return;
    e.prompt(); const r = await e.userChoice.catch(() => null);
    if (r?.outcome === 'accepted') { setInstalled(true); w.__momaInstall = null; setCan(false); }
  };
  return { can: can && !installed, ios: ios && !installed, install };
}

export default function Welcome({ onStart }: { onStart: () => void }) {
  const { width, height } = useWindowDimensions();
  const colW = Math.min(width, 480);
  // One centred stack: mascot, wordmark, tagline and buttons share the same column width.
  const artH = Math.max(150, Math.min(colW * 0.58, height - 400, 270));
  const { can, ios, install } = useInstall();
  return (
    <View style={{ flex: 1 }}>
      <Svg style={{ position: 'absolute', top: 0, left: 0 }} width={width} height={height}>
        <Defs>
          <LinearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#EBDDF1" />
            <Stop offset="0.45" stopColor="#F1E6F2" />
            <Stop offset="0.75" stopColor="#F6EEEC" />
            <Stop offset="1" stopColor="#F8F4EC" />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={height} fill="url(#wg)" />
      </Svg>
      <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: colW, paddingHorizontal: 24, paddingVertical: 18, alignItems: 'stretch' }}>
          <Image source={ART} accessibilityLabel="Mo, the Moma mascot, hugging a baby" style={{ width: artH / RATIO, height: artH, alignSelf: 'center', marginBottom: 22 }} resizeMode="contain" />
          <Text style={{ textAlign: 'center', fontSize: 34, fontWeight: '800', color: '#69247C', letterSpacing: 3, marginBottom: 6 }}>SÒLÁYÒ</Text>
          <Text style={{ textAlign: 'center', fontSize: 17, color: '#3A2A40', marginBottom: 28 }}>Safe delivery. Smarter maternal care.</Text>
          <Pressable accessibilityRole="button" onPress={onStart} style={({ pressed }) => ({ backgroundColor: '#69247C', borderRadius: 99, paddingVertical: 17, alignItems: 'center', opacity: pressed ? 0.85 : 1 })}>
            <Text style={{ color: '#fff', fontSize: 17, fontWeight: '600' }}>Get started</Text>
          </Pressable>
          {can && (
            <Pressable accessibilityRole="button" onPress={install} style={({ pressed }) => ({ backgroundColor: '#fff', borderRadius: 99, paddingVertical: 16, alignItems: 'center', marginTop: 10, opacity: pressed ? 0.85 : 1 })}>
              <Text style={{ color: '#69247C', fontSize: 16, fontWeight: '600' }}>Install Moma on this device</Text>
            </Pressable>
          )}
          {ios && <Text style={{ textAlign: 'center', fontSize: 13, color: '#4A4550', marginTop: 12 }}>On iPhone: tap Share, then Add to Home Screen to install Moma.</Text>}
          <NdpaBadge small style={{ alignSelf: 'center', marginTop: 16 }} />
          <Text style={{ textAlign: 'center', fontSize: 12, color: '#6F6A73', marginTop: 8 }}>Your health logs stay on this phone.</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}
