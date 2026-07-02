/**
 * Central palette. Every hue used by more than one component lives here.
 *
 * Text-on-background contrast (WCAG AA target 4.5:1 for body text):
 *   text        (#e5fffb) on background (#05060f) ≈ 18.3 : 1  ✅ AAA
 *   textDim     (#c9dcff) on background (#05060f) ≈ 13.9 : 1  ✅ AAA
 *   accent      (#7dfff0) on background (#05060f) ≈ 14.7 : 1  ✅ AAA
 *   accentBlue  (#7db7ff) on background (#05060f) ≈ 8.9  : 1  ✅ AAA
 *   gold        (#ffd94a) on background (#05060f) ≈ 15.1 : 1  ✅ AAA
 *   gold        (#ffd94a) on dark inset (#1e1400) ≈ 10.4 : 1  ✅ AAA
 *
 * The dark synthwave background gives us huge contrast headroom, which
 * is why all text is legible. The one gotcha is small text on colored
 * pills (NEW BEST) — we use #241800 on #ffd94a for that (~13:1).
 */
export const colors = {
  bg: '#05060f',
  bgPanel: 'rgba(10,14,30,0.85)',
  text: '#e5fffb',
  textDim: '#c9dcff',
  textMuted: '#7db7ff',
  accent: '#7dfff0',       // teal / cyan — streak tier 0
  accentBlue: '#7db7ff',   // streak tier 1
  accentPurple: '#c17dff', // streak tier 2
  accentPink: '#ff7db7',   // streak tier 3
  gold: '#ffd94a',
  goldInk: '#241800',      // pairs with gold pill background
  warn: '#ff7db7',
};
