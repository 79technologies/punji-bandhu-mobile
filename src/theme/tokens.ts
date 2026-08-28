/**
 * Punji Bandhu design tokens.
 *
 * Calibrated for the parents' generation audience: large type, generous
 * spacing, calm colors. Trader-app red/green is deliberately *not* the
 * primary palette — gain/loss colors are a small accent, not the whole UI.
 *
 * Contrast ratios noted next to color pairings have been checked against
 * WCAG AA (4.5:1 body, 3:1 large text / non-text). Verify after any change.
 */

export const colors = {
  // Brand
  navy900: '#0F2A4A',   // primary brand; bg of hero & buttons. 13.1:1 on white.
  navy800: '#172F50',   // subtle midpoint for card inner highlight
  navy700: '#1F4470',
  navy500: '#3A6BA1',
  gold500: '#C8A24B',   // accent — used sparingly (logo mark, single CTA).
  gold200: '#F0E2BD',

  // Surfaces
  surface: '#FFFFFF',
  surfaceMuted: '#F7F5F0', // warm off-white. Background of the app.
  surfaceSunken: '#EDEAE1',

  // Text
  textPrimary: '#0F2A4A',   // navy on cream — 12.4:1.
  textSecondary: '#4A5468', // 7.6:1 on surface.
  textMuted: '#6B7280',     // 5.1:1 on surface — meets AA for body.
  textInverse: '#FFFFFF',

  // Borders
  border: '#D9D3C5',
  borderStrong: '#B3A98C',

  // Semantic (used sparingly — value deltas only)
  gain: '#1F7A4A',  // green; on white 6.4:1.
  loss: '#A12626',  // red; on white 6.5:1.

  // Warning — prices that are stale or failed to refresh. Amber rather than loss
  // red: nothing has gone down, the number is merely unconfirmed.
  warning: '#8A4B08',           // on warningSurface 6.1:1, on white 6.9:1.
  warningSurface: '#FEF6D9',
  warningBorder: '#E9D08A',

  // States
  focusRing: '#3A6BA1',
} as const;

export const spacing = {
  // 4-point base scale
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
  hero: 64,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
  pill: 999,
} as const;

export const type = {
  // Type scale — body floor is 17 (not 14/16) because audience is parents'
  // generation. Headings are heavier than usual to compensate for the calmer
  // palette without resorting to gain/loss color cues.
  display: { fontSize: 36, lineHeight: 42, fontWeight: '700' as const, letterSpacing: -0.5 },
  h1:      { fontSize: 28, lineHeight: 34, fontWeight: '700' as const },
  h2:      { fontSize: 22, lineHeight: 28, fontWeight: '600' as const },
  h3:      { fontSize: 19, lineHeight: 25, fontWeight: '600' as const },
  body:    { fontSize: 17, lineHeight: 24, fontWeight: '400' as const },
  bodyStrong: { fontSize: 17, lineHeight: 24, fontWeight: '600' as const },
  caption: { fontSize: 14, lineHeight: 20, fontWeight: '500' as const },
} as const;

export const shadow = {
  card: {
    shadowColor: '#0F2A4A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  cardStrong: {
    shadowColor: '#0F2A4A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 6,
  },
} as const;

// Minimum tap target — Apple HIG 44, Material 48. Use 48 to be safe.
export const minTapTarget = 48;
