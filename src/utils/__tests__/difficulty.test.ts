import {
  scrollSpeed,
  gapSize,
  gapVariance,
  pipeSpacing,
} from '../difficulty';
import {
  SCROLL_BASE,
  SCROLL_MAX_MULT,
  GAP_SIZE_BASE,
  GAP_SIZE_MIN,
  GAP_VAR_BASE,
  GAP_VAR_MAX,
  PIPE_SPACING_BASE,
  PIPE_SPACING_MIN,
} from '../../constants/tuning';

describe('difficulty curves', () => {
  describe('scrollSpeed', () => {
    it('starts at base', () => {
      expect(scrollSpeed(0)).toBeCloseTo(SCROLL_BASE, 4);
    });
    it('increases monotonically with score', () => {
      let prev = -Infinity;
      for (const s of [0, 1, 5, 10, 25, 100, 500]) {
        const v = scrollSpeed(s);
        expect(v).toBeGreaterThan(prev);
        prev = v;
      }
    });
    it('never reaches the ceiling (asymptotic)', () => {
      const ceiling = SCROLL_BASE * SCROLL_MAX_MULT;
      for (const s of [100, 1_000, 10_000, 100_000]) {
        const v = scrollSpeed(s);
        expect(v).toBeLessThan(ceiling);
      }
      // But approaches it: at 100k score we should be within 5% of ceiling.
      expect(scrollSpeed(100_000)).toBeGreaterThan(ceiling * 0.95);
    });
  });

  describe('gapSize', () => {
    it('starts at base', () => {
      expect(gapSize(0)).toBeCloseTo(GAP_SIZE_BASE, 4);
    });
    it('decreases monotonically with score', () => {
      let prev = Infinity;
      for (const s of [0, 1, 5, 25, 100, 1000]) {
        const v = gapSize(s);
        expect(v).toBeLessThan(prev);
        prev = v;
      }
    });
    it('never dips below GAP_SIZE_MIN', () => {
      for (const s of [0, 100, 1_000, 100_000]) {
        expect(gapSize(s)).toBeGreaterThanOrEqual(GAP_SIZE_MIN);
      }
    });
    it('asymptotically approaches GAP_SIZE_MIN', () => {
      expect(gapSize(100_000)).toBeLessThan(GAP_SIZE_MIN + 0.5);
    });
  });

  describe('gapVariance', () => {
    it('starts at base', () => {
      expect(gapVariance(0)).toBeCloseTo(GAP_VAR_BASE, 4);
    });
    it('increases monotonically with score', () => {
      let prev = -Infinity;
      for (const s of [0, 5, 25, 100, 1000]) {
        const v = gapVariance(s);
        expect(v).toBeGreaterThan(prev);
        prev = v;
      }
    });
    it('never exceeds GAP_VAR_MAX', () => {
      for (const s of [0, 100, 1_000, 100_000]) {
        expect(gapVariance(s)).toBeLessThanOrEqual(GAP_VAR_MAX);
      }
    });
  });

  describe('pipeSpacing', () => {
    it('starts at base', () => {
      expect(pipeSpacing(0)).toBeCloseTo(PIPE_SPACING_BASE, 4);
    });
    it('tightens toward PIPE_SPACING_MIN but does not go below', () => {
      for (const s of [0, 100, 1_000, 100_000]) {
        expect(pipeSpacing(s)).toBeGreaterThanOrEqual(PIPE_SPACING_MIN);
      }
    });
  });

  describe('all curves are finite for arbitrary scores', () => {
    it.each([0, -1, NaN, Infinity, -Infinity, 1e12, 1e-9])(
      'produces finite (or gracefully-bounded) values for score=%p',
      (s) => {
        // NaN / -Infinity are not valid inputs from the game, but curves
        // should not throw. We only require finite output for finite input.
        if (Number.isFinite(s)) {
          expect(Number.isFinite(scrollSpeed(s))).toBe(true);
          expect(Number.isFinite(gapSize(s))).toBe(true);
          expect(Number.isFinite(gapVariance(s))).toBe(true);
          expect(Number.isFinite(pipeSpacing(s))).toBe(true);
        }
      },
    );
  });
});
