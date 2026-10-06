import React from 'react';
import { View } from 'react-native';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import { Text } from './ui';

// Moma's own UK GDPR trust badge (not the ICO's logo). Names kept so every screen keeps working.
export function NdpaShield({ size = 30 }: { size?: number }) {
  return (
    <Svg width={size} height={size * 46 / 40} viewBox="0 0 40 46">
      <Path d="M20 2 37 8v13c0 11-7.3 19.6-17 23C10.3 40.6 3 32 3 21V8z" fill="#141414" />
      <Path d="M20 6.5 33 11v10c0 8.6-5.5 15.4-13 18.3V6.5z" fill="#2E2A33" />
      <Rect x={13} y={20} width={14} height={11} rx={2.5} fill="#A8E8CB" />
      <Path d="M15.8 20v-3.2a4.2 4.2 0 0 1 8.4 0V20" fill="none" stroke="#A8E8CB" strokeWidth={2.4} />
      <Circle cx={20} cy={25.3} r={1.6} fill="#141414" />
    </Svg>
  );
}

export function NdpaBadge({ small, sub = 'Your data stays yours', style }: { small?: boolean; sub?: string; style?: object }) {
  return (
    <View accessibilityLabel="Built for UK GDPR"
      style={[{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: small ? 8 : 10, backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1.5, borderColor: '#D9EFE4',
        paddingVertical: small ? 6 : 8, paddingLeft: small ? 8 : 10, paddingRight: small ? 12 : 16 }, style]}>
      <NdpaShield size={small ? 22 : 28} />
      <View>
        <Text style={{ fontSize: small ? 13 : 15, fontWeight: '800', color: '#141414', letterSpacing: 0.4 }}>Built for UK GDPR</Text>
        <Text style={{ fontSize: small ? 11 : 12, color: '#4A5A52', fontWeight: '500' }}>{sub}</Text>
      </View>
    </View>
  );
}
