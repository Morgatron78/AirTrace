import { Wine, UtensilsCrossed, Plane, Zap, Thermometer, Moon } from 'lucide-react'
import { C } from './theme'

// lateStart deliberately uses fixed literals, not T.muted/T.ink — T's
// values mutate in place when dark mode toggles (see theme.js), but a
// plain object property here would capture T's *value* once at import
// time and never see the update. C's own accent colors are fine as-is
// since they're never mutated by theme changes (dark mode only swaps
// T's neutrals). "Late start" was always meant to read as a deliberately
// muted/neutral badge next to the other tags' vivid colors — freezing it
// at its light-mode appearance keeps that intent on both themes rather
// than needing its own light/dark pair.
const LATE_START_MUTED = '#7C7C88'
const LATE_START_INK = '#0A0A0C'

export const TAG_LABEL = { alcohol: 'Alcohol', lateMeal: 'Late meal', awayFromHome: 'Away from home', highStress: 'High stress', illness: 'Congestion/illness', lateStart: 'Late start' }
export const TAG_ICON = { alcohol: Wine, lateMeal: UtensilsCrossed, awayFromHome: Plane, highStress: Zap, illness: Thermometer, lateStart: Moon }
export const TAG_COLOR = { alcohol: C.purple, lateMeal: C.orange, awayFromHome: C.blue, highStress: C.red, illness: C.pink, lateStart: LATE_START_MUTED }
export const TAG_GRADIENT = {
  alcohol: `linear-gradient(135deg,${C.purple},${C.pink})`,
  lateMeal: `linear-gradient(135deg,${C.orange},${C.red})`,
  awayFromHome: `linear-gradient(135deg,${C.blue},${C.purple})`,
  highStress: `linear-gradient(135deg,${C.red},${C.orange})`,
  illness: `linear-gradient(135deg,${C.pink},${C.red})`,
  lateStart: `linear-gradient(135deg,${LATE_START_MUTED},${LATE_START_INK})`,
}

// Auto-detected from the machine's own data (session start vs. Target
// bedtime) — never logged by the user, always known, never part of the
// review/nag flow. Flagged separately so anywhere tags are shown can mark
// it as computed rather than something the user reported.
export const AUTO_TAGS = new Set(['lateStart'])

// Alcohol is graded (dose-dependent effect on airway muscle relaxation);
// the rest are flat yes/no — grading them wouldn't earn its complexity.
export const GRADED_TAGS = { alcohol: ['light', 'heavy'] }
