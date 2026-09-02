import { Fragment, useState, useRef, useEffect } from 'react'
import {
  ChevronLeft, ChevronRight, Crosshair, ZoomOut, Maximize2, X, Link2,
  ArrowUpDown, ChevronUp, ChevronDown, PowerOff, Pencil, Clock, Gauge, HardDrive,
} from 'lucide-react'
import { T, C, SEV } from '../constants/theme'
import { EQUIPMENT } from '../constants/equipment'
import { TAG_LABEL, TAG_ICON, TAG_COLOR, AUTO_TAGS } from '../constants/tags'
import { scoreColor } from '../utils/scoring'
import { CardTitle } from '../components/CardTitle'
import { EventRing } from '../components/EventRing'
import { StatRow } from '../components/StatRow'
import { ChartInfoButton } from '../components/ChartInfoButton'
import { Segmented } from '../components/Segmented'
import { LeakIcon } from '../components/icons/LeakIcon'
import { MiniMap } from '../components/charts/MiniMap'
import { MiniChart } from '../components/charts/MiniChart'
import { BigChannelChart } from '../components/charts/BigChannelChart'
import { DEFAULT_CHANNEL_ORDER, EVENT_COLOR, hourTicks, bandPath, makePanHandlers, jumpToEvent, computeStats, hexA } from '../components/charts/chartHelpers'
import { getDetail } from '../db/detail.js'
import { formatDuration } from '../utils/dates'

// Rolling date-chip strip at the top of Night View — shared by both the
// normal (used) and not-used-this-night variants below, so navigating
// through a stretch of skipped nights never loses this picker (it used
// to only exist in the used-night render path, making a run of no-usage
// nights impossible to page through except one day at a time via the
// prev/next arrows).
function NightDatePicker({ nights, idx, setIdx, targets }) {
  // Always includes whichever night is currently selected — a fixed
  // "last 10" slice would go blank (no highlighted night at all) once you
  // page further back than that window via the prev/next arrows.
  const pickerWindow = 10
  let winStart = Math.max(0, idx - Math.floor(pickerWindow / 2))
  let winEnd = Math.min(nights.length, winStart + pickerWindow)
  winStart = Math.max(0, winEnd - pickerWindow)
  const recentWindow = nights.slice(winStart, winEnd)
  const activePickerRef = useRef(null)
  useEffect(() => {
    activePickerRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [idx])
  return (
    <div style={{ background: T.surface, borderRadius: 22, padding: '16px 16px 18px' }}>
      <div className="no-scrollbar" style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '3px 4px' }}>
        {recentWindow.map((n) => {
          const ni = nights.indexOf(n)
          const active = ni === idx
          return (
            <button key={ni} ref={active ? activePickerRef : null} onClick={() => setIdx(ni)} style={{ flexShrink: 0, width: 40 }}>
              <div style={{
                height: 44, borderRadius: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1,
                background: n.noUsage ? T.bg : scoreColor(n.ahi, targets),
                border: n.noUsage ? `1.5px dashed ${T.muted}` : 'none',
                outline: active ? `2px solid ${T.ink}` : 'none', outlineOffset: 1,
                boxSizing: 'border-box', opacity: active ? 1 : 0.4,
              }}>
                <span className="font-display" style={{ fontSize: 9, fontWeight: 700, color: n.noUsage ? T.muted : 'rgba(255,255,255,0.75)' }}>{n.wd}</span>
                <span className="font-display" style={{ fontSize: 13, fontWeight: 700, color: n.noUsage ? T.muted : '#FFFFFF' }}>{n.label.split(' ')[0]}</span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function DrillDownScreenNight({ nights, idx, setIdx, targets, onOpenTagEntry }) {
  const night = nights[idx]
  const [expandedChart, setExpandedChart] = useState(null)
  const [syncZoom, setSyncZoom] = useState(1)
  const [syncPan, setSyncPan] = useState(0)
  const syncDragRef = useRef(null)
  const syncMiniDragRef = useRef(null)
  const syncBrushRef = useRef(null)
  const [syncSelectMode, setSyncSelectMode] = useState(false)
  const [syncBrushSel, setSyncBrushSel] = useState(null)
  const [chartsLinked, setChartsLinked] = useState(false)
  const [activeGroup, setActiveGroup] = useState('Core')
  const [syncShowInfo, setSyncShowInfo] = useState(false)
  const [linkedZoom, setLinkedZoom] = useState(1)
  const [linkedPan, setLinkedPan] = useState(0)

  // Real per-night waveform detail + events, loaded from IndexedDB (see
  // src/edf/parseNight.js for what actually populates it, and CLAUDE.md
  // for why it may not exist: pruned past the 90-day retention window,
  // or this night predates any DATALOG import even though its summary
  // is still available from STR.edf).
  const [nightData, setNightData] = useState(null)
  const [detailStatus, setDetailStatus] = useState('loading') // 'loading' | 'unavailable' | 'ready'
  useEffect(() => {
    let cancelled = false
    setDetailStatus('loading')
    setNightData(null)
    getDetail(night.date).then((row) => {
      if (cancelled) return
      if (!row) { setDetailStatus('unavailable'); return }
      setNightData(row)
      setDetailStatus('ready')
    })
    return () => { cancelled = true }
  }, [night.date])
  // Safe empty fallbacks so CHANNEL_REGISTRY etc. below can be built
  // unconditionally (keeps every hook in this component running every
  // render, regardless of load state) — the actual detailStatus gate on
  // what renders happens once, right before the JSX return.
  const events = nightData?.events ?? []
  const detail = nightData?.detail ?? { flow: [], pressure: [], leak: [], respRate: [], tidalVolume: [], minuteVent: [], snore: [], flowLimit: [] }
  const timeInApneaSec = nightData?.timeInApneaSec ?? 0

  // Real per-channel data arrives from src/edf/parseNight.js in physical
  // units (L/s, cmH2O, L/min, ml, ...), but the chart rendering below
  // (bandPath in chartHelpers.js) expects every value pre-normalized to a
  // 0-1 fraction of a chosen display range — axisMin/axisMax are that
  // chosen range for display (tick labels, stats), never applied in the
  // render path itself. Flow is genuinely signed (confirmed real range
  // -2..3 L/s) and normalizes the same way as every other channel — zero
  // just lands at whatever fraction that implies (~0.4) rather than a
  // specially-centered baseline; no chart rendering changes needed.
  // Array.from (not values.map) deliberately — the parser's real channel
  // data is a Float32Array, and bandPath below (unchanged, existing code)
  // calls .map() with a callback that returns strings to build an SVG
  // path; Array.prototype.map is fine with that, but a typed array's own
  // .map() coerces each returned string back through Number(), which
  // silently produces NaN for every point. Array.from always yields a
  // plain Array regardless of the input type, so bandPath keeps working
  // exactly as it always did.
  const normalize = (values, min, max) => Array.from(values, (v) => Math.max(0, Math.min(1, (v - min) / (max - min))))
  const PRESSURE_MIN = Math.max(0, EQUIPMENT.fixedPressure - 5)
  const PRESSURE_MAX = EQUIPMENT.fixedPressure + 5

  // Every overlayable channel, in one place — the single source of truth
  // for label/color/mode/axis/description, used by the individual charts,
  // the Synchronized view picker, and the fullscreen modal alike. No
  // inspTime/expTime — confirmed this device has no real source for
  // either (see CLAUDE.md's "Real file structure" section).
  const CHANNEL_REGISTRY = {
    flow: { label: 'Flow', color: C.blue, mode: 'line', values: normalize(detail.flow, -2, 3), axisMin: -2, axisMax: 3, unit: ' L/s' },
    pressure: { label: 'Pressure', color: C.purple, mode: 'line', values: normalize(detail.pressure, PRESSURE_MIN, PRESSURE_MAX), axisMin: PRESSURE_MIN, axisMax: PRESSURE_MAX, unit: ' cmH₂O' },
    leak: { label: 'Leak Rate', color: C.orange, mode: 'line', values: normalize(detail.leak, 0, 25), axisMax: 25, unit: ' L/min', unitLabel: 'litres per minute',
      sub: 'Air escaping around the mask seal rather than being delivered to you. Under about 24 L/min is generally considered an acceptable seal — a rising or spiking pattern usually means the mask needs adjusting or the cushion is due for replacement.' },
    flowLimit: { label: 'Flow Limit', color: C.pink, mode: 'bar', values: normalize(detail.flowLimit, 0, 1), axisMax: 1, unit: '', decimals: 2, unitLabel: 'a 0-1 flattening index, not a physical unit',
      sub: 'How flattened your breathing waveform is — a subtler marker than a full obstructive event, but a sign the airway is starting to narrow. Frequent flow limitation without full events can still fragment sleep.' },
    snore: { label: 'Snore', color: SEV.good, mode: 'bar', values: normalize(detail.snore, 0, 5), axisMax: 5, unit: '', decimals: 2, unitLabel: 'a 0-5 intensity index, not a physical unit',
      sub: "Vibration detected in the airflow signal, usually from partial airway narrowing. Occasional snoring isn't necessarily meaningful, but a consistent nightly pattern is worth mentioning at your next clinician visit." },
    tidalVolume: { label: 'Tidal Volume', color: C.blue, mode: 'line', values: normalize(detail.tidalVolume, 0, 1500), axisMax: 1500, unit: ' ml', decimals: 0, unitLabel: 'millilitres per breath',
      sub: "The amount of air moved in a single breath. Dips usually line up with obstructive or central events above — a breath that's cut short physically can't deliver a normal volume." },
    respRate: { label: 'Resp. Rate', fullLabel: 'Respiratory Rate', color: C.orange, mode: 'line', values: normalize(detail.respRate, 0, 50), axisMax: 50, unit: ' br/min', decimals: 0, unitLabel: 'breaths per minute',
      sub: "How many breaths you're taking per minute. It's often naturally elevated in the first stretch of the night as you settle, then should steady out — a rate that stays high or spikes repeatedly can point to disrupted sleep." },
    minuteVent: { label: 'Minute Vent', color: C.pink, mode: 'line', values: normalize(detail.minuteVent, 0, 30), axisMax: 30, unit: ' L/min', unitLabel: 'litres per minute',
      sub: "Total air moved per minute — tidal volume multiplied by breathing rate. It's the best single number for overall ventilation, since it captures both how deep and how fast you're breathing." },
  }
  // Groups the picker chips by what they actually measure, so choosing
  // channels is about intent (raw signal vs. breathing quality vs.
  // ventilation) rather than one long undifferentiated list.
  const CHANNEL_GROUPS = [
    { label: 'Core', keys: ['flow', 'pressure', 'leak'] },
    { label: 'Breathing', keys: ['flowLimit', 'snore'] },
    { label: 'Ventilation', keys: ['tidalVolume', 'respRate', 'minuteVent'] },
  ]
  // Condensed Min/Med/95%/99.5% table — same per-channel data as the
  // waveform charts above, just readable at a glance instead of requiring
  // each chart to be opened. Pressure is special-cased: on a fixed-pressure
  // machine there's no meaningful waveform percentile, so it reuses the
  // per-night pMin/pMax/p95 already generated for Trends' Pressure tab.
  const statRows = [
    { label: 'Pressure', unit: ' cmH₂O', decimals: 1, min: night.pMin, med: EQUIPMENT.fixedPressure, p95: night.p95, p995: night.pMax },
    // computeStats expects the normalized 0-1 fraction values (it reverses
    // the normalization back to real units itself) — CHANNEL_REGISTRY's
    // *.values, not the raw detail.* arrays, which are already real units.
    (() => { const s = computeStats(CHANNEL_REGISTRY.leak.values, CHANNEL_REGISTRY.leak.axisMax); return { label: 'Leak rate', unit: ' L/min', decimals: 1, min: s.min, med: s.median, p95: s.p95, p995: s.p995 } })(),
    (() => { const s = computeStats(CHANNEL_REGISTRY.respRate.values, CHANNEL_REGISTRY.respRate.axisMax); return { label: 'Resp rate', unit: ' br/min', decimals: 1, min: s.min, med: s.median, p95: s.p95, p995: s.p995 } })(),
    (() => { const s = computeStats(CHANNEL_REGISTRY.flowLimit.values, CHANNEL_REGISTRY.flowLimit.axisMax); return { label: 'Flow limit', unit: '', decimals: 2, min: s.min, med: s.median, p95: s.p95, p995: s.p995 } })(),
  ]
  const apneaPct = (timeInApneaSec / (night.usage * 3600)) * 100
  const fmtDuration = (totalSec) => {
    const m = Math.floor(totalSec / 60), s = Math.round(totalSec % 60)
    return m > 0 ? `${m}m ${s}s` : `${s}s`
  }
  // The individual cards below the Synchronized view — same 8 channels
  // that view's own picker offers, reorderable independently of it.
  const [channelOrder, setChannelOrder] = useState(DEFAULT_CHANNEL_ORDER)
  const [reorderMode, setReorderMode] = useState(false)
  const [selectedChannels, setSelectedChannels] = useState(['flow', 'leak', 'flowLimit'])
  function toggleChannel(key) {
    setSyncShowInfo(false)
    setSelectedChannels((cur) => {
      if (cur.includes(key)) return cur.length > 1 ? cur.filter((k) => k !== key) : cur
      if (cur.length >= 3) return [...cur.slice(1), key]
      return [...cur, key]
    })
  }
  function moveChannel(idx, dir) {
    setChannelOrder((cur) => {
      const target = idx + dir
      if (target < 0 || target >= cur.length) return cur
      const next = [...cur]
      ;[next[idx], next[target]] = [next[target], next[idx]]
      return next
    })
  }

  const SYNC_WINDOW_FRACS = [1, 0.4, 0.18]
  function SyncChart({ bandH, gap, w, zoom = 1, panStart = 0, onPanChange, onZoomChange, dragRef, miniDragRef, fill = false, selectMode, onSelectModeChange, brushSel, onBrushSelChange, brushRef, showInfo, onShowInfoChange }) {
    const bandsFull = selectedChannels.map((k) => CHANNEL_REGISTRY[k])
    const n = bandsFull.length
    const totalH = bandH * n + gap * (n - 1)
    const frac = zoom
    const isZoomedIn = zoom < 0.999
    const total = bandsFull[0]?.values.length || 1
    const winLen = Math.max(10, Math.round(total * frac))
    const maxStart = Math.max(0, total - winLen)
    const start = Math.min(maxStart, Math.round(panStart * maxStart))
    const bands = bandsFull.map((b) => ({ ...b, values: b.values.slice(start, start + winLen) }))
    const winStartFrac = start / total, winEndFrac = (start + winLen) / total
    const visEvents = events
      .filter((e) => e.x >= winStartFrac && e.x <= winEndFrac)
      .map((e) => ({ ...e, origX: e.x, x: (e.x - winStartFrac) / (winEndFrac - winStartFrac) }))
    const t0 = winStartFrac * night.usage, t1 = winEndFrac * night.usage
    const ticks = hourTicks(night.startHour + t0, t1 - t0, w > 400 ? 9 : 5)
    const flowBandIndex = selectedChannels.indexOf('flow')
    const accentColor = bandsFull[0]?.color || C.orange
    const panHandlers = dragRef ? makePanHandlers(dragRef, { active: isZoomedIn, scaleSamples: winLen, maxStart, panStart, setPanStart: onPanChange }) : {}
    // Brush-select applies to the shared time axis all overlaid channels
    // already sit on — one selection zooms every active channel together,
    // rather than needing to pick which channel a drag "belongs to."
    function handleBrushDown(e) {
      const rect = e.currentTarget.getBoundingClientRect()
      const x = (e.clientX - rect.left) / rect.width
      brushRef.current = { a: x, b: x }
      onBrushSelChange({ a: x, b: x })
    }
    function handleBrushMove(e) {
      if (!brushRef.current) return
      const rect = e.currentTarget.getBoundingClientRect()
      const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
      brushRef.current = { ...brushRef.current, b: x }
      onBrushSelChange({ ...brushRef.current })
    }
    function handleBrushUp() {
      const sel = brushRef.current && brushSel
      brushRef.current = null
      if (sel) {
        const a = Math.min(sel.a, sel.b), b = Math.max(sel.a, sel.b)
        const width = b - a
        if (width > 0.03) {
          // a/b are fractions of whatever's currently visible — map into
          // whole-night fractions via the current window's own bounds so a
          // second select-to-zoom, done while already zoomed in, computes
          // the correct window instead of a stale one.
          const winSpan = winEndFrac - winStartFrac
          const globalA = winStartFrac + a * winSpan
          const globalB = winStartFrac + b * winSpan
          const newZoom = Math.max(0.02, globalB - globalA)
          const maxStartFrac = Math.max(0, 1 - newZoom)
          const newStartFrac = Math.max(0, Math.min(maxStartFrac, (globalA + globalB) / 2 - newZoom / 2))
          onZoomChange(newZoom)
          onPanChange(maxStartFrac > 0 ? newStartFrac / maxStartFrac : 0)
          onSelectModeChange(false)
        }
      }
      onBrushSelChange(null)
    }
    const brushHandlers = { onPointerDown: handleBrushDown, onPointerMove: handleBrushMove, onPointerUp: handleBrushUp, onPointerCancel: handleBrushUp }
    const miniMap = isZoomedIn && miniDragRef && (
      <MiniMap layers={bandsFull.map((b) => ({ values: b.values, color: b.color, mode: b.mode }))}
        total={total} winLen={winLen} start={start} maxStart={maxStart}
        panStart={panStart} onPanChange={onPanChange} dragRef={miniDragRef} accentColor={accentColor} />
    )
    const chartInner = (
      <div {...(selectMode ? brushHandlers : (isZoomedIn ? panHandlers : {}))} style={{ position: 'relative', width: '100%', height: fill ? '100%' : totalH, touchAction: 'pan-y', cursor: selectMode ? 'crosshair' : isZoomedIn ? 'grab' : 'default', outline: selectMode ? `2px dashed ${accentColor}` : 'none', outlineOffset: 2, borderRadius: 4 }}>
        <svg width="100%" height="100%" viewBox={`0 0 ${w} ${totalH}`} preserveAspectRatio="none" style={{ display: 'block' }}>
          {ticks.map((t) => (
            <line key={t.label} x1={t.frac * w} x2={t.frac * w} y1={0} y2={totalH} stroke={T.line} strokeWidth="1" />
          ))}
          {/* A visible line between each band, not just empty gap space —
              otherwise it's hard to tell where one channel's trace ends and
              the next one's begins, especially with a busy overlay. */}
          {bands.slice(0, -1).map((_, bi) => {
            const dividerY = bi * (bandH + gap) + bandH + gap / 2
            return <line key={`div-${bi}`} x1={0} x2={w} y1={dividerY} y2={dividerY} stroke={T.line} strokeWidth="1.5" />
          })}
          {bands.map((b, bi) => {
            const y0 = bi * (bandH + gap), y1 = y0 + bandH
            const barW = w / b.values.length
            return (
              <g key={selectedChannels[bi]}>
                {b.mode === 'line' ? (
                  <path d={`M ${bandPath(b.values, y0, y1, w)}`} fill="none" stroke={b.color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                ) : (
                  b.values.map((v, i) => v > 0.02 ? (
                    <rect key={i} x={i * barW + barW * 0.3} y={y1 - v * (bandH - 2)} width={Math.max(1, barW * 0.4)} height={v * (bandH - 2)} fill={b.color} />
                  ) : null)
                )}
              </g>
            )
          })}
        </svg>
        {/* Event markers rendered as real HTML dots, not SVG shapes inside the
            (non-uniformly stretched) chart coordinate space — svg circles get
            squashed into ellipses whenever the chart's rendered aspect ratio
            differs from its viewBox, which is common once height can flex
            independently of width (e.g. fullscreen landscape). */}
        {flowBandIndex !== -1 && visEvents.map((e, i) => (
          <div key={i} onPointerDown={(ev) => ev.stopPropagation()}
            onClick={() => onZoomChange && jumpToEvent(e.origX, total, SYNC_WINDOW_FRACS[SYNC_WINDOW_FRACS.length - 1], SYNC_WINDOW_FRACS[SYNC_WINDOW_FRACS.length - 1], onZoomChange, onPanChange)}
            style={{
              position: 'absolute', left: `${e.x * 100}%`, top: `${((flowBandIndex * (bandH + gap) + 7) / totalH) * 100}%`, cursor: onZoomChange ? 'pointer' : 'default',
              transform: 'translate(-50%, -50%)', width: 8, height: 8, borderRadius: '50%',
              background: EVENT_COLOR[e.type], border: `1.5px solid ${T.surface}`,
            }} />
        ))}
        {brushSel && selectMode && (() => {
          const a = Math.min(brushSel.a, brushSel.b), b = Math.max(brushSel.a, brushSel.b)
          return <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${a * 100}%`, width: `${(b - a) * 100}%`, background: hexA(accentColor, 0.18), border: `1.5px solid ${accentColor}`, pointerEvents: 'none' }} />
        })()}
      </div>
    )
    // Each band has its own scale (Flow 0-1, Leak 0-25, Tidal Volume 0-1500...)
    // so the axis gutter labels every band separately rather than showing one
    // shared scale for the whole stack.
    const gutter = (
      <div style={{ position: 'relative', width: 28, height: fill ? '100%' : totalH, flexShrink: 0 }}>
        {bandsFull.map((b, bi) => {
          const y0 = bi * (bandH + gap), y1 = y0 + bandH
          return (
            <div key={selectedChannels[bi]}>
              <span className="font-display" style={{ position: 'absolute', top: `${(y0 / totalH) * 100}%`, left: 0, fontSize: 9, fontWeight: 600, color: T.muted }}>{b.axisMax}</span>
              <span className="font-display" style={{ position: 'absolute', top: `${(y1 / totalH) * 100}%`, left: 0, transform: 'translateY(-100%)', fontSize: 9, fontWeight: 600, color: T.muted }}>{b.axisMin ?? 0}</span>
            </div>
          )
        })}
      </div>
    )
    // One shared Info toggle now (in the header) covers every active band at
    // once, rather than a separate tiny button per band — deliberately
    // minimal content still applies: full name and unit only, no lengthy
    // description, since up to 3 bands share this card's height. That's
    // what the channel's own individual chart is for, one tap away via
    // "Individual channels".
    const infoOverlay = showInfo && (
      <>
        {bandsFull.map((b, bi) => {
          const y0 = bi * (bandH + gap), y1 = y0 + bandH
          return (
            <div key={selectedChannels[bi]} onClick={() => onShowInfoChange(false)} style={{
              position: 'absolute', top: `${(y0 / totalH) * 100}%`, height: `${(bandH / totalH) * 100}%`, left: 0, right: 0,
              background: T.surface, border: `1.5px solid ${b.color}`, borderRadius: 10,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              padding: '4px 10px', textAlign: 'center', cursor: 'pointer',
            }}>
              <span className="font-display" style={{ fontSize: 12, fontWeight: 700, color: b.color }}>{b.fullLabel || b.label}</span>
              {b.unitLabel && <span style={{ fontSize: 10, color: T.muted, marginTop: 2 }}>{b.unitLabel}</span>}
            </div>
          )
        })}
      </>
    )
    const chart = (
      <div style={{ display: 'flex', gap: 8, width: '100%', height: fill ? '100%' : totalH }}>
        {gutter}
        <div style={{ flex: 1, position: 'relative' }}>{chartInner}{infoOverlay}</div>
      </div>
    )
    if (fill) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ flex: 1, minHeight: 0 }}>{chart}</div>
          <div style={{ position: 'relative', height: 14, marginTop: 8, flexShrink: 0 }}>
            {ticks.map((t) => (
              <span key={t.label} className="font-display" style={{ position: 'absolute', left: `${t.frac * 100}%`, transform: t.frac < 0.05 ? 'none' : t.frac > 0.95 ? 'translateX(-100%)' : 'translateX(-50%)', fontSize: 10, fontWeight: 600, color: T.muted, whiteSpace: 'nowrap' }}>{t.label}</span>
            ))}
          </div>
          {miniMap && <div style={{ flexShrink: 0 }}>{miniMap}</div>}
        </div>
      )
    }
    return (
      <>
        {chart}
        <div style={{ position: 'relative', height: 14, marginTop: 8 }}>
          {ticks.map((t) => (
            <span key={t.label} className="font-display" style={{ position: 'absolute', left: `${t.frac * 100}%`, transform: t.frac < 0.05 ? 'none' : t.frac > 0.95 ? 'translateX(-100%)' : 'translateX(-50%)', fontSize: 10, fontWeight: 600, color: T.muted, whiteSpace: 'nowrap' }}>{t.label}</span>
          ))}
        </div>
        {miniMap}
      </>
    )
  }
  const LegendRow = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 14, flexWrap: 'wrap' }}>
      {selectedChannels.map((k) => (
        <span key={`ch-${k}`} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: T.muted }}>
          <span style={{ width: 12, height: 2, borderRadius: 1, background: CHANNEL_REGISTRY[k].color }} />{CHANNEL_REGISTRY[k].label}
        </span>
      ))}
      {selectedChannels.includes('flow') && Object.entries(EVENT_COLOR).map(([label, c]) => (
        <span key={`ev-${label}`} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: T.muted, textTransform: 'capitalize' }}>
          <span style={{ width: 8, height: 8, borderRadius: 4, background: c }} />{label}
        </span>
      ))}
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <NightDatePicker nights={nights} idx={idx} setIdx={setIdx} targets={targets} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={() => setIdx((i) => Math.max(0, i - 1))} style={{ width: 32, height: 32, borderRadius: '50%', background: T.surface, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ChevronLeft size={16} style={{ color: T.ink }} />
        </button>
        <div className="font-display" style={{ fontSize: 15, fontWeight: 700, color: T.ink }}>{new Date(`${night.date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'long' })} {night.fullLabel}</div>
        <button onClick={() => setIdx((i) => Math.min(nights.length - 1, i + 1))} style={{ width: 32, height: 32, borderRadius: '50%', background: T.surface, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ChevronRight size={16} style={{ color: T.ink }} />
        </button>
      </div>

      <div style={{ background: T.surface, borderRadius: 22, padding: 20 }}>
        <CardTitle>Night summary</CardTitle>
        <div style={{ margin: '12px 0 4px' }}>
          <EventRing night={night} size={140} />
        </div>
        <StatRow icon={Clock} iconColor={C.blue} label="Usage" value={formatDuration(night.usage)}
          description="Time your machine was actively delivering therapy. Most guidelines treat 4+ hours as a full night of therapeutic use." />
        <StatRow icon={Gauge} iconColor={C.orange} label="Set pressure" value={`${EQUIPMENT.fixedPressure} cmH₂O`}
          description="Your fixed prescribed pressure. Tonight's delivered range stayed within a fraction of this, as expected for a non-auto-adjusting machine." />
        <StatRow icon={LeakIcon} iconColor={C.purple} label="Avg leak" value={`${night.leak} L/min`}
          description="Air escaping around the mask edge rather than through it. Under ~24 L/min is generally considered an acceptable seal; consistently higher is worth checking your mask fit." />
        <StatRow icon={Clock} iconColor={C.pink} label="Time in apnea" value={`${fmtDuration(timeInApneaSec)} (${apneaPct.toFixed(2)}%)`} last
          description="Total time spent within a scored obstructive, central, or hypopnea event tonight — a duration-based view alongside AHI's per-hour event count." />
      </div>

      <TagsCard night={night} onOpenTagEntry={onOpenTagEntry} />

      {detailStatus !== 'ready' ? (
        <div style={{ background: T.surface, borderRadius: 22, padding: 32, textAlign: 'center' }}>
          {detailStatus === 'loading' ? (
            <div className="font-display" style={{ fontSize: 13, fontWeight: 600, color: T.muted }}>Loading waveform detail…</div>
          ) : (
            <>
              <div style={{ width: 56, height: 56, borderRadius: '50%', border: `2px dashed ${T.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <HardDrive size={22} style={{ color: T.muted }} strokeWidth={1.8} />
              </div>
              <div className="font-display" style={{ fontSize: 15, fontWeight: 700, color: T.ink, marginBottom: 6 }}>Waveform detail not available</div>
              <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.5 }}>Detailed charts are only kept for the last 90 days — this night's own summary above is still accurate, just without the full waveform to drill into.</div>
            </>
          )}
        </div>
      ) : (
      <>
      <div style={{ background: T.surface, borderRadius: 22, padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="font-display" style={{ fontSize: 15, fontWeight: 700, color: T.ink }}>Synchronized view</span>
          <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
            <ChartInfoButton show={syncShowInfo} onToggle={() => setSyncShowInfo((s) => !s)} size={32} />
            <button onClick={() => { setSyncSelectMode((s) => !s) }}
              style={{ width: 32, height: 32, borderRadius: '50%', background: syncSelectMode ? T.ink : T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Crosshair size={13} style={{ color: syncSelectMode ? '#FFFFFF' : T.ink }} />
            </button>
            {syncZoom < 0.999 && (
              <button onClick={() => { setSyncZoom(1); setSyncPan(0) }}
                style={{ width: 32, height: 32, borderRadius: '50%', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ZoomOut size={13} style={{ color: T.ink }} />
              </button>
            )}
            <button onClick={() => setExpandedChart('sync')} style={{ width: 32, height: 32, borderRadius: '50%', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Maximize2 size={13} style={{ color: T.ink }} />
            </button>
          </div>
        </div>
        <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>Choose up to 3 channels to overlay</div>
        <div className="no-scrollbar" style={{ display: 'flex', justifyContent: 'center', overflowX: 'auto', marginTop: 12, paddingBottom: 2 }}>
          <Segmented options={CHANNEL_GROUPS.map((g) => ({ key: g.label, label: g.label }))} active={activeGroup} onChange={setActiveGroup} />
        </div>
        <div className="no-scrollbar" style={{ display: 'flex', justifyContent: 'center', gap: 6, overflowX: 'auto', marginTop: 8, paddingBottom: 2 }}>
          {CHANNEL_GROUPS.find((g) => g.label === activeGroup).keys.map((key) => {
            const ch = CHANNEL_REGISTRY[key]
            const active = selectedChannels.includes(key)
            return (
              <button key={key} onClick={() => toggleChannel(key)} style={{
                flexShrink: 0, padding: '6px 12px', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center',
                background: active ? ch.color : T.bg,
                border: active ? 'none' : `1px solid ${T.line}`,
              }}>
                <span className="font-display" style={{ fontSize: 12, fontWeight: 600, color: active ? '#FFFFFF' : T.muted, whiteSpace: 'nowrap' }}>{ch.label}</span>
              </button>
            )
          })}
        </div>
        <div style={{ marginTop: 14 }}>
          <SyncChart bandH={64} gap={16} w={300} zoom={syncZoom} panStart={syncPan} onPanChange={setSyncPan} onZoomChange={setSyncZoom} dragRef={syncDragRef} miniDragRef={syncMiniDragRef}
            selectMode={syncSelectMode} onSelectModeChange={setSyncSelectMode} brushSel={syncBrushSel} onBrushSelChange={setSyncBrushSel} brushRef={syncBrushRef}
            showInfo={syncShowInfo} onShowInfoChange={setSyncShowInfo} />
        </div>
        <LegendRow />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px' }}>
        <span className="font-display" style={{ fontSize: 15, fontWeight: 700, color: T.ink }}>Individual channels</span>
        <div style={{ display: 'flex', gap: 8 }}>
          {!reorderMode && (
            <button onClick={() => setChartsLinked((s) => !s)} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 20,
              background: chartsLinked ? C.blue : T.surface, border: chartsLinked ? 'none' : `1px solid ${T.line}`,
            }}>
              <Link2 size={13} style={{ color: chartsLinked ? '#FFFFFF' : T.muted }} />
              <span className="font-display" style={{ fontSize: 12, fontWeight: 600, color: chartsLinked ? '#FFFFFF' : T.muted }}>Sync zoom</span>
            </button>
          )}
          <button onClick={() => setReorderMode((s) => !s)} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 20,
            background: reorderMode ? C.blue : T.surface, border: reorderMode ? 'none' : `1px solid ${T.line}`,
          }}>
            {!reorderMode && <ArrowUpDown size={13} style={{ color: T.muted }} />}
            <span className="font-display" style={{ fontSize: 12, fontWeight: 600, color: reorderMode ? '#FFFFFF' : T.muted }}>{reorderMode ? 'Done' : 'Reorder'}</span>
          </button>
        </div>
      </div>

      {reorderMode ? (
        <div style={{ background: T.surface, borderRadius: 22, padding: 20 }}>
          {channelOrder.map((key, idx) => {
            const ch = CHANNEL_REGISTRY[key]
            return (
              <div key={key} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 52,
                borderBottom: idx === channelOrder.length - 1 ? 'none' : `1px solid ${T.line}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 5, background: ch.color, flexShrink: 0 }} />
                  <span className="font-display" style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>{ch.fullLabel || ch.label}</span>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => moveChannel(idx, -1)} disabled={idx === 0}
                    style={{ width: 32, height: 32, borderRadius: '50%', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: idx === 0 ? 0.3 : 1 }}>
                    <ChevronUp size={15} style={{ color: T.ink }} />
                  </button>
                  <button onClick={() => moveChannel(idx, 1)} disabled={idx === channelOrder.length - 1}
                    style={{ width: 32, height: 32, borderRadius: '50%', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: idx === channelOrder.length - 1 ? 0.3 : 1 }}>
                    <ChevronDown size={15} style={{ color: T.ink }} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        channelOrder.map((key) => {
          const ch = CHANNEL_REGISTRY[key]
          const linkProps = chartsLinked
            ? { zoom: linkedZoom, onZoomChange: setLinkedZoom, panStart: linkedPan, onPanChange: setLinkedPan }
            : {}
          return (
            <MiniChart key={key} label={ch.label} sub={ch.sub} fullLabel={ch.fullLabel} unitLabel={ch.unitLabel} values={ch.values} color={ch.color} mode={ch.mode}
              axisMax={ch.axisMax} axisMin={ch.axisMin ?? 0} unit={ch.unit} decimals={ch.decimals ?? 1}
              usageHours={night.usage} startHour={night.startHour} onExpand={() => setExpandedChart(key)} events={events}
              {...linkProps} />
          )
        })
      )}

      <div style={{ background: T.surface, borderRadius: 22, padding: 20 }}>
        <CardTitle>Statistics</CardTitle>
        <div style={{ display: 'grid', gridTemplateColumns: '1.7fr repeat(4, 1fr)', columnGap: 6 }}>
          <div />
          {['Min', 'Med', '95%', '99.5%'].map((h) => (
            <div key={h} style={{ fontSize: 10, fontWeight: 700, color: T.muted, textAlign: 'right', paddingBottom: 8 }}>{h}</div>
          ))}
          {statRows.map((row, i) => (
            <Fragment key={row.label}>
              {i > 0 && <div style={{ gridColumn: '1 / -1', borderTop: `1px solid ${T.line}` }} />}
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: i === 0 ? '0 0 10px' : '10px 0' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: T.ink, lineHeight: 1.3 }}>{row.label}</span>
                {row.unit && <span style={{ fontSize: 10, color: T.muted, lineHeight: 1.3, marginTop: 1 }}>{row.unit.trim()}</span>}
              </div>
              {[row.min, row.med, row.p95, row.p995].map((v, j) => (
                <div key={j} className="font-display" style={{
                  fontSize: 13, fontWeight: 600, color: T.ink, lineHeight: 1.3, display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                  padding: i === 0 ? '0 0 10px' : '10px 0',
                }}>
                  {v.toFixed(row.decimals)}
                </div>
              ))}
            </Fragment>
          ))}
        </div>
      </div>

      {expandedChart && (() => {
        const meta = expandedChart === 'sync' ? null : CHANNEL_REGISTRY[expandedChart]
        return (
          <div style={{ position: 'fixed', inset: 0, background: T.bg, zIndex: 50, padding: 'max(20px, calc(env(safe-area-inset-top, 0px) + 24px)) max(16px, env(safe-area-inset-right, 0px)) max(20px, env(safe-area-inset-bottom, 0px)) max(16px, env(safe-area-inset-left, 0px))', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexShrink: 0 }}>
              <div className="font-display" style={{ fontSize: 16, fontWeight: 700, color: T.ink }}>
                {night.label} · {expandedChart === 'sync' ? 'Synchronized view' : (meta.fullLabel || meta.label)}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {expandedChart === 'sync' && (
                  <>
                    <ChartInfoButton show={syncShowInfo} onToggle={() => setSyncShowInfo((s) => !s)} size={32} />
                    <button onClick={() => setSyncSelectMode((s) => !s)}
                      style={{ width: 32, height: 32, borderRadius: '50%', background: syncSelectMode ? T.ink : T.surface, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Crosshair size={14} style={{ color: syncSelectMode ? '#FFFFFF' : T.ink }} />
                    </button>
                    {syncZoom < 0.999 && (
                      <button onClick={() => { setSyncZoom(1); setSyncPan(0) }}
                        style={{ width: 32, height: 32, borderRadius: '50%', background: T.surface, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ZoomOut size={14} style={{ color: T.ink }} />
                      </button>
                    )}
                  </>
                )}
                <button onClick={() => setExpandedChart(null)} style={{ width: 40, height: 40, borderRadius: '50%', background: T.surface, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={17} style={{ color: T.ink }} />
                </button>
              </div>
            </div>
            <div style={{ flex: 1, minHeight: 0, overflow: 'auto', display: 'flex' }}>
              <div style={{ background: T.surface, borderRadius: 22, padding: 20, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                {expandedChart === 'sync' ? (
                  <>
                    <div style={{ flex: 1, minHeight: 0 }}>
                      <SyncChart bandH={160} gap={28} w={800} zoom={syncZoom} panStart={syncPan} onPanChange={setSyncPan} onZoomChange={setSyncZoom} dragRef={syncDragRef} miniDragRef={syncMiniDragRef} fill
                        selectMode={syncSelectMode} onSelectModeChange={setSyncSelectMode} brushSel={syncBrushSel} onBrushSelChange={setSyncBrushSel} brushRef={syncBrushRef}
                        showInfo={syncShowInfo} onShowInfoChange={setSyncShowInfo} />
                    </div>
                    <div style={{ flexShrink: 0 }}><LegendRow /></div>
                  </>
                ) : (
                  <div style={{ flex: 1, minHeight: 0 }}>
                    <BigChannelChart values={meta.values} color={meta.color} mode={meta.mode} axisMax={meta.axisMax} axisMin={meta.axisMin ?? 0} unit={meta.unit} decimals={meta.decimals ?? 1}
                      usageHours={night.usage} startHour={night.startHour} events={events} sub={meta.sub} label={meta.label} fullLabel={meta.fullLabel} unitLabel={meta.unitLabel} />
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })()}
      </>
      )}
    </div>
  )
}
// A no-usage night has no waveform, no events, nothing to chart — showing
// DrillDownScreenNight for one would previously fall back to fabricating a
// synthetic "clean" night (mkEvents({obstructive:0,...}) still runs, hrs
// defaults via `night.usage || 7`), which reads as an unusually good night
// rather than as no data at all. This wrapper decides before any hooks run,
// so the two very different render paths (full charts vs. a plain message)
// never conflict with React's rules of hooks.
function DrillDownScreenNight_NotUsed({ nights, idx, setIdx, targets, onOpenTagEntry }) {
  const night = nights[idx]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <NightDatePicker nights={nights} idx={idx} setIdx={setIdx} targets={targets} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={() => setIdx((i) => Math.max(0, i - 1))} style={{ width: 32, height: 32, borderRadius: '50%', background: T.surface, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ChevronLeft size={16} style={{ color: T.ink }} />
        </button>
        <div className="font-display" style={{ fontSize: 15, fontWeight: 700, color: T.ink }}>{new Date(`${night.date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'long' })} {night.fullLabel}</div>
        <button onClick={() => setIdx((i) => Math.min(nights.length - 1, i + 1))} style={{ width: 32, height: 32, borderRadius: '50%', background: T.surface, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ChevronRight size={16} style={{ color: T.ink }} />
        </button>
      </div>
      <div style={{ background: T.surface, borderRadius: 22, padding: 32, textAlign: 'center' }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', border: `2px dashed ${T.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
          <PowerOff size={22} style={{ color: T.muted }} strokeWidth={1.8} />
        </div>
        <div className="font-display" style={{ fontSize: 15, fontWeight: 700, color: T.ink, marginBottom: 6 }}>Not used this night</div>
        <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.5 }}>No session was recorded — nothing to show for AHI, leak, pressure, or waveform detail.</div>
      </div>
      <TagsCard night={night} onOpenTagEntry={onOpenTagEntry} />
    </div>
  )
}
// Shown on every night (used or not — a no-usage night still has context
// worth logging, like "away from home" often being exactly why the
// machine wasn't used) with an edit affordance opening the shared
// TagEntryScreen modal.
function TagsCard({ night, onOpenTagEntry }) {
  const manualTags = night.tags.filter((tk) => !AUTO_TAGS.has(tk))
  const autoTags = night.tags.filter((tk) => AUTO_TAGS.has(tk))
  const tagLabel = (tk) => (tk === 'alcohol' && night.alcoholLevel ? `Alcohol (${night.alcoholLevel})` : TAG_LABEL[tk])
  return (
    <div style={{ background: T.surface, borderRadius: 22, padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <CardTitle>Tags</CardTitle>
        <button onClick={() => onOpenTagEntry(night.date)} style={{ width: 32, height: 32, borderRadius: '50%', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Pencil size={13} style={{ color: T.ink }} />
        </button>
      </div>
      {night.tagStatus === 'unreviewed' ? (
        <div style={{ fontSize: 13, color: T.muted, marginTop: 4 }}>Not yet reviewed.</div>
      ) : manualTags.length === 0 && autoTags.length === 0 ? (
        <div style={{ fontSize: 13, color: T.muted, marginTop: 4 }}>{night.tagStatus === 'reviewed' ? 'Nothing to report.' : 'No tags logged.'}</div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
          {[...manualTags, ...autoTags].map((tk) => {
            const Icon = TAG_ICON[tk]
            const color = TAG_COLOR[tk]
            return (
              <span key={tk} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px 6px 8px', borderRadius: 999, background: hexA(color, 0.14) }}>
                <Icon size={12} style={{ color }} />
                <span className="font-display" style={{ fontSize: 12, fontWeight: 600, color: T.ink }}>{tagLabel(tk)}</span>
                {AUTO_TAGS.has(tk) && <span style={{ fontSize: 9, fontWeight: 700, color: T.muted }}>AUTO</span>}
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}
export function DrillDownScreen({ nights, idx, setIdx, targets, onOpenTagEntry }) {
  if (nights[idx].noUsage) return <DrillDownScreenNight_NotUsed nights={nights} idx={idx} setIdx={setIdx} targets={targets} onOpenTagEntry={onOpenTagEntry} />
  return <DrillDownScreenNight nights={nights} idx={idx} setIdx={setIdx} targets={targets} onOpenTagEntry={onOpenTagEntry} />
}
