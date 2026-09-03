import { TrendingUp, TriangleAlert, Trophy, Sparkles, RefreshCw, Droplets, Wind, Upload } from 'lucide-react'
import { C, SEV, T } from '../constants/theme'
import { daysAgo, formatDuration } from './dates'

// Several real machine settings (STR.edf's S.C.Press, S.RampEnable, etc —
// see parseSummaries.js) aren't fixed constants — they genuinely change
// over time as a prescription or preference is adjusted, so there's no
// single "current" value baked into a night that predates the latest
// change. For UI that wants one current figure rather than a specific
// night's own (Equipment, Insights, Clinician Report), this walks
// backward for the most recent night that actually recorded a non-null
// value for the given field. Returns fallback if no night ever has (e.g.
// nothing imported yet, or this field predates when it started being
// parsed).
export function mostRecentValue(nights, field, fallback) {
  for (let i = nights.length - 1; i >= 0; i--) {
    if (nights[i][field] != null) return nights[i][field]
  }
  return fallback
}

export function currentSetPressure(nights, fallback) {
  return mostRecentValue(nights, 'setPressure', fallback)
}

// Antibacterial filter changes what kind of filter this actually is, and
// that changes its real lifespan: no antibacterial filter fitted (the
// common case, confirmed via STR.edf's S.ABFilter) means a disposable
// filter, replaced monthly; a reusable one is rinsed monthly but only
// fully replaced every ~6 months. Defaults to the disposable/shorter
// interval when unknown — the safer assumption to warn early on, not late.
export function filterIntervalDays(nights) {
  return mostRecentValue(nights, 'antibacterialFilter', 0) === 1 ? 180 : 30
}

export function status(ahi, targets) {
  if (ahi < targets.ahi * 0.4) return ['Excellent score!', 'Your therapy is working really well.']
  if (ahi < targets.ahi * 0.6) return ["That's a great score!", "You're well on your way to good sleep."]
  if (ahi < targets.ahi) return ['A solid score.', 'A couple of things worth keeping an eye on.']
  return ['A rougher night.', 'Worth checking your mask and settings.']
}

// Points-earned, not penalties-subtracted, across four capped categories
// that sum to 100 — matches ResMed's own published myAir methodology.
// All four tables below are the exact, real lookup tables from myAir's
// own in-app info screens (user-supplied screenshots), not derived or
// approximated — every category turns out to be a flat, universal table,
// the same for every user, none of them scaled by the user's own
// targets. That means the targets configured in Settings no longer feed
// the score itself (they still drive Stats/warning-triangle thresholds
// elsewhere in the app, unaffected by this).
//
// Single source of truth for both the score number and its breakdown —
// scoreOf sums these points, ScoreRing's tap-reveal shows them
// individually, so the two can never drift out of sync with each other.
const MASK_OFF_POINTS = { 0: 5, 1: 5, 2: 5, 3: 4, 4: 3, 5: 1 } // 6+ -> 0, the ?? 0 fallback below
const LEAK_POINTS_TABLE = [
  [16, 20], [18, 19], [20, 18], [22, 17], [24, 16], [26, 15], [28, 14],
  [30, 13], [32, 12], [34, 11], [36, 10], [38, 9], [40, 8], [42, 7],
  [44, 6], [46, 5], [48, 4], [50, 3], [52, 2], [54, 1],
] // 55+ L/min -> 0
const AHI_POINTS_TABLE = [[6, 5], [9, 4], [12, 3], [15, 2], [18, 1]] // 19+ events/hr -> 0
function tablePoints(table, value) {
  for (const [maxInclusive, points] of table) {
    if (value <= maxInclusive) return points
  }
  return 0
}
export function scoreBreakdown(night) {
  const usage = Math.max(0, Math.min(70, night.usage * 10))
  const leak = tablePoints(LEAK_POINTS_TABLE, night.leak)
  const ahi = tablePoints(AHI_POINTS_TABLE, night.ahi)
  const maskOff = MASK_OFF_POINTS[night.maskOff] ?? 0
  return [
    { label: 'Usage', points: usage, max: 70 },
    { label: 'Leak', points: leak, max: 20 },
    { label: 'AHI', points: ahi, max: 5 },
    { label: 'Mask-off', points: maskOff, max: 5 },
  ]
}

export function scoreOf(night) {
  if (night.noUsage) return 0
  const total = scoreBreakdown(night).reduce((s, b) => s + b.points, 0)
  return Math.round(Math.max(0, Math.min(100, total)))
}

export function scoreColor(ahi, targets) {
  return ahi < targets.ahi * 0.6 ? SEV.good : ahi < targets.ahi ? SEV.fair : SEV.bad
}

export function dueColor(days, intervalDays) {
  if (days >= intervalDays) return SEV.bad
  if (days >= intervalDays * 0.75) return SEV.fair
  return T.ink
}

export function isConcern(kind, night, targets) {
  if (kind === 'usage') return night.usage < targets.usage
  if (kind === 'ahi') return night.ahi >= targets.ahi
  if (kind === 'leak') return night.leak >= targets.leak
  if (kind === 'seal') return night.seal === 'Poor'
  if (kind === 'maskOff') return night.maskOff >= targets.maskOff
  return false
}

// myAir gives 4 free "streak freezes" per calendar month — a night that
// misses the usage goal doesn't reset the streak (it's just skipped, not
// counted) as long as a freeze is still available for the month it falls
// in. Applies from the very first night scanned (last night itself can
// be freeze-protected, not just an already-running streak), and budgets
// reset per calendar month, not a rolling 30-day window — myAir's own
// wording is "4 free freezes a month."
const STREAK_FREEZES_PER_MONTH = 4
export function computeStreak(nights, targets) {
  let streak = 0
  const freezesUsedByMonth = {} // 'YYYY-MM' -> count already spent
  for (let i = nights.length - 1; i >= 0; i--) {
    const n = nights[i]
    if (!n.noUsage && n.usage >= targets.usage) { streak++; continue }
    const month = n.date.slice(0, 7)
    const used = freezesUsedByMonth[month] || 0
    if (used < STREAK_FREEZES_PER_MONTH) { freezesUsedByMonth[month] = used + 1; continue }
    break
  }
  return streak
}

// The single most relevant thing to surface right now — used for Today's
// proactive banner. Insights itself shows the fuller list.
export function getPrimaryInsight(nights, targets, equipment) {
  const avgUsed = (arr, k) => {
    const used = arr.filter((n) => !n.noUsage)
    return used.length ? used.reduce((s, n) => s + n[k], 0) / used.length : 0
  }
  const last = nights[nights.length - 1]
  // Same two fixes as InsightsScreen.jsx's own copies of this exact
  // logic (a separate implementation here, never got the same pass):
  // "4 nights running" needs 4 real *used* nights, not the last 4
  // calendar entries — a no-usage night's zeroed leak landing at the
  // front made the non-decreasing check trivially true forever after.
  const last4Used = nights.filter((n) => !n.noUsage).slice(-4)
  const leakUp = last4Used.length === 4 && last4Used.every((n, i) => i === 0 || n.leak >= last4Used[i - 1].leak - 1)
  // Trajectory: recent window (last ~60 nights) split in half, not the
  // entire import history — "this window"/"recently" in the banner text
  // below means recently, not "the first half of 18 months of history
  // vs the second". avgUsed (not a plain avg) so no-usage nights' zeroed
  // AHI doesn't drag either half down.
  const recentWindow = nights.slice(-60)
  const half = Math.floor(recentWindow.length / 2)
  const firstHalf = recentWindow.slice(0, half), secondHalf = recentWindow.slice(half)
  const firstHalfAhi = avgUsed(firstHalf, 'ahi')
  // Same minimum-sample guard Trends already has for this identical
  // comparison (its own MIN_HALF_FOR_TREND) — a newer user with only a
  // handful of nights imported would otherwise get a confident "trending
  // in the wrong direction" banner off a 2-3-night half, indistinguishable
  // from ordinary noise at that size.
  const trajDiff = half >= 6 && firstHalfAhi ? Math.round(((avgUsed(secondHalf, 'ahi') - firstHalfAhi) / firstHalfAhi) * 100) : 0
  const cushionDays = daysAgo(equipment.cushionChanged)
  const headgearDays = daysAgo(equipment.headgearWashed)
  const filterDays = daysAgo(equipment.filterChanged)

  // last.noUsage doesn't only mean "you skipped a night" — STR.edf's own
  // last record is always a not-yet-populated placeholder for today until
  // the next import, so this is the everyday state of the app on any day
  // before that day's card has been imported, not a one-time first-run
  // edge case. Surfacing "Short night — 0h 0m of usage" here would be
  // actively misleading (there's no real night to judge yet, and every
  // one of last night's own stats is a zeroed placeholder, not data) —
  // prompting the actual next step is far more useful, and takes priority
  // over everything else since it's blocking every other stat on the page.
  if (last.noUsage) {
    return { icon: Upload, dot: `linear-gradient(135deg,${C.blue},${C.purple})`, title: 'No data imported for today yet', subtitle: "Import your SD card to see last night's results", target: 'import' }
  }

  // Tonight's own warning-triangle stats take priority — the banner should
  // never say "nothing urgent" while a triangle is visible right below it.
  // These route straight to last night's Drill-down, not the vaguer Insights tab.
  if (isConcern('ahi', last, targets)) {
    return { icon: TriangleAlert, dot: `linear-gradient(135deg,${C.orange},${C.red})`, title: "Last night's AHI was high", subtitle: `${last.ahi} events/hr — worth a look at what might have caused it`, target: 'night' }
  }
  if (isConcern('usage', last, targets)) {
    return { icon: TriangleAlert, dot: `linear-gradient(135deg,${C.orange},${C.red})`, title: 'Short night last night', subtitle: `Only ${formatDuration(last.usage)} of usage — under your ${targets.usage}-hour target`, target: 'night' }
  }
  if (isConcern('leak', last, targets)) {
    return { icon: TriangleAlert, dot: `linear-gradient(135deg,${C.orange},${C.red})`, title: 'High leak last night', subtitle: `${last.leak} L/min — worth checking your mask seal`, target: 'night' }
  }
  if (isConcern('seal', last, targets)) {
    return { icon: TriangleAlert, dot: `linear-gradient(135deg,${C.orange},${C.red})`, title: 'Mask seal rated poor last night', subtitle: 'Worth checking cushion fit and headgear tension', target: 'night' }
  }
  if (trajDiff > 5) {
    return { icon: TrendingUp, dot: `linear-gradient(135deg,${C.orange},${C.red})`, title: 'Trending in the wrong direction', subtitle: `AHI up ${Math.abs(trajDiff)}% over this window — worth a closer look`, target: 'trends' }
  }
  if (leakUp) {
    return {
      icon: TriangleAlert, dot: `linear-gradient(135deg,${C.orange},${C.red})`, title: 'Leak trending up',
      subtitle: cushionDays > 60 ? `4 nights running — your cushion is ${cushionDays} days old, likely why` : '4 nights running — check your mask seal', target: 'trends',
    }
  }
  // Overdue equipment — same thresholds MaintenanceRow uses to show its own triangle
  if (cushionDays >= 90) {
    return { icon: RefreshCw, dot: `linear-gradient(135deg,${C.orange},${C.red})`, title: 'Cushion overdue for replacement', subtitle: `${cushionDays} days since it was last changed`, target: 'equipment' }
  }
  if (headgearDays >= 14) {
    return { icon: Droplets, dot: `linear-gradient(135deg,${C.orange},${C.red})`, title: 'Headgear overdue for a wash', subtitle: `${headgearDays} days since it was last washed`, target: 'equipment' }
  }
  if (filterDays >= filterIntervalDays(nights)) {
    return { icon: Wind, dot: `linear-gradient(135deg,${C.orange},${C.red})`, title: 'Filter overdue for replacement', subtitle: `${filterDays} days since it was last changed`, target: 'equipment' }
  }
  if (trajDiff < -5) {
    return { icon: Trophy, dot: `linear-gradient(135deg,${C.blue},${SEV.good})`, title: 'Trending in the right direction', subtitle: `AHI down ${Math.abs(trajDiff)}% over this window — keep it up`, target: 'trends' }
  }
  return { icon: Sparkles, dot: `linear-gradient(135deg,${C.blue},${C.purple})`, title: 'Nothing urgent right now', subtitle: 'Check Insights for the full picture', target: 'insights' }
}
