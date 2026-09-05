import { T, SEV } from '../constants/theme'
import { NoUsageMarker } from './NoUsageMarker'
import { ChartInfoOverlay } from './ChartInfoOverlay'

export function FlatBarChart({ data, dataKey, color, colorFn, max, height = 130, labelEvery = 1, onBarClick, markFn, selectedIdx, stack, showInfo, onCloseInfo, infoTitle, infoDesc, infoColor, axisUnit = '' }) {
  // stack (optional): [{ key, color }] — every bar renders as segments
  // summing to dataKey's total instead of a single flat color. The caller
  // decides when to pass this at all (e.g. only once a night is selected),
  // so the chart itself doesn't need to know why it's showing composition.
  const m = max || Math.max(...data.map((d) => d[dataKey])) * 1.15
  const ticks = [1, 0.75, 0.5, 0.25, 0]
  const dimOthers = selectedIdx != null
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <div style={{ position: 'relative', width: 24, height, flexShrink: 0 }}>
        {ticks.map((t) => (
          <span key={t} style={{ position: 'absolute', top: `${(1 - t) * 100}%`, transform: 'translateY(-50%)', fontSize: 9, color: T.muted }}>
            {Math.round(m * t)}{axisUnit}
          </span>
        ))}
      </div>
      <div style={{ position: 'relative', flex: 1, height }}>
        {ticks.map((t) => (
          <div key={t} style={{ position: 'absolute', top: `${(1 - t) * 100}%`, left: 0, right: 0, borderTop: `1px dashed ${T.line}` }} />
        ))}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-end', gap: data.length > 16 ? 3 : 6, height: '100%' }}>
          {data.map((d, i) => {
            const total = d[dataKey]
            const barPct = Math.min(100, (total / m) * 100)
            const isSelected = selectedIdx === i
            if (d.noUsage) {
              return (
                <button key={i} onClick={() => onBarClick && onBarClick(i)}
                  style={{ flex: 1, minWidth: 0, position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', background: 'none', height: '100%', opacity: dimOthers && !isSelected ? 0.4 : 1 }}>
                  <NoUsageMarker isSelected={isSelected} />
                </button>
              )
            }
            return (
              <button key={i} onClick={() => onBarClick && onBarClick(i)}
                style={{ flex: 1, minWidth: 0, position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, background: 'none', height: '100%', justifyContent: 'flex-end', opacity: dimOthers && !isSelected ? 0.4 : 1 }}>
                {markFn && markFn(d) && (
                  <div style={{ position: 'absolute', bottom: `calc(${barPct}% + 4px)`, left: '50%', transform: 'translateX(-50%)', width: 6, height: 6, borderRadius: 3, background: SEV.bad }} />
                )}
                {stack ? (
                  <div style={{ width: '100%', height: `${barPct}%`, minHeight: 3, borderRadius: '3px 3px 0 0', overflow: 'hidden', display: 'flex', flexDirection: 'column-reverse', outline: isSelected ? `2px solid ${T.ink}` : 'none', outlineOffset: 1 }}>
                    {stack.map((sk) => {
                      const segPct = total ? (d[sk.key] / total) * 100 : 0
                      return <div key={sk.key} style={{ width: '100%', height: `${segPct}%`, background: sk.color }} />
                    })}
                  </div>
                ) : (
                  <div style={{ width: '100%', height: `${barPct}%`, background: colorFn ? colorFn(d) : color, borderRadius: '3px 3px 0 0', minHeight: 3, outline: isSelected ? `2px solid ${T.ink}` : 'none', outlineOffset: 1 }} />
                )}
              </button>
            )
          })}
        </div>
        <ChartInfoOverlay show={showInfo} onClose={onCloseInfo} title={infoTitle} desc={infoDesc} color={infoColor} />
      </div>
    </div>
  )
}
