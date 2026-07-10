/**
 * Audio layer. Bundled OGG files (Kenney CC0 pack) loaded into small
 * round-robin voice pools so overlapping plays don't cut each other off.
 *
 * The pitched score tick uses a single click file with playback rate
 * shifted per pitch step (shouldCorrectPitch: false) — one asset,
 * SCORE_TICK_RESET / SCORE_TICK_CYCLE distinct pitches at runtime.
 */
import { Audio, AVPlaybackSource } from 'expo-av';
import {
  SCORE_TICK_BASE_FREQ,
  SCORE_TICK_STEP,
  SCORE_TICK_CYCLE,
  SCORE_TICK_RESET,
} from '../constants/tuning';

export type SfxKey =
  | 'flap'
  | 'score'
  | 'nearMiss'
  | 'death'
  | 'milestone'
  | 'surge'
  | 'tick';

const POOL_SIZE = 4;
const TICK_POOL_SIZE = 3;

const SOURCES: Record<SfxKey, AVPlaybackSource> = {
  flap: require('../../assets/sounds/flap.ogg'),
  score: require('../../assets/sounds/score.ogg'),
  nearMiss: require('../../assets/sounds/near-miss.ogg'),
  death: require('../../assets/sounds/death.ogg'),
  milestone: require('../../assets/sounds/milestone.ogg'),
  surge: require('../../assets/sounds/surge.ogg'),
  tick: require('../../assets/sounds/tick.ogg'),
};

// Per-key volume trims — Kenney SFX are not level-matched to each other.
const GAINS: Record<SfxKey, number> = {
  flap: 0.55,
  score: 0.6,
  nearMiss: 0.7,
  death: 0.75,
  milestone: 0.65,
  surge: 0.5,
  tick: 0.45,
};

type Voices = { sounds: Audio.Sound[]; idx: number };
const pools: Partial<Record<Exclude<SfxKey, 'tick'>, Voices>> = {};
// Tick uses a per-pitch pool — each entry has its rate pre-applied so
// playback is a single setPositionAsync + playAsync call.
const tickPools: Map<number, Voices> = new Map();

let ready = false;
let loading: Promise<void> | null = null;

async function loadPool(source: AVPlaybackSource, size: number, volume: number): Promise<Voices> {
  const sounds: Audio.Sound[] = [];
  for (let i = 0; i < size; i++) {
    const { sound } = await Audio.Sound.createAsync(source, { volume });
    sounds.push(sound);
  }
  return { sounds, idx: 0 };
}

/** Called once from the app root. Idempotent. */
export async function ensureLoaded(): Promise<void> {
  if (ready) return;
  if (loading) return loading;
  loading = (async () => {
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });
      const nonTick: Array<Exclude<SfxKey, 'tick'>> = [
        'flap',
        'score',
        'nearMiss',
        'death',
        'milestone',
        'surge',
      ];
      await Promise.all(
        nonTick.map(async (k) => {
          pools[k] = await loadPool(SOURCES[k], POOL_SIZE, GAINS[k]);
        }),
      );
      ready = true;
    } catch (err) {
      // Audio is a "nice to have"; never crash the game if it fails.
      console.warn('[audio] load failed', err);
      ready = true;
    }
  })();
  return loading;
}

function nextVoice(v: Voices): Audio.Sound {
  const s = v.sounds[v.idx];
  v.idx = (v.idx + 1) % v.sounds.length;
  return s;
}

export function play(key: Exclude<SfxKey, 'tick'>): void {
  if (!ready) return;
  const pool = pools[key];
  if (!pool) return;
  const s = nextVoice(pool);
  s.setPositionAsync(0).catch(() => {});
  s.playAsync().catch(() => {});
}

function tickRateForStep(step: number): number {
  // freq at step k = base + step * step_hz; rate = freq / base.
  return (SCORE_TICK_BASE_FREQ + step * SCORE_TICK_STEP) / SCORE_TICK_BASE_FREQ;
}

/**
 * Pitched tick — rises in pitch every SCORE_TICK_CYCLE points and
 * resets every SCORE_TICK_RESET. Per-pitch pools are pre-warmed lazily
 * so subsequent plays are just position + play.
 */
export async function playTick(score: number): Promise<void> {
  if (!ready) return;
  const step = Math.floor((score % SCORE_TICK_RESET) / SCORE_TICK_CYCLE);
  let pool = tickPools.get(step);
  if (!pool) {
    try {
      pool = await loadPool(SOURCES.tick, TICK_POOL_SIZE, GAINS.tick);
      const rate = tickRateForStep(step);
      // shouldCorrectPitch: false → rate change is a resample, i.e. pitch shift.
      await Promise.all(
        pool.sounds.map((s) => s.setRateAsync(rate, false).catch(() => {})),
      );
      tickPools.set(step, pool);
    } catch {
      return;
    }
  }
  const s = nextVoice(pool);
  s.setPositionAsync(0).catch(() => {});
  s.playAsync().catch(() => {});
}
