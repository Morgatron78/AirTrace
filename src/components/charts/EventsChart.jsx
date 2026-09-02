import { useState, useRef } from 'react'
import { ZoomOut, Maximize2 } from 'lucide-react'
import { T } from '../../constants/theme'
import { formatClock } from '../../utils/dates'
import { hourTicks, makePanHandlers, EVENT_COLOR, formatEventDuration, ZOOM_PRESETS } from './chartHelpers'

// A dedicated events-only timeline, separate from the small dots overlaid
// on the Flow band elsewhere (Synchronized view, MiniChart, BigChannelChart
// — those stay exactly as they were, tap-to-jump-and-zoom). This chart
// exists because on a busy night those overlay dots are tiny and can sit
// right on top of each other; here every event gets its own always-visible
// lane, deliberately zoomed out by default rather than sharing whatever
// zoom level Flow happens to be at.
//
// Unlike every other chart here, there's no sampled `values` array to
// zoom/pan through — events just have a startSec-derived `x` fraction of
// the whole night. So zoom/pan below work in continuous 0-1 fraction space
// directly (winLen/maxStart are fractions, not sample counts), rather than
// reusing the values.length-based indexing the waveform charts use.
//
// Two real problems this has to solve, per the user's own framing:
//   1. Events very close together at a glance still need to be
//      individually identifiable, not just a blur of dots.
//   2. Tapping one should say what it actually was.
// The approach: pixel-proximity clustering (nearby dots merge into one
// bigger dot with a count badge — same idea as map-pin clusters), and
// tapping a cluster either zooms in on it (if zooming in would actually
// spread it out) or — once already at the deepest zoom, meaning these
// events are genuinely seconds apart, not just visually close because
// we're zoomed out — opens a small stacked list of every event in it.
// A single (unclustered) dot always just opens that one event's detail.
export function EventsChart({ events, usageHours, startHour, onExpand, big = false }) {
  const [zoom, setZoom] = useState(1)
  const [panStart, setPanStart] = useState(0)
  const [openCluster, setOpenCluster] = useState(null) // { px, items } | null
  const dragRef = useRef(null)
  const isZoomedIn = zoom < 0.999
  const atDeepestZoom = zoom <= ZOOM_PRESETS[ZOOM_PRESETS.length - 1] + 0.001

  const winLen = zoom
  const maxStart = Math.max(0, 1 - winLen)
  const start = Math.min(maxStart, panStart * maxStart)
  const winStartFrac = start, winEndFrac = start + winLen
  const panHandlers = makePanHandlers(dragRef, { active: isZoomedIn, scaleSamples: winLen, maxStart, panStart, setPanStart })

  const w = big ? 800 : 300, h = big ? 200 : 96
  const dotR = big ? 7 : 6
  const clusterPx = big ? 22 : 15

  const sorted = (events || [])
    .filter((e) => e.x >= winStartFrac && e.x <= winEndFrac)
    .map((e) => ({ ...e, px: ((e.x - winStartFrac) / winLen) * w }))
  // Sequential proximity clustering — events arrive pre-sorted by time
  // (parseNight.js), so a single left-to-right pass grouping anything
  // within clusterPx of the running cluster center is enough; re-clusters
  // fresh on every render, so panning/zooming naturally re-separates
  // clusters as their on-screen spacing grows.
  const clusters = []
  for (const e of sorted) {
    const last = clusters[clusters.length - 1]
    if (last && e.px - last.px < clusterPx) {
      last.items.push(e)
      last.px = (last.px * (last.items.length - 1) + e.px) / last.items.length
    } else {
      clusters.push({ px: e.px, items: [e] })
    }
  }
  function dominantColor(items) {
    if (items.length === 1) return EVENT_COLOR[items[0].type]
    const counts = {}
    for (const it of items) counts[it.type] = (counts[it.type] || 0) + 1
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
    return EVENT_COLOR[top]
  }
  function handleClusterClick(c) {
    if (c.items.length === 1 || atDeepestZoom) {
      setOpenCluster(c)
      return
    }
    // Zoom in centered on the cluster — same "jump to the deepest preset"
    // behavior as tapping a dot elsewhere, just centered on a group mean
    // rather than one event's own timestamp.
    const centerFrac = winStartFrac + (c.px / w) * winLen
    const targetZoom = ZOOM_PRESETS[ZOOM_PRESETS.length - 1]
    const maxStartT = Math.max(0, 1 - targetZoom)
    const desired = centerFrac - targetZoom / 2
    const clamped = Math.max(0, Math.min(maxStartT, desired))
    setZoom(targetZoom)
    setPanStart(maxStartT > 0 ? clamped / maxStartT : 0)
    setOpenCluster(null)
  }

  const t0 = winStartFrac * usageHours, t1 = winEndFrac * usageHours
  const ticks = hourTicks(startHour + t0, t1 - t0, big ? 9 : 5)
  const popoverLeftPct = openCluster ? Math.max(14, Math.min(86, (openCluster.px / w) * 100)) : 0

  const body = (
    <div style={{ display: 'flex', gap: 8 }}>
      <div {...(isZoomedIn ? panHandlers : {})} style={{ position: 'relative', flex: 1, height: h, touchAction: 'pan-y', cursor: isZoomedIn ? 'grab' : 'default' }}>
        <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: 'block' }}>
          {ticks.map((t) => (
            <line key={t.label} x1={t.frac * w} x2={t.frac * w} y1={0} y2={h} stroke={T.line} strokeWidth="1" />
          ))}
          <line x1={0} x2={w} y1={h / 2} y2={h / 2} stroke={T.line} strokeWidth="1" />
        </svg>
        {clusters.length === 0 ? (
          <div className="font-display" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: T.muted }}>
            No events in view
          </div>
        ) : clusters.map((c, i) => {
          const single = c.items.length === 1
          const r = single ? dotR : dotR + 4
          return (
            <div key={i} onPointerDown={(ev) => ev.stopPropagation()} onClick={() => handleClusterClick(c)}
              style={{
                position: 'absolute', left: `${(c.px / w) * 100}%`, top: '50%', cursor: 'pointer',
                transform: 'translate(-50%, -50%)', width: r * 2, height: r * 2, borderRadius: '50%',
                background: dominantColor(c.items), border: `2px solid ${T.surface}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
              {!single && <span className="font-display" style={{ fontSize: big ? 11 : 9, fontWeight: 700, color: '#FFFFFF' }}>{c.items.length}</span>}
            </div>
          )
        })}
        {openCluster && (
          <>
            <div onClick={() => setOpenCluster(null)} style={{ position: 'fixed', inset: 0, zIndex: 9 }} />
            <div style={{
              position: 'absolute', left: `${popoverLeftPct}%`, bottom: '100%', marginBottom: 10, transform: 'translateX(-50%)', zIndex: 10,
              background: T.surface, borderRadius: 12, boxShadow: '0 6px 20px rgba(0,0,0,0.18)', padding: 8, minWidth: 150, maxWidth: 220,
            }}>
              {openCluster.items.map((it, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 4px', borderTop: i > 0 ? `1px solid ${T.line}` : 'none' }}>
                  <span style={{ width: 8, height: 8, borderRadius: 4, background: EVENT_COLOR[it.type], flexShrink: 0 }} />
                  <div>
                    <div className="font-display" style={{ fontSize: 12, fontWeight: 700, color: T.ink, textTransform: 'capitalize' }}>{it.type}</div>
                    <div style={{ fontSize: 11, color: T.muted }}>{formatClock(startHour + it.x * usageHours)} · {formatEventDuration(it.durationSec)}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
  const axis = (
    <div style={{ position: 'relative', height: 14, marginTop: 6 }}>
      {ticks.map((t) => (
        <span key={t.label} className="font-display" style={{ position: 'absolute', left: `${t.frac * 100}%`, transform: t.frac < 0.05 ? 'none' : t.frac > 0.95 ? 'translateX(-100%)' : 'translateX(-50%)', fontSize: big ? 12 : 10, fontWeight: 600, color: T.muted, whiteSpace: 'nowrap' }}>{t.label}</span>
      ))}
    </div>
  )
  const legend = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 12, flexWrap: 'wrap' }}>
      {Object.entries(EVENT_COLOR).map(([label, c]) => (
        <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: T.muted, textTransform: 'capitalize' }}>
          <span style={{ width: 8, height: 8, borderRadius: 4, background: c }} />{label}
        </span>
      ))}
    </div>
  )

  if (big) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
          {isZoomedIn && (
            <button onClick={() => { setZoom(1); setPanStart(0) }}
              style={{ width: 32, height: 32, borderRadius: '50%', background: T.surface, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ZoomOut size={14} style={{ color: T.ink }} />
            </button>
          )}
        </div>
        <div style={{ flex: 1, minHeight: 0, marginTop: 8 }}>{body}</div>
        {axis}
        {legend}
      </div>
    )
  }
  return (
    <div style={{ background: T.surface, borderRadius: 22, padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="font-display" style={{ fontSize: 15, fontWeight: 700, color: T.ink }}>Events</span>
        <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
          {isZoomedIn && (
            <button onClick={() => { setZoom(1); setPanStart(0) }}
              style={{ width: 32, height: 32, borderRadius: '50%', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ZoomOut size={13} style={{ color: T.ink }} />
            </button>
          )}
          <button onClick={onExpand} style={{ width: 32, height: 32, borderRadius: '50%', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Maximize2 size={13} style={{ color: T.ink }} />
          </button>
        </div>
      </div>
      <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>Tap a dot for its type · tap a cluster to zoom in</div>
      <div style={{ marginTop: 12 }}>{body}</div>
      {axis}
      {legend}
    </div>
  )
}
