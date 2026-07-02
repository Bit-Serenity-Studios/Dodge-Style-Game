/**
 * In-run HUD: big score (with pop animation), streak meter, corner "BEST: N".
 * Score text can't be driven directly from a shared value — we bridge via
 * useAnimatedReaction on the score shared value to a React state variable
 * (fires only when the integer changes, not per frame).
 */
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  SharedValue,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { NEW_BEST_GOLD, SCORE_POP_SCALE, STREAK_TIERS } from '../constants/tuning';

type Props = {
  score: SharedValue<number>;
  streak: SharedValue<number>;
  streakTier: SharedValue<number>;
  best: number;
  isNewBest: boolean;
};

export const HUD: React.FC<Props> = ({ score, streak, streakTier, best, isNewBest }) => {
  const [displayScore, setDisplayScore] = useState(0);
  const [displayStreak, setDisplayStreak] = useState(0);
  const popScale = useSharedValue(1);

  useAnimatedReaction(
    () => score.value,
    (v, prev) => {
      if (prev == null || v === prev) return;
      runOnJS(setDisplayScore)(v);
      popScale.value = withSequence(
        withTiming(SCORE_POP_SCALE, { duration: 90, easing: Easing.out(Easing.quad) }),
        withSpring(1, { mass: 0.5, damping: 8, stiffness: 260 }),
      );
    },
  );
  useAnimatedReaction(
    () => streak.value,
    (v, prev) => {
      if (prev == null || v === prev) return;
      runOnJS(setDisplayStreak)(v);
    },
  );

  const scoreStyle = useAnimatedStyle(() => ({
    transform: [{ scale: popScale.value }],
  }));

  // Combo bar fill based on streak within current tier.
  const barStyle = useAnimatedStyle(() => {
    const s = streak.value;
    const tier = streakTier.value;
    let denom: number = STREAK_TIERS[0];
    let base = 0;
    if (tier === 0) {
      denom = STREAK_TIERS[0];
    } else if (tier === 1) {
      base = STREAK_TIERS[0];
      denom = STREAK_TIERS[1] - STREAK_TIERS[0];
    } else if (tier === 2) {
      base = STREAK_TIERS[1];
      denom = STREAK_TIERS[2] - STREAK_TIERS[1];
    } else {
      base = STREAK_TIERS[2];
      denom = 10;
    }
    const local = Math.min(1, (s - base) / denom);
    const hue =
      tier === 0 ? '#7dfff0' : tier === 1 ? '#7db7ff' : tier === 2 ? '#c17dff' : '#ff7db7';
    return { width: `${local * 100}%`, backgroundColor: hue };
  });

  const bestColor = isNewBest ? NEW_BEST_GOLD : '#7db7ff';

  return (
    <>
      <View style={styles.topBar} pointerEvents="none">
        <Text style={[styles.bestText, { color: bestColor }]}>BEST: {best}</Text>
      </View>
      <View style={styles.centerTop} pointerEvents="none">
        <Animated.Text
          style={[styles.scoreText, isNewBest && { color: NEW_BEST_GOLD, textShadowColor: NEW_BEST_GOLD }, scoreStyle]}
        >
          {displayScore}
        </Animated.Text>
        {displayStreak >= STREAK_TIERS[0] ? (
          <View style={styles.streakWrap}>
            <Text style={styles.streakText}>{displayStreak}× COMBO</Text>
            <View style={styles.streakBar}>
              <Animated.View style={[styles.streakFill, barStyle]} />
            </View>
          </View>
        ) : null}
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  topBar: {
    position: 'absolute',
    top: 44,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    alignItems: 'flex-end',
  },
  centerTop: {
    position: 'absolute',
    top: 84,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  bestText: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 2,
    color: '#7db7ff',
    textShadowColor: '#7db7ff',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  scoreText: {
    color: '#e5fffb',
    fontSize: 74,
    fontWeight: '900',
    letterSpacing: 2,
    textShadowColor: '#7dfff0',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
  },
  streakWrap: {
    marginTop: 10,
    alignItems: 'center',
    width: 200,
  },
  streakText: {
    color: '#c9dcff',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 6,
  },
  streakBar: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  streakFill: {
    height: '100%',
    borderRadius: 3,
  },
});
