/**
 * The game loop.
 *
 * Design:
 *   - Physics + collision run entirely on the UI thread via useFrameCallback.
 *   - All per-frame values are shared values (SharedValue<number>).
 *   - JS state is *only* updated on discrete events (score, near-miss,
 *     surge, death) via useAnimatedReaction — never per frame.
 *   - A fixed-timestep accumulator keeps physics identical across
 *     refresh rates (60 / 90 / 120 Hz).
 *   - `wallTime` advances every frame (used for shake decay + hitstop
 *     timing). `gameTime` only advances while playing (used for surge
 *     timing so pauses/hitstop don't cheat the player).
 */
import { useCallback, useEffect, useMemo } from 'react';
import {
  cancelAnimation,
  runOnJS,
  useAnimatedReaction,
  useFrameCallback,
  useSharedValue,
} from 'react-native-reanimated';
import {
  FIXED_DT,
  GRAVITY,
  MAX_FALL_V,
  TAP_IMPULSE,
  PLAYER_RADIUS,
  PLAYER_HITBOX_SCALE,
  PLAYER_X_FRAC,
  PIPE_WIDTH,
  PIPE_COUNT,
  GAP_MARGIN_TOP,
  GAP_MARGIN_BOTTOM,
  NEAR_MISS_PX,
  NEAR_MISS_BONUS,
  SURGE_EVERY,
  SURGE_DURATION,
  SURGE_WARN_DURATION,
  SURGE_MULT,
  TILT_UP_DEG,
  TILT_DOWN_MAX_DEG,
  TILT_VELOCITY_SCALE,
  SHAKE_NEAR_MISS,
  SHAKE_DEATH,
  HITSTOP_MS,
} from '../constants/tuning';
import { scrollSpeed, gapSize, gapVariance, pipeSpacing } from '../utils/difficulty';
import { mulberry32 } from '../utils/rng';

export type Phase = 'idle' | 'playing' | 'dying' | 'dead';

export type GameCallbacks = {
  onScore: (score: number, isNearMiss: boolean) => void;
  onDeath: (finalScore: number) => void;
  onSurgeWarn: () => void;
  onFlap: () => void;
  onTierUp: (tier: number) => void;
};

export type PipeSV = {
  x: ReturnType<typeof useSharedValue<number>>;
  gapY: ReturnType<typeof useSharedValue<number>>;
  gap: ReturnType<typeof useSharedValue<number>>;
  passed: ReturnType<typeof useSharedValue<number>>;
  active: ReturnType<typeof useSharedValue<number>>;
};

export type UseGameLoopArgs = {
  width: number;
  height: number;
  seed: number;
  callbacks: GameCallbacks;
  /** 1 = reduce-motion active. Suppresses camera shake and freeze-frame. */
  reduceMotionSv?: import('react-native-reanimated').SharedValue<number>;
};

/**
 * Build a fixed-size pool of pipe shared values. PIPE_COUNT is a
 * compile-time constant, so hook count is stable across renders.
 */
function usePipePool(): PipeSV[] {
  const pipes: PipeSV[] = [];
  for (let i = 0; i < PIPE_COUNT; i++) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const x = useSharedValue(-9999);
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const gapY = useSharedValue(0);
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const gap = useSharedValue(0);
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const passed = useSharedValue(0);
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const active = useSharedValue(0);
    pipes.push({ x, gapY, gap, passed, active });
  }
  return pipes;
}

export function useGameLoop({ width, height, seed, callbacks, reduceMotionSv }: UseGameLoopArgs) {
  // ---- Shared values (UI thread only) ----
  const phase = useSharedValue<number>(0); // 0=idle 1=playing 2=dying 3=dead
  const py = useSharedValue<number>(height / 2);
  const vy = useSharedValue<number>(0);
  const rot = useSharedValue<number>(0);
  const score = useSharedValue<number>(0);
  const streak = useSharedValue<number>(0);
  const streakTier = useSharedValue<number>(0);
  const surgeUntil = useSharedValue<number>(0);
  const surgeWarnUntil = useSharedValue<number>(0);
  const surgeTriggeredAt = useSharedValue<number>(-1);
  const gameTime = useSharedValue<number>(0);
  const wallTime = useSharedValue<number>(0);
  const hitstopUntil = useSharedValue<number>(0);
  const shakeMag = useSharedValue<number>(0);
  const shakeX = useSharedValue<number>(0);
  const shakeY = useSharedValue<number>(0);
  const accum = useSharedValue<number>(0);

  // Discrete event channels (increment -> JS callback).
  const scoreEv = useSharedValue<number>(0);
  const nearMissEv = useSharedValue<number>(0);
  const deathEv = useSharedValue<number>(0);
  const surgeWarnEv = useSharedValue<number>(0);
  const flapEv = useSharedValue<number>(0);
  const seedSv = useSharedValue<number>(seed);

  const pipes = usePipePool();

  const playerX = width * PLAYER_X_FRAC;
  const hitboxR = PLAYER_RADIUS * PLAYER_HITBOX_SCALE;

  // ---- Reset ----
  const resetWorklet = useCallback(() => {
    'worklet';
    phase.value = 0;
    py.value = height / 2;
    vy.value = 0;
    rot.value = 0;
    score.value = 0;
    streak.value = 0;
    streakTier.value = 0;
    surgeUntil.value = 0;
    surgeWarnUntil.value = 0;
    surgeTriggeredAt.value = -1;
    gameTime.value = 0;
    hitstopUntil.value = 0;
    shakeMag.value = 0;
    shakeX.value = 0;
    shakeY.value = 0;
    accum.value = 0;
    const rng = mulberry32(seedSv.value);
    let cursorX = width + 120;
    const g0 = gapSize(0);
    for (let i = 0; i < pipes.length; i++) {
      const p = pipes[i];
      const midMin = GAP_MARGIN_TOP + g0 / 2;
      const midMax = height - GAP_MARGIN_BOTTOM - g0 / 2;
      p.gap.value = g0;
      p.gapY.value = midMin + rng() * (midMax - midMin);
      p.x.value = cursorX;
      p.passed.value = 0;
      p.active.value = 1;
      cursorX += pipeSpacing(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [height, width]);

  useEffect(() => {
    seedSv.value = seed;
    if (phase.value === 0) resetWorklet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed]);

  useEffect(() => {
    resetWorklet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height]);

  // ---- Input ----
  const tap = useCallback(() => {
    'worklet';
    if (phase.value === 2 || phase.value === 3) return; // death handled by React overlay
    if (phase.value === 0) phase.value = 1;
    vy.value = TAP_IMPULSE;
    rot.value = TILT_UP_DEG;
    flapEv.value = flapEv.value + 1;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Death (UI thread) ----
  const die = useCallback(() => {
    'worklet';
    if (phase.value !== 1) return;
    phase.value = 2;
    const rm = reduceMotionSv ? reduceMotionSv.value : 0;
    shakeMag.value = rm ? 0 : SHAKE_DEATH;
    hitstopUntil.value = wallTime.value * 1000 + (rm ? 0 : HITSTOP_MS);
    deathEv.value = deathEv.value + 1;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Physics step (UI thread, fixed dt) ----
  const step = useCallback(
    (dt: number) => {
      'worklet';
      if (phase.value !== 1) return;
      gameTime.value += dt;

      const s = score.value;
      const baseSpeed = scrollSpeed(s);
      const gtMs = gameTime.value * 1000;
      const surging = gtMs < surgeUntil.value && gtMs >= surgeWarnUntil.value;
      const speed = surging ? baseSpeed * SURGE_MULT : baseSpeed;

      vy.value = Math.min(MAX_FALL_V, vy.value + GRAVITY * dt);
      py.value += vy.value * dt;

      const targetRot =
        vy.value < 0
          ? TILT_UP_DEG
          : Math.min(TILT_DOWN_MAX_DEG, (vy.value / TILT_VELOCITY_SCALE) * TILT_DOWN_MAX_DEG);
      rot.value += (targetRot - rot.value) * Math.min(1, dt * 8);

      if (py.value - PLAYER_RADIUS < 0) {
        py.value = PLAYER_RADIUS;
        die();
        return;
      }
      if (py.value + PLAYER_RADIUS > height) {
        py.value = height - PLAYER_RADIUS;
        die();
        return;
      }

      let maxX = -Infinity;
      for (let i = 0; i < pipes.length; i++) if (pipes[i].x.value > maxX) maxX = pipes[i].x.value;

      for (let i = 0; i < pipes.length; i++) {
        const p = pipes[i];
        if (!p.active.value) continue;
        p.x.value -= speed * dt;

        const trailing = p.x.value + PIPE_WIDTH;
        if (!p.passed.value && trailing < playerX - PLAYER_RADIUS) {
          p.passed.value = 1;
          const gY = p.gapY.value;
          const g = p.gap.value;
          const topEdge = gY - g / 2;
          const botEdge = gY + g / 2;
          const distTop = py.value - PLAYER_RADIUS - topEdge;
          const distBot = botEdge - (py.value + PLAYER_RADIUS);
          const closestEdge = Math.min(distTop, distBot);
          const nm = closestEdge <= NEAR_MISS_PX;
          if (nm) {
            score.value += 1 + NEAR_MISS_BONUS;
            nearMissEv.value = nearMissEv.value + 1;
            const rm = reduceMotionSv ? reduceMotionSv.value : 0;
            if (!rm) shakeMag.value = Math.max(shakeMag.value, SHAKE_NEAR_MISS);
          } else {
            score.value += 1;
            // Only emit the plain score event on clean passes — near-miss
            // has its own event so JS side never double-fires audio/haptic.
            scoreEv.value = scoreEv.value + 1;
          }
          streak.value += 1;

          if (streak.value >= 20) streakTier.value = 3;
          else if (streak.value >= 10) streakTier.value = 2;
          else if (streak.value >= 5) streakTier.value = 1;
          else streakTier.value = 0;

          if (
            score.value > 0 &&
            Math.floor(score.value / SURGE_EVERY) > Math.floor(surgeTriggeredAt.value / SURGE_EVERY) &&
            score.value >= SURGE_EVERY
          ) {
            surgeTriggeredAt.value = score.value;
            surgeWarnUntil.value = gtMs + SURGE_WARN_DURATION * 1000;
            surgeUntil.value = gtMs + (SURGE_WARN_DURATION + SURGE_DURATION) * 1000;
            surgeWarnEv.value = surgeWarnEv.value + 1;
          }
        }

        if (p.x.value + PIPE_WIDTH < 0) {
          const g = gapSize(score.value);
          const midMin = GAP_MARGIN_TOP + g / 2;
          const midMax = height - GAP_MARGIN_BOTTOM - g / 2;
          const range = midMax - midMin;
          const variance = Math.min(range / 2, gapVariance(score.value));
          const prevGapY = p.gapY.value;
          const rng = mulberry32((seedSv.value ^ (score.value * 2654435761)) >>> 0);
          const delta = (rng() * 2 - 1) * variance;
          let newGapY = prevGapY + delta;
          if (newGapY < midMin) newGapY = midMin + (midMin - newGapY);
          if (newGapY > midMax) newGapY = midMax - (newGapY - midMax);
          newGapY = Math.min(midMax, Math.max(midMin, newGapY));
          p.gap.value = g;
          p.gapY.value = newGapY;
          p.x.value = maxX + pipeSpacing(score.value);
          p.passed.value = 0;
          maxX = p.x.value;
        }

        const px1 = p.x.value;
        const px2 = p.x.value + PIPE_WIDTH;
        const playerLeft = playerX - hitboxR;
        const playerRight = playerX + hitboxR;
        if (px2 > playerLeft && px1 < playerRight) {
          const gY = p.gapY.value;
          const g = p.gap.value;
          const topEdge = gY - g / 2;
          const botEdge = gY + g / 2;
          const playerTop = py.value - hitboxR;
          const playerBot = py.value + hitboxR;
          if (playerTop < topEdge || playerBot > botEdge) {
            die();
            return;
          }
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [height, playerX, hitboxR],
  );

  // ---- Frame callback ----
  useFrameCallback((info) => {
    'worklet';
    if (info.timeSincePreviousFrame == null) return;
    let dt = info.timeSincePreviousFrame / 1000;
    if (!isFinite(dt) || dt <= 0) return;
    if (dt > 0.25) dt = 0.25;

    wallTime.value += dt;

    // Shake decays in real time (survives hitstop, so death jolt reads).
    if (shakeMag.value > 0) {
      shakeMag.value = Math.max(0, shakeMag.value - 60 * dt);
    }
    if (shakeMag.value > 0.1) {
      shakeX.value = (Math.random() * 2 - 1) * shakeMag.value;
      shakeY.value = (Math.random() * 2 - 1) * shakeMag.value;
    } else if (shakeX.value !== 0 || shakeY.value !== 0) {
      shakeX.value = 0;
      shakeY.value = 0;
    }

    // Hitstop: dying phase freezes physics until wall-time elapses,
    // then transitions to dead (JS overlay picks it up).
    if (phase.value === 2) {
      if (wallTime.value * 1000 >= hitstopUntil.value) phase.value = 3;
      return;
    }
    if (phase.value !== 1) return;

    accum.value += dt;
    let iters = 0;
    while (accum.value >= FIXED_DT && iters < 8) {
      step(FIXED_DT);
      accum.value -= FIXED_DT;
      iters++;
      if (phase.value !== 1) break;
    }
  }, true);

  // ---- Discrete-event bridges to JS ----
  useAnimatedReaction(
    () => scoreEv.value,
    (v, prev) => {
      if (prev == null || v === prev) return;
      runOnJS(callbacks.onScore)(score.value, false);
    },
  );
  useAnimatedReaction(
    () => nearMissEv.value,
    (v, prev) => {
      if (prev == null || v === prev) return;
      runOnJS(callbacks.onScore)(score.value, true);
    },
  );
  useAnimatedReaction(
    () => deathEv.value,
    (v, prev) => {
      if (prev == null || v === prev) return;
      runOnJS(callbacks.onDeath)(score.value);
    },
  );
  useAnimatedReaction(
    () => surgeWarnEv.value,
    (v, prev) => {
      if (prev == null || v === prev) return;
      runOnJS(callbacks.onSurgeWarn)();
    },
  );
  useAnimatedReaction(
    () => flapEv.value,
    (v, prev) => {
      if (prev == null || v === prev) return;
      runOnJS(callbacks.onFlap)();
    },
  );
  useAnimatedReaction(
    () => streakTier.value,
    (v, prev) => {
      if (prev == null || v === prev) return;
      if (v > prev) runOnJS(callbacks.onTierUp)(v);
    },
  );

  const reset = useCallback(() => {
    cancelAnimation(rot);
    resetWorklet();
  }, [resetWorklet, rot]);

  return useMemo(
    () => ({
      tap,
      reset,
      phase,
      py,
      rot,
      score,
      streak,
      streakTier,
      surgeUntil,
      surgeWarnUntil,
      gameTime,
      shakeX,
      shakeY,
      pipes,
      playerX,
      width,
      height,
    }),
    // Shared values are stable identities; safe to depend on the callback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tap, reset, width, height],
  );
}
