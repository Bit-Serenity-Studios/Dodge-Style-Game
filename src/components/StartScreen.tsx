/**
 * Idle overlay: title + pulsing "TAP TO START" + Daily Run toggle +
 * gear button that opens SettingsSheet.
 *
 * All interactive controls carry accessibilityLabel/Role/Hint so the
 * screen reader announces state transitions coherently. Tap targets
 * meet the 44pt minimum. Reduce-motion disables pulse + bob animations.
 */
import React, { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '../constants/colors';

type Props = {
  best: number;
  dailyMode: boolean;
  dailyBest: number;
  reduceMotion: boolean;
  onToggleDaily: () => void;
  onOpenSettings: () => void;
  showFirstRunHint: boolean;
};

export const StartScreen: React.FC<Props> = ({
  best,
  dailyMode,
  dailyBest,
  reduceMotion,
  onToggleDaily,
  onOpenSettings,
  showFirstRunHint,
}) => {
  const pulse = useSharedValue(1);
  const bob = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      pulse.value = 1;
      bob.value = 0;
      return;
    }
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 700, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.94, { duration: 700, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      true,
    );
    bob.value = withRepeat(
      withSequence(withTiming(-4, { duration: 900 }), withTiming(4, { duration: 900 })),
      -1,
      true,
    );
  }, [pulse, bob, reduceMotion]);

  const tapStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }, { translateY: bob.value }],
  }));

  return (
    <View pointerEvents="box-none" style={styles.wrap}>
      <View pointerEvents="none" style={styles.top}>
        <Text
          style={styles.title}
          allowFontScaling={false}
          accessibilityRole="header"
        >
          NEON DODGE
        </Text>
        <Text style={styles.subtitle} accessibilityLabel={`Best score ${best}`}>
          BEST {best}
        </Text>
      </View>
      <Animated.View pointerEvents="none" style={[styles.tapWrap, tapStyle]}>
        <Text style={styles.tap} allowFontScaling={false}>TAP TO START</Text>
        {showFirstRunHint ? (
          <Text style={styles.hint} accessibilityLabel="Tap anywhere to flap and fly through gaps">
            Tap anywhere to flap.  Fly through the gaps.
          </Text>
        ) : null}
      </Animated.View>
      <View style={styles.bottom} pointerEvents="box-none">
        <TouchableOpacity
          onPress={onToggleDaily}
          style={[styles.toggle, dailyMode && styles.toggleOn]}
          activeOpacity={0.7}
          accessibilityRole="switch"
          accessibilityState={{ checked: dailyMode }}
          accessibilityLabel="Daily Run"
          accessibilityHint={
            dailyMode
              ? `Daily run mode is on. Daily best is ${dailyBest}. Double tap to switch to endless.`
              : 'Daily run mode is off. Double tap to enable the same pipe sequence for everyone today.'
          }
        >
          <View style={[styles.dot, dailyMode && styles.dotOn]} />
          <Text style={[styles.toggleLabel, dailyMode && styles.toggleLabelOn]}>
            DAILY RUN{dailyMode ? `  ·  BEST ${dailyBest}` : ''}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onOpenSettings}
          style={styles.gear}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Settings"
          accessibilityHint="Sound, haptics, and reduce motion"
        >
          <View style={styles.gearInner}>
            <Text style={styles.gearIcon} allowFontScaling={false}>⚙</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 100,
  },
  top: { alignItems: 'center' },
  title: {
    color: colors.text,
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: 6,
    textShadowColor: colors.accent,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 4,
    marginTop: 6,
  },
  tapWrap: { alignItems: 'center', gap: 10 },
  tap: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 6,
    textShadowColor: colors.accent,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
  },
  hint: { color: colors.textDim, fontSize: 12, letterSpacing: 1, textAlign: 'center' },
  bottom: { alignItems: 'center', gap: 12 },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(125,183,255,0.4)',
  },
  toggleOn: { backgroundColor: 'rgba(125,255,240,0.14)', borderColor: colors.accent },
  toggleLabel: {
    color: colors.textMuted,
    fontWeight: '800',
    letterSpacing: 3,
    fontSize: 12,
    marginLeft: 8,
  },
  toggleLabelOn: { color: colors.text },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.textMuted },
  dotOn: {
    backgroundColor: colors.accent,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  gear: {
    marginTop: 6,
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(125,183,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  gearInner: { alignItems: 'center', justifyContent: 'center' },
  gearIcon: { color: colors.textMuted, fontSize: 22 },
});
