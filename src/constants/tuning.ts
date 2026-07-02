/**
 * All game-feel numbers live here so the whole game can be re-tuned
 * from one file. See README for a knob-by-knob guide.
 */

// ---------- Player ----------
export const PLAYER_RADIUS = 18;                // visual radius (px)
export const PLAYER_HITBOX_SCALE = 0.85;        // forgiving hitbox (85% of visual)
export const PLAYER_X_FRAC = 0.28;              // x position as fraction of screen width

// ---------- Physics ----------
export const GRAVITY = 1400;                    // px/s^2 constant downward accel
export const TAP_IMPULSE = -420;                // px/s instant upward velocity (set, not added)
export const MAX_FALL_V = 900;                  // terminal fall velocity cap
export const FIXED_DT = 1 / 120;                // physics step (s); 120Hz for stability

// ---------- Rotation ----------
export const TILT_UP_DEG = -28;                 // rotation on tap
export const TILT_DOWN_MAX_DEG = 82;            // max fall rotation
export const TILT_VELOCITY_SCALE = 800;         // how fast rotation follows velocity

// ---------- Pipes / world ----------
export const PIPE_WIDTH = 68;
export const PIPE_SPACING_BASE = 260;           // horizontal gap between pipe pairs at score 0
export const PIPE_SPACING_MIN = 200;            // spacing asymptote
export const PIPE_COUNT = 4;                    // pipe slots on screen at once (pool size)

export const GAP_SIZE_BASE = 190;               // starting gap size (px)
export const GAP_SIZE_MIN = PLAYER_RADIUS * 2 * 2.4; // minimum gap = 2.4x player height
export const GAP_MARGIN_TOP = 60;               // min distance from ceiling to gap top
export const GAP_MARGIN_BOTTOM = 60;            // min distance from floor to gap bottom

export const GAP_VAR_BASE = 60;                 // starting altitude change between gaps
export const GAP_VAR_MAX = 260;                 // max altitude change asymptote

// ---------- Scroll speed ----------
export const SCROLL_BASE = 200;                 // px/s at score 0
export const SCROLL_MAX_MULT = 2.2;             // asymptotic ceiling multiplier
export const SCROLL_GROWTH = 0.015;             // per-point growth factor (~1.5%)

// ---------- Difficulty curve shapes (asymptotic, never reach the ceiling) ----------
// speed(score)     = base * (1 + (max-1) * (1 - 1/(1 + score * SCROLL_GROWTH)))
// gap(score)       = min + (base-min) * exp(-score / GAP_SHRINK_TAU)
// variance(score)  = base + (max-base) * (1 - 1/(1 + score/VAR_GROWTH_TAU))
export const GAP_SHRINK_TAU = 55;
export const VAR_GROWTH_TAU = 30;

// ---------- Surge cycle ----------
export const SURGE_EVERY = 25;                  // trigger surge every N points
export const SURGE_DURATION = 3.0;              // seconds
export const SURGE_WARN_DURATION = 1.2;         // seconds of pre-warning
export const SURGE_MULT = 1.15;                 // +15% speed during surge

// ---------- Near-miss ----------
export const NEAR_MISS_PX = 12;                 // px from either edge
export const NEAR_MISS_BONUS = 1;

// ---------- Streaks ----------
export const STREAK_TIERS = [5, 10, 20] as const;
export const TRAIL_LENGTHS = [8, 12, 18, 26];   // trail length per tier (0..3)
export const TRAIL_HUES = ['#7dfff0', '#7db7ff', '#c17dff', '#ff7db7']; // per tier

// ---------- Screen shake ----------
export const SHAKE_NEAR_MISS = 6;               // px
export const SHAKE_DEATH = 26;                  // px
export const HITSTOP_MS = 80;                   // freeze frame duration
export const FLASH_MS = 180;                    // white flash duration

// ---------- Audio ----------
export const SCORE_TICK_BASE_FREQ = 660;        // Hz for base score tick
export const SCORE_TICK_STEP = 40;              // Hz added per point within cycle
export const SCORE_TICK_CYCLE = 5;              // ramp resets every 5 points visually...
export const SCORE_TICK_RESET = 25;             // ...and every 25 the cycle resets fully

// ---------- HUD ----------
export const SCORE_POP_SCALE = 1.3;
export const NEW_BEST_GOLD = '#ffd94a';

// ---------- Starfield ----------
export const STAR_COUNT_FAR = 40;
export const STAR_COUNT_NEAR = 22;
export const STAR_SPEED_FAR = 25;               // px/s (parallax slow layer)
export const STAR_SPEED_NEAR = 70;              // px/s (parallax fast layer)

// ---------- Restart window ----------
export const RESTART_WINDOW_MS = 400;           // "one tap anywhere" window opens after this
export const RESTART_MAX_DELAY_MS = 1000;       // hard commitment: death-to-playing < 1s
