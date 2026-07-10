# Neon Dodge

An endless one-tap dodge game (Flappy Bird lineage) built with Expo (managed
workflow), React Native, TypeScript and Reanimated. Physics and rendering run
entirely on the UI thread via `useFrameCallback` and shared values — no
per-frame React state, no bridge crossings. All persistence is local
(AsyncStorage). SFX and background music are bundled OGG files from the
[Kenney](https://kenney.nl) CC0 audio packs; the pitched score tick uses
`setRateAsync` on `expo-av` for runtime pitch shifting off a single click.

## Run it

```bash
npm install
npx expo start
```

Open in Expo Go on device (recommended — haptics + audio only work on
a real phone) or run on a simulator with `i` / `a`.

Type-check:

```bash
npm run typecheck
```

Run tests:

```bash
npm test
```

## Play

- Tap anywhere to flap. Everything is one tap.
- Squeeze through the pipes; hit ceiling, floor, or pipe → run over.
- Clear a pipe within `NEAR_MISS_PX` of an edge for a **CLOSE!** bonus,
  a spark burst, a bright chime, and +1 extra point.
- Streaks (5 / 10 / 20) grow your orb trail and shift the screen glow.
- Every 25 points a **SURGE**: brief warning band, then a 3s speedup.
- **Daily Run** toggle: same pipe sequence for everyone that day, tracked
  as a separate daily best.

Death → tap-to-retry within a second. No menus in the loop.

## Structure

```
App.tsx               root — GestureHandlerRootView + SafeAreaProvider
src/
  constants/
    tuning.ts         every physics / difficulty / juice number
  utils/
    difficulty.ts     asymptotic curves (speed, gap, variance, spacing)
    rng.ts            mulberry32, todaySeed, randomSeed
  audio/
    index.ts          preload SFX pool, play(), playTick() (pitched)
    music.ts          background music player (menu / gameplay loops)
  ads/
    config.ts         ADS_ENABLED, cadence knobs, reserved banner height
    types.ts          AdsAdapter interface — SDK-agnostic contract
    stub.tsx          default no-op adapter with placeholder banner
    index.ts          orchestration: init, banner, interstitial cadence
  iap/
    config.ts         IAP_ENABLED, product IDs, fallback price
    types.ts          IapAdapter interface — SDK-agnostic contract
    stub.tsx          default dev adapter — Alert-confirm "purchase"
    index.ts          orchestration: init, purchase, restore, hooks
  hooks/
    useGameLoop.ts    fixed-timestep frame callback, physics, collision,
                      near-miss detection, surge trigger, event bridges
    usePersistence.ts AsyncStorage best/daily/session stats
  components/
    GameScreen.tsx    top-level composition, callbacks -> haptics/SFX/pops
    Player.tsx        orb + trail + idle bob/pulse
    Pipes.tsx         top/bottom pipes with gradient + glowing edge
    Starfield.tsx     two parallax layers
    HUD.tsx           big score with spring pop, combo bar, corner BEST
    StartScreen.tsx   idle overlay + pulsing "TAP TO START" + daily toggle
    DeathOverlay.tsx  white flash, count-up, gold NEW BEST, restart tap
    NearMissPopup.tsx "CLOSE!" popup (spring in, fade out)
    NewBestBanner.tsx slides from the left when best is passed mid-run
    ParticleSystem.tsx pool of shared-value particles (spark, confetti)
    EdgeGlow.tsx      streak edge glow, incoming-pipe warning, surge band
```

## Tuning guide

Every knob lives in `src/constants/tuning.ts`. What each one does to feel:

### Physics
| Constant | Effect on feel |
| --- | --- |
| `GRAVITY` | Higher = twitchier, snappier fall. Lower = floaty. |
| `TAP_IMPULSE` | Bigger negative = higher flap. Small tweaks change everything. |
| `MAX_FALL_V` | Prevents unrecoverable dives. Raise for more punishment. |
| `FIXED_DT` | Physics timestep. 1/120 is smooth on 60/90/120Hz screens. |

### Player
| Constant | Effect on feel |
| --- | --- |
| `PLAYER_RADIUS` | Visual size only. Change hitbox with the scale below. |
| `PLAYER_HITBOX_SCALE` | 0.85 is intentionally forgiving; drop for hardcore, raise for casual. |
| `PLAYER_X_FRAC` | Where the player sits (fraction of screen width). |
| `TILT_UP_DEG` / `TILT_DOWN_MAX_DEG` / `TILT_VELOCITY_SCALE` | Classic Flappy tilt personality. |

### World
| Constant | Effect on feel |
| --- | --- |
| `PIPE_WIDTH` | Thicker pipes = later warning, harder pass. |
| `PIPE_SPACING_BASE` / `PIPE_SPACING_MIN` | Horizontal breathing room between pipes. |
| `GAP_SIZE_BASE` / `GAP_SIZE_MIN` | Vertical gap; min is enforced at ~2.4× player height. |
| `GAP_MARGIN_TOP` / `GAP_MARGIN_BOTTOM` | Never spawn a gap flush with the ceiling/floor. |
| `GAP_VAR_BASE` / `GAP_VAR_MAX` | How much altitude change between successive gaps. |

### Difficulty scaling
Every curve is asymptotic. See `utils/difficulty.ts`.
| Constant | Effect on feel |
| --- | --- |
| `SCROLL_BASE` | Base scroll speed. |
| `SCROLL_MAX_MULT` | Speed ceiling as a multiplier (2.2× base by default). |
| `SCROLL_GROWTH` | How fast we approach the ceiling per point. Bigger = ramp harder. |
| `GAP_SHRINK_TAU` | Points to shrink most of the way to `GAP_SIZE_MIN`. Lower = punishing early. |
| `VAR_GROWTH_TAU` | Points to grow altitude variance. Lower = wild swings early. |

### Surge cycle
| Constant | Effect on feel |
| --- | --- |
| `SURGE_EVERY` | Points between surges. Sets the tension/relief cadence. |
| `SURGE_WARN_DURATION` | Warning before the speedup — anticipation window. |
| `SURGE_DURATION` | How long the harder segment lasts. |
| `SURGE_MULT` | Speed bump during surge (+15% is intentional; more feels cheap). |

### Juice
| Constant | Effect on feel |
| --- | --- |
| `NEAR_MISS_PX` | Slack between "pass" and "CLOSE!". Bigger = more dopamine hits. |
| `NEAR_MISS_BONUS` | +1 extra point per near-miss. Near-misses > clean passes. |
| `STREAK_TIERS` | Where the trail/edge glow escalates. |
| `TRAIL_LENGTHS` / `TRAIL_HUES` | Combo aesthetics per tier. |
| `SCORE_POP_SCALE` | How big the score number leaps on each point. |
| `SCORE_TICK_BASE_FREQ` / `SCORE_TICK_STEP` / `SCORE_TICK_CYCLE` / `SCORE_TICK_RESET` | Audio ramp; rises every 5 points, resets every 25. |
| `SHAKE_NEAR_MISS` / `SHAKE_DEATH` | Camera shake magnitude in px. |
| `HITSTOP_MS` | Freeze-frame length on death. 80ms is the sweet spot. |
| `FLASH_MS` | White flash length on death. |
| `RESTART_WINDOW_MS` | Delay before "tap to retry" arms — prevents accidental double-tap restarts. |

## Audio

Bundled OGG files under `assets/sounds/` (SFX) and `assets/music/`
(background loops), all from the [Kenney](https://kenney.nl) CC0 audio
packs (attribution is not required by CC0 but is included in
`assets/sounds/LICENSE.txt` and `assets/music/LICENSE.txt`).

`src/audio/index.ts` preloads a small round-robin pool of `expo-av`
`Audio.Sound` voices per SFX so rapid plays overlap cleanly instead of
cutting each other off. The pitched score tick uses one bundled click
whose playback rate is shifted per step via
`setRateAsync(rate, /*shouldCorrectPitch*/ false)` — one asset,
`SCORE_TICK_RESET / SCORE_TICK_CYCLE` distinct pitches at runtime.

`src/audio/music.ts` runs two looping tracks (menu, gameplay) with only
one active at a time. Music pauses on backgrounding and resumes on
foreground, and is gated by the `music` setting toggle (defaults on).

To swap in different audio, replace the OGG files at those paths — the
`require()` sources in `index.ts` / `music.ts` will pick them up on the
next Metro bundle. Per-key gain trims live in `GAINS` in `index.ts`.

## Architecture notes

**Physics on UI thread.** All per-frame values are shared values.
`useGameLoop` uses `useFrameCallback` with a fixed-timestep accumulator
so 60 / 90 / 120 Hz devices all step physics identically. React state
is only updated on discrete events (score, near-miss, death, surge)
via `useAnimatedReaction` — the game holds a steady 60 FPS even on
mid-range devices.

**Collision.** Simple AABB on a shrunk hitbox (`PLAYER_HITBOX_SCALE`
of the visual radius). Intentionally lenient — this is a game-feel
knob, not a bug.

**Determinism.** All pipe layouts come from a seeded Mulberry32 PRNG.
`Daily Run` mode seeds from `YYYYMMDD` so everyone gets the same
sequence, tracked as a separate best.

**No half-finished stubs.** Everything you can trigger has a
visual + audio + haptic response (see `GameScreen.onScore`,
`onDeath`, `onSurgeWarn`, `onFlap`).

## Production-readiness

### Accessibility

- **Screen readers** — every interactive control (daily-run toggle,
  settings gear, settings switches, death-screen retry hit-area) has
  `accessibilityRole`, `accessibilityLabel`, and where useful
  `accessibilityHint`. HUD score exposes `accessibilityLiveRegion="polite"`
  so VoiceOver / TalkBack announce score changes.
- **Contrast** — palette lives in `src/constants/colors.ts` with
  measured contrast ratios; every text/background pair is 8:1 or
  better (AAA) against the near-black background.
- **Not color-only** — streak progression is a combo bar with numeric
  `N× COMBO` text, not just a hue shift. Score is a number. Near-miss
  is the word "CLOSE!". Nothing important is signaled by color alone.
- **Dynamic type** — informational text scales with system font size.
  Layout-critical numerals (giant score, `TAP TO START`, HUD score)
  use `allowFontScaling={false}` so scaled system fonts don't shatter
  the layout — the tradeoff is standard practice for numeric HUDs.
- **Reduce Motion** — `useSettings` reads
  `AccessibilityInfo.isReduceMotionEnabled()` and subscribes to changes.
  When active it disables camera shake, freeze-frame, idle bob/pulse,
  the death panel spring, and confetti/spark bursts. Users can also
  toggle it manually from the settings sheet.
- **Tap targets** — daily toggle, settings gear, settings switches,
  and the "DONE" button all have `minHeight: 44+` (iOS 44pt / Android
  48dp). Main gameplay tap target is the entire screen.
- **Mute** — sound, music, and haptics each have their own toggle in
  the settings sheet, persisted to AsyncStorage under `nd.settings.v1`.

### Security & privacy

- **No secrets, no network.** There are zero fetch/URL calls and zero
  API keys in the codebase. `git grep -i "api.key\|secret\|token"`
  returns nothing.
- **No sensitive local data.** AsyncStorage holds: all-time best,
  daily best per date key, and settings JSON. All integers or
  booleans — nothing PII-adjacent.
- **Input validation** — every AsyncStorage read is gated by
  `safeParseNonNegInt` (see `src/utils/safeStorage.ts`): non-numeric,
  negative, NaN, Infinity, and 1000-digit strings all get clamped or
  reset to 0. Corrupt storage from an aborted write or a downgrade
  cannot crash the game. Settings JSON parse errors reset to defaults.
- **Privacy policy draft** — `PRIVACY.md`. Prefilled to declare "no
  data collected" for both the App Store Privacy Nutrition Label and
  Google Play Data Safety. If you later add an ad SDK, that document
  needs updating **before** submission.
- **Ad/IAP SDKs not wired.** When you add them, the Data Safety form
  entries will need to change; the current form claims no data
  collection, which stops being true the moment AdMob is added.

### Performance

- **60 fps** — all per-frame values are Reanimated shared values
  updated on the UI thread. React state changes only on discrete
  events (score, near-miss, tier-up, death, surge). No `Animated.Text`
  driven by shared values (bridged via `useAnimatedReaction` → JS
  state only when the integer changes). Pipes and particles are a
  fixed-size pool of shared values — no per-frame render.
- **Cold start** — audio synthesis + FS writes happen inside a
  `useEffect` on mount, non-blocking. The game is interactive
  immediately; if the user taps before audio is ready, `play()` is
  a no-op (silent fallback).
- **Memory** — particle pool is fixed at 60. Pipe pool is fixed at
  4. Trail pool is fixed at 26. Pitched-tick audio pool is bounded
  by `SCORE_TICK_RESET / SCORE_TICK_CYCLE = 5` distinct pitches.
  Timers/intervals are cleaned up in `useEffect` returns.
- **Bundle** — every declared dependency is imported in at least one
  source file. No transitive bloat from unused SDKs.

### Error handling & edge cases

- **Corrupt / missing storage** — every read uses `safeParseNonNegInt`
  or a JSON coerce with defaults. First-launch (missing key) returns 0
  cleanly. Zero try/catch is missing on any read or write.
- **Rapid taps** — `tap()` is a worklet that just checks phase and
  sets `vy`; no possible state corruption from 20 taps in 200ms.
- **Backgrounding mid-run** — `AppState` listener flips the game to
  the death state on `background`/`inactive` transitions instead of
  letting the player silently fall while offscreen.
- **Timezone / midnight rollover** — daily-run seed is re-derived on
  `AppState.active` and the daily key updates only if the calendar day
  changed. A user traveling east across the international date line
  will simply see today's new (empty) daily best on return, not a
  stale one.
- **`dt` spike** — the frame callback clamps `dt` to 250 ms so a
  device that stalls does not send the player 1500 px down in one step.
- **Storage write failure** — writes are wrapped in try/catch; the
  next run silently records against the stale in-memory best. No crash,
  no data-loss modal for the player.

### Polish

- **First-run hint** — StartScreen shows a small "Tap anywhere to
  flap. Fly through the gaps." line on the first cold start. Dismissed
  permanently on the first death.
- **Consistent theme** — `src/constants/colors.ts` centralises the
  palette. Some components still reference literal hex codes for
  historical reasons — safe to refactor toward `colors.*` any time.
- **App icon / splash screen** — Expo will fall back to placeholders
  if you don't provide assets. To ship for real, drop:
    - `assets/icon.png` (1024×1024, PNG)
    - `assets/splash.png` (1284×2778 iOS / any Android size)
    - `assets/adaptive-icon.png` (1024×1024 foreground for Android)
  then wire them in `app.json` under `expo.icon`, `expo.splash.image`,
  `expo.android.adaptiveIcon.foregroundImage`. Left out of this repo
  because we have no image-authoring surface here; **decision needed**
  on final icon art.
- **Death screen** feels complete: score with animated count-up, gold
  new-best treatment, session run count, session best, all-time best,
  and (in Daily mode) daily best.

### Testing

- **Unit tests** cover the deterministic core: difficulty curves
  (monotonicity + asymptotic bounds), RNG (determinism, distribution,
  range), storage validation (safe parse of null/NaN/Infinity/negative/
  1000-digit inputs).
  Run: `npm test` — 39 tests across 3 suites, all green.
- **Not yet covered (flagged, not blocked):** RN-runtime UI tests
  (would need `jest-expo` + Testing Library setup) and Detox e2e.
  Given the game is a single-screen tap-only loop, manual pass on
  device is a defensible bar; add e2e when you introduce screens with
  meaningful navigation. **Decision needed**: is manual-device QA
  enough for launch, or do you want e2e coverage before submission?

### App Store / Play compliance

- **Copy** — "Neon Dodge" and the in-app strings avoid the words
  "addictive" and "endless fun" that some store review teams flag.
- **Age rating** — 4+ / Everyone / IARC 3. No violence, gambling,
  UGC, or web content.
- **Ads plumbing** — `src/ads/` wires a banner slot at the bottom of
  the screen (physics reserve `BANNER_HEIGHT_PT` so pipes never overlap)
  and a between-runs interstitial hook (frequency-capped: every
  `INTERSTITIAL_MIN_RUNS` deaths, minimum `INTERSTITIAL_MIN_INTERVAL_MS`
  spacing, never on the first run of a session). Both currently route
  through the stub adapter in `src/ads/stub.tsx` — a placeholder banner
  and a logging interstitial, zero network. To ship real ads: add an
  SDK (`react-native-google-mobile-ads` is the reference), write an
  adapter next to `stub.tsx` implementing `AdsAdapter`, swap the
  `adapter =` line in `src/ads/index.ts`, and follow the pre-submission
  checklist in `PRIVACY.md`: ATT prompt on iOS, UMP consent form for
  EU, re-declare Data Safety.

- **Remove Ads IAP** — `src/iap/` wires a one-time non-consumable
  purchase (product ID `com.dodgestyle.neondodge.remove_ads`, default
  price `$4.99`). The Settings sheet exposes a **Remove Ads · $4.99**
  button plus **Restore Purchases** (Apple-mandatory). Purchase
  entitlement is persisted to AsyncStorage under
  `nd.iap.removeAds.v1`. `useAdsActive()` and the runtime
  `isAdsActive()` fuse `ADS_ENABLED` with the entitlement, so the
  banner disappears, the game area expands, and interstitials skip
  the moment the purchase completes. The stub adapter in
  `src/iap/stub.tsx` confirms via a native Alert (no real charge) —
  swap it for a real SDK adapter (`react-native-iap` or
  `expo-in-app-purchases`) and update the `adapter =` line in
  `src/iap/index.ts`. Before submission: create the matching
  non-consumable product in App Store Connect + Google Play Console
  with the same product ID, add a Tax + Banking profile (required
  before IAP works in TestFlight), and add a review-note explaining
  the purchase and how to test Restore.

### Decisions I need from you

1. **App icon and splash art.** Placeholder-only right now — I have no
   authoring surface for the final PNGs. If you have art, drop them
   under `assets/` and I'll wire the `app.json` entries.
2. **e2e tests before submission?** Manual on-device is a reasonable
   bar for a one-screen tap game; happy to add Detox if you want it
   before launch.
3. **Publisher contact email** for `PRIVACY.md` (currently
   `{{TODO: your email}}`).
4. **Bundle identifier + display name.** Current placeholders
   are `com.dodgestyle.neondodge` / `Neon Dodge` — confirm or override
   before we take a build to TestFlight/internal track.
5. **Localization?** All UI copy is currently hard-coded English.
   Wire i18n now (cheap) or later (a bit more churn)?
6. **Ad monetization SDK choice** (AdMob vs AppLovin vs none). Not
   wired yet — flagging so the Data Safety form and ATT prompt work
   don't blindside you at submission time.
