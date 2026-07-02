/**
 * Top-level game screen. Composes all subsystems:
 *   - useGameLoop (physics on UI thread)
 *   - Persistence hook (AsyncStorage best + session stats + daily)
 *   - Audio layer (SFX)
 *   - Reactive components (HUD, overlays, particles, edge glow)
 *
 * Handles: input → tap; discrete event callbacks → haptics/audio/pops.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';

import { useGameLoop } from '../hooks/useGameLoop';
import { usePersistence } from '../hooks/usePersistence';
import { ensureLoaded, play, playTick } from '../audio';
import { randomSeed, todaySeed } from '../utils/rng';

import { Starfield } from './Starfield';
import { Pipes } from './Pipes';
import { Player } from './Player';
import { HUD } from './HUD';
import { StartScreen } from './StartScreen';
import { DeathOverlay } from './DeathOverlay';
import { NearMissPopup, NearMissRef } from './NearMissPopup';
import { NewBestBanner, NewBestBannerRef } from './NewBestBanner';
import { ParticleSystem, ParticleSystemHandle } from './ParticleSystem';
import { StreakEdgeGlow, IncomingWarn, SurgeWarnLayer } from './EdgeGlow';
import { PLAYER_X_FRAC, SURGE_WARN_DURATION } from '../constants/tuning';

type OverlayPhase = 'idle' | 'playing' | 'dead';

export const GameScreen: React.FC = () => {
  const { width, height } = useWindowDimensions();
  const [dailyMode, setDailyMode] = useState(false);
  const [seed, setSeed] = useState<number>(() => randomSeed());
  const [overlayPhase, setOverlayPhase] = useState<OverlayPhase>('idle');
  const [runNewBest, setRunNewBest] = useState(false);
  const [runFinalScore, setRunFinalScore] = useState(0);
  const [surgeVisible, setSurgeVisible] = useState(false);
  const surgeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const runBestRef = useRef(0); // best at run start (for detecting new best mid-run)
  const nearMissRef = useRef<NearMissRef | null>(null);
  const newBestRef = useRef<NewBestBannerRef | null>(null);
  const particlesRef = useRef<ParticleSystemHandle | null>(null);
  const passedBestThisRunRef = useRef(false);

  const { stats, recordRun } = usePersistence(dailyMode);

  // Preload audio once.
  useEffect(() => {
    ensureLoaded();
  }, []);

  // Callbacks fired by the UI-thread loop.
  const onScore = useCallback(
    (score: number, isNearMiss: boolean) => {
      // Score tick (pitched).
      playTick(score);
      // Haptic.
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      if (isNearMiss) {
        play('nearMiss');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        nearMissRef.current?.show();
        // Spark burst near the player.
        particlesRef.current?.spark(width * PLAYER_X_FRAC, height / 2, '#ffd94a');
      } else {
        play('score');
      }
      // Personal best crossed mid-run?
      if (
        !passedBestThisRunRef.current &&
        runBestRef.current > 0 &&
        score > runBestRef.current
      ) {
        passedBestThisRunRef.current = true;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
        play('milestone');
        newBestRef.current?.show();
        particlesRef.current?.confetti(width / 2, height * 0.35);
        setRunNewBest(true);
      }
    },
    [width, height],
  );

  const onDeath = useCallback(
    (finalScore: number) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      // Sharp double-buzz.
      setTimeout(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
      }, 80);
      play('death');
      setRunFinalScore(finalScore);
      recordRun(finalScore).then(({ newBest }) => {
        // If newBest was true but we hadn't crossed mid-run (initial 0 best),
        // still surface the gold state in the death panel.
        if (newBest) setRunNewBest(true);
      });
      // Match hitstop timing: overlay appears just after freeze frame ends.
      setTimeout(() => setOverlayPhase('dead'), 80);
    },
    [recordRun],
  );

  const onSurgeWarn = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    play('surge');
    setSurgeVisible(true);
    if (surgeTimerRef.current) clearTimeout(surgeTimerRef.current);
    surgeTimerRef.current = setTimeout(
      () => setSurgeVisible(false),
      Math.round(SURGE_WARN_DURATION * 1000),
    );
  }, []);

  const onFlap = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    play('flap');
  }, []);

  const onTierUp = useCallback(
    (_tier: number) => {
      // Streak escalation: rigid haptic + celebration chime + confetti puff
      // at player. Small, not overwhelming — the visual edge glow is the star.
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      play('milestone');
      particlesRef.current?.spark(width * PLAYER_X_FRAC, height / 2, '#c17dff');
    },
    [width, height],
  );

  const gameLoop = useGameLoop({
    width,
    height,
    seed,
    callbacks: useMemo(
      () => ({ onScore, onDeath, onSurgeWarn, onFlap, onTierUp }),
      [onScore, onDeath, onSurgeWarn, onFlap, onTierUp],
    ),
  });

  // Bridge phase shared value -> overlayPhase for start-screen visibility.
  useAnimatedReaction(
    () => gameLoop.phase.value,
    (v, prev) => {
      if (prev === v) return;
      if (v === 0) runOnJS(setOverlayPhase)('idle');
      else if (v === 1) runOnJS(setOverlayPhase)('playing');
      // v==2 dying — stay in playing until deathEv-driven overlay flip
      // v==3 dead — overlay flip is done by onDeath timer to match hitstop
    },
  );

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: gameLoop.shakeX.value }, { translateY: gameLoop.shakeY.value }],
  }));

  const tapGesture = useMemo(
    () =>
      Gesture.Tap()
        .maxDuration(400)
        .onStart(() => {
          'worklet';
          gameLoop.tap();
        }),
    [gameLoop],
  );

  const handleRestart = useCallback(() => {
    passedBestThisRunRef.current = false;
    setRunNewBest(false);
    setSurgeVisible(false);
    if (surgeTimerRef.current) clearTimeout(surgeTimerRef.current);
    runBestRef.current = dailyMode ? stats.dailyBest : stats.allTimeBest;
    setSeed(dailyMode ? todaySeed() : randomSeed());
    gameLoop.reset();
    setOverlayPhase('idle');
  }, [dailyMode, stats, gameLoop]);

  // Whenever a run begins (idle -> playing), snapshot the current best.
  useEffect(() => {
    if (overlayPhase === 'playing') {
      runBestRef.current = dailyMode ? stats.dailyBest : stats.allTimeBest;
      passedBestThisRunRef.current = false;
      setRunNewBest(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overlayPhase]);

  const displayBest = dailyMode ? stats.dailyBest : stats.allTimeBest;

  return (
    <View style={styles.root}>
      <GestureDetector gesture={tapGesture}>
        <Animated.View style={[styles.root, shakeStyle]}>
          {/* Background */}
          <Starfield width={width} height={height} />
          {/* Pipes */}
          <Pipes pipes={gameLoop.pipes} width={width} height={height} />
          {/* Player */}
          <Player
            x={gameLoop.playerX}
            y={gameLoop.py}
            rot={gameLoop.rot}
            phase={gameLoop.phase}
            streakTier={gameLoop.streakTier}
          />
          {/* Particles */}
          <ParticleSystem handleRef={particlesRef} />
          {/* Edge/warn overlays */}
          <StreakEdgeGlow streakTier={gameLoop.streakTier} />
          <IncomingWarn score={gameLoop.score} />
          <SurgeWarnLayer visible={surgeVisible} />
          {/* Popups */}
          <NearMissPopup ref={nearMissRef} />
          <NewBestBanner ref={newBestRef} />
          {/* HUD */}
          {overlayPhase === 'playing' ? (
            <HUD
              score={gameLoop.score}
              streak={gameLoop.streak}
              streakTier={gameLoop.streakTier}
              best={displayBest}
              isNewBest={runNewBest}
            />
          ) : null}
        </Animated.View>
      </GestureDetector>
      {/* Start / Death overlays (outside shake so UI stays legible) */}
      {overlayPhase === 'idle' ? (
        <StartScreen
          best={displayBest}
          dailyMode={dailyMode}
          dailyBest={stats.dailyBest}
          onToggleDaily={() => {
            const next = !dailyMode;
            setDailyMode(next);
            setSeed(next ? todaySeed() : randomSeed());
          }}
        />
      ) : null}
      {overlayPhase === 'dead' ? (
        <DeathOverlay
          score={runFinalScore}
          best={displayBest}
          isNewBest={runNewBest}
          stats={stats}
          dailyMode={dailyMode}
          dailyBest={stats.dailyBest}
          onRestart={handleRestart}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#05060f' },
});
