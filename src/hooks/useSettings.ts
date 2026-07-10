/**
 * User settings: sound / music / haptics / reduce-motion.
 *
 * - Sound + music + haptics: user toggles, persisted to AsyncStorage.
 *   Default on.
 * - Reduce Motion: system-driven via AccessibilityInfo; also exposed as a
 *   user override so testing/manual override is possible.
 *
 * Exposes both a React state (for gating JS-side effects like SFX/haptics)
 * and a SharedValue<number> flag for worklets (for gating camera shake and
 * other UI-thread-only effects without a JS round-trip).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSharedValue } from 'react-native-reanimated';

const K_SETTINGS = 'nd.settings.v1';

export type Settings = {
  sound: boolean;
  music: boolean;
  haptics: boolean;
  reduceMotionUser: boolean; // user override (false = follow system)
  personalizedAds: boolean;  // false = request non-personalized ads under GDPR/CCPA/ATT
};

export type ResolvedSettings = Settings & {
  reduceMotion: boolean; // effective = user OR system
  systemReduceMotion: boolean;
};

const DEFAULT: Settings = {
  sound: true,
  music: true,
  haptics: true,
  reduceMotionUser: false,
  personalizedAds: true,
};

function coerce(value: unknown): Settings {
  if (!value || typeof value !== 'object') return { ...DEFAULT };
  const v = value as Record<string, unknown>;
  return {
    sound: typeof v.sound === 'boolean' ? v.sound : DEFAULT.sound,
    music: typeof v.music === 'boolean' ? v.music : DEFAULT.music,
    haptics: typeof v.haptics === 'boolean' ? v.haptics : DEFAULT.haptics,
    reduceMotionUser: typeof v.reduceMotionUser === 'boolean' ? v.reduceMotionUser : DEFAULT.reduceMotionUser,
    personalizedAds: typeof v.personalizedAds === 'boolean' ? v.personalizedAds : DEFAULT.personalizedAds,
  };
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT);
  const [systemReduceMotion, setSystemReduceMotion] = useState(false);
  const [ready, setReady] = useState(false);
  // Worklet-readable flag: 1 = reduce motion effective, 0 = off.
  const reduceMotionSv = useSharedValue<number>(0);
  // Guard against races between load and immediate save.
  const loadedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(K_SETTINGS);
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (!cancelled) setSettings(coerce(parsed));
          } catch {
            // Corrupt JSON — reset to defaults, do not crash.
            if (!cancelled) setSettings({ ...DEFAULT });
          }
        }
      } catch {
        /* ignore */
      }
      try {
        const sys = await AccessibilityInfo.isReduceMotionEnabled();
        if (!cancelled) setSystemReduceMotion(!!sys);
      } catch {
        /* ignore */
      }
      if (!cancelled) {
        loadedRef.current = true;
        setReady(true);
      }
    })();

    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
      setSystemReduceMotion(!!enabled);
    });
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, []);

  const persist = useCallback((s: Settings) => {
    AsyncStorage.setItem(K_SETTINGS, JSON.stringify(s)).catch(() => {});
  }, []);

  const update = useCallback(
    (patch: Partial<Settings>) => {
      setSettings((prev) => {
        const next = { ...prev, ...patch };
        if (loadedRef.current) persist(next);
        return next;
      });
    },
    [persist],
  );

  const effectiveReduceMotion = settings.reduceMotionUser || systemReduceMotion;
  useEffect(() => {
    reduceMotionSv.value = effectiveReduceMotion ? 1 : 0;
  }, [effectiveReduceMotion, reduceMotionSv]);

  const resolved: ResolvedSettings = {
    ...settings,
    systemReduceMotion,
    reduceMotion: effectiveReduceMotion,
  };

  return { settings: resolved, update, ready, reduceMotionSv };
}
