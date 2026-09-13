// Confound flagging for the Trends "All Time" AHI panel, built entirely
// from data the app already parses (STR.edf's S.C.Press, see
// parseSummaries.js) — not a new tracking feature. Nights-only, and
// deliberately agnostic to device mode (CPAP vs APAP): S.C.Press only
// means "prescription" on a fixed-pressure machine, so the caller is
// responsible for gating this on a confirmed-CPAP `mode` check before
// calling it at all — keeping device-mode a call-site concern rather
// than tangled into this algorithm.
//
// Finds the longest suffix of nights (with a real setPressure reading)
// that all share the current value — the "stable stretch" that's still
// active today. If that suffix covers the whole history, there's nothing
// to flag: correctly returns null for the common case (pressure has
// always been what it is now) without a separate "was it ever constant"
// check.
export function findPressureConfound(nights) {
  const withPressure = nights.filter((n) => n.setPressure != null)
  if (!withPressure.length) return null

  const current = withPressure[withPressure.length - 1].setPressure
  let stableStartIdx = withPressure.length - 1
  while (stableStartIdx > 0 && withPressure[stableStartIdx - 1].setPressure === current) stableStartIdx--
  if (stableStartIdx === 0) return null // the whole history is one value — nothing to shade

  // Real (date, setPressure) transition points inside the shaded region,
  // for the tap-to-reveal popover — one entry per genuine change, not
  // one per night.
  const transitions = []
  for (let i = 0; i < stableStartIdx; i++) {
    if (i === 0 || withPressure[i].setPressure !== withPressure[i - 1].setPressure) {
      transitions.push({ date: withPressure[i].date, setPressure: withPressure[i].setPressure })
    }
  }

  return {
    shadeStartDate: withPressure[0].date,
    boundaryDate: withPressure[stableStartIdx].date, // shading ends here (exclusive); the boundary line is drawn here
    transitions,
  }
}
