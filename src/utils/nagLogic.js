// Zero imports from anything that touches lucide-react/theme/React —
// deliberately, not by accident. src/sw.js (the service worker) needs
// this exact logic to decide whether a push notification is worth
// showing, and a service worker must never pull in UI-only code (icon
// components, DOM-dependent theme tokens) just to reach a date
// calculation or a threshold check. App.jsx/TrendsScreen.jsx import this
// same module for their own on-screen use of the identical logic, so
// there's exactly one implementation of each of these, not two that can
// drift apart. tagLabels.js is the one exception to "zero imports" — it's
// itself dependency-free (see its own header), just plain tag-key/label
// data split out of tags.js specifically so this file can reach it.
import { TAG_LABEL } from '../constants/tagLabels.js'

export const toDateStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// Every date from tagStartDate through yesterday with no tagLog entry —
// extracted verbatim from App.jsx's own original inline computation.
// Independent of imported night data entirely, since the whole point is
// catching up on a date even if that night hasn't been imported yet.
export function getUntaggedDates(tagLog, tagStartDate) {
  if (!tagStartDate) return []
  const out = []
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1); yesterday.setHours(0, 0, 0, 0)
  for (const d = new Date(`${tagStartDate}T00:00:00`); d <= yesterday; d.setDate(d.getDate() + 1)) {
    const ds = toDateStr(d)
    if (!tagLog[ds]) out.push(ds)
  }
  return out
}

// Same thresholds dueColor (scoring.js) already used — extracted so the
// service worker can check "is this actually overdue" without reaching
// into scoring.js, which imports lucide-react icons at module scope.
// dueColor itself now calls isOverdue/isApproaching rather than
// duplicating this arithmetic, so there's still only one definition.
export function isOverdue(days, intervalDays) {
  return days >= intervalDays
}
export function isApproaching(days, intervalDays) {
  return days >= intervalDays * 0.75
}

// Already pure — re-exported here (not just left in scoring.js) so the
// service worker has one place to import every piece of this decision
// logic from, rather than half from here and half from scoring.js.
export function filterIntervalDays(nights) {
  return mostRecentValue(nights, 'antibacterialFilter', 0) === 1 ? 180 : 30
}

// Also needed by filterIntervalDays above. scoring.js has its own public
// mostRecentValue export too (used for several other fields — set
// pressure, mask type, humidifier status, none of which the service
// worker needs) — this is a separate, local copy rather than importing
// scoring.js just for one function, since scoring.js imports
// lucide-react at module scope.
function mostRecentValue(nights, field, fallback) {
  for (let i = nights.length - 1; i >= 0; i--) {
    if (nights[i][field] != null) return nights[i][field]
  }
  return fallback
}

// Extracted verbatim from App.jsx's own original inline computation — the
// weekly-summary push (src/sw.js) needs the exact same per-night tag
// array App.jsx builds for every screen, and can't run App.jsx's own
// useMemo. App.jsx now calls this instead of duplicating the logic, then
// layers its own UI-only fields (tagStatus, alcoholLevel, note) on top.
// Manual tags come from a tagLog entry's booleans; 'lateStart' is always
// auto-detected from the machine's own recorded session start vs.
// targets.bedtime, independent of whether there's a tagLog entry at all.
export function computeNightTags(night, tagLog, targets) {
  const entry = tagLog[night.date]
  let tags = entry ? [
    ...(entry.alcohol ? ['alcohol'] : []),
    ...(entry.lateMeal ? ['lateMeal'] : []),
    ...(entry.awayFromHome ? ['awayFromHome'] : []),
    ...(entry.highStress ? ['highStress'] : []),
    ...(entry.illness ? ['illness'] : []),
  ] : []
  if (!night.noUsage && night.startHour > targets.bedtime + 2) tags = [...tags, 'lateStart']
  return tags
}

// Mirrors TrendsScreen's own "does an AHI move link back to a tag" logic
// (the v0.1.49 feature) — extracted here as the one shared implementation
// so the weekly-summary push's claim about a night's data can never
// disagree with what Trends itself would say about those exact same
// nights. firstHalf/secondHalf just need `.noUsage`, `.ahi`, `.tags` on
// each night — TrendsScreen's own `data` array already has that shape, as
// does a night run through computeNightTags above. Callers format their
// own final sentence from the returned numbers — Trends' in-app copy and
// a push notification's copy are legitimately different lengths/styles,
// so formatting deliberately isn't shared, only the underlying numbers.
export function ahiTrend(firstHalf, secondHalf, { minHalfSize = 6, thresholdPct = 8, tagShiftPct = 20 } = {}) {
  const avgAhi = (arr) => {
    const used = arr.filter((n) => !n.noUsage)
    return used.length ? used.reduce((s, n) => s + n.ahi, 0) / used.length : 0
  }
  const firstAhi = avgAhi(firstHalf)
  const secondAhi = avgAhi(secondHalf)
  const diffPct = firstHalf.length && secondHalf.length && firstAhi
    ? Math.round(((secondAhi - firstAhi) / firstAhi) * 100)
    : 0
  if (firstHalf.length < minHalfSize || secondHalf.length < minHalfSize) {
    return { diffPct: 0, tagShift: null, insufficientData: true }
  }
  if (diffPct <= thresholdPct && diffPct >= -thresholdPct) {
    return { diffPct, tagShift: null, insufficientData: false }
  }
  // A single-tag frequency shift, not a controlled comparison — the blunt
  // >=tagShiftPct-point bar is why callers frame this as "may be part of
  // it," never as an asserted cause (see TrendsScreen's own copy).
  const rose = diffPct > thresholdPct
  const freq = (arr, tk) => (arr.length ? arr.filter((n) => n.tags.includes(tk)).length / arr.length : 0)
  const candidates = Object.keys(TAG_LABEL)
    .map((tk) => ({
      tk,
      ptDiff: Math.round((freq(secondHalf, tk) - freq(firstHalf, tk)) * 100),
      c1: firstHalf.filter((n) => n.tags.includes(tk)).length,
      c2: secondHalf.filter((n) => n.tags.includes(tk)).length,
    }))
    .filter((c) => (rose ? c.ptDiff >= tagShiftPct : c.ptDiff <= -tagShiftPct))
    .sort((a, b) => Math.abs(b.ptDiff) - Math.abs(a.ptDiff))
  return { diffPct, tagShift: candidates[0] || null, insufficientData: false }
}
