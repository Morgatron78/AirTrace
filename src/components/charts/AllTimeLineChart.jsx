import { useState } from 'react'
import { T } from '../../constants/theme'
import { yTicks } from './chartHelpers.js'

const WEEK_MS = 7 * 86400000

// Reusable weekly-line panel for Trends' All Time section — used for both
// the AHI panel and the Weight/BMI panel. Data has real gaps (a week with
// zero underlying readings just isn't a point), so points are positioned
// by their actual weekIndex against the shared maxWeek span, not by array
// index — a missing week has to look like a gap, not get silently
// compressed away.
export function AllTimeLineChart({ data, maxWeek, gridStartMs, color, formatY, ticks, showXAxisLabels, confound }) {
  const [confoundOpen, setConfoundOpen] = useState(false)
  const w = 400
  const h = showXAxisLabels ? 142 : 130
  const padTop = 10, padBottom = showXAxisLabels ? 22 : 10, padLeft = 4, padRight = 4

  if (!data.length) return null

  const values = data.map((d) => d.value)
  const min = Math.min(...values), max = Math.max(...values)
  const span = (max - min) || 1
  const yPad = span * 0.18 // never zero-anchored — a narrow real range shouldn't look flattened
  const yMin = min - yPad, yMax = max + yPad
  const x = (week) => padLeft + (week / maxWeek) * (w - padLeft - padRight)
  const y = (v) => padTop + (1 - (v - yMin) / (yMax - yMin)) * (h - padTop - padBottom)
  const weekOf = (dateStr) => (Date.parse(dateStr) - gridStartMs) / WEEK_MS

  // Clamped to the chart's own visible range: the confound's real start
  // date can predate week-index 0's own labeled date (week 0 absorbs
  // whatever partial-week remainder is left once the grid is anchored
  // from the latest night backward — see weeklyTrend.js), which without
  // clamping computed a negative x here and bled the shaded region off
  // the left edge, overlapping the y-axis labels.
  const confoundX0 = confound ? Math.max(padLeft, x(weekOf(confound.shadeStartDate))) : null
  const confoundX1 = confound ? Math.min(w - padRight, Math.max(padLeft, x(weekOf(confound.boundaryDate)))) : null

  return (
    <div style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ display: 'block', width: '100%', height: 'auto', overflow: 'visible' }}>
        {confound && (
          <rect x={confoundX0} y={0} width={confoundX1 - confoundX0} height={h - padBottom} fill={T.bg} style={{ cursor: 'pointer' }}
            onClick={(e) => { e.stopPropagation(); setConfoundOpen((o) => !o) }} />
        )}
        {confound && (
          <line x1={confoundX1} x2={confoundX1} y1={0} y2={h - padBottom} stroke={T.muted} strokeWidth={1} strokeDasharray="3 3" />
        )}
        {/* No vertical gridlines here — FlatBarChart/SessionTimesChart never
            draw one either, only horizontal ticks; x-axis position is
            conveyed by the labels alone. */}
        {ticks.map((t) => (
          showXAxisLabels && (
            <text key={t.week} x={x(t.week)} y={h + 9} textAnchor="middle" fontSize={9} fontWeight={600} fill={T.muted} fontFamily="'Plus Jakarta Sans', sans-serif">{t.label}</text>
          )
        ))}
        {yTicks(yMin, yMax).map((v) => (
          <g key={v}>
            {/* "3 3" approximates the browser's own native rendering of
                FlatBarChart's real `border-top: 1px dashed` gridlines —
                CSS doesn't expose an exact dash length to match against,
                but the previous "2 2" read visibly denser/tighter. */}
            <line x1={padLeft} x2={w - padRight} y1={y(v)} y2={y(v)} stroke={T.line} strokeWidth={1} strokeDasharray="3 3" />
            {/* Centered on its gridline (dominantBaseline="middle"), matching
                FlatBarChart's own real y-axis tick convention (translateY(-50%))
                — a fixed baseline offset instead read as sitting low, almost
                touching the line, rather than centered on it. */}
            <text x={padLeft} y={y(v)} dominantBaseline="middle" fontSize={9} fontWeight={600} fill={T.muted} fontFamily="'Plus Jakarta Sans', sans-serif">{formatY(v)}</text>
          </g>
        ))}
        {data.slice(0, -1).map((a, i) => {
          const b = data[i + 1]
          const lowConfidence = a.count < 3 || b.count < 3
          return (
            <line key={a.weekIndex} x1={x(a.weekIndex)} y1={y(a.value)} x2={x(b.weekIndex)} y2={y(b.value)}
              stroke={color} strokeWidth={1.6} strokeLinecap="round"
              strokeDasharray={lowConfidence ? '3 3' : undefined} opacity={lowConfidence ? 0.55 : 1} />
          )
        })}
        <circle cx={x(data[data.length - 1].weekIndex)} cy={y(data[data.length - 1].value)} r={3} fill={color} />
      </svg>
      {confound && confoundOpen && (
        <div style={{
          position: 'absolute', zIndex: 20, left: 10, top: 8, background: T.surface, borderRadius: 12,
          boxShadow: '0 6px 20px rgba(0,0,0,0.18)', padding: '10px 12px', fontSize: 11.5, color: T.muted, lineHeight: 1.6, maxWidth: 210,
        }}>
          <b style={{ color: T.ink }}>Pressure adjusted early on</b><br />
          {confound.transitions.map((t) => `${t.date}: ${t.setPressure} cmH₂O`).join(', ')}
        </div>
      )}
    </div>
  )
}
