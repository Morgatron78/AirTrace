import { useState, useRef } from 'react'
import { MoreHorizontal, Crosshair, ZoomOut, Info, BarChart3 } from 'lucide-react'
import { T } from '../../constants/theme'
import { StatQuad } from './StatQuad'
import { MiniMap } from './MiniMap'
import { hourTicks, bandPath, makePanHandlers, jumpToEvent, computeStats, hexA, EVENT_COLOR, ZOOM_PRESETS } from './chartHelpers'

// Fullscreen version of a single channel — has its own zoom/pan too, now
// that it's a stable top-level component rather than being redefined (and
// therefore remounted) every time the parent screen re-renders.
export function BigChannelChart({ values, color, mode, axisMax, unit, decimals = 1, usageHours, startHour, events, sub, label, fullLabel, unitLabel }) {
  const [zoom, setZoom] = useState(1)
  const [panStart, setPanStart] = useState(0)
  const [showStats, setShowStats] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const [selectMode, setSelectMode] = useState(false)
  const [showMore, setShowMore] = useState(false)
  const dragRef = useRef(null)
  const miniDragRef = useRef(null)
  const brushRef = useRef(null)
  const [brushSel, setBrushSel] = useState(null)
  const isZoomedIn = zoom < 0.999
  const total = values.length
  const winLen = Math.max(10, Math.round(total * zoom))
  const maxStart = Math.max(0, total - winLen)
  const start = Math.min(maxStart, Math.round(panStart * maxStart))
  const visible = values.slice(start, start + winLen)
  const panHandlers = makePanHandlers(dragRef, { active: isZoomedIn, scaleSamples: winLen, maxStart, panStart, setPanStart })
  const winStartFrac = start / total, winEndFrac = (start + winLen) / total
  const visEvents = (events || [])
    .filter((e) => e.x >= winStartFrac && e.x <= winEndFrac)
    .map((e) => ({ ...e, origX: e.x, x: (e.x - winStartFrac) / (winEndFrac - winStartFrac) }))

  function handleBrushDown(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    const startF = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    brushRef.current = { rect, startF }
    setBrushSel({ a: startF, b: startF })
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  function handleBrushMove(e) {
    const d = brushRef.current
    if (!d) return
    const f = Math.max(0, Math.min(1, (e.clientX - d.rect.left) / d.rect.width))
    setBrushSel({ a: d.startF, b: f })
  }
  function handleBrushUp() {
    const sel = brushRef.current && brushSel
    brushRef.current = null
    if (sel) {
      const a = Math.min(sel.a, sel.b), b = Math.max(sel.a, sel.b)
      const width = b - a
      if (width > 0.03) {
        // a/b are fractions of whatever's currently visible, not of the
        // whole night — once already zoomed in those aren't the same
        // thing, so map them into whole-night fractions via the current
        // window's own bounds before computing the new zoom/pan.
        const winSpan = winEndFrac - winStartFrac
        const globalA = winStartFrac + a * winSpan
        const globalB = winStartFrac + b * winSpan
        const newZoom = Math.max(0.02, globalB - globalA)
        const maxStartFrac = Math.max(0, 1 - newZoom)
        const newStartFrac = Math.max(0, Math.min(maxStartFrac, (globalA + globalB) / 2 - newZoom / 2))
        setZoom(newZoom)
        setPanStart(maxStartFrac > 0 ? newStartFrac / maxStartFrac : 0)
        setSelectMode(false)
      }
    }
    setBrushSel(null)
  }
  const brushHandlers = { onPointerDown: handleBrushDown, onPointerMove: handleBrushMove, onPointerUp: handleBrushUp, onPointerCancel: handleBrushUp }

  const w = 800, h = 220
  const barW = w / visible.length
  const t0 = (start / total) * usageHours
  const t1 = ((start + winLen) / total) * usageHours
  const ticks = hourTicks(startHour + t0, t1 - t0, 9)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', flexShrink: 0, position: 'relative' }}>
        <div style={{ display: 'flex', gap: 5 }}>
          <button onClick={() => setShowMore((s) => !s)}
            style={{ width: 32, height: 32, borderRadius: '50%', background: showMore ? T.ink : T.surface, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MoreHorizontal size={16} style={{ color: showMore ? '#FFFFFF' : T.muted }} />
          </button>
          <button onClick={() => { setSelectMode((s) => !s); setShowMore(false) }}
            style={{ width: 32, height: 32, borderRadius: '50%', background: selectMode ? T.ink : T.surface, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Crosshair size={14} style={{ color: selectMode ? '#FFFFFF' : T.ink }} />
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
              {sub && (
                <button onClick={() => { setShowInfo((s) => !s); setShowStats(false); setShowMore(false) }}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 10px', borderRadius: 9, background: 'none' }}>
                  <Info size={15} style={{ color: T.muted }} />
                  <span className="font-display" style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>Description</span>
                </button>
              )}
              <button onClick={() => { setShowStats((s) => !s); setShowInfo(false); setShowMore(false) }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 10px', borderRadius: 9, background: 'none' }}>
                <BarChart3 size={15} style={{ color: T.muted }} />
                <span className="font-display" style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>Stats</span>
              </button>
            </div>
          </>
        )}
      </div>
      {showStats && (
        <div style={{ flexShrink: 0, maxWidth: 360, marginTop: 8 }}>
          <StatQuad stats={computeStats(visible, axisMax != null ? axisMax : 1)} unit={unit} decimals={decimals} />
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, flex: 1, minHeight: 0, marginTop: 8 }}>
        {axisMax != null && (
          <div style={{ position: 'relative', width: 26, flexShrink: 0 }}>
            <span className="font-display" style={{ position: 'absolute', top: 0, left: 0, fontSize: 12, fontWeight: 600, color: T.muted }}>{axisMax}</span>
            <span className="font-display" style={{ position: 'absolute', bottom: 4, left: 0, fontSize: 12, fontWeight: 600, color: T.muted }}>0</span>
          </div>
        )}
        <div {...(selectMode ? brushHandlers : (isZoomedIn ? panHandlers : {}))} style={{ position: 'relative', flex: 1, touchAction: 'pan-y', cursor: selectMode ? 'crosshair' : isZoomedIn ? 'grab' : 'default', outline: selectMode ? `2px dashed ${color}` : 'none', outlineOffset: 2, borderRadius: 4 }}>
          <svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: 'block' }}>
            {ticks.map((t) => (
              <line key={t.label} x1={t.frac * w} x2={t.frac * w} y1={0} y2={h} stroke={T.line} strokeWidth="1" />
            ))}
            <line x1={0} x2={w} y1={h - 1} y2={h - 1} stroke={T.line} strokeWidth="1" />
            {mode === 'line' ? (
              <path d={`M ${bandPath(visible, 8, h, w)}`} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            ) : (
              visible.map((v, i) => v > 0.02 ? (
                <rect key={i} x={i * barW + barW * 0.3} y={h - v * (h - 8)} width={Math.max(2, barW * 0.4)} height={v * (h - 8)} fill={color} />
              ) : null)
            )}
          </svg>
          {brushSel && selectMode && (
            <div style={{
              position: 'absolute', top: 0, bottom: 0, zIndex: 3, pointerEvents: 'none',
              left: `${Math.min(brushSel.a, brushSel.b) * 100}%`, width: `${Math.abs(brushSel.b - brushSel.a) * 100}%`,
              background: hexA(color, 0.18), border: `1.5px solid ${color}`, borderRadius: 4,
            }} />
          )}
          {showInfo && sub && (
            <div onClick={() => setShowInfo(false)} style={{
              position: 'absolute', inset: 0, zIndex: 2, overflow: 'hidden', background: T.surface, border: `1.5px solid ${color}`, borderRadius: 10,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '12px 24px', textAlign: 'center', cursor: 'pointer',
            }}>
              <span className="font-display" style={{ fontSize: 15, fontWeight: 700, color: T.ink }}>{fullLabel || label}</span>
              {unitLabel && <span style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>Measured in {unitLabel}</span>}
              <span style={{ fontSize: 13, color: T.ink, marginTop: 6, lineHeight: 1.4, maxWidth: 480 }}>{sub}</span>
            </div>
          )}
          {events && visEvents.map((e, i) => (
            <div key={i} onPointerDown={(ev) => ev.stopPropagation()}
              onClick={() => jumpToEvent(e.origX, total, ZOOM_PRESETS[ZOOM_PRESETS.length - 1], ZOOM_PRESETS[ZOOM_PRESETS.length - 1], setZoom, setPanStart)}
              style={{
                position: 'absolute', left: `${e.x * 100}%`, top: 16, cursor: 'pointer',
                transform: 'translate(-50%, -50%)', width: 10, height: 10, borderRadius: '50%',
                background: EVENT_COLOR[e.type], border: `2px solid ${T.surface}`,
              }} />
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 8, flexShrink: 0 }}>
        {axisMax != null && <div style={{ width: 26, flexShrink: 0 }} />}
        <div style={{ position: 'relative', height: 16, flex: 1 }}>
          {ticks.map((t) => (
            <span key={t.label} className="font-display" style={{ position: 'absolute', left: `${t.frac * 100}%`, transform: t.frac < 0.05 ? 'none' : t.frac > 0.95 ? 'translateX(-100%)' : 'translateX(-50%)', fontSize: 12, fontWeight: 600, color: T.muted, whiteSpace: 'nowrap' }}>{t.label}</span>
          ))}
        </div>
      </div>
      {isZoomedIn && (
        <div style={{ flexShrink: 0 }}>
          <MiniMap layers={[{ values, color, mode }]} total={total} winLen={winLen} start={start} maxStart={maxStart}
            panStart={panStart} onPanChange={setPanStart} dragRef={miniDragRef} accentColor={color} />
        </div>
      )}
    </div>
  )
}
