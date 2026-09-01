import { T } from '../constants/theme'

export function CardTitle({ children, sub }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div className="font-display" style={{ fontSize: 15, fontWeight: 700, color: T.ink }}>{children}</div>
      {sub && <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>{sub}</div>}
    </div>
  )
}
