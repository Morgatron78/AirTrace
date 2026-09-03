// Zero imports from anything that touches lucide-react/theme/React —
// deliberately, not by accident. src/sw.js (the service worker) needs
// this exact logic to decide whether a push notification is worth
// showing, and a service worker must never pull in UI-only code (icon
// components, DOM-dependent theme tokens) just to reach a date
// calculation or a threshold check. App.jsx imports this same module
// for its own on-screen use of the identical logic, so there's exactly
// one implementation of each of these, not two that can drift apart.

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

// Also needed by filterIntervalDays above, and small/pure enough to
// duplicate having it here rather than importing scoring.js just for
// this one function — scoring.js keeps its own copy too (unchanged),
// since plenty of non-service-worker code already depends on it from
// there and re-pointing all of it isn't in scope of this change.
function mostRecentValue(nights, field, fallback) {
  for (let i = nights.length - 1; i >= 0; i--) {
    if (nights[i][field] != null) return nights[i][field]
  }
  return fallback
}
