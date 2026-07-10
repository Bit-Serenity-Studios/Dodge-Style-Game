/**
 * No-op ads adapter. Renders a visible "AD" placeholder banner and
 * logs interstitial calls without blocking. Wire a real SDK by
 * writing another adapter and registering it in ./index.ts.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { AdsAdapter, BannerProps } from './types';

const StubBanner: React.FC<BannerProps> = ({ style, height }) => (
  <View
    style={[styles.banner, { height }, style]}
    accessibilityLabel="Advertisement placeholder"
    accessibilityRole="text"
    pointerEvents="none"
  >
    <Text style={styles.label}>AD  ·  PLACEHOLDER</Text>
  </View>
);

let ready = false;

export const stubAdapter: AdsAdapter = {
  async init() {
    ready = true;
  },
  isReady() {
    return ready;
  },
  preloadInterstitial() {
    /* no-op */
  },
  async showInterstitial() {
    // In real SDKs this awaits the ad-dismissed callback. Here we
    // just log so the cadence + hook point can be verified during
    // development.
    if (__DEV__) {
      console.log('[ads:stub] showInterstitial() (no-op)');
    }
  },
  Banner: StubBanner,
  setPersonalized(_on: boolean) {
    /* no-op */
  },
};

const styles = StyleSheet.create({
  banner: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(125,183,255,0.35)',
    borderStyle: 'dashed',
  },
  label: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    letterSpacing: 4,
    fontWeight: '700',
  },
});
