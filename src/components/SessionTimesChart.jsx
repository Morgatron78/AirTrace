import { T, C } from '../constants/theme'
import { NoUsageMarker } from './NoUsageMarker'
import { ChartInfoOverlay } from './ChartInfoOverlay'

// Vertical range bars — bedtime to wake time each night, on a fixed
// 8pm-9am clock axis (rather than a 0-based value axis like FlatBarChart)
// so the actual sleep window position and length are both visible at once.
export function SessionTimesChart({ data, height = 160, onBarClick, selectedIdx, showInfo, onCloseInfo, infoTitle, infoDesc, infoColor }) {
  const domainStart = 20, domainEnd = 33 // 8pm .. 9am next day
  const span = domainEnd - domainStart
  const ticks = [20, 24, 28, 32]
  const tickLabel = (h) => {
    const hh = ((h % 24) + 24) % 24
    const ampm = hh < 12 ? 'AM' : 'PM'
    let h12 = hh % 12
    if (h12 === 0) h12 = 12
    return `${h12}${ampm}`
  }
  const dimOthers = selectedIdx != null
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <div style={{ position: 'relative', width: 30, height, flexShrink: 0 }}>
        {ticks.map((t) => (
          <span key={t} style={{ position: 'absolute', top: `${((t - domainStart) / span) * 100}%`, transform: 'translateY(-50%)', fontSize: 9, color: T.muted }}>
            {tickLabel(t)}
          </span>
        ))}
      </div>
      <div style={{ position: 'relative', flex: 1, height, overflow: 'hidden' }}>
        {ticks.map((t) => (
          <div key={t} style={{ position: 'absolute', top: `${((t - domainStart) / span) * 100}%`, left: 0, right: 0, borderTop: `1px dashed ${T.line}` }} />
        ))}
        <div style={{ position: 'relative', display: 'flex', gap: data.length > 16 ? 3 : 6, height: '100%' }}>
          {data.map((n, i) => {
            const rawTop = ((n.startHour - domainStart) / span) * 100
            const rawH = ((n.usage) / span) * 100
            const topPct = Math.max(0, Math.min(100, rawTop))
            const hPct = Math.max(0, Math.min(100 - topPct, rawTop + rawH - topPct))
            const isSelected = selectedIdx === i
            if (n.noUsage) {
              return (
                <button key={i} onClick={() => onBarClick && onBarClick(i)} style={{ flex: 1, minWidth: 0, position: 'relative', height: '100%', background: 'none', opacity: dimOthers && !isSelected ? 0.4 : 1 }}>
                  <NoUsageMarker isSelected={isSelected} style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }} />
                </button>
              )
            }
            return (
              <button key={i} onClick={() => onBarClick && onBarClick(i)} style={{ flex: 1, minWidth: 0, position: 'relative', height: '100%', background: 'none', opacity: dimOthers && !isSelected ? 0.4 : 1 }}>
                <div style={{ position: 'absolute', top: `${topPct}%`, height: `${hPct}%`, left: 0, right: 0, background: C.blue, borderRadius: 3, minHeight: 3, outline: isSelected ? `2px solid ${T.ink}` : 'none', outlineOffset: 1 }} />
              </button>
            )
          })}
        </div>
        <ChartInfoOverlay show={showInfo} onClose={onCloseInfo} title={infoTitle} desc={infoDesc} color={infoColor} />
      </div>
    </div>
  )
}
