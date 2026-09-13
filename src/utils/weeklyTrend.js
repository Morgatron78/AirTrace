// Shared anchor-date/week-bucketing core for the Trends "All Time"
// section, plus two thin wrappers — one per series. Both wrappers return
// the same shape ({ weekIndex, date, value, count }) so the AHI and
// weight/BMI panels can zip on weekIndex and never drift apart on their
// shared time axis, even though they're bucketing two entirely different
// arrays (nights vs. Apple Health readings).
const WEEK_MS = 7 * 86400000

// Raw (<= 0) index counting backward from anchorMs: 0 for the 7 days
// ending on anchorMs itself, -1 for the 7 days before that, and so on.
// Bucket functions add `shift` (getWeekSpan's return value) to land on a
// friendly 0-based grid instead of exposing negative indices.
function rawWeekIndex(ms, anchorMs) {
  return -Math.floor((anchorMs - ms) / WEEK_MS)
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

// The anchor every weekly series counts backward from — the LATEST used
// night, not the earliest. This guarantees the newest bucket is always a
// genuinely full week: any partial week now falls at the OLDEST end
// (therapy start) instead of silently attaching to "today", which
// previously made the headline "recent" figure an unrepresentative
// small-sample number — confirmed against real production data: a
// 5-night final bucket read 0.9 while the actual last-30-nights trend
// was 1.3. A partial *first* bucket only affects the "since start"
// baseline, which tolerates imprecision far better than "how am I doing
// right now" does.
export function getAnchorMs(nights) {
  const used = nights.filter((n) => !n.noUsage)
  return used.length ? Date.parse(used[used.length - 1].date) : null
}

// How many weeks back the earliest used night sits from anchorMs — the
// single shift both bucketAhiWeekly and bucketWeightWeekly apply so they
// land on the identical 0-based grid regardless of each series' own data
// extent (weight readings can start later, or stop earlier, than the
// earliest/latest CPAP night). Also doubles as the chart's maxWeek, and
// (anchorMs - shift*WEEK_MS) is week-index 0's real calendar start date,
// for tick/confound date math.
export function getWeekSpan(nights, anchorMs) {
  const used = nights.filter((n) => !n.noUsage)
  if (!used.length || anchorMs == null) return 0
  return -rawWeekIndex(Date.parse(used[0].date), anchorMs)
}

// AHI, weekly-averaged across the FULL night history (not the 30-night
// window the rest of Trends uses) — same reason the app already plots
// AHI this way at all: raw nightly data is too noisy over a multi-month
// span.
export function bucketAhiWeekly(nights, anchorMs) {
  const used = nights.filter((n) => !n.noUsage)
  if (!used.length || anchorMs == null) return []
  const shift = getWeekSpan(nights, anchorMs)
  const buckets = new Map()
  for (const n of used) {
    const wi = rawWeekIndex(Date.parse(n.date), anchorMs) + shift
    if (!buckets.has(wi)) buckets.set(wi, { sum: 0, count: 0 })
    const b = buckets.get(wi)
    b.sum += n.ahi
    b.count += 1
  }
  const gridStartMs = anchorMs - shift * WEEK_MS
  const out = []
  for (let wi = 0; wi <= shift; wi++) {
    const b = buckets.get(wi)
    if (!b) continue // a week with zero used nights just isn't a point, not a fabricated gap-fill
    out.push({ weekIndex: wi, date: new Date(gridStartMs + wi * WEEK_MS), value: b.sum / b.count, count: b.count })
  }
  return out
}

// Weight, bucketed onto the SAME week grid as AHI (anchorMs AND shift
// passed in, not recomputed) — a shared grid is what keeps the two
// stacked panels genuinely aligned on one time axis rather than two
// independent timelines that happen to look similar.
//
// Per-week outlier rejection before averaging: any single raw reading
// more than 10kg from that week's own median is dropped. Confirmed
// against this project's real Apple Health export — cleanly removes
// physically-impossible single readings (a failed scale contact) and a
// week where a second person's weight was clearly mixed in (a
// shared-scale artifact), without touching any genuine reading. A week
// with exactly one reading has nothing to reject it against (its median
// is itself), so it always survives untouched.
export function bucketWeightWeekly(weightReadings, anchorMs, shift) {
  if (!weightReadings.length) return []
  const buckets = new Map()
  for (const r of weightReadings) {
    const wi = rawWeekIndex(r.ts, anchorMs) + shift
    if (wi < 0) continue // a reading from before the earliest CPAP night doesn't have a week to belong to on this chart
    if (!buckets.has(wi)) buckets.set(wi, [])
    buckets.get(wi).push(r.kg)
  }
  const gridStartMs = anchorMs - shift * WEEK_MS
  const maxWeek = buckets.size ? Math.max(...buckets.keys()) : -1
  const out = []
  for (let wi = 0; wi <= maxWeek; wi++) {
    const raw = buckets.get(wi)
    if (!raw) continue
    const med = median(raw)
    const clean = raw.filter((kg) => Math.abs(kg - med) <= 10)
    if (!clean.length) continue
    out.push({ weekIndex: wi, date: new Date(gridStartMs + wi * WEEK_MS), value: clean.reduce((s, v) => s + v, 0) / clean.length, count: clean.length })
  }
  return out
}
