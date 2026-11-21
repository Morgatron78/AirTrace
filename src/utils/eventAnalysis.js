// Per-event waveform analysis — the one genuinely new computation this adds
// beyond what the device's own event list already reports (type/time/
// duration). Everything here comes from data already loaded for the night
// (nightDetail's flow/leak Float32Arrays, the full per-night events list) —
// nothing new to fetch or store. Approved design: see the AirTrace Events
// Drill-In mockup (claude.ai/artifact/NuUA2nTGgNKVZHpeYXWbUa) and
// [[airtrace-waveform-insights-triage]] for the decision history — this is
// the one feature out of eight candidates that earned a real build.

const CLUSTER_WINDOW_SEC = 300 // 5 minutes — matches the approved mockup

// Confirmed live against a real sample-card night (2026-06-01): EVE/CSL's
// own annotation clock and BRP's Flow samples can disagree by several real
// seconds — CLAUDE.md already documents this as "immaterial" for chart
// positioning (invisible at a multi-hour zoom level), but it's very much
// material here, where the whole analysis window is only ~20-40 seconds
// wide. A fixed-offset average landed squarely in the wrong part of the
// signal on a real event (baseline read quieter than the scored "apnea"
// itself). Fixed by searching generously-padded windows for the real
// extremum instead of trusting the scored boundary to the second.
const SEARCH_PAD_SEC = 15

// 1-second-resolution mean-abs-amplitude buckets across [fromSec, toSec) —
// coarse enough to smooth past single-sample noise, fine enough to find a
// real trough/peak within a padded search window.
function buckets(arr, fromSec, toSec, totalNightSec) {
  const hz = arr.length / totalNightSec
  const out = []
  for (let t = Math.max(0, fromSec); t < toSec; t++) {
    const a = Math.floor(t * hz), b = Math.min(arr.length, Math.floor((t + 1) * hz))
    if (b <= a) continue
    let sum = 0
    for (let i = a; i < b; i++) sum += Math.abs(arr[i])
    out.push(sum / (b - a))
  }
  return out
}

function flowStats(event, flow, totalNightSec) {
  if (!flow || !flow.length) return null
  const { startSec, endSec } = event
  // Baseline: the strongest breath in the lead-in before anything started
  // to go wrong — a peak, not an average, so one partial/declining breath
  // right at the edge of the window can't drag it down.
  const baseline = Math.max(0, ...buckets(flow, startSec - SEARCH_PAD_SEC, startSec - 2, totalNightSec))
  // Trough: the real quietest second anywhere near the scored window, not
  // assumed to sit exactly at its reported 33-66% midpoint.
  const trough = Math.min(...(buckets(flow, startSec - 5, endSec + 5, totalNightSec).length
    ? buckets(flow, startSec - 5, endSec + 5, totalNightSec) : [0]))
  // Recovery: the strongest breath in the seconds after the scored end —
  // a peak, since a single compensatory gasp is the real signal, not the
  // average of several breaths settling back to normal.
  const recoveryBuckets = buckets(flow, endSec, endSec + SEARCH_PAD_SEC, totalNightSec)
  const recovery = recoveryBuckets.length ? Math.max(...recoveryBuckets) : 0
  if (!baseline) return null
  return {
    flowDropPct: Math.round((1 - trough / baseline) * 100),
    recoveryPct: Math.round((recovery / baseline - 1) * 100),
  }
}

// Small ±3s pad, same clock-offset reasoning as flowStats above — Leak.2s
// is already a slow, smoothed 0.5Hz channel, so a plain average (not a
// peak search) over a lightly padded window is enough here.
function leakDuringEvent(event, leak, totalNightSec) {
  if (!leak || !leak.length) return null
  const hz = leak.length / totalNightSec
  const a = Math.max(0, Math.floor((event.startSec - 3) * hz))
  const b = Math.min(leak.length, Math.ceil((event.endSec + 3) * hz))
  if (b <= a) return null
  let sum = 0
  for (let i = a; i < b; i++) sum += leak[i]
  return sum / (b - a)
}

function ordinal(n) {
  if (n === 1) return '1st'
  if (n === 2) return '2nd'
  if (n === 3) return '3rd'
  return `${n}th`
}

// Matched by startSec+type rather than object identity — EventsChart
// builds its own `{...event, px}` copies for display, so the object a
// caller holds is never the same reference as the one in the night's
// original events array.
function findIndex(event, events) {
  return events.findIndex((e) => e.startSec === event.startSec && e.type === event.type)
}

// Position within a run of events close enough together to read as one
// cluster, or an isolated-event readout otherwise. `events` must be sorted
// by startSec (parseNight.js already guarantees this for the full night).
function clusterNoteFor(event, events) {
  const idx = findIndex(event, events)
  if (idx === -1) return ''
  let lo = idx, hi = idx
  while (lo > 0 && events[lo].startSec - events[lo - 1].endSec <= CLUSTER_WINDOW_SEC) lo--
  while (hi < events.length - 1 && events[hi + 1].startSec - events[hi].endSec <= CLUSTER_WINDOW_SEC) hi++
  const size = hi - lo + 1
  if (size > 1) {
    const spanMin = Math.max(1, Math.round((events[hi].endSec - events[lo].startSec) / 60))
    return `${ordinal(idx - lo + 1)} of ${size} events within a ${spanMin}-minute span`
  }
  const gapBefore = idx > 0 ? event.startSec - events[idx - 1].endSec : Infinity
  const gapAfter = idx < events.length - 1 ? events[idx + 1].startSec - event.endSec : Infinity
  const nearestGapMin = Math.round(Math.min(gapBefore, gapAfter) / 60)
  return Number.isFinite(nearestGapMin) ? `Isolated — nearest event ${nearestGapMin} min away` : 'Isolated — the only event tonight'
}

// Only stated when unambiguous (a single event strictly longer than every
// other of the same type tonight, no tie) — silent otherwise, same
// quiet-omission rule the rest of the app already follows.
function rankNoteFor(event, events) {
  const sameType = events.filter((e) => e.type === event.type)
  if (sameType.length < 2) return ''
  const sorted = [...sameType].sort((a, b) => b.durationSec - a.durationSec)
  if (sorted[0].startSec !== event.startSec || sorted[0].durationSec === sorted[1].durationSec) return ''
  const label = event.type === 'obstructive' ? 'Obstructive' : event.type === 'central' ? 'Central' : 'Hypopnea'
  return `Longest ${label} event tonight (next: ${sorted[1].durationSec}s)`
}

function patternText(event, flowDropPct, recoveryPct) {
  if (event.type === 'obstructive') {
    const ripple = flowDropPct >= 80 ? ' with residual effort ripple' : ''
    const surge = recoveryPct >= 15 ? 'compensatory surge' : 'modest rebound'
    return `Flow flattens${ripple}, then a ${surge} on recovery — consistent with "Obstructive Apnea."`
  }
  if (event.type === 'central') {
    return 'Flow fades smoothly to near zero with no residual ripple and no compensatory surge on return — consistent with "Central Apnea."'
  }
  return `Flow reduces ${flowDropPct}% without fully stopping, recovering gradually — consistent with "Hypopnea."`
}

// The one export callers need. Returns null when there's no waveform
// detail to analyze at all (pruned past the 90-used-nights retention
// window), so a caller can hide the info toggle entirely rather than show
// it with nothing behind it.
export function analyzeEvent(event, events, detail, totalNightSec, leakTarget) {
  if (!detail?.flow?.length || !totalNightSec) return null
  const fs = flowStats(event, detail.flow, totalNightSec)
  if (!fs) return null
  const leakAvg = leakDuringEvent(event, detail.leak, totalNightSec)
  return {
    flowDropPct: fs.flowDropPct,
    recoveryPct: fs.recoveryPct,
    clusterNote: clusterNoteFor(event, events),
    rankNote: rankNoteFor(event, events),
    leakAvg: leakAvg != null ? Math.round(leakAvg * 10) / 10 : null,
    leakFlagged: leakAvg != null && leakAvg > leakTarget,
    patternText: patternText(event, fs.flowDropPct, fs.recoveryPct),
  }
}
