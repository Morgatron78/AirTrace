import { T } from '../constants/theme'

// Row layout shared by every detail-panel's field group (Start/Finish/Length,
// Low/High/95th, etc) — three-across, label over value.
export function DetailFields({ fields }) {
  return (
    <div style={{ display: 'flex' }}>
      {fields.map((f) => (
        <div key={f.label} style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: T.muted, marginBottom: 3 }}>{f.label}</div>
          <div className="font-display" style={{ fontSize: 13, fontWeight: 700, color: f.color || T.ink }}>{f.value}</div>
        </div>
      ))}
    </div>
  )
}
