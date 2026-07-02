/**
 * Tiny pure-JS WAV encoder + base64 emitter. Used to synthesize placeholder
 * SFX at runtime so we have no bundled audio dependencies. Files are
 * written to expo-file-system's cache directory once at boot and swapped
 * transparently — replacing them with real assets is a one-line change
 * in audio/index.ts (see AUDIO_SOURCES).
 */

const SAMPLE_RATE = 22050;

export type Envelope = { attack: number; decay: number; sustain: number; release: number };

const DEFAULT_ENV: Envelope = { attack: 0.005, decay: 0.05, sustain: 0.6, release: 0.15 };

function env(t: number, dur: number, e: Envelope): number {
  const { attack, decay, sustain, release } = e;
  if (t < attack) return t / attack;
  if (t < attack + decay) return 1 - (1 - sustain) * ((t - attack) / decay);
  if (t < dur - release) return sustain;
  const rt = (dur - t) / release;
  return Math.max(0, rt) * sustain;
}

export type Voice =
  | { type: 'sine'; freq: number; freqEnd?: number }
  | { type: 'square'; freq: number; freqEnd?: number }
  | { type: 'triangle'; freq: number; freqEnd?: number }
  | { type: 'noise' };

function sample(v: Voice, t: number, dur: number): number {
  const p = t / dur;
  switch (v.type) {
    case 'sine': {
      const f = v.freq + ((v.freqEnd ?? v.freq) - v.freq) * p;
      return Math.sin(2 * Math.PI * f * t);
    }
    case 'square': {
      const f = v.freq + ((v.freqEnd ?? v.freq) - v.freq) * p;
      return Math.sin(2 * Math.PI * f * t) >= 0 ? 1 : -1;
    }
    case 'triangle': {
      const f = v.freq + ((v.freqEnd ?? v.freq) - v.freq) * p;
      const x = (t * f) % 1;
      return 4 * Math.abs(x - 0.5) - 1;
    }
    case 'noise':
      return Math.random() * 2 - 1;
  }
}

export function synth(voices: Voice[], dur: number, envelope: Envelope = DEFAULT_ENV, gain = 0.55): Float32Array {
  const n = Math.max(1, Math.floor(SAMPLE_RATE * dur));
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    let s = 0;
    for (const v of voices) s += sample(v, t, dur);
    s /= voices.length;
    out[i] = s * env(t, dur, envelope) * gain;
  }
  return out;
}

export function encodeWav(samples: Float32Array): Uint8Array {
  const numChannels = 1;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = SAMPLE_RATE * blockAlign;
  const dataSize = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  let o = 0;
  const wStr = (s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(o++, s.charCodeAt(i));
  };
  const wU32 = (v: number) => {
    view.setUint32(o, v, true);
    o += 4;
  };
  const wU16 = (v: number) => {
    view.setUint16(o, v, true);
    o += 2;
  };
  wStr('RIFF');
  wU32(36 + dataSize);
  wStr('WAVE');
  wStr('fmt ');
  wU32(16);
  wU16(1);
  wU16(numChannels);
  wU32(SAMPLE_RATE);
  wU32(byteRate);
  wU16(blockAlign);
  wU16(16);
  wStr('data');
  wU32(dataSize);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    o += 2;
  }
  return new Uint8Array(buffer);
}

/** btoa is not available in RN by default. Small inline base64 encoder. */
export function bytesToBase64(bytes: Uint8Array): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let out = '';
  let i = 0;
  const len = bytes.length;
  while (i < len) {
    const b1 = bytes[i++] | 0;
    const b2 = i < len ? bytes[i++] | 0 : 0;
    const b3 = i < len ? bytes[i++] | 0 : 0;
    const triplet = (b1 << 16) | (b2 << 8) | b3;
    out += chars[(triplet >> 18) & 0x3f];
    out += chars[(triplet >> 12) & 0x3f];
    out += i - 1 > len ? '=' : chars[(triplet >> 6) & 0x3f];
    out += i > len ? '=' : chars[triplet & 0x3f];
  }
  const pad = (3 - (len % 3)) % 3;
  return pad === 0 ? out : out.slice(0, -pad) + '='.repeat(pad);
}
