import { useState } from 'react'
import { TriangleAlert, ChevronRight } from 'lucide-react'
import { T, SEV } from '../constants/theme'

export function StatRow({ icon: Icon, iconColor, label, value, last, delta, description, warn }) {
  const [open, setOpen] = useState(false)
  const clickable = !!description
  return (
    <div style={{ borderBottom: last ? 'none' : `1px solid ${T.line}` }}>
      <div onClick={clickable ? () => setOpen((o) => !o) : undefined}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0', height: 44, boxSizing: 'border-box', cursor: clickable ? 'pointer' : 'default' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Icon size={18} style={{ color: iconColor }} strokeWidth={1.8} />
          <span className="font-display" style={{ fontSize: 14.5, color: T.ink }}>{label}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {delta !== undefined && <span style={{ fontSize: 12, color: T.muted }}>{delta > 0 ? '↑' : delta < 0 ? '↓' : '–'} {Math.abs(delta)}%</span>}
          {warn && <TriangleAlert size={18} style={{ color: SEV.bad }} />}
          <span className="font-display" style={{ fontSize: 18, fontWeight: 700, color: T.ink }}>{value}</span>
          {clickable && <ChevronRight size={14} style={{ color: T.muted, transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', marginLeft: 2 }} />}
        </div>
      </div>
      {clickable && open && (
        <div style={{ paddingBottom: 14 }}>
          <p className="font-display" style={{ fontSize: 12.5, fontWeight: 500, lineHeight: 1.5, color: T.muted, margin: 0 }}>{description}</p>
        </div>
      )}
    </div>
  )
}
