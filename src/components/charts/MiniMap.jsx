import { T } from '../../constants/theme'
import { bandPath, makePanHandlers, hexA } from './chartHelpers'

// The full-night scrubber strip below each chart — shows the whole night's
// shape at a glance, with a draggable box marking the current zoom/pan
// window. Dragging the box moves it directly (unlike dragging the chart
// itself, which scrolls content the opposite way).
export function MiniMap({ layers, total, winLen, start, maxStart, panStart, onPanChange, dragRef, accentColor }) {
  const w = 300, h = 34
  const n = layers.length
  const bandH = h / n
  const leftPct = (start / total) * 100
  const widthPct = Math.max((winLen / total) * 100, 3)
  const handlers = makePanHandlers(dragRef, { active: true, maxStart, panStart, setPanStart: onPanChange, scaleSamples: total, invert: true })
  return (
    <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${T.line}` }}>
      <div className="font-display" style={{ fontSize: 11, fontWeight: 600, color: T.muted, marginBottom: 6 }}>Full night</div>
      <div style={{ position: 'relative', height: h, borderRadius: 8, background: T.bg, overflow: 'hidden' }}>
        <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: 'block' }}>
          {layers.map((l, li) => {
            const y0 = li * bandH, y1 = y0 + bandH
            const barW = w / l.values.length
            return l.mode === 'bar' ? (
              <g key={li}>
                {l.values.map((v, i) => v > 0.02 ? (
                  <rect key={i} x={i * barW} y={y1 - v * bandH} width={Math.max(1, barW)} height={v * bandH} fill={l.color} opacity={0.5} />
                ) : null)}
              </g>
            ) : (
              <path key={li} d={`M ${bandPath(l.values, y0 + 2, y1 - 2, w)}`} fill="none" stroke={l.color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" opacity={0.55} />
            )
          })}
        </svg>
        <div {...handlers} style={{
          position: 'absolute', top: 0, bottom: 0, left: `${leftPct}%`, width: `${widthPct}%`,
          border: `1.5px solid ${accentColor}`, background: hexA(accentColor, 0.16), borderRadius: 6,
          cursor: 'grab', touchAction: 'pan-y',
        }} />
      </div>
    </div>
  )
}
