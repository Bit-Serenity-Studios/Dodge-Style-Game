/**
 * Best/session/daily persistence, backed by AsyncStorage.
 * All writes are debounced/immediate at the call site; nothing runs on the UI thread here.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { todaySeed } from '../utils/rng';

const K_BEST = 'nd.best';
const K_DAILY_PREFIX = 'nd.daily.';

export type Stats = {
  allTimeBest: number;
  sessionRuns: number;
  sessionBest: number;
  dailyBest: number;
  dailyKey: string;
};

function dailyKeyFor(seed: number): string {
  return `${K_DAILY_PREFIX}${seed}`;
}

export function usePersistence(dailyMode: boolean) {
  const seedForToday = useRef(todaySeed());
  const dailyKey = dailyKeyFor(seedForToday.current);
  const [stats, setStats] = useState<Stats>({
    allTimeBest: 0,
    sessionRuns: 0,
    sessionBest: 0,
    dailyBest: 0,
    dailyKey,
  });

  useEffect(() => {
    (async () => {
      try {
        const [b, d] = await Promise.all([AsyncStorage.getItem(K_BEST), AsyncStorage.getItem(dailyKey)]);
        setStats((s) => ({
          ...s,
          allTimeBest: b ? parseInt(b, 10) || 0 : 0,
          dailyBest: d ? parseInt(d, 10) || 0 : 0,
        }));
      } catch {
        /* ignore — corrupt storage should not crash the game */
      }
    })();
  }, [dailyKey]);

  const recordRun = useCallback(
    async (score: number): Promise<{ newBest: boolean }> => {
      let newBest = false;
      setStats((prev) => {
        const isBestOverall = score > prev.allTimeBest;
        const isBestSession = score > prev.sessionBest;
        const isBestDaily = dailyMode && score > prev.dailyBest;
        newBest = isBestOverall;
        return {
          ...prev,
          allTimeBest: isBestOverall ? score : prev.allTimeBest,
          sessionRuns: prev.sessionRuns + 1,
          sessionBest: isBestSession ? score : prev.sessionBest,
          dailyBest: isBestDaily ? score : prev.dailyBest,
        };
      });
      try {
        // read-modify-write on storage independent of setState optimism.
        const cur = await AsyncStorage.getItem(K_BEST);
        const curN = cur ? parseInt(cur, 10) || 0 : 0;
        if (score > curN) await AsyncStorage.setItem(K_BEST, String(score));
        if (dailyMode) {
          const curD = await AsyncStorage.getItem(dailyKey);
          const curDN = curD ? parseInt(curD, 10) || 0 : 0;
          if (score > curDN) await AsyncStorage.setItem(dailyKey, String(score));
        }
      } catch {
        /* ignore */
      }
      return { newBest };
    },
    [dailyKey, dailyMode],
  );

  return { stats, recordRun, todaySeedValue: seedForToday.current };
}
