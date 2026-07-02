/**
 * "NEW BEST" banner slides in from the left mid-run without pausing.
 * Imperative show() from GameScreen when personal-best is beaten in-run.
 */
import React, { forwardRef, useCallback, useImperativeHandle } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { STR } from '../constants/strings';

export type NewBestBannerRef = { show: () => void };

export const NewBestBanner = forwardRef<NewBestBannerRef, unknown>((_, ref) => {
  const x = useSharedValue(-260);
  const op = useSharedValue(0);

  const show = useCallback(() => {
    x.value = -260;
    op.value = 1;
    x.value = withSequence(
      withSpring(0, { mass: 0.6, damping: 12, stiffness: 180 }),
      withDelay(1400, withTiming(-260, { duration: 400, easing: Easing.in(Easing.quad) })),
    );
    op.value = withSequence(withTiming(1, { duration: 100 }), withDelay(1600, withTiming(0, { duration: 400 })));
  }, [x, op]);

  useImperativeHandle(ref, () => ({ show }), [show]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }],
    opacity: op.value,
  }));

  return (
    <Animated.View pointerEvents="none" style={[styles.wrap, style]}>
      <Text style={styles.text}>{STR.newBest.banner}</Text>
    </Animated.View>
  );
});
NewBestBanner.displayName = 'NewBestBanner';

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 180,
    left: 0,
    paddingVertical: 8,
    paddingHorizontal: 24,
    backgroundColor: '#ffd94a',
    borderTopRightRadius: 999,
    borderBottomRightRadius: 999,
    shadowColor: '#ffd94a',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 16,
  },
  text: { color: '#241800', fontWeight: '900', letterSpacing: 4, fontSize: 14 },
});
