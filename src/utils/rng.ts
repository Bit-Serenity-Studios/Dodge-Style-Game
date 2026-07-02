/**
 * Deterministic RNG (Mulberry32). Used for pipe generation so that
 * "Daily Run" mode gives everyone the same pipe sequence for a given date.
 */
export type RNG = () => number;

export function mulberry32(seed: number): RNG {
  'worklet';
  let a = seed >>> 0;
  return function () {
    'worklet';
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic seed for today's daily run: YYYYMMDD packed as int. */
export function todaySeed(): number {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

/** Random seed (non-daily mode). */
export function randomSeed(): number {
  return Math.floor(Math.random() * 0xffffffff);
}
