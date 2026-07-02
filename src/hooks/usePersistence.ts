/**
 * Best/session/daily persistence, backed by AsyncStorage.
 * All AsyncStorage reads pass through `safeParseNonNegInt` so corrupt
 * storage (aborted writes, downgrades, manual edits) can never NaN us.
 *
 * Also handles the "user travels across midnight" case: an AppState
 * listener re-derives today's seed on foreground and updates the daily
 * key if the calendar day changed while backgrounded.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { todaySeed } from '../utils/rng';
import { safeParseNonNegInt } from '../utils/safeStorage';

const K_BEST = 'nd.best';
const K_DAILY_PREFIX = 'nd.daily.';

export type Stats = {
  allTimeBest: number;
  sessionRuns: number;
  sessionBest: number;
  dailyBest: number;
  dailyKey: string;
  dailySeed: number;
};

function dailyKeyFor(seed: number): string {
  return `${K_DAILY_PREFIX}${seed}`;
}

export function usePersistence(dailyMode: boolean) {
  const [dailySeed, setDailySeed] = useState<number>(() => todaySeed());
  const dailyKey = dailyKeyFor(dailySeed);
  const [stats, setStats] = useState<Stats>({
    allTimeBest: 0,
    sessionRuns: 0,
    sessionBest: 0,
    dailyBest: 0,
    dailyKey,
    dailySeed,
  });
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Refresh daily seed on foreground so timezone/date-change (or the app
  // being backgrounded past midnight) doesn't leave us on yesterday's key.
  useEffect(() => {
    const onChange = (s: AppStateStatus) => {
      if (s === 'active') {
        const cur = todaySeed();
        setDailySeed((prev) => (prev === cur ? prev : cur));
      }
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [b, d] = await Promise.all([
          AsyncStorage.getItem(K_BEST),
          AsyncStorage.getItem(dailyKeyFor(dailySeed)),
        ]);
        if (cancelled) return;
        setStats((s) => ({
          ...s,
          allTimeBest: safeParseNonNegInt(b),
          dailyBest: safeParseNonNegInt(d),
          dailyKey: dailyKeyFor(dailySeed),
          dailySeed,
        }));
      } catch {
        /* ignore — bad storage should not crash */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dailySeed]);

  const recordRun = useCallback(
    async (score: number): Promise<{ newBest: boolean }> => {
      const safeScore = safeParseNonNegInt(String(Math.floor(score)));
      let newBest = false;
      setStats((prev) => {
        const isBestOverall = safeScore > prev.allTimeBest;
        const isBestSession = safeScore > prev.sessionBest;
        const isBestDaily = dailyMode && safeScore > prev.dailyBest;
        newBest = isBestOverall;
        return {
          ...prev,
          allTimeBest: isBestOverall ? safeScore : prev.allTimeBest,
          sessionRuns: prev.sessionRuns + 1,
          sessionBest: isBestSession ? safeScore : prev.sessionBest,
          dailyBest: isBestDaily ? safeScore : prev.dailyBest,
        };
      });
      try {
        const cur = safeParseNonNegInt(await AsyncStorage.getItem(K_BEST));
        if (safeScore > cur) await AsyncStorage.setItem(K_BEST, String(safeScore));
        if (dailyMode) {
          const key = dailyKeyFor(dailySeed);
          const curD = safeParseNonNegInt(await AsyncStorage.getItem(key));
          if (safeScore > curD) await AsyncStorage.setItem(key, String(safeScore));
        }
      } catch {
        /* ignore — write failures should not crash */
      }
      return { newBest };
    },
    [dailyMode, dailySeed],
  );

  return { stats, recordRun, todaySeedValue: dailySeed };
}
