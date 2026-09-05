// Apple Health integration (POC) — safe to delete this file entirely,
// see docs/apple-health-integration.md.
import { getNightWindowMs } from './nightWindow.js'

// Minutes spent in each sleep stage that night, clipped to the CPAP
// session window — the shared computation stagePercents.js (percentages)
// and stageAhi.js (events/hour per stage) both need, plus Trends' own
// Sleep architecture chart (absolute per-night duration). Previously
// duplicated in the first two; extracted once a third real consumer
// showed up. Returns null if there's no health data for this night at
// all — same "missing entry = not shown" convention used everywhere else
// this feature touches.
export function stageMinutes(healthEntry, night) {
  if (!healthEntry?.stages?.length) return null
  const { startMs, endMs } = getNightWindowMs(night)
  const minutes = {}
  for (const s of healthEntry.stages) {
    const clipStart = Math.max(s.startMs, startMs)
    const clipEnd = Math.min(s.endMs, endMs)
    if (clipEnd > clipStart) minutes[s.stage] = (minutes[s.stage] || 0) + (clipEnd - clipStart) / 60000
  }
  return Object.keys(minutes).length ? minutes : null
}
