/**
 * Idle overlay: title + pulsing "TAP TO START" + Daily Run toggle.
 * The first tap anywhere both hides this and triggers the first flap.
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

type Props = {
  best: number;
  dailyMode: boolean;
  dailyBest: number;
  onToggleDaily: () => void;
};

export const StartScreen: React.FC<Props> = ({ best, dailyMode, dailyBest, onToggleDaily }) => {
  const pulse = useSharedValue(1);
  const bob = useSharedValue(0);

  useEffect(() => {
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
  }, [pulse, bob]);

  const tapStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }, { translateY: bob.value }],
  }));

  return (
    <View pointerEvents="box-none" style={styles.wrap}>
      <View pointerEvents="none" style={styles.top}>
        <Text style={styles.title}>NEON DODGE</Text>
        <Text style={styles.subtitle}>BEST {best}</Text>
      </View>
      <Animated.View pointerEvents="none" style={[styles.tapWrap, tapStyle]}>
        <Text style={styles.tap}>TAP TO START</Text>
      </Animated.View>
      <View style={styles.bottom} pointerEvents="box-none">
        <TouchableOpacity
          onPress={onToggleDaily}
          style={[styles.toggle, dailyMode && styles.toggleOn]}
          activeOpacity={0.7}
        >
          <View style={[styles.dot, dailyMode && styles.dotOn]} />
          <Text style={[styles.toggleLabel, dailyMode && styles.toggleLabelOn]}>
            DAILY RUN{dailyMode ? `  ·  BEST ${dailyBest}` : ''}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'space-between', paddingVertical: 100 },
  top: { alignItems: 'center' },
  title: {
    color: '#e5fffb',
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: 6,
    textShadowColor: '#7dfff0',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
  },
  subtitle: {
    color: '#7db7ff',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 4,
    marginTop: 6,
  },
  tapWrap: { alignItems: 'center' },
  tap: {
    color: '#e5fffb',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 6,
    textShadowColor: '#7dfff0',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
  },
  bottom: { alignItems: 'center' },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(125,183,255,0.4)',
  },
  toggleOn: { backgroundColor: 'rgba(125,255,240,0.14)', borderColor: '#7dfff0' },
  toggleLabel: { color: '#7db7ff', fontWeight: '800', letterSpacing: 3, fontSize: 12, marginLeft: 8 },
  toggleLabelOn: { color: '#e5fffb' },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#7db7ff' },
  dotOn: {
    backgroundColor: '#7dfff0',
    shadowColor: '#7dfff0',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
});
