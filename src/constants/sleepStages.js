import { Sun, Moon, Waves, Eye } from 'lucide-react'
import { C } from './theme'

// Apple Health integration (POC) — see docs/apple-health-integration.md.
// Mirrors tags.js's TAG_LABEL/TAG_COLOR pattern. Keys match the decoded
// `stage` field src/health/parseHealthExport.js produces from HealthKit's
// numeric HKCategoryValueSleepAnalysis value (2/3/4/5) — never from the
// export app's own unreliable label string, see parseHealthExport.js.
export const STAGE_LABEL = { awake: 'Awake', core: 'Core', deep: 'Deep', rem: 'REM' }
export const STAGE_COLOR = { awake: '#7C7C88', core: C.blue, deep: C.purple, rem: C.pink }
// Icons, not just color swatches — used everywhere a sleep stage needs a
// small visual marker (Sleep stages legend/AHI-by-stage rows, the event
// popover's "Sleep stage" row, Trends' REM/Deep tab icons). Deliberately
// icon-shape-distinct rather than relying on color alone: a stage marker
// sitting right next to a scored-event marker (own color palette, red/
// orange/blue) in the same popover would otherwise compete for the same
// visual channel. Sun/Moon (Awake/Core) pair naturally; Eye/Waves
// (REM/Deep) are literal (rapid eye movement; slow-wave sleep).
export const STAGE_ICON = { awake: Sun, core: Moon, deep: Waves, rem: Eye }
