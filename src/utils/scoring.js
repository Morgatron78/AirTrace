import { TrendingUp, TriangleAlert, Trophy, Sparkles, RefreshCw, Droplets, Wind, Upload } from 'lucide-react'
import { C, SEV, T } from '../constants/theme'
import { daysAgo, formatDuration } from './dates'

export function status(ahi, targets) {
  if (ahi < targets.ahi * 0.4) return ['Excellent score!', 'Your therapy is working really well.']
  if (ahi < targets.ahi * 0.6) return ["That's a great score!", "You're well on your way to good sleep."]
  if (ahi < targets.ahi) return ['A solid score.', 'A couple of things worth keeping an eye on.']
  return ['A rougher night.', 'Worth checking your mask and settings.']
}

// Points-earned, not penalties-subtracted, across four capped categories
// that sum to 100 — matches ResMed's own published myAir methodology:
// https://www.resmed.com/en-us/sleep-health/blog/myair-tips-understanding-your-myair-score/
//
// Usage and Mask-off are both categories myAir documents exactly — flat
// rates, the same for every user, deliberately NOT scaled by the user's
// own targets: Usage is 10 points/hour capped at 70 (7 hours maxes it
// out); Mask-off is the real lookup table from myAir's own in-app info
// screen (1-2 events -> 5pts, 3 -> 4pts, 4 -> 3pts, 5 -> 1pt, 6+ -> 0pts).
// Leak and AHI are only described in vague verbal buckets with no
// published numeric thresholds ("minimal leak -> up to 20 points,
// moderate -> 10 to 15, higher -> 0 to 10"; "minimal events -> 4 to 5
// points" — that 4-5 comes from the arithmetic, since 70+20+5+5=100 is
// the only way the four categories add up). Since ResMed doesn't publish
// the actual curve for those two, they're anchored to the user's own
// configured targets instead — hitting a target lands roughly
// mid-bucket, which is also how "override via Settings" works for this
// score: moving a target reshapes exactly where that category's points
// taper off.
//
// Single source of truth for both the score number and its breakdown —
// scoreOf sums these points, ScoreRing's tap-reveal shows them
// individually, so the two can never drift out of sync with each other.
const MASK_OFF_POINTS = { 0: 5, 1: 5, 2: 5, 3: 4, 4: 3, 5: 1 }
export function scoreBreakdown(night, targets) {
  const usage = Math.max(0, Math.min(70, night.usage * 10))
  const leak = Math.max(0, Math.min(20, 20 * (1 - night.leak / (targets.leak * 2.5))))
  const ahi = Math.max(0, Math.min(5, 5 * (1 - night.ahi / (targets.ahi * 2))))
  const maskOff = MASK_OFF_POINTS[night.maskOff] ?? 0
  return [
    { label: 'Usage', points: usage, max: 70 },
    { label: 'Leak', points: leak, max: 20 },
    { label: 'AHI', points: ahi, max: 5 },
    { label: 'Mask-off', points: maskOff, max: 5 },
  ]
}

export function scoreOf(night, targets) {
  if (night.noUsage) return 0
  const total = scoreBreakdown(night, targets).reduce((s, b) => s + b.points, 0)
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
  const avg = (arr, k) => arr.reduce((s, n) => s + n[k], 0) / arr.length
  const last = nights[nights.length - 1]
  const last4 = nights.slice(-4)
  const leakUp = last4.length >= 4 && last4.every((n, i) => i === 0 || n.leak >= last4[i - 1].leak - 1)
  const half = Math.floor(nights.length / 2)
  const firstHalf = nights.slice(0, half), secondHalf = nights.slice(half)
  const trajDiff = firstHalf.length && secondHalf.length ? Math.round(((avg(secondHalf, 'ahi') - avg(firstHalf, 'ahi')) / avg(firstHalf, 'ahi')) * 100) : 0
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
  if (filterDays >= 180) {
    return { icon: Wind, dot: `linear-gradient(135deg,${C.orange},${C.red})`, title: 'Filter overdue for replacement', subtitle: `${filterDays} days since it was last changed`, target: 'equipment' }
  }
  if (trajDiff < -5) {
    return { icon: Trophy, dot: `linear-gradient(135deg,${C.blue},${SEV.good})`, title: 'Trending in the right direction', subtitle: `AHI down ${Math.abs(trajDiff)}% over this window — keep it up`, target: 'trends' }
  }
  return { icon: Sparkles, dot: `linear-gradient(135deg,${C.blue},${C.purple})`, title: 'Nothing urgent right now', subtitle: 'Check Insights for the full picture', target: 'insights' }
}
