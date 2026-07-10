/**
 * Background music player. Two looping tracks (Kenney CC0):
 *   - 'menu'      — idle & death screens
 *   - 'gameplay'  — active run
 *
 * Design:
 *   - Two Audio.Sound instances, both preloaded and left in position 0.
 *   - Only one plays at a time; switching tracks stops the other.
 *   - `setEnabled(false)` pauses the active track and remembers which
 *     one it was so `setEnabled(true)` resumes it.
 *   - Every method catches — audio is never allowed to crash the game.
 */
import { Audio, AVPlaybackSource } from 'expo-av';

export type MusicTrack = 'menu' | 'gameplay';

const SOURCES: Record<MusicTrack, AVPlaybackSource> = {
  menu: require('../../assets/music/menu.ogg'),
  gameplay: require('../../assets/music/gameplay.ogg'),
};

// Music sits under SFX — 0.35 leaves ceiling for SFX without drowning.
const MUSIC_VOLUME = 0.35;

const sounds: Partial<Record<MusicTrack, Audio.Sound>> = {};
let ready = false;
let loading: Promise<void> | null = null;
let current: MusicTrack | null = null;
let enabled = true;

export async function loadMusic(): Promise<void> {
  if (ready) return;
  if (loading) return loading;
  loading = (async () => {
    try {
      await Promise.all(
        (Object.keys(SOURCES) as MusicTrack[]).map(async (k) => {
          const { sound } = await Audio.Sound.createAsync(SOURCES[k], {
            volume: MUSIC_VOLUME,
            isLooping: true,
            shouldPlay: false,
          });
          sounds[k] = sound;
        }),
      );
      ready = true;
    } catch (err) {
      console.warn('[music] load failed', err);
      ready = true;
    }
  })();
  return loading;
}

export async function playTrack(track: MusicTrack): Promise<void> {
  if (!ready) return;
  if (current === track && enabled) return;
  const next = sounds[track];
  if (!next) return;
  // Stop the previous track before starting the new one so we never
  // overlap two music beds.
  if (current && current !== track) {
    const prev = sounds[current];
    if (prev) {
      try {
        await prev.stopAsync();
      } catch {
        /* ignore */
      }
    }
  }
  current = track;
  if (!enabled) return;
  try {
    await next.setPositionAsync(0);
    await next.playAsync();
  } catch {
    /* ignore */
  }
}

export async function stopMusic(): Promise<void> {
  if (!ready) return;
  const active = current ? sounds[current] : null;
  current = null;
  if (active) {
    try {
      await active.stopAsync();
    } catch {
      /* ignore */
    }
  }
}

/** Pause without forgetting which track was playing (for backgrounding). */
export async function pauseMusic(): Promise<void> {
  if (!ready) return;
  const active = current ? sounds[current] : null;
  if (active) {
    try {
      await active.pauseAsync();
    } catch {
      /* ignore */
    }
  }
}

/** Resume the last playing track if music is enabled and one was selected. */
export async function resumeMusic(): Promise<void> {
  if (!ready || !enabled || !current) return;
  const active = sounds[current];
  if (active) {
    try {
      await active.playAsync();
    } catch {
      /* ignore */
    }
  }
}

/**
 * User setting toggle. Turning off pauses immediately; turning on
 * resumes the last selected track (if any).
 */
export async function setEnabled(on: boolean): Promise<void> {
  enabled = on;
  if (!ready) return;
  if (on) {
    await resumeMusic();
  } else {
    await pauseMusic();
  }
}
