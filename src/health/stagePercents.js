// Apple Health integration (POC) — safe to delete this file entirely,
// see docs/apple-health-integration.md.
import { getNightWindowMs } from './nightWindow.js'

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
  if (!healthEntry?.stages?.length) return null
  const { startMs, endMs } = getNightWindowMs(night)
  const minutes = {}
  let total = 0
  for (const s of healthEntry.stages) {
    const clipStart = Math.max(s.startMs, startMs)
    const clipEnd = Math.min(s.endMs, endMs)
    if (clipEnd <= clipStart) continue
    const mins = (clipEnd - clipStart) / 60000
    minutes[s.stage] = (minutes[s.stage] || 0) + mins
    total += mins
  }
  if (!total) return null
  const pct = {}
  for (const stage of Object.keys(minutes)) pct[stage] = (minutes[stage] / total) * 100
  return pct
}
