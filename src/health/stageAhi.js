// Apple Health integration (POC) — safe to delete this file entirely,
// see docs/apple-health-integration.md.
import { getNightWindowMs } from './nightWindow.js'
import { stageAt } from './lookupAtTime.js'
import { stageMinutes } from './stageMinutes.js'

// All three scored types count toward "AHI" (Apnea-Hypopnea Index) here,
// matching how night.ahi is computed from STR.edf elsewhere in this app
// (obstructive + central + hypopnea) — a different convention from
// detail.js's timeInApneaSec, which deliberately excludes hypopnea to
// match OSCAR's "time in apnoea" stat. Two different named metrics, two
// different real definitions; not a bug that they disagree.
const AHI_EVENT_TYPES = new Set(['obstructive', 'central', 'hypopnea'])

// For the night currently being viewed: how many minutes were spent in
// each sleep stage, and what the events-per-hour rate was *within just
// that stage's own time* — not the whole-night AHI split four ways, but
// each stage's own real rate, which is what actually answers "is this
// stage worse than that one" rather than "how much of the bad stuff
// happened to fall in this stage by sheer proportion of time."
//
// Returns null if there's no health data for this night at all (same
// "missing entry = not shown" convention as everywhere else this feature
// touches). Stages with zero minutes recorded are omitted — dividing by
// zero isn't a rate, it's a missing data point.
export function computeAhiByStage(events, healthEntry, night) {
  const minutes = stageMinutes(healthEntry, night)
  if (!minutes) return null

  const { startMs } = getNightWindowMs(night)
  const stageCounts = {}
  for (const e of events || []) {
    if (!AHI_EVENT_TYPES.has(e.type)) continue
    const ms = startMs + e.x * night.usage * 3600000
    const stage = stageAt(healthEntry, ms)
    if (stage) stageCounts[stage] = (stageCounts[stage] || 0) + 1
  }

  return Object.keys(minutes)
    .map((stage) => ({ stage, minutes: minutes[stage], ahi: (stageCounts[stage] || 0) / (minutes[stage] / 60) }))
}
