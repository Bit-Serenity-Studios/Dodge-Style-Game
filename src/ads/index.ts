/**
 * Ads orchestration — public API for the rest of the app.
 *
 * - `initAds()` / `isAdsReady()`             — lifecycle
 * - `preloadInterstitial()`                  — call when the run starts
 * - `maybeShowInterstitial()`                — call at run end; frequency-capped
 * - `setPersonalizedAds(on)`                 — bind to user setting
 * - `Banner`                                 — component for the reserved slot
 *
 * The active adapter is swapped in one place (below) — switch from
 * `stubAdapter` to a real SDK adapter when ready to ship.
 */
import {
  ADS_ENABLED,
  INTERSTITIAL_MIN_INTERVAL_MS,
  INTERSTITIAL_MIN_RUNS,
  INTERSTITIAL_SKIP_FIRST_RUN,
} from './config';
import { stubAdapter } from './stub';
import type { AdsAdapter } from './types';

// Swap this line to change SDK. Keep the rest of the app untouched.
const adapter: AdsAdapter = stubAdapter;

// In-memory cadence state. Reset per app-launch — we intentionally do
// NOT persist to storage, so a user re-opening the app after a long
// break gets a clean grace period, not an immediate interstitial.
let runsThisSession = 0;
let runsSinceLastInterstitial = 0;
let lastInterstitialAt = 0;

export async function initAds(): Promise<void> {
  if (!ADS_ENABLED) return;
  await adapter.init();
  adapter.preloadInterstitial();
}

export function isAdsReady(): boolean {
  return ADS_ENABLED && adapter.isReady();
}

export function preloadInterstitial(): void {
  if (!ADS_ENABLED) return;
  adapter.preloadInterstitial();
}

export function setPersonalizedAds(on: boolean): void {
  if (!ADS_ENABLED) return;
  adapter.setPersonalized(on);
}

/**
 * Call at run end (after the death screen appears, before restart).
 * Returns when the ad — if any — has been dismissed. Never rejects.
 */
export async function maybeShowInterstitial(now: number): Promise<boolean> {
  if (!ADS_ENABLED) return false;
  if (!adapter.isReady()) return false;
  runsThisSession += 1;
  runsSinceLastInterstitial += 1;
  if (INTERSTITIAL_SKIP_FIRST_RUN && runsThisSession === 1) return false;
  if (runsSinceLastInterstitial < INTERSTITIAL_MIN_RUNS) return false;
  if (now - lastInterstitialAt < INTERSTITIAL_MIN_INTERVAL_MS) return false;
  lastInterstitialAt = now;
  runsSinceLastInterstitial = 0;
  try {
    await adapter.showInterstitial();
  } catch {
    /* never break the game flow on an ad error */
  }
  // Preload the next one immediately so the following interstitial is warm.
  adapter.preloadInterstitial();
  return true;
}

export const Banner = adapter.Banner;
export { ADS_ENABLED, BANNER_HEIGHT_PT } from './config';
