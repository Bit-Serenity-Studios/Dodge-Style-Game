/**
 * Death overlay: white flash on entry, animated count-up score vs best,
 * "TAP TO RESTART" cue that unlocks after RESTART_WINDOW_MS, and quick
 * session stats. Restart is a full-screen tap catcher.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { FLASH_MS, NEW_BEST_GOLD, RESTART_WINDOW_MS } from '../constants/tuning';
import type { Stats } from '../hooks/usePersistence';
import { STR } from '../constants/strings';

type Props = {
  score: number;
  best: number;
  isNewBest: boolean;
  stats: Stats;
  dailyMode: boolean;
  dailyBest: number;
  reduceMotion: boolean;
  onRestart: () => void;
};

export const DeathOverlay: React.FC<Props> = ({
  score,
  best,
  isNewBest,
  stats,
  dailyMode,
  dailyBest,
  reduceMotion,
  onRestart,
}) => {
  const flash = useSharedValue(1);
  const panelY = useSharedValue(40);
  const panelOp = useSharedValue(0);
  const [restartArmed, setRestartArmed] = useState(false);
  const [displayScore, setDisplayScore] = useState(0);
  const armTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (reduceMotion) {
      flash.value = 0;
      panelY.value = 0;
      panelOp.value = 1;
      setDisplayScore(score);
      armTimer.current = setTimeout(() => setRestartArmed(true), RESTART_WINDOW_MS);
      return () => {
        if (armTimer.current) clearTimeout(armTimer.current);
      };
    }
    flash.value = withSequence(
      withTiming(1, { duration: 0 }),
      withTiming(0, { duration: FLASH_MS, easing: Easing.out(Easing.quad) }),
    );
    panelY.value = withDelay(80, withSpring(0, { mass: 0.7, damping: 12, stiffness: 160 }));
    panelOp.value = withDelay(80, withTiming(1, { duration: 260 }));
    armTimer.current = setTimeout(() => setRestartArmed(true), RESTART_WINDOW_MS);

    const steps = Math.max(1, Math.min(60, score));
    const perStep = Math.max(8, Math.floor(500 / steps));
    let cur = 0;
    setDisplayScore(0);
    countTimer.current = setInterval(() => {
      cur = Math.min(score, cur + Math.max(1, Math.ceil(score / steps)));
      setDisplayScore(cur);
      if (cur >= score && countTimer.current) {
        clearInterval(countTimer.current);
        countTimer.current = null;
      }
    }, perStep);
    return () => {
      if (armTimer.current) clearTimeout(armTimer.current);
      if (countTimer.current) clearInterval(countTimer.current);
    };
  }, [score, flash, panelY, panelOp, reduceMotion]);

  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value }));
  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: panelY.value }],
    opacity: panelOp.value,
  }));

  const scoreColor = isNewBest ? NEW_BEST_GOLD : '#e5fffb';

  return (
    <>
      <Animated.View pointerEvents="none" style={[styles.flash, flashStyle]} />
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={() => {
          if (!restartArmed) return;
          onRestart();
        }}
        accessibilityRole="button"
        accessibilityLabel={
          restartArmed ? STR.death.a11yArmed(score, isNewBest, best) : STR.death.a11yArming(score)
        }
        accessibilityHint={restartArmed ? STR.death.a11yHintArmed : undefined}
      >
        <View style={styles.dim} />
        <Animated.View style={[styles.panel, panelStyle]}>
          <Text style={styles.label} accessible={false}>{STR.death.scoreLabel}</Text>
          <Text
            style={[styles.score, { color: scoreColor, textShadowColor: scoreColor }]}
            allowFontScaling={false}
            accessible={false}
          >
            {displayScore}
          </Text>
          {isNewBest ? (
            <View style={styles.newBestPill}>
              <Text style={styles.newBestText} allowFontScaling={false}>{STR.death.newBestPill}</Text>
            </View>
          ) : (
            <Text style={styles.bestSub} accessible={false}>{STR.death.bestSub(best)}</Text>
          )}
          <View style={styles.statsRow}>
            <Stat label={STR.death.statRuns} value={stats.sessionRuns} />
            <Stat label={STR.death.statSession} value={stats.sessionBest} />
            <Stat label={STR.death.statAll} value={stats.allTimeBest} />
            {dailyMode ? <Stat label={STR.death.statDaily} value={dailyBest} /> : null}
          </View>
          <View style={styles.hintWrap}>
            <Text
              style={[styles.hint, { opacity: restartArmed ? 1 : 0.35 }]}
              allowFontScaling={false}
              accessible={false}
            >
              {restartArmed ? STR.death.retryArmed : STR.death.retryArming}
            </Text>
          </View>
        </Animated.View>
      </Pressable>
    </>
  );
};

const Stat: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <View style={styles.stat} accessibilityLabel={`${label} ${value}`}>
    <Text style={styles.statLabel} accessible={false}>{label}</Text>
    <Text style={styles.statValue} accessible={false} allowFontScaling={false}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  flash: { ...StyleSheet.absoluteFillObject, backgroundColor: '#ffffff' },
  dim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(5,6,15,0.55)' },
  panel: {
    position: 'absolute',
    top: '22%',
    left: 24,
    right: 24,
    alignItems: 'center',
    paddingVertical: 22,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: 'rgba(10,14,30,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(125,255,240,0.25)',
  },
  label: { color: '#7db7ff', letterSpacing: 4, fontWeight: '800', fontSize: 12 },
  score: {
    fontSize: 72,
    fontWeight: '900',
    letterSpacing: 2,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 22,
    marginTop: 6,
    marginBottom: 4,
  },
  bestSub: { color: '#7db7ff', letterSpacing: 3, fontWeight: '800', fontSize: 12 },
  newBestPill: {
    marginTop: 4,
    paddingVertical: 5,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: '#ffd94a',
  },
  newBestText: { color: '#231800', fontWeight: '900', letterSpacing: 3 },
  statsRow: {
    marginTop: 22,
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    flexWrap: 'wrap',
  },
  stat: { alignItems: 'center', paddingHorizontal: 8, paddingVertical: 6 },
  statLabel: { color: '#7db7ff', fontSize: 10, letterSpacing: 2, fontWeight: '800' },
  statValue: { color: '#e5fffb', fontSize: 22, fontWeight: '900', marginTop: 2 },
  hintWrap: { marginTop: 22 },
  hint: { color: '#c9dcff', letterSpacing: 3, fontWeight: '800', fontSize: 13 },
});
