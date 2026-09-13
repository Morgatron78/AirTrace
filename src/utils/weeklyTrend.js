// Shared anchor-date/week-bucketing core for the Trends "All Time"
// section, plus two thin wrappers — one per series. Both wrappers return
// the same shape ({ weekIndex, date, value, count }) so the AHI and
// weight/BMI panels can zip on weekIndex and never drift apart on their
// shared time axis, even though they're bucketing two entirely different
// arrays (nights vs. Apple Health readings).
const WEEK_MS = 7 * 86400000

function weekIndexFor(ms, anchorMs) {
  return Math.floor((ms - anchorMs) / WEEK_MS)
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

// The shared anchor every weekly series (AHI, weight, x-axis ticks,
// confound date mapping) is bucketed against — the earliest used night,
// so week 0 always starts on real therapy start, not an arbitrary
// calendar boundary. Exposed so the caller can pass the exact same value
// into bucketWeightWeekly and into tick/confound x-position math, rather
// than each recomputing it and risking drift.
export function getAnchorMs(nights) {
  const used = nights.filter((n) => !n.noUsage)
  return used.length ? Date.parse(used[0].date) : null
}

// AHI, weekly-averaged across the FULL night history (not the 30-night
// window the rest of Trends uses) — same reason the app already plots
// AHI this way at all: raw nightly data is too noisy over a multi-month
// span.
export function bucketAhiWeekly(nights, anchorMs) {
  const used = nights.filter((n) => !n.noUsage)
  if (!used.length || anchorMs == null) return []
  const buckets = new Map()
  for (const n of used) {
    const wi = weekIndexFor(Date.parse(n.date), anchorMs)
    if (!buckets.has(wi)) buckets.set(wi, { sum: 0, count: 0 })
    const b = buckets.get(wi)
    b.sum += n.ahi
    b.count += 1
  }
  const maxWeek = Math.max(...buckets.keys())
  const out = []
  for (let wi = 0; wi <= maxWeek; wi++) {
    const b = buckets.get(wi)
    if (!b) continue // a week with zero used nights just isn't a point, not a fabricated gap-fill
    out.push({ weekIndex: wi, date: new Date(anchorMs + wi * WEEK_MS), value: b.sum / b.count, count: b.count })
  }
  return out
}

// APPLE-HEALTH: weight, bucketed onto the SAME week grid as AHI (anchorMs passed in,
// not recomputed) — a shared anchor is what keeps the two stacked panels
// genuinely aligned on one time axis rather than two independent
// timelines that happen to look similar.
//
// Per-week outlier rejection before averaging: any single raw reading
// more than 10kg from that week's own median is dropped. Confirmed
// against this project's real Apple Health export — cleanly removes
// physically-impossible single readings (a failed scale contact) and a
// week where a second person's weight was clearly mixed in (a
// shared-scale artifact), without touching any genuine reading. A week
// with exactly one reading has nothing to reject it against (its median
// is itself), so it always survives untouched.
export function bucketWeightWeekly(weightReadings, anchorMs) {
  if (!weightReadings.length) return []
  const buckets = new Map()
  for (const r of weightReadings) {
    const wi = weekIndexFor(r.ts, anchorMs)
    if (wi < 0) continue // a reading from before therapy start doesn't have a week to belong to on this chart
    if (!buckets.has(wi)) buckets.set(wi, [])
    buckets.get(wi).push(r.kg)
  }
  const maxWeek = Math.max(...buckets.keys())
  const out = []
  for (let wi = 0; wi <= maxWeek; wi++) {
    const raw = buckets.get(wi)
    if (!raw) continue
    const med = median(raw)
    const clean = raw.filter((kg) => Math.abs(kg - med) <= 10)
    if (!clean.length) continue
    out.push({ weekIndex: wi, date: new Date(anchorMs + wi * WEEK_MS), value: clean.reduce((s, v) => s + v, 0) / clean.length, count: clean.length })
  }
  return out
}
