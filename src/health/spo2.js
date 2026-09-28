// Apple Health integration — safe to delete this file entirely,
// see docs/apple-health-integration.md.

// A real, recognized desaturation threshold (not this app's own guess) —
// below this, SpO2 gets flagged the same way other real concerns already
// are elsewhere (isConcern's red), not just reported as a plain number
// indistinguishable from a healthy reading.
export const SPO2_LOW_THRESHOLD = 90

// Judged on the rounded value, not the raw one: Apple reports fractional
// readings (e.g. 89.6) and every place this is displayed shows the rounded
// number, so flagging on the raw value could paint a reading red that
// visibly reads "90%". Shared by the event popover and the SpO2 card so the
// two can never disagree about the same reading.
export function isLowSpo2(pct) {
  return Math.round(pct) < SPO2_LOW_THRESHOLD
}

// Lowest / average / count across one night's readings ({ts, pct}[]),
// rounded the way they're displayed. Caller guarantees at least one reading.
export function summarizeSpo2(readings) {
  const pcts = readings.map((r) => r.pct)
  return {
    low: Math.round(Math.min(...pcts)),
    avg: Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length),
    count: pcts.length,
  }
}
