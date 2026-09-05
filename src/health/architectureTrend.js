// Apple Health integration (POC) — safe to delete this file entirely,
// see docs/apple-health-integration.md.

// Mirrors src/utils/nagLogic.js's ahiTrend shape (first-half vs
// second-half average, minimum-sample-size guard) but isn't built on top
// of it or added to it — ahiTrend hardcodes n.ahi/n.noUsage/n.tags, and
// nagLogic.js must stay dependency-free and unrelated to Apple Health for
// the service worker (src/sw.js), which has nothing to do with this
// feature. `nightsWithPct` must already be filtered to nights that have
// a real `n[stageKey]` (a flat field, e.g. `remPct`/`deepPct` — matching
// FlatBarChart's own `d[dataKey]` convention, not a nested `pct` object)
// — a night with no Watch data is a different kind of "missing" than
// ahiTrend's own noUsage filtering (no therapy that night), so this file
// doesn't try to reproduce that filtering itself.
//
// No tagShift here, unlike ahiTrend — CLAUDE.md is explicit that tag
// correlation is AHI-only ("Leak was deliberately dropped... AHI only").
// Extending that to sleep-stage percentages isn't part of this feature.
export function architectureTrend(nightsWithPct, stageKey, { minHalfSize = 6 } = {}) {
  const half = Math.floor(nightsWithPct.length / 2)
  const firstHalf = nightsWithPct.slice(0, half)
  const secondHalf = nightsWithPct.slice(half)
  const avg = (arr) => (arr.length ? arr.reduce((s, n) => s + n[stageKey], 0) / arr.length : 0)
  const firstAvg = avg(firstHalf), secondAvg = avg(secondHalf)
  const diffPct = firstHalf.length && secondHalf.length && firstAvg
    ? Math.round(((secondAvg - firstAvg) / firstAvg) * 100)
    : 0
  if (firstHalf.length < minHalfSize || secondHalf.length < minHalfSize) {
    return { diffPct: 0, insufficientData: true }
  }
  return { diffPct, insufficientData: false }
}
