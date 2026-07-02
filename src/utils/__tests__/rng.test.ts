import { mulberry32, todaySeed, randomSeed } from '../rng';

describe('mulberry32', () => {
  it('produces the same sequence for the same seed', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 100; i++) {
      expect(a()).toBe(b());
    }
  });
  it('produces different sequences for different seeds', () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    let anyDiff = false;
    for (let i = 0; i < 20; i++) if (a() !== b()) anyDiff = true;
    expect(anyDiff).toBe(true);
  });
  it('outputs are in [0, 1)', () => {
    const r = mulberry32(123);
    for (let i = 0; i < 1000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
  it('distributes reasonably (mean near 0.5 over 5k samples)', () => {
    const r = mulberry32(7);
    let sum = 0;
    const n = 5000;
    for (let i = 0; i < n; i++) sum += r();
    const mean = sum / n;
    expect(mean).toBeGreaterThan(0.45);
    expect(mean).toBeLessThan(0.55);
  });
});

describe('todaySeed', () => {
  it('packs YYYYMMDD into an int', () => {
    const s = todaySeed();
    expect(Number.isInteger(s)).toBe(true);
    expect(s).toBeGreaterThan(19_700_101);
    expect(s).toBeLessThan(99_991_231);
  });
  it('returns the same value across rapid successive calls in-day', () => {
    // Note: could fail on the exact millisecond of a UTC day rollover, but
    // that's a 1-in-86.4M edge case in a unit test.
    expect(todaySeed()).toBe(todaySeed());
  });
});

describe('randomSeed', () => {
  it('returns a non-negative 32-bit integer', () => {
    for (let i = 0; i < 100; i++) {
      const s = randomSeed();
      expect(Number.isInteger(s)).toBe(true);
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(0xffffffff);
    }
  });
});
