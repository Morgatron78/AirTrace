import { C } from '../../constants/theme'
import { formatClock } from '../../utils/dates'

// Drill-down helpers & charts (module-level so zoom/pan state survives
// re-renders of the parent screen — a nested component would be
// redefined, and therefore remounted with state reset, on every render).

// Keys are lowercase to match the real `type` field resmedQuirks.js
// produces ('obstructive'/'central'/'hypopnea', confirmed against real
// device output) — a capitalized-key version of this previously meant
// every EVENT_COLOR[e.type] lookup silently returned undefined, so event
// dots rendered with no fill color at all. Display text that wants
// capitalized labels (the chart legend) should style that in CSS
// (text-transform: capitalize) rather than relying on this object's own
// key casing.
export const EVENT_COLOR = { obstructive: C.red, central: C.orange, hypopnea: C.blue }
// inspTime/expTime aren't recorded signals — this device has no real
// source for either (see CLAUDE.md's "Real file structure" section) —
// they're derived from Flow's own zero-crossings instead (see
// edf/deriveBreathTimes.js). All 11 channels are listed here, ranked by
// default usefulness for a first look at a night — this is the initial
// order only, not a fixed structure: Individual channels' own Edit mode
// lets it be freely reordered (and hidden) per user, persisted from
// there once set, so this ranking only matters until someone overrides
// it once.
//   1. Flow, Leak, Mask Pressure — the most directly diagnostic trio:
//      what happened, whether the seal held, what pressure you actually
//      got.
//   2. Flow Limit, Snore — subtler breathing-quality markers.
//   3. Insp./Exp. Time — useful supporting detail, but explicitly an
//      *estimate* (derived from Flow, not a recorded signal), so it
//      sits after the directly-measured channels above it.
//   4. Tidal Volume, Resp. Rate, Minute Vent — the ventilation group,
//      more of a deep-dive than a first-look stat.
//   5. Therapy Pressure last — deliberately, not an oversight: on this
//      fixed-pressure machine it's flat except a brief ramp, the least
//      dynamically informative channel of the eleven (see CLAUDE.md's
//      note on pressure trend analysis being low-value on fixed CPAP).
//      Still worth keeping around for the rare cases (ramp review, EPR
//      dip check), just not worth defaulting near the top.
export const DEFAULT_CHANNEL_ORDER = ['flow', 'leak', 'pressure', 'flowLimit', 'snore', 'inspTime', 'expTime', 'tidalVolume', 'respRate', 'minuteVent', 'therapyPressure']

// "Nice" round step sizes to choose between, in minutes — small enough to
// give real precision once zoomed in tight, but never an odd number like
// "7 minutes" that would read as arbitrary rather than a real clock
// interval.
const NICE_STEP_MINUTES = [1, 2, 5, 10, 15, 20, 30, 60, 90, 120, 180, 240, 360, 480, 720]

// Real wall-clock markers (matches how a real overnight chart reads —
// "11:00 PM, 12:00 AM..." — rather than elapsed time from session start).
// Picks the smallest "nice" step (minutes, not just whole hours) that
// still keeps the label count under maxLabels — a zoomed-out full night
// lands on an hour-ish step same as before, but a zoomed-in window a
// few minutes wide now gets minute-level ticks instead of just one lonely
// hour label (or none at all): the previous version never stepped below
// 1 hour regardless of how tight the zoom was, which made it hard to
// tell precisely when something happened once zoomed in.
export function hourTicks(startHour, spanHours, maxLabels = 5) {
  const spanMinutes = spanHours * 60
  const stepMinutes = NICE_STEP_MINUTES.find((m) => spanMinutes / m <= maxLabels) ?? NICE_STEP_MINUTES[NICE_STEP_MINUTES.length - 1]
  const startMinutes = startHour * 60
  const firstMinutes = Math.ceil(startMinutes / stepMinutes) * stepMinutes
  const list = []
  for (let m = firstMinutes; m < startMinutes + spanMinutes; m += stepMinutes) {
    list.push({ frac: (m - startMinutes) / spanMinutes, label: formatClock(m / 60) })
  }
  return list
}

export function bandPath(values, y0, y1, w) {
  const h = y1 - y0
  return values.map((v, i) => `${(i / (values.length - 1)) * w},${(y1 - v * h).toFixed(1)}`).join(' L ')
}

// Drag-to-pan: converts a horizontal pointer drag into a change in panStart
// (0..1, same value the buttons used to control). touchAction:"pan-y" on the
// element lets vertical page-scroll pass through untouched while horizontal
// drags are captured here.
// scaleSamples: how many samples one full drag-width should move through —
//   pass winLen for "drag the chart content" (content scrolls opposite the
//   drag direction), or the full total for "drag a mini-map handle" (the
//   handle moves the same direction you drag it — invert:true).
export function makePanHandlers(dragRef, { active, scaleSamples, maxStart, panStart, setPanStart, invert = false }) {
  return {
    onPointerDown: (e) => {
      if (!active || maxStart <= 0) return
      dragRef.current = { dragging: true, startX: e.clientX, startPan: panStart, width: e.currentTarget.getBoundingClientRect().width || 1 }
      e.currentTarget.setPointerCapture(e.pointerId)
    },
    onPointerMove: (e) => {
      const d = dragRef.current
      if (!d || !d.dragging) return
      const dx = e.clientX - d.startX
      const sign = invert ? 1 : -1
      const deltaFrac = sign * (dx / d.width) * (scaleSamples / maxStart)
      setPanStart(Math.max(0, Math.min(1, d.startPan + deltaFrac)))
    },
    onPointerUp: () => { if (dragRef.current) dragRef.current.dragging = false },
    onPointerCancel: () => { if (dragRef.current) dragRef.current.dragging = false },
  }
}

// Jumps zoom+pan to center the deepest zoom level on a specific event —
// used when an event dot is tapped, so you don't have to manually zoom
// and hunt for it.
export function jumpToEvent(origX, total, winLenFrac, targetZoomValue, setZoom, setPanStart) {
  const winLen = Math.max(10, Math.round(total * winLenFrac))
  const maxStart = Math.max(0, total - winLen)
  const desiredStart = origX * total - winLen / 2
  const clamped = Math.max(0, Math.min(maxStart, desiredStart))
  setZoom(targetZoomValue)
  setPanStart(maxStart > 0 ? clamped / maxStart : 0)
}

// Zoom presets for the individual charts — zoom is a continuous fraction
// (1 = full night), and brush-select can land on any value; these presets
// are only used now to define "fully zoomed in" for tap-an-event-to-jump.
// The last value is the one that actually matters (see every call site:
// always ZOOM_PRESETS[ZOOM_PRESETS.length - 1]) — deep enough that
// hourTicks' finer step sizes kick in (5-minute ticks for a typical
// night, versus the wider ~15-minute window this used to land on), while
// still wide enough to see real context around the tapped event rather
// than an isolated sliver. For tighter than that, drag-to-select
// (the crosshair icon) zooms to any window you draw, no floor beyond
// hourTicks' own 1-minute step.
export const ZOOM_PRESETS = [1, 0.4, 0.05]

// values are 0-1 fractions (see bandPath below); scale/offset reverse
// that back to the channel's real display units. offset defaults to 0
// (most channels' real range starts at 0) — Flow and Pressure normalize
// against a non-zero real minimum, so they pass their own offset to get
// correct Min/Median/Max numbers back, not just a correct chart shape.
export function computeStats(values, scale, offset = 0) {
  const sorted = [...values].sort((a, b) => a - b)
  const n = sorted.length
  const pick = (p) => sorted[Math.min(n - 1, Math.floor(p * n))]
  const toReal = (v) => offset + v * scale
  return { min: toReal(sorted[0]), median: toReal(pick(0.5)), p95: toReal(pick(0.95)), p995: toReal(pick(0.995)), max: toReal(sorted[n - 1]) }
}

// Shared short-duration formatter for event popovers (EventsChart) — same
// shape as DrillDownScreen's own local fmtDuration for "Time in apnea",
// factored out here since EventsChart needs the identical per-event format.
export function formatEventDuration(sec) {
  const m = Math.floor(sec / 60), s = Math.round(sec % 60)
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

export function hexA(hex, alpha) {
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0, 2), 16), g = parseInt(h.substring(2, 4), 16), b = parseInt(h.substring(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
