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
            // Always centered on the bar, no edge special-casing — the
            // empty gutter column to the left (and matching blank space
            // to the right) already absorbs a label's half-width easily
            // at either end, so un-centering the label instead just
            // visibly detaches it from its bar. Confirmed: with enough
            // bars for the first label's fraction to dip under where
            // that special-casing used to kick in (14+, i.e. 2-week/month
            // view but not week view), the first date label sat ~7px off
            // from its actual bar.
            <div key={i} style={{
              position: 'absolute', left: `${frac * 100}%`, top: 0,
              transform: 'translateX(-50%)',
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
