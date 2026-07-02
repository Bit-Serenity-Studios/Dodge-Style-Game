# Neon Dodge

An endless one-tap dodge game (Flappy Bird lineage) built with Expo (managed
workflow), React Native, TypeScript and Reanimated. Physics and rendering run
entirely on the UI thread via `useFrameCallback` and shared values — no
per-frame React state, no bridge crossings. All persistence is local
(AsyncStorage). All SFX are synthesized in-JS at boot and cached to disk;
swap them for real assets by editing `src/audio/index.ts`.

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
    wav.ts            pure-JS WAV encoder + base64
    index.ts          preload SFX pool, play(), playTick()
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

`src/audio/wav.ts` is a tiny pure-JS WAV encoder. `index.ts` synthesizes a
handful of short PCM buffers at boot, writes them to
`FileSystem.cacheDirectory`, and preloads a small round-robin pool of
`expo-av` `Audio.Sound` voices per SFX so that rapid plays overlap
cleanly instead of cutting each other off.

To swap in real audio files:
1. Drop `.wav` / `.mp3` files under `assets/sounds/`.
2. In `audio/index.ts`, replace the `RECIPES` for those keys with
   `require('../../assets/sounds/foo.wav')` and set the source directly
   in `writeAndLoadPool` (skip the synthesis + FS write).

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
