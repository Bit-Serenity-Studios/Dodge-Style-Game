/**
 * Top-level game screen. Composes all subsystems:
 *   - useGameLoop        physics on UI thread
 *   - usePersistence     AsyncStorage best + session stats + daily
 *   - useSettings        sound / haptics / reduce-motion
 *   - audio layer        SFX
 *   - reactive components (HUD, overlays, particles, edge glow)
 *
 * Discrete-event JS callbacks translate score/near-miss/tier/surge/flap/death
 * into haptics + audio + juice, all gated by user settings.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, StyleSheet, useWindowDimensions, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, {
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';

import { useGameLoop } from '../hooks/useGameLoop';
import { usePersistence } from '../hooks/usePersistence';
import { useSettings } from '../hooks/useSettings';
import { ensureLoaded, play, playTick } from '../audio';
import {
  loadMusic,
  playTrack as playMusicTrack,
  pauseMusic,
  resumeMusic,
  setEnabled as setMusicEnabled,
} from '../audio/music';
import {
  initAds,
  preloadInterstitial,
  maybeShowInterstitial,
  setPersonalizedAds,
  BANNER_HEIGHT_PT,
  useAdsActive,
} from '../ads';
import { initIap } from '../iap';
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
import { SettingsSheet } from './SettingsSheet';
import { BannerAdSlot } from './BannerAdSlot';
import { PLAYER_X_FRAC, SURGE_WARN_DURATION } from '../constants/tuning';
import { STR } from '../constants/strings';

type OverlayPhase = 'idle' | 'playing' | 'dead';

const FIRST_RUN_KEY = 'nd.firstRunDone';

export const GameScreen: React.FC = () => {
  const { width, height: screenHeight } = useWindowDimensions();
  const adsActive = useAdsActive();
  // Reserve the bottom of the screen for the banner ad — physics use
  // this reduced height so pipes / player never overlap the ad row.
  // Shrinks to zero when the user owns Remove Ads.
  const height = adsActive ? screenHeight - BANNER_HEIGHT_PT : screenHeight;
  const [dailyMode, setDailyMode] = useState(false);
  const [seed, setSeed] = useState<number>(() => randomSeed());
  const [overlayPhase, setOverlayPhase] = useState<OverlayPhase>('idle');
  const [runNewBest, setRunNewBest] = useState(false);
  const [runFinalScore, setRunFinalScore] = useState(0);
  const [surgeVisible, setSurgeVisible] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [firstRun, setFirstRun] = useState(false);
  const surgeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const runBestRef = useRef(0);
  const nearMissRef = useRef<NearMissRef | null>(null);
  const newBestRef = useRef<NewBestBannerRef | null>(null);
  const particlesRef = useRef<ParticleSystemHandle | null>(null);
  const passedBestThisRunRef = useRef(false);

  const { stats, recordRun } = usePersistence(dailyMode);
  const { settings, update: updateSettings, reduceMotionSv } = useSettings();

  // Refs so worklet callbacks always see the current settings without
  // depending on stale closures.
  const soundOnRef = useRef(settings.sound);
  const hapticsOnRef = useRef(settings.haptics);
  const reduceMotionRef = useRef(settings.reduceMotion);
  useEffect(() => {
    soundOnRef.current = settings.sound;
    hapticsOnRef.current = settings.haptics;
    reduceMotionRef.current = settings.reduceMotion;
  }, [settings.sound, settings.haptics, settings.reduceMotion]);

  // Preload SFX + music + ads + IAP once (best-effort — silent if it fails).
  useEffect(() => {
    ensureLoaded();
    loadMusic();
    initAds();
    initIap();
  }, []);

  // Bind personalized-ads setting to the ad SDK.
  useEffect(() => {
    setPersonalizedAds(settings.personalizedAds);
  }, [settings.personalizedAds]);

  // Music toggle: enable/disable the player when the setting changes.
  useEffect(() => {
    setMusicEnabled(settings.music);
  }, [settings.music]);

  // Track selection follows overlay phase.
  useEffect(() => {
    const track = overlayPhase === 'playing' ? 'gameplay' : 'menu';
    playMusicTrack(track);
  }, [overlayPhase]);

  // First-run flag: show the "how to play" hint on first cold start only.
  useEffect(() => {
    (async () => {
      try {
        const done = await AsyncStorage.getItem(FIRST_RUN_KEY);
        if (!done) setFirstRun(true);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  // Helpers that check user settings before firing side effects.
  const doHaptic = useCallback((fn: () => Promise<unknown>) => {
    if (!hapticsOnRef.current) return;
    fn().catch(() => {});
  }, []);
  const doPlay = useCallback((key: Parameters<typeof play>[0]) => {
    if (!soundOnRef.current) return;
    play(key);
  }, []);
  const doTick = useCallback((score: number) => {
    if (!soundOnRef.current) return;
    playTick(score);
  }, []);

  const onScore = useCallback(
    (score: number, isNearMiss: boolean) => {
      doTick(score);
      doHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
      if (isNearMiss) {
        doPlay('nearMiss');
        doHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
        nearMissRef.current?.show();
        if (!reduceMotionRef.current) {
          particlesRef.current?.spark(width * PLAYER_X_FRAC, height / 2, '#ffd94a');
        }
      } else {
        doPlay('score');
      }
      if (
        !passedBestThisRunRef.current &&
        runBestRef.current > 0 &&
        score > runBestRef.current
      ) {
        passedBestThisRunRef.current = true;
        doHaptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
        doHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy));
        doPlay('milestone');
        newBestRef.current?.show();
        if (!reduceMotionRef.current) {
          particlesRef.current?.confetti(width / 2, height * 0.35);
        }
        setRunNewBest(true);
      }
    },
    [width, height, doHaptic, doPlay, doTick],
  );

  const onDeath = useCallback(
    (finalScore: number) => {
      doHaptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
      setTimeout(() => {
        doHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy));
      }, 80);
      doPlay('death');
      setRunFinalScore(finalScore);
      recordRun(finalScore).then(({ newBest }) => {
        if (newBest) setRunNewBest(true);
      });
      // Dismiss the first-run hint permanently once the user's completed a run.
      if (firstRun) {
        setFirstRun(false);
        AsyncStorage.setItem(FIRST_RUN_KEY, '1').catch(() => {});
      }
      setTimeout(() => setOverlayPhase('dead'), reduceMotionRef.current ? 0 : 80);
    },
    [recordRun, doHaptic, doPlay, firstRun],
  );

  const onSurgeWarn = useCallback(() => {
    doHaptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
    doPlay('surge');
    setSurgeVisible(true);
    if (surgeTimerRef.current) clearTimeout(surgeTimerRef.current);
    surgeTimerRef.current = setTimeout(
      () => setSurgeVisible(false),
      Math.round(SURGE_WARN_DURATION * 1000),
    );
  }, [doHaptic, doPlay]);

  const onFlap = useCallback(() => {
    doHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
    doPlay('flap');
  }, [doHaptic, doPlay]);

  const onTierUp = useCallback(
    (_tier: number) => {
      doHaptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
      doPlay('milestone');
      if (!reduceMotionRef.current) {
        particlesRef.current?.spark(width * PLAYER_X_FRAC, height / 2, '#c17dff');
      }
    },
    [width, height, doHaptic, doPlay],
  );

  const gameLoop = useGameLoop({
    width,
    height,
    seed,
    reduceMotionSv,
    callbacks: useMemo(
      () => ({ onScore, onDeath, onSurgeWarn, onFlap, onTierUp }),
      [onScore, onDeath, onSurgeWarn, onFlap, onTierUp],
    ),
  });

  useAnimatedReaction(
    () => gameLoop.phase.value,
    (v, prev) => {
      if (prev === v) return;
      if (v === 0) runOnJS(setOverlayPhase)('idle');
      else if (v === 1) runOnJS(setOverlayPhase)('playing');
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

  const handleRestart = useCallback(async () => {
    // Interstitial ad — frequency-capped inside the ads module. Fires
    // between runs (retry-tap), never mid-run. Never rejects.
    await maybeShowInterstitial(Date.now());
    passedBestThisRunRef.current = false;
    setRunNewBest(false);
    setSurgeVisible(false);
    if (surgeTimerRef.current) clearTimeout(surgeTimerRef.current);
    runBestRef.current = dailyMode ? stats.dailyBest : stats.allTimeBest;
    setSeed(dailyMode ? todaySeed() : randomSeed());
    gameLoop.reset();
    setOverlayPhase('idle');
  }, [dailyMode, stats, gameLoop]);

  useEffect(() => {
    if (overlayPhase === 'playing') {
      runBestRef.current = dailyMode ? stats.dailyBest : stats.allTimeBest;
      passedBestThisRunRef.current = false;
      setRunNewBest(false);
      // Warm the next interstitial so it's ready by run end.
      preloadInterstitial();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overlayPhase]);

  // Backgrounding: pause a mid-run into 'dead' state so we don't have
  // the player fall while the game is offscreen. Also cancels any pending
  // surge timer so it doesn't fire while backgrounded, and pauses music
  // so it doesn't keep playing in the background.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s !== 'active' && overlayPhase === 'playing' && gameLoop.phase.value === 1) {
        // Treat backgrounding as a death — the alternative is silently
        // resuming after an arbitrary gap which feels broken.
        // gameLoop.phase = 2 (dying) → 3 (dead) via the frame callback.
        gameLoop.phase.value = 2;
      }
      if (s === 'active') {
        resumeMusic();
      } else {
        pauseMusic();
      }
    });
    return () => sub.remove();
  }, [overlayPhase, gameLoop]);

  const displayBest = dailyMode ? stats.dailyBest : stats.allTimeBest;

  return (
    <View style={styles.root}>
      <GestureDetector gesture={tapGesture}>
        <Animated.View
          style={[styles.root, shakeStyle]}
          accessibilityRole={overlayPhase === 'playing' ? 'button' : undefined}
          accessibilityLabel={overlayPhase === 'playing' ? STR.game.tapToFlapA11y : undefined}
        >
          <Starfield width={width} height={height} />
          <Pipes pipes={gameLoop.pipes} width={width} height={height} />
          <Player
            x={gameLoop.playerX}
            y={gameLoop.py}
            rot={gameLoop.rot}
            phase={gameLoop.phase}
            streakTier={gameLoop.streakTier}
            reduceMotion={settings.reduceMotion}
          />
          <ParticleSystem handleRef={particlesRef} />
          <StreakEdgeGlow streakTier={gameLoop.streakTier} />
          <IncomingWarn score={gameLoop.score} />
          <SurgeWarnLayer visible={surgeVisible} />
          <NearMissPopup ref={nearMissRef} />
          <NewBestBanner ref={newBestRef} />
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
      {overlayPhase === 'idle' ? (
        <StartScreen
          best={displayBest}
          dailyMode={dailyMode}
          dailyBest={stats.dailyBest}
          reduceMotion={settings.reduceMotion}
          showFirstRunHint={firstRun}
          onToggleDaily={() => {
            const next = !dailyMode;
            setDailyMode(next);
            setSeed(next ? todaySeed() : randomSeed());
          }}
          onOpenSettings={() => setSettingsOpen(true)}
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
          reduceMotion={settings.reduceMotion}
          onRestart={handleRestart}
        />
      ) : null}
      <SettingsSheet
        open={settingsOpen}
        settings={settings}
        onChange={updateSettings}
        onClose={() => setSettingsOpen(false)}
      />
      <BannerAdSlot />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#05060f' },
});
