import { T } from '../../constants/theme'

export function StatQuad({ stats, unit, decimals }) {
  return (
    <div style={{ display: 'flex', margin: '8px 0' }}>
      {[['Min', stats.min], ['Median', stats.median], ['95%', stats.p95], ['Max', stats.max]].map(([label, val]) => (
        <div key={label} style={{ flex: 1 }}>
          <div style={{ fontSize: 9, color: T.muted, marginBottom: 1 }}>{label}</div>
          <div className="font-display" style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>{val.toFixed(decimals)}{unit}</div>
        </div>
      ))}
    </div>
  )
}
