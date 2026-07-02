/**
 * Audio layer. Loads a pool of SFX at boot; each play() gets a fresh
 * "voice" from a small round-robin pool so overlapping plays don't
 * cut each other off (e.g. rapid score ticks).
 *
 * Replace with real assets:
 *   1. drop .wav/.mp3 files in assets/sounds/
 *   2. change the entries in AUDIO_SOURCES to `require(...)` those files
 *   3. delete the runtime WAV synthesis step in ensureLoaded()
 */
import { Audio, AVPlaybackSource } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { synth, encodeWav, bytesToBase64, Voice } from './wav';
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
  | 'tick'; // pitched by score

const POOL_SIZE = 4;

type Recipe = { voices: Voice[]; dur: number; gain?: number; env?: { attack: number; decay: number; sustain: number; release: number } };

function tickRecipe(freqHz: number): Recipe {
  return {
    voices: [{ type: 'sine', freq: freqHz, freqEnd: freqHz * 1.02 }],
    dur: 0.06,
    gain: 0.4,
    env: { attack: 0.002, decay: 0.02, sustain: 0.4, release: 0.03 },
  };
}

const RECIPES: Record<SfxKey, Recipe> = {
  flap: {
    voices: [{ type: 'triangle', freq: 380, freqEnd: 240 }],
    dur: 0.09,
    gain: 0.45,
    env: { attack: 0.002, decay: 0.03, sustain: 0.35, release: 0.05 },
  },
  score: {
    voices: [
      { type: 'sine', freq: 900, freqEnd: 1100 },
      { type: 'sine', freq: 1400, freqEnd: 1700 },
    ],
    dur: 0.12,
    gain: 0.4,
    env: { attack: 0.003, decay: 0.04, sustain: 0.5, release: 0.07 },
  },
  nearMiss: {
    voices: [
      { type: 'sine', freq: 1600, freqEnd: 2200 },
      { type: 'sine', freq: 2400, freqEnd: 3300 },
    ],
    dur: 0.18,
    gain: 0.5,
    env: { attack: 0.002, decay: 0.05, sustain: 0.6, release: 0.12 },
  },
  death: {
    voices: [
      { type: 'noise' },
      { type: 'square', freq: 220, freqEnd: 60 },
      { type: 'sine', freq: 90, freqEnd: 40 },
    ],
    dur: 0.45,
    gain: 0.6,
    env: { attack: 0.001, decay: 0.15, sustain: 0.55, release: 0.28 },
  },
  milestone: {
    voices: [
      { type: 'sine', freq: 660, freqEnd: 990 },
      { type: 'triangle', freq: 990, freqEnd: 1320 },
    ],
    dur: 0.35,
    gain: 0.55,
    env: { attack: 0.005, decay: 0.06, sustain: 0.7, release: 0.22 },
  },
  surge: {
    voices: [
      { type: 'triangle', freq: 200, freqEnd: 500 },
      { type: 'sine', freq: 400, freqEnd: 900 },
    ],
    dur: 0.55,
    gain: 0.45,
    env: { attack: 0.05, decay: 0.1, sustain: 0.6, release: 0.35 },
  },
  tick: tickRecipe(SCORE_TICK_BASE_FREQ), // template — real tick uses playTick()
};

type Voices = { sounds: Audio.Sound[]; idx: number };
const pools: Partial<Record<SfxKey, Voices>> = {};
const tickPools: Map<number, Voices> = new Map();

let ready = false;
let loading: Promise<void> | null = null;

async function writeAndLoadPool(key: string, recipe: Recipe, size: number): Promise<Voices> {
  const pcm = synth(recipe.voices, recipe.dur, recipe.env, recipe.gain ?? 0.5);
  const wav = encodeWav(pcm);
  const b64 = bytesToBase64(wav);
  const path = `${FileSystem.cacheDirectory}sfx-${key}.wav`;
  await FileSystem.writeAsStringAsync(path, b64, { encoding: FileSystem.EncodingType.Base64 });
  const source: AVPlaybackSource = { uri: path };
  const sounds: Audio.Sound[] = [];
  for (let i = 0; i < size; i++) {
    const { sound } = await Audio.Sound.createAsync(source, { volume: 1.0 });
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
      // Non-tick sounds.
      const nonTick: SfxKey[] = ['flap', 'score', 'nearMiss', 'death', 'milestone', 'surge'];
      await Promise.all(
        nonTick.map(async (k) => {
          pools[k] = await writeAndLoadPool(k, RECIPES[k], POOL_SIZE);
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

/**
 * Pitched tick — rises in pitch every SCORE_TICK_CYCLE points and
 * resets every SCORE_TICK_RESET. Cached lazily per pitch.
 */
export async function playTick(score: number): Promise<void> {
  if (!ready) return;
  const step = Math.floor((score % SCORE_TICK_RESET) / SCORE_TICK_CYCLE);
  const freq = Math.round(SCORE_TICK_BASE_FREQ + step * SCORE_TICK_STEP);
  let pool = tickPools.get(freq);
  if (!pool) {
    try {
      pool = await writeAndLoadPool(`tick-${freq}`, tickRecipe(freq), 3);
      tickPools.set(freq, pool);
    } catch {
      return;
    }
  }
  const s = nextVoice(pool);
  s.setPositionAsync(0).catch(() => {});
  s.playAsync().catch(() => {});
}
