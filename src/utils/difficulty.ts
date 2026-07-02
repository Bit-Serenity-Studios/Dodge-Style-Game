/**
 * Difficulty curves. All are asymptotic: they smoothly approach
 * a ceiling (or floor) without ever reaching it, so the game
 * remains technically survivable at any score.
 *
 * Marked worklet so the game loop on the UI thread can call them.
 */
import {
  SCROLL_BASE,
  SCROLL_MAX_MULT,
  SCROLL_GROWTH,
  GAP_SIZE_BASE,
  GAP_SIZE_MIN,
  GAP_SHRINK_TAU,
  GAP_VAR_BASE,
  GAP_VAR_MAX,
  VAR_GROWTH_TAU,
  PIPE_SPACING_BASE,
  PIPE_SPACING_MIN,
} from '../constants/tuning';

export function scrollSpeed(score: number): number {
  'worklet';
  const k = 1 - 1 / (1 + score * SCROLL_GROWTH);
  return SCROLL_BASE * (1 + (SCROLL_MAX_MULT - 1) * k);
}

export function gapSize(score: number): number {
  'worklet';
  return GAP_SIZE_MIN + (GAP_SIZE_BASE - GAP_SIZE_MIN) * Math.exp(-score / GAP_SHRINK_TAU);
}

export function gapVariance(score: number): number {
  'worklet';
  const k = 1 - 1 / (1 + score / VAR_GROWTH_TAU);
  return GAP_VAR_BASE + (GAP_VAR_MAX - GAP_VAR_BASE) * k;
}

export function pipeSpacing(score: number): number {
  'worklet';
  // Spacing tightens with score, floored well above 0.
  const k = 1 - 1 / (1 + score / 60);
  return PIPE_SPACING_BASE + (PIPE_SPACING_MIN - PIPE_SPACING_BASE) * k;
}
