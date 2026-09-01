import { TrendingUp, TriangleAlert, Trophy, Sparkles, RefreshCw, Droplets, Wind } from 'lucide-react'
import { C, SEV, T } from '../constants/theme'
import { daysAgo } from './dates'

export function status(ahi, targets) {
  if (ahi < targets.ahi * 0.4) return ['Excellent score!', 'Your therapy is working really well.']
  if (ahi < targets.ahi * 0.6) return ["That's a great score!", "You're well on your way to good sleep."]
  if (ahi < targets.ahi) return ['A solid score.', 'A couple of things worth keeping an eye on.']
  return ['A rougher night.', 'Worth checking your mask and settings.']
}

// Meeting every target simultaneously (AHI at/under target, leak at/under
// target, usage at/over target, mask-off at/under target) is what
// reliably earns 100 — each missed target costs points proportionally.
//
// Single source of truth for both the score number and its breakdown —
// scoreOf sums these penalties, ScoreRing's tap-reveal shows them
// individually, so the two can never drift out of sync with each other.
export function scoreBreakdown(night, targets) {
  return [
    { label: 'AHI', penalty: Math.max(0, night.ahi - targets.ahi) * 6, met: night.ahi <= targets.ahi },
    { label: 'Leak', penalty: Math.max(0, night.leak - targets.leak) * 1, met: night.leak <= targets.leak },
    { label: 'Usage', penalty: Math.max(0, targets.usage - night.usage) * 8, met: night.usage >= targets.usage },
    { label: 'Mask-off', penalty: Math.max(0, night.maskOff - targets.maskOff) * 5, met: night.maskOff <= targets.maskOff },
  ]
}

export function scoreOf(night, targets) {
  if (night.noUsage) return 0
  const total = scoreBreakdown(night, targets).reduce((s, b) => s + b.penalty, 0)
  return Math.round(Math.max(0, Math.min(100, 100 - total)))
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

export function computeStreak(nights, targets) {
  let streak = 0
  for (let i = nights.length - 1; i >= 0; i--) {
    if (nights[i].noUsage) break
    if (nights[i].usage >= targets.usage) streak++
    else break
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

  // Tonight's own warning-triangle stats take priority — the banner should
  // never say "nothing urgent" while a triangle is visible right below it.
  // These route straight to last night's Drill-down, not the vaguer Insights tab.
  if (isConcern('ahi', last, targets)) {
    return { icon: TriangleAlert, dot: `linear-gradient(135deg,${C.orange},${C.red})`, title: "Last night's AHI was high", subtitle: `${last.ahi} events/hr — worth a look at what might have caused it`, target: 'night' }
  }
  if (isConcern('usage', last, targets)) {
    return { icon: TriangleAlert, dot: `linear-gradient(135deg,${C.orange},${C.red})`, title: 'Short night last night', subtitle: `Only ${last.usage}h of usage — under your ${targets.usage}-hour target`, target: 'night' }
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
