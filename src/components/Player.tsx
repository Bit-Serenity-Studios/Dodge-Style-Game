/**
 * The glowing orb. Position/rotation driven from shared values on the UI
 * thread. A short trail is a pool of View "ghosts" whose x/y trail the
 * player with an exponential lag — length and hue scale with streak tier.
 */
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  SharedValue,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';
import { PLAYER_RADIUS, TRAIL_HUES, TRAIL_LENGTHS } from '../constants/tuning';

type Props = {
  x: number;
  y: SharedValue<number>;
  rot: SharedValue<number>;
  phase: SharedValue<number>; // 0=idle 1=play 2=dying 3=dead
  streakTier: SharedValue<number>;
};

const TRAIL_MAX = 26;

export const Player: React.FC<Props> = ({ x, y, rot, phase, streakTier }) => {
  // Trail buffer: shared values sampled from y at increasing lags.
  const trailY: SharedValue<number>[] = [];
  const trailX: SharedValue<number>[] = [];
  for (let i = 0; i < TRAIL_MAX; i++) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    trailY.push(useSharedValue<number>(y.value));
    // eslint-disable-next-line react-hooks/rules-of-hooks
    trailX.push(useSharedValue<number>(x));
  }

  // Update trail on every animation frame by chaining derived values.
  // Each successive slot lags the previous by a small factor.
  useDerivedValue(() => {
    // Only trail while playing (idle/dead: freeze trail on the orb).
    if (phase.value === 0 || phase.value === 3) {
      for (let i = 0; i < TRAIL_MAX; i++) {
        trailY[i].value = y.value;
        trailX[i].value = x;
      }
      return 0;
    }
    // Shift down: slot[i] chases slot[i-1] with lag.
    trailY[0].value = y.value;
    trailX[0].value = x;
    for (let i = 1; i < TRAIL_MAX; i++) {
      trailY[i].value += (trailY[i - 1].value - trailY[i].value) * 0.5;
      trailX[i].value += (trailX[i - 1].value - trailX[i].value) * 0.5;
    }
    return 0;
  });

  // Idle bob + pulse.
  const idleBob = useSharedValue<number>(0);
  const idlePulse = useSharedValue<number>(1);
  useEffect(() => {
    idleBob.value = withRepeat(
      withSequence(withTiming(-8, { duration: 900 }), withTiming(8, { duration: 900 })),
      -1,
      true,
    );
    idlePulse.value = withRepeat(
      withSequence(withTiming(1.08, { duration: 700 }), withTiming(0.96, { duration: 700 })),
      -1,
      true,
    );
    return () => {
      cancelAnimation(idleBob);
      cancelAnimation(idlePulse);
    };
  }, [idleBob, idlePulse]);

  const orbStyle = useAnimatedStyle(() => {
    const idle = phase.value === 0 ? 1 : 0;
    const bob = idle ? idleBob.value : 0;
    const pulse = idle ? idlePulse.value : 1;
    return {
      transform: [
        { translateX: x - PLAYER_RADIUS },
        { translateY: y.value - PLAYER_RADIUS + bob },
        { rotate: `${rot.value}deg` },
        { scale: pulse },
      ],
      opacity: phase.value === 3 ? 0.15 : 1,
    };
  });

  return (
    <>
      {Array.from({ length: TRAIL_MAX }).map((_, i) => (
        <TrailDot key={i} idx={i} px={trailX[i]} py={trailY[i]} streakTier={streakTier} phase={phase} />
      ))}
      <Animated.View style={[styles.orb, orbStyle]}>
        <View style={styles.orbGlow} />
        <View style={styles.orbInner} />
        <View style={styles.orbHighlight} />
      </Animated.View>
    </>
  );
};

const TrailDot: React.FC<{
  idx: number;
  px: SharedValue<number>;
  py: SharedValue<number>;
  streakTier: SharedValue<number>;
  phase: SharedValue<number>;
}> = ({ idx, px, py, streakTier, phase }) => {
  const style = useAnimatedStyle(() => {
    const len = TRAIL_LENGTHS[streakTier.value] ?? TRAIL_LENGTHS[0];
    const visible = idx > 0 && idx < len && phase.value === 1;
    const t = idx / len; // 0..1 fade
    const size = Math.max(4, PLAYER_RADIUS * 2 * (1 - t * 0.65));
    return {
      position: 'absolute',
      left: 0,
      top: 0,
      width: size,
      height: size,
      borderRadius: size / 2,
      transform: [{ translateX: px.value - size / 2 }, { translateY: py.value - size / 2 }],
      opacity: visible ? (1 - t) * 0.55 : 0,
    };
  });
  const colorStyle = useAnimatedStyle(() => {
    const hue = TRAIL_HUES[streakTier.value] ?? TRAIL_HUES[0];
    return { backgroundColor: hue };
  });
  return <Animated.View style={[style, colorStyle]} />;
};

const styles = StyleSheet.create({
  orb: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: PLAYER_RADIUS * 2,
    height: PLAYER_RADIUS * 2,
    borderRadius: PLAYER_RADIUS,
    backgroundColor: '#8ffcff',
    shadowColor: '#7dfff0',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 22,
    elevation: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbGlow: {
    position: 'absolute',
    width: PLAYER_RADIUS * 3.6,
    height: PLAYER_RADIUS * 3.6,
    borderRadius: PLAYER_RADIUS * 1.8,
    backgroundColor: '#7dfff0',
    opacity: 0.12,
  },
  orbInner: {
    position: 'absolute',
    width: PLAYER_RADIUS * 1.5,
    height: PLAYER_RADIUS * 1.5,
    borderRadius: PLAYER_RADIUS * 0.75,
    backgroundColor: '#e5fffb',
    opacity: 0.95,
  },
  orbHighlight: {
    position: 'absolute',
    width: PLAYER_RADIUS * 0.6,
    height: PLAYER_RADIUS * 0.6,
    borderRadius: PLAYER_RADIUS * 0.3,
    backgroundColor: '#ffffff',
    top: PLAYER_RADIUS * 0.35,
    left: PLAYER_RADIUS * 0.5,
    opacity: 0.9,
  },
});
