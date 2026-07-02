/**
 * Near-miss "CLOSE!" popup + "NEW BEST" milestone banner.
 * Triggered by imperative `show()` from GameScreen.
 */
import React, { useImperativeHandle, forwardRef, useCallback } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

export type NearMissRef = { show: (label?: string) => void };

export const NearMissPopup = forwardRef<NearMissRef, unknown>((_, ref) => {
  const scale = useSharedValue(0);
  const y = useSharedValue(0);
  const op = useSharedValue(0);
  const rot = useSharedValue(-6);

  const show = useCallback(
    (_label?: string) => {
      op.value = 1;
      scale.value = 0.6;
      y.value = 0;
      rot.value = -6 + Math.random() * 12;
      scale.value = withSpring(1.15, { mass: 0.4, damping: 8, stiffness: 260 });
      y.value = withSequence(
        withTiming(-30, { duration: 400, easing: Easing.out(Easing.quad) }),
        withTiming(-40, { duration: 200 }),
      );
      op.value = withSequence(
        withTiming(1, { duration: 60 }),
        withDelay(360, withTiming(0, { duration: 240 })),
      );
    },
    [scale, y, op, rot],
  );

  useImperativeHandle(ref, () => ({ show }), [show]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }, { scale: scale.value }, { rotate: `${rot.value}deg` }],
    opacity: op.value,
  }));

  return (
    <Animated.View pointerEvents="none" style={[styles.wrap, style]}>
      <Animated.Text style={styles.text}>CLOSE!</Animated.Text>
    </Animated.View>
  );
});
NearMissPopup.displayName = 'NearMissPopup';

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: '40%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  text: {
    color: '#ffd94a',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 4,
    textShadowColor: '#ffd94a',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
});
