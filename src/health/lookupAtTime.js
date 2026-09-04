// Apple Health integration (POC) — safe to delete this file entirely,
// see docs/apple-health-integration.md.
//
// Small, pure lookup helpers used only by EventsChart.jsx's popover
// addition, kept in their own file specifically so that component's own
// diff is just JSX plus one function call each, not new logic.

// The sleep-stage segment containing a given absolute timestamp, or
// undefined if none does (e.g. a gap between segments, or no Watch data
// near this moment at all).
export function stageAt(entry, ms) {
  return entry?.stages?.find((s) => ms >= s.startMs && ms < s.endMs)?.stage
}

// The nearest reading (heartRate or spo2 array — both share the shape
// {ts, ...}) to a given timestamp, within maxGapMs, or undefined if
// nothing is that close. Single nearest raw sample only — no
// interpolation or averaging between two samples.
export function nearestReading(list, ms, maxGapMs) {
  if (!list?.length) return undefined
  let best, bestGap = Infinity
  for (const r of list) {
    const gap = Math.abs(r.ts - ms)
    if (gap < bestGap) { best = r; bestGap = gap }
  }
  return bestGap <= maxGapMs ? best : undefined
}
