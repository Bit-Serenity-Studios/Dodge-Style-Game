/**
 * All user-facing copy in one place. Structured as a nested object so
 * adding an i18n library later is a mechanical swap — the shape mirrors
 * what a `t('start.title')` call would resolve to.
 *
 * Interpolation is done via small formatter functions rather than
 * template placeholders so we keep TypeScript-checkable call sites
 * (no untyped `{count}` strings floating around).
 *
 * When you're ready to localize:
 *   1. Copy this file to `src/constants/strings.en.ts`.
 *   2. Add locale files with the same shape.
 *   3. Add a resolver hook that picks the active locale.
 *   4. Replace `import { STR } from './strings'` with the hook.
 */

export const STR = {
  start: {
    title: 'NEON DODGE',
    best: (n: number) => `BEST ${n}`,
    tapToStart: 'TAP TO START',
    firstRunHint: 'Tap anywhere to flap.  Fly through the gaps.',
    dailyOff: 'DAILY RUN',
    dailyOn: (best: number) => `DAILY RUN  ·  BEST ${best}`,
    dailyA11yOff: 'Daily run mode is off. Double tap to enable the same pipe sequence for everyone today.',
    dailyA11yOn: (best: number) =>
      `Daily run mode is on. Daily best is ${best}. Double tap to switch to endless.`,
    settingsA11y: 'Settings',
    settingsHintA11y: 'Sound, music, haptics, and reduce motion',
  },
  hud: {
    bestCorner: (n: number) => `BEST: ${n}`,
    bestCornerA11y: (n: number) => `Best score ${n}`,
    scoreA11y: (n: number, newBest: boolean) => `Score ${n}${newBest ? ', new best' : ''}`,
    combo: (n: number) => `${n}× COMBO`,
    comboA11y: (n: number) => `${n} combo`,
  },
  death: {
    scoreLabel: 'SCORE',
    bestSub: (n: number) => `BEST ${n}`,
    newBestPill: 'NEW BEST',
    retryArmed: 'TAP ANYWHERE TO RETRY',
    retryArming: '…',
    statRuns: 'RUNS',
    statSession: 'SESSION',
    statAll: 'ALL-TIME',
    statDaily: 'DAILY',
    a11yArmed: (score: number, isNewBest: boolean, best: number) =>
      isNewBest
        ? `Score ${score}, new personal best. Tap anywhere to retry.`
        : `Score ${score}, best ${best}. Tap anywhere to retry.`,
    a11yArming: (score: number) => `Score ${score}. Restart arming.`,
    a11yHintArmed: 'Tap anywhere to start a new run',
  },
  nearMiss: {
    close: 'CLOSE!',
  },
  newBest: {
    banner: 'NEW BEST',
  },
  surge: {
    label: 'SURGE INCOMING',
  },
  settings: {
    title: 'SETTINGS',
    sound: 'Sound',
    soundHint: 'SFX and score ticks',
    music: 'Music',
    musicHint: 'Background music loop',
    haptics: 'Haptics',
    hapticsHint: 'Vibration on taps, scores, and death',
    reduceMotion: 'Reduce motion',
    reduceMotionSystemHint: 'Following your system Reduce Motion setting',
    reduceMotionHint: 'Skip camera shake, freeze-frame, and idle bob',
    personalizedAds: 'Personalized ads',
    personalizedAdsHint: 'Off = request non-personalized ads only',
    done: 'DONE',
    close: 'Close settings',
    announceReduceOn: 'Reduce motion on',
    announceReduceOff: 'Reduce motion off',
  },
  game: {
    tapToFlapA11y: 'Tap to flap',
  },
} as const;

export type Strings = typeof STR;
