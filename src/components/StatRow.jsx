import { useState } from 'react'
import { TriangleAlert, ChevronRight } from 'lucide-react'
import { T, SEV } from '../constants/theme'

// detail: an optional ReactNode rendered above the description text,
// styled as its own compact label/value pairs (StatDetailRow below)
// rather than a plain sentence — for expandable content that's really
// structured data (Usage's start/finish time) rather than prose.
export function StatDetailRow({ label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '3px 0' }}>
      <span className="font-display" style={{ fontSize: 13, color: T.muted }}>{label}</span>
      <span className="font-display" style={{ fontSize: 14.5, fontWeight: 700, color: T.ink }}>{value}</span>
    </div>
  )
}

export function StatRow({ icon: Icon, iconColor, label, value, last, delta, description, detail, warn }) {
  const [open, setOpen] = useState(false)
  const clickable = !!description || !!detail
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
          {detail}
          {description && (
            <p className="font-display" style={{ fontSize: 12.5, fontWeight: 500, lineHeight: 1.5, color: T.muted, margin: detail ? '8px 0 0' : 0 }}>{description}</p>
          )}
        </div>
      )}
    </div>
  )
}
