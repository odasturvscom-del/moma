import React, { useEffect, useState } from 'react';
import { View, Image, Pressable, Platform, useWindowDimensions } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '../ui';
import { C } from '../theme';

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
  const artH = Math.min(colW * RATIO, height - 250);
  const { can, ios, install } = useInstall();
  return (
    <View style={{ flex: 1 }}>
      <Svg style={{ position: 'absolute', top: 0, left: 0 }} width={width} height={height}>
        <Defs>
          <LinearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#B4D7EE" />
            <Stop offset="0.45" stopColor="#C3CCE9" />
            <Stop offset="0.75" stopColor="#E4DBE1" />
            <Stop offset="1" stopColor="#F4E6DA" />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={height} fill="url(#wg)" />
      </Svg>
      <SafeAreaView style={{ flex: 1, alignItems: 'center' }}>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <Image source={ART} accessibilityLabel="Moma: a coral character hugging a baby, with three friends saying Hi mama" style={{ width: artH / RATIO, height: artH }} resizeMode="contain" />
        </View>
        <View style={{ width: colW, paddingHorizontal: 24, paddingBottom: 18 }}>
          <Text style={{ textAlign: 'center', fontSize: 18, color: '#3A3540', marginBottom: 18 }}>Your pregnancy, made lighter</Text>
          <Pressable accessibilityRole="button" onPress={onStart} style={({ pressed }) => ({ backgroundColor: '#141414', borderRadius: 99, paddingVertical: 17, alignItems: 'center', opacity: pressed ? 0.85 : 1 })}>
            <Text style={{ color: '#fff', fontSize: 17, fontWeight: '600' }}>Get started</Text>
          </Pressable>
          {can && (
            <Pressable accessibilityRole="button" onPress={install} style={({ pressed }) => ({ backgroundColor: '#fff', borderRadius: 99, paddingVertical: 16, alignItems: 'center', marginTop: 10, opacity: pressed ? 0.85 : 1 })}>
              <Text style={{ color: '#141414', fontSize: 16, fontWeight: '600' }}>Install Moma on this device</Text>
            </Pressable>
          )}
          {ios && <Text style={{ textAlign: 'center', fontSize: 13, color: '#4A4550', marginTop: 12 }}>On iPhone: tap Share, then Add to Home Screen to install Moma.</Text>}
          <Text style={{ textAlign: 'center', fontSize: 12, color: '#6F6A73', marginTop: 12 }}>Private by default. Everything stays on this phone.</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}
