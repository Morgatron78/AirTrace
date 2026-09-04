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

// How many CPAP nights even *could* have matched — i.e. had real usage
// and fall within the timespan the export actually covers. Each of
// parsed's three arrays is already sorted (parseHealthExport.js), so its
// own first/last entries bound that timespan without re-scanning
// everything. Used only for the Settings import result message: without
// this, "Matched N of nights.length" compares against the user's entire
// therapy history (often 1+ years) rather than the export's real ~90-day
// window, making a perfectly normal match rate look alarmingly low.
export function countEligibleNights(parsed, nights) {
  const bounds = []
  if (parsed.stages.length) bounds.push(parsed.stages[0].startMs, parsed.stages[parsed.stages.length - 1].endMs)
  if (parsed.heartRate.length) bounds.push(parsed.heartRate[0].ts, parsed.heartRate[parsed.heartRate.length - 1].ts)
  if (parsed.spo2.length) bounds.push(parsed.spo2[0].ts, parsed.spo2[parsed.spo2.length - 1].ts)
  if (!bounds.length) return 0
  const minMs = Math.min(...bounds), maxMs = Math.max(...bounds)
  return nights.filter((n) => {
    if (n.noUsage) return false
    const { startMs } = getNightWindowMs(n)
    return startMs >= minMs && startMs <= maxMs
  }).length
}
