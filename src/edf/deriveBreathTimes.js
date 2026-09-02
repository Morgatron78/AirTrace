// Inspiration/Expiration Time — the one pair of channels this device
// genuinely doesn't record anywhere (confirmed against every real
// BRP.edf/PLD.edf signal list; see CLAUDE.md's "Real file structure"
// section). OSCAR doesn't read them from the card either — it derives
// them from the raw Flow waveform, the same approach taken here: each
// time Flow crosses zero (positive = inhaling, negative = exhaling,
// same convention as the Flow channel everywhere else in this app) marks
// a breath-phase boundary, and the time between crossings is that
// breath's inspiration or expiration duration.
//
// A plain zero-crossing detector is too twitchy on real data — small
// flow flutter right around zero (sensor noise, or the brief near-zero
// moment at the top/bottom of a breath) would register as extra
// spurious phase changes. A deadband (hysteresis) around zero fixes
// this: a phase only ends once Flow has clearly moved past the deadband
// in the new direction, not merely touched zero.
const FLOW_DEADBAND_L_PER_S = 0.05

// flow: Float32Array of signed L/s samples at flowSampleRateHz (BRP.edf's
// real 25Hz Flow.40ms). totalNightSec: the night's real recorded span
// (same value parseNight.js already computes from BRP's own header).
// numOutputSamples: how many output points to produce — passed in as
// another PLD-rate channel's own .length (e.g. leak's), so these two new
// channels slot into the exact same per-night sample grid every other
// PLD-derived channel already uses, with no special-casing needed
// anywhere else (CHANNEL_REGISTRY, chart decimation, Statistics, etc.
// all just treat them as one more values array).
//
// Each output sample holds "the duration of whichever inspiration/
// expiration phase was most recently completed as of that moment" —
// forward-filled across every output sample that phase actually spanned,
// so the chart reads as a breath-by-breath step function rather than
// needing its own irregular (one-point-per-breath) time axis.
export function deriveBreathPhaseTimes(flow, flowSampleRateHz, totalNightSec, numOutputSamples) {
  const inspTime = new Float32Array(numOutputSamples)
  const expTime = new Float32Array(numOutputSamples)
  if (numOutputSamples === 0 || flow.length === 0) return { inspTime, expTime }

  const outputIntervalSec = totalNightSec / numOutputSamples
  let lastInsp = 0, lastExp = 0
  function fillRange(fromSec, toSec) {
    const fromIdx = Math.max(0, Math.floor(fromSec / outputIntervalSec))
    const toIdx = Math.min(numOutputSamples, Math.ceil(toSec / outputIntervalSec))
    for (let i = fromIdx; i < toIdx; i++) { inspTime[i] = lastInsp; expTime[i] = lastExp }
  }

  let state = null // 'in' | 'out' — null until the first real (past-deadband) crossing
  let phaseStartSec = 0
  for (let i = 0; i < flow.length; i++) {
    const t = i / flowSampleRateHz
    const v = flow[i]
    if (state === null) {
      if (v > FLOW_DEADBAND_L_PER_S) state = 'in'
      else if (v < -FLOW_DEADBAND_L_PER_S) state = 'out'
      phaseStartSec = t
      continue
    }
    if (state === 'in' && v < -FLOW_DEADBAND_L_PER_S) {
      lastInsp = t - phaseStartSec
      fillRange(phaseStartSec, t)
      state = 'out'
      phaseStartSec = t
    } else if (state === 'out' && v > FLOW_DEADBAND_L_PER_S) {
      lastExp = t - phaseStartSec
      fillRange(phaseStartSec, t)
      state = 'in'
      phaseStartSec = t
    }
  }
  fillRange(phaseStartSec, totalNightSec) // trailing partial phase, still worth showing
  return { inspTime, expTime }
}
