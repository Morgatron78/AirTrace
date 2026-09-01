import { C } from '../../constants/theme'
import { formatClock } from '../../utils/dates'

// Drill-down helpers & charts (module-level so zoom/pan state survives
// re-renders of the parent screen — a nested component would be
// redefined, and therefore remounted with state reset, on every render).

export const EVENT_COLOR = { Obstructive: C.red, Central: C.orange, Hypopnea: C.blue }
// No inspTime/expTime — confirmed this device has no real source for
// either channel (see CLAUDE.md's "Real file structure" section).
export const DEFAULT_CHANNEL_ORDER = ['leak', 'flowLimit', 'snore', 'tidalVolume', 'respRate', 'minuteVent']

// Real wall-clock hour markers (matches how a real overnight chart reads —
// "11:00 PM, 12:00 AM..." — rather than elapsed time from session start).
// Steps by more than 1 hour once the span is long enough that hourly
// labels would start colliding at typical mobile chart widths.
export function hourTicks(startHour, spanHours, maxLabels = 5) {
  let step = 1
  while (spanHours / step > maxLabels) step++
  const first = Math.ceil(startHour / step) * step
  const list = []
  for (let h = first; h < startHour + spanHours; h += step) {
    list.push({ frac: (h - startHour) / spanHours, label: formatClock(h) })
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
export const ZOOM_PRESETS = [1, 0.4, 0.18]

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

export function hexA(hex, alpha) {
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0, 2), 16), g = parseInt(h.substring(2, 4), 16), b = parseInt(h.substring(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
