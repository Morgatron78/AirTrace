import { useState, useRef } from 'react'
import { ZoomOut, Maximize2, MoreHorizontal, Info } from 'lucide-react'
import { T } from '../../constants/theme'
import { formatClock } from '../../utils/dates'
import { hourTicks, makePanHandlers, EVENT_COLOR, formatEventDuration, ZOOM_PRESETS } from './chartHelpers'
// APPLE-HEALTH: additive corroborating-context rows in the popover below —
// see docs/apple-health-integration.md for the full strip-out list.
import { STAGE_LABEL } from '../../constants/sleepStages'
import { getNightWindowMs } from '../../health/nightWindow'
import { stageAt, nearestReading } from '../../health/lookupAtTime'

// Same Description affordance every other channel chart offers (the "..."
// menu in MiniChart/BigChannelChart) — this chart doesn't come from
// CHANNEL_REGISTRY like the others, so its own explanatory text lives here
// instead of alongside theirs in DrillDownScreen.jsx.
const EVENTS_SUB = "Every obstructive, central, and hypopnea event during the night, all in one place. Nearby events merge into a numbered cluster so a busy stretch doesn't turn into an unreadable pile of dots — tap a single dot, or a cluster once it's already at full zoom, to see exactly what happened and when."

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
export function EventsChart({ events, usageHours, startHour, onExpand, onSelectEvent, big = false, date, healthEntry }) {
  const [zoom, setZoom] = useState(1)
  const [panStart, setPanStart] = useState(0)
  const [openCluster, setOpenCluster] = useState(null) // { px, items } | null
  const [showMore, setShowMore] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
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
    if (c.items.length === 1) {
      // Unambiguous — exactly one event, so alongside the usual
      // type/time popover this is also the point where a caller can
      // drill every other channel to this same moment (Individual
      // channels' own "Sync zoom" state, driven from DrillDownScreen).
      // Deliberately not fired for a still-overlapping cluster at
      // deepest zoom (the branch below) — several events seconds apart
      // is still genuinely ambiguous about which one is meant.
      setOpenCluster(c)
      onSelectEvent?.(c.items[0])
      return
    }
    if (atDeepestZoom) {
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
  // APPLE-HEALTH: only computed when both a date and matched health data
  // exist for this night — see the popover rows below.
  const healthNightStartMs = date && healthEntry ? getNightWindowMs({ date, startHour, usage: usageHours }).startMs : null

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
                // Two events close enough in time to still overlap into one
                // cluster even at this chart's own deepest zoom (rare, but
                // real — events seconds apart) previously had no way to
                // pick one: the cluster popover listed them but tapping a
                // row did nothing. Each row is now its own tap target,
                // using the exact same onSelectEvent a genuine single dot
                // fires — the type/time/duration already shown here is
                // exactly what's needed to tell two near-simultaneous
                // events apart.
                <div key={i} onPointerDown={(ev) => ev.stopPropagation()} onClick={() => onSelectEvent?.(it)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 4px', borderTop: i > 0 ? `1px solid ${T.line}` : 'none', cursor: onSelectEvent ? 'pointer' : 'default' }}>
                  <span style={{ width: 8, height: 8, borderRadius: 4, background: EVENT_COLOR[it.type], flexShrink: 0 }} />
                  <div>
                    <div className="font-display" style={{ fontSize: 12, fontWeight: 700, color: T.ink, textTransform: 'capitalize' }}>{it.type}</div>
                    <div style={{ fontSize: 11, color: T.muted }}>{formatClock(startHour + it.x * usageHours)} · {formatEventDuration(it.durationSec)}</div>
                    {/* APPLE-HEALTH: corroborating context from Apple
                        Health at this same moment — additive only, no
                        rows render at all when nothing is nearby. */}
                    {healthNightStartMs != null && (() => {
                      const ms = healthNightStartMs + it.x * usageHours * 3600000
                      const stage = stageAt(healthEntry, ms)
                      const hr = nearestReading(healthEntry.heartRate, ms, 15 * 60000)
                      const spo2 = nearestReading(healthEntry.spo2, ms, 60 * 60000)
                      if (!stage && !hr && !spo2) return null
                      return (
                        <div style={{ marginTop: 3 }}>
                          {stage && <div style={{ fontSize: 10.5, color: T.muted }}>Sleep stage: {STAGE_LABEL[stage]}</div>}
                          {hr && <div style={{ fontSize: 10.5, color: T.muted }}>Heart rate: {Math.round(hr.bpm)} bpm</div>}
                          {spo2 && <div style={{ fontSize: 10.5, color: T.muted }}>SpO&#8322;: {Math.round(spo2.pct)}%</div>}
                        </div>
                      )
                    })()}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
        {showInfo && (
          <div onClick={() => setShowInfo(false)} style={{
            position: 'absolute', inset: 0, zIndex: 2, overflow: 'auto', background: T.surface, border: `1.5px solid ${T.ink}`, borderRadius: 10,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: big ? '12px 24px' : '6px 10px', textAlign: 'center', cursor: 'pointer',
          }}>
            <span className="font-display" style={{ fontSize: big ? 15 : 11, fontWeight: 700, color: T.ink }}>Events</span>
            <span style={{ fontSize: big ? 13 : 10, color: big ? T.ink : T.muted, marginTop: big ? 6 : 3, lineHeight: big ? 1.4 : 1.3, maxWidth: big ? 480 : undefined }}>{EVENTS_SUB}</span>
          </div>
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
        <div style={{ display: 'flex', justifyContent: 'flex-end', flexShrink: 0, position: 'relative' }}>
          <div style={{ display: 'flex', gap: 5 }}>
            <button onClick={() => setShowMore((s) => !s)}
              style={{ width: 32, height: 32, borderRadius: '50%', background: showMore ? T.ink : T.surface, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MoreHorizontal size={16} style={{ color: showMore ? '#FFFFFF' : T.muted }} />
            </button>
            {isZoomedIn && (
              <button onClick={() => { setZoom(1); setPanStart(0) }}
                style={{ width: 32, height: 32, borderRadius: '50%', background: T.surface, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ZoomOut size={14} style={{ color: T.ink }} />
              </button>
            )}
          </div>
          {showMore && (
            <>
              <div onClick={() => setShowMore(false)} style={{ position: 'fixed', inset: 0, zIndex: 9 }} />
              <div style={{
                position: 'absolute', top: '100%', right: 0, marginTop: 6, zIndex: 10, minWidth: 180,
                background: T.surface, borderRadius: 14, boxShadow: '0 6px 20px rgba(0,0,0,0.14)', padding: 6,
              }}>
                <button onClick={() => { setShowInfo((s) => !s); setShowMore(false) }}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 10px', borderRadius: 9, background: 'none' }}>
                  <Info size={15} style={{ color: T.muted }} />
                  <span className="font-display" style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>Description</span>
                </button>
              </div>
            </>
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
        <span className="font-display" style={{ fontSize: 15, fontWeight: 700, color: T.ink }}>Events</span>
        <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
          <button onClick={() => setShowMore((s) => !s)}
            style={{ width: 32, height: 32, borderRadius: '50%', background: showMore ? T.ink : T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MoreHorizontal size={15} style={{ color: showMore ? '#FFFFFF' : T.muted }} />
          </button>
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
        {showMore && (
          <>
            <div onClick={() => setShowMore(false)} style={{ position: 'fixed', inset: 0, zIndex: 9 }} />
            <div style={{
              position: 'absolute', top: '100%', right: 0, marginTop: 6, zIndex: 10, minWidth: 168,
              background: T.surface, borderRadius: 14, boxShadow: '0 6px 20px rgba(0,0,0,0.14)', padding: 6,
            }}>
              <button onClick={() => { setShowInfo((s) => !s); setShowMore(false) }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 10px', borderRadius: 9, background: 'none' }}>
                <Info size={14} style={{ color: T.muted }} />
                <span className="font-display" style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>Description</span>
              </button>
            </div>
          </>
        )}
      </div>
      <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>Tap a dot for its type · tap a cluster to zoom in</div>
      <div style={{ marginTop: 12 }}>{body}</div>
      {axis}
      {legend}
    </div>
  )
}
