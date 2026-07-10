/**
 * Ad slot configuration. Currently paired with a stub adapter that
 * renders a placeholder banner and no-ops interstitials so the layout
 * and cadence can be seen/tested without a real SDK.
 *
 * To ship real ads, install a config-plugin-friendly SDK
 * (react-native-google-mobile-ads, react-native-applovin-max, etc.),
 * write an adapter in ./admob.ts (or ./applovin.ts) implementing
 * AdsAdapter from ./types.ts, and replace the stub registration in
 * ./index.ts. Also update PRIVACY.md + Data Safety declarations —
 * see the "Ad content compliance" section in README.md.
 */

export const ADS_ENABLED = true;

// Reserved banner slot height in pt. AdMob adaptive banners size to
// the screen width automatically, but a fixed reservation keeps the
// physics layout stable when the SDK is swapped in.
export const BANNER_HEIGHT_PT = 50;

// Interstitial cadence — mirrors the "don't annoy players" defaults
// most ad-monetized casual games ship with.
export const INTERSTITIAL_MIN_RUNS = 3;              // show every N runs
export const INTERSTITIAL_MIN_INTERVAL_MS = 60_000;  // never faster than 1/min
export const INTERSTITIAL_SKIP_FIRST_RUN = true;     // never on the very first run of a session
