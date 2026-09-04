import { C } from './theme'

// Apple Health integration (POC) — see docs/apple-health-integration.md.
// Mirrors tags.js's TAG_LABEL/TAG_COLOR pattern. Keys match the decoded
// `stage` field src/health/parseHealthExport.js produces from HealthKit's
// numeric HKCategoryValueSleepAnalysis value (2/3/4/5) — never from the
// export app's own unreliable label string, see parseHealthExport.js.
export const STAGE_LABEL = { awake: 'Awake', core: 'Core', deep: 'Deep', rem: 'REM' }
export const STAGE_COLOR = { awake: '#7C7C88', core: C.blue, deep: C.purple, rem: C.pink }
