/**
 * Streak-driven vignette-style edge glow (four gradient stripes) and an
 * incoming-pipe warning glow on the right edge that intensifies with speed.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { SharedValue, useAnimatedStyle } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { TRAIL_HUES } from '../constants/tuning';

const STRIPE = 40;

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export const StreakEdgeGlow: React.FC<{ streakTier: SharedValue<number> }> = ({ streakTier }) => {
  return (
    <>
      <BackgroundHueTint streakTier={streakTier} />
      {[0, 1, 2, 3].map((tier) => (
        <TierLayer key={tier} tier={tier} active={streakTier} />
      ))}
    </>
  );
};

/**
 * Very subtle full-screen tint that slowly shifts with the streak tier —
 * so the whole game reads "different" at higher combo depths without
 * dominating readability. Opacity is intentionally tiny.
 */
const BackgroundHueTint: React.FC<{ streakTier: SharedValue<number> }> = ({ streakTier }) => {
  const style = useAnimatedStyle(() => {
    const t = streakTier.value;
    return { opacity: t === 0 ? 0 : 0.05 + t * 0.03 };
  });
  const colorStyle = useAnimatedStyle(() => ({
    backgroundColor: TRAIL_HUES[streakTier.value] ?? TRAIL_HUES[0],
  }));
  return <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, style, colorStyle]} />;
};

const TierLayer: React.FC<{ tier: number; active: SharedValue<number> }> = ({ tier, active }) => {
  const style = useAnimatedStyle(() => ({
    opacity: active.value === tier && tier > 0 ? 1 : 0,
  }));
  const hue = TRAIL_HUES[tier] ?? TRAIL_HUES[0];
  const outer = hexToRgba(hue, 0.55);
  const inner = hexToRgba(hue, 0);
  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
      <LinearGradient
        colors={[outer, inner]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={[styles.side, { left: 0, width: STRIPE }]}
      />
      <LinearGradient
        colors={[inner, outer]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={[styles.side, { right: 0, width: STRIPE }]}
      />
      <LinearGradient
        colors={[outer, inner]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={[styles.horiz, { top: 0, height: STRIPE }]}
      />
      <LinearGradient
        colors={[inner, outer]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={[styles.horiz, { bottom: 0, height: STRIPE }]}
      />
    </Animated.View>
  );
};

export const IncomingWarn: React.FC<{ score: SharedValue<number> }> = ({ score }) => {
  const style = useAnimatedStyle(() => {
    const s = score.value;
    const opacity = Math.min(0.6, Math.max(0, (s - 8) / 60));
    return { opacity };
  });
  return (
    <Animated.View pointerEvents="none" style={[styles.rightGlow, style]}>
      <LinearGradient
        colors={['rgba(255,90,110,0)', 'rgba(255,90,110,0.8)']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
};

/** Surge warning band that pulses across the screen for SURGE_WARN_DURATION. */
export const SurgeWarnLayer: React.FC<{ visible: boolean; label?: string }> = ({ visible, label = 'SURGE INCOMING' }) => {
  if (!visible) return null;
  return (
    <View pointerEvents="none" style={styles.surgeWrap}>
      <View style={styles.surgeBand}>
        <LinearGradient
          colors={['rgba(255,80,120,0)', 'rgba(255,120,150,0.9)', 'rgba(255,80,120,0)']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.surgeLabelWrap}>
          <View style={styles.surgeLabelPill}>
            <View style={styles.surgeDot} />
            <View style={{ width: 8 }} />
            <View>
              <SurgeLabel label={label} />
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

const SurgeLabel: React.FC<{ label: string }> = ({ label }) => (
  <Animated.Text style={styles.surgeLabel}>{label}</Animated.Text>
);

const styles = StyleSheet.create({
  side: { position: 'absolute', top: 0, bottom: 0 },
  horiz: { position: 'absolute', left: 0, right: 0 },
  rightGlow: { position: 'absolute', top: 0, right: 0, bottom: 0, width: 44 },
  surgeWrap: { position: 'absolute', top: '38%', left: 0, right: 0, alignItems: 'center' },
  surgeBand: { width: '100%', height: 70, justifyContent: 'center' },
  surgeLabelWrap: { alignItems: 'center', justifyContent: 'center' },
  surgeLabelPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(20,10,20,0.75)',
    borderWidth: 1,
    borderColor: '#ff7db7',
  },
  surgeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ff7db7',
    shadowColor: '#ff7db7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  surgeLabel: {
    color: '#ffe1ec',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 3,
  },
});
