// Apple Health integration (POC) — safe to delete this file entirely,
// see docs/apple-health-integration.md.
import { getNightWindowMs } from './nightWindow.js'

// Buckets parsed Apple Health samples (parseHealthExport.js's output) into
// whichever CPAP night's own session window each falls inside. Exact
// containment only, no buffer around the window — Watch sleep detected
// shortly before mask-on or after mask-off is excluded (see the POC's
// known-simplifications note in docs/apple-health-integration.md).
//
// Nights with zero matched samples across all three categories are
// omitted from the result entirely, matching this app's existing "missing
// store entry = not shown" convention rather than writing an empty row.
//
// Returns { [date]: { stages, heartRate, spo2 } }, ready to be written one
// entry at a time via db/health.js's setHealthEntry.
export function matchHealthDataToNights(parsed, nights) {
  const result = {}
  for (const night of nights) {
    if (night.noUsage) continue
    const { startMs, endMs } = getNightWindowMs(night)
    const inWindow = (t) => t >= startMs && t < endMs

    const stages = parsed.stages.filter((s) => inWindow(s.startMs))
    const heartRate = parsed.heartRate.filter((s) => inWindow(s.ts))
    const spo2 = parsed.spo2.filter((s) => inWindow(s.ts))

    if (stages.length || heartRate.length || spo2.length) {
      result[night.date] = { stages, heartRate, spo2 }
    }
  }
  return result
}
