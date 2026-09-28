// Apple Health integration — safe to delete this file entirely,
// see docs/apple-health-integration.md.
import { useState } from 'react'
import { T, C, SEV } from '../../constants/theme'
import { ChartInfoButton } from '../ChartInfoButton'
import { getNightWindowMs } from '../../health/nightWindow'
import { isLowSpo2, summarizeSpo2, SPO2_LOW_THRESHOLD } from '../../health/spo2'
import { hourTicks } from './chartHelpers'

// Standalone card, deliberately not in DrillDownScreen's CHANNEL_REGISTRY —
// same precedent HypnogramChart/EventsChart set. Registry channels are dense,
// evenly sampled arrays; the Watch takes roughly one SpO2 reading an hour, so
// this draws each reading as its own dot rather than a line that would imply
// continuous data (and no percentiles — a handful of points can't support them).
//
// The y range is a fixed 88-100: readings outside it are clamped to the plot
// edge (their label still shows the real number), so one bad reading can't
// squash every normal one into a flat line.
const Y_MIN = 88
const Y_MAX = 100
const PLOT_H = 96
const PLOT_TOP = 8
const PLOT_BOTTOM_PAD = 12
const PX_PER_PCT = (PLOT_H - PLOT_TOP - PLOT_BOTTOM_PAD) / (Y_MAX - Y_MIN)
const DOT = 11
const DOT_LOW = 13

const DESC = "Blood-oxygen spot checks from your Apple Watch, roughly hourly. Dips between readings aren't captured and a single low value is often movement or fit, so this isn't a desaturation count. Under 90% is flagged."

const yFor = (pct) => PLOT_TOP + (Y_MAX - Math.min(Y_MAX, Math.max(Y_MIN, pct))) * PX_PER_PCT

// `readings` is healthEntry.spo2 — already filtered to this night's own
// session window at import time (matchNights.js), so no window filtering here.
export function Spo2Chart({ night, readings }) {
  const [showInfo, setShowInfo] = useState(false)

  if (!readings?.length) return null
  const { startMs, endMs } = getNightWindowMs(night)
  const span = endMs - startMs
  if (span <= 0) return null

  const points = readings.map((r) => ({
    key: r.ts,
    f: Math.min(1, Math.max(0, (r.ts - startMs) / span)),
    y: yFor(r.pct),
    shown: Math.round(r.pct),
    low: isLowSpo2(r.pct),
  }))
  const { low, avg, count } = summarizeSpo2(readings)
  const ticks = hourTicks(night.startHour, night.usage, 5)
  const yThreshold = yFor(SPO2_LOW_THRESHOLD)

  const stat = (label, value, color) => (
    <div style={{ background: T.bg, borderRadius: 14, padding: '10px 12px' }}>
      <div style={{ fontSize: 10.5, color: T.muted }}>{label}</div>
      <div className="font-display" style={{ fontSize: 15, fontWeight: 800, color: color || T.ink, marginTop: 2 }}>{value}</div>
    </div>
  )

  return (
    <div style={{ background: T.surface, borderRadius: 22, padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="font-display" style={{ fontSize: 15, fontWeight: 700, color: T.ink }}>SpO₂</span>
        <ChartInfoButton show={showInfo} onToggle={() => setShowInfo((s) => !s)} size={32} />
      </div>
      <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>Spot readings · From Apple Health</div>

      <div style={{ position: 'relative', height: PLOT_H, background: T.bg, borderRadius: 12, marginTop: 12 }}>
        <div style={{ position: 'absolute', left: 0, right: 0, top: yThreshold, borderTop: `1px dashed ${SEV.bad}`, opacity: 0.5 }} />
        <span style={{ position: 'absolute', right: 8, top: yThreshold - 13, fontSize: 9.5, fontWeight: 700, color: SEV.bad }}>{SPO2_LOW_THRESHOLD}%</span>
        {points.map((p) => {
          const d = p.low ? DOT_LOW : DOT
          return (
            <div key={p.key}>
              <div style={{
                position: 'absolute', left: `${p.f * 100}%`, top: p.y - d / 2, width: d, height: d, marginLeft: -d / 2, borderRadius: '50%',
                background: p.low ? SEV.bad : C.blue,
                boxShadow: `0 0 0 2px ${T.surface}${p.low ? `, 0 0 0 5px ${SEV.bad}33` : ''}`,
              }} />
              <span style={{
                position: 'absolute', left: `${p.f * 100}%`, top: p.y - d / 2 - 16, transform: 'translateX(-50%)',
                fontSize: 10.5, lineHeight: '13px', fontWeight: 700, color: p.low ? SEV.bad : T.ink,
                background: T.bg, padding: '0 3px', borderRadius: 4,
              }}>{p.shown}</span>
            </div>
          )
        })}
        {showInfo && (
          <div onClick={() => setShowInfo(false)} style={{
            position: 'absolute', inset: 0, zIndex: 2, overflow: 'auto', boxSizing: 'border-box', background: T.surface, border: `1.5px solid ${C.blue}`, borderRadius: 10,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '6px 10px', textAlign: 'center', cursor: 'pointer',
          }}>
            <span className="font-display" style={{ fontSize: 11, fontWeight: 700, color: T.ink, lineHeight: 1.25 }}>SpO₂ · % oxygen saturation</span>
            <span style={{ fontSize: 10, color: T.muted, marginTop: 3, lineHeight: 1.3 }}>{DESC}</span>
          </div>
        )}
      </div>

      <div style={{ position: 'relative', height: 14, marginTop: 6 }}>
        {ticks.map((t) => (
          <span key={t.label} className="font-display" style={{ position: 'absolute', left: `${t.frac * 100}%`, transform: t.frac < 0.05 ? 'none' : t.frac > 0.95 ? 'translateX(-100%)' : 'translateX(-50%)', fontSize: 10, fontWeight: 600, color: T.muted, whiteSpace: 'nowrap' }}>{t.label}</span>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8, marginTop: 14 }}>
        {stat('Lowest', `${low}%`, isLowSpo2(low) ? SEV.bad : undefined)}
        {stat('Average', `${avg}%`)}
        {stat('Readings', count)}
      </div>
    </div>
  )
}
