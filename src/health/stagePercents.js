// Apple Health integration (POC) — safe to delete this file entirely,
// see docs/apple-health-integration.md.
import { stageMinutes } from './stageMinutes.js'

// Percent of a night's total *categorized* sleep-stage time (Awake+Core+
// Deep+REM summed together) spent in one stage — the same denominator
// Apple's own Health app uses, confirmed against a real Health app
// screenshot this session: 9min Awake + 93min REM + 209min Core + 32min
// Deep = 343min total; 93/343 = 27.1%, matching Health's own displayed
// "27%" exactly. Deliberately NOT a percent of night.usage (the CPAP
// session length) and NOT "asleep time only" (excluding Awake) — either
// would quietly disagree with the number already familiar from Apple
// Health/MyAir for the same night.
//
// Returns null if there's no health data for this night at all — same
// "missing entry = not shown" convention used everywhere else this
// feature touches.
export function stagePercents(healthEntry, night) {
  const minutes = stageMinutes(healthEntry, night)
  if (!minutes) return null
  const total = Object.values(minutes).reduce((s, m) => s + m, 0)
  if (!total) return null
  const pct = {}
  for (const stage of Object.keys(minutes)) pct[stage] = (minutes[stage] / total) * 100
  return pct
}
