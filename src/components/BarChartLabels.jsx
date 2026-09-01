import { T } from '../constants/theme'

export function BarChartLabels({ data, labelEvery, labelWidth = 24 }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
      <div style={{ width: labelWidth, flexShrink: 0 }} />
      <div style={{ position: 'relative', flex: 1, height: 24 }}>
        {data.map((d, i) => {
          if (i % labelEvery !== 0) return null
          const frac = (i + 0.5) / data.length
          return (
            <div key={i} style={{
              position: 'absolute', left: `${frac * 100}%`, top: 0,
              transform: frac < 0.06 ? 'none' : frac > 0.94 ? 'translateX(-100%)' : 'translateX(-50%)',
              textAlign: 'center', whiteSpace: 'nowrap',
            }}>
              <div style={{ fontSize: 9, color: T.muted }}>{d.wd}</div>
              <div style={{ fontSize: 9, fontWeight: 600, color: T.ink }}>{d.label.split(' ')[0]}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
