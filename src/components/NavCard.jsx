import { ChevronRight } from 'lucide-react'
import { T } from '../constants/theme'

export function NavCard({ title, subtitle, dot, icon: Icon, onClick }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 14, background: T.surface, borderRadius: 16, padding: 16, width: '100%', textAlign: 'left' }}>
      <div style={{ width: 40, height: 40, borderRadius: '50%', background: dot, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={18} style={{ color: '#FFFFFF' }} strokeWidth={2} />
      </div>
      <div style={{ flex: 1 }}>
        <div className="font-display" style={{ fontSize: 15, fontWeight: 700, color: T.ink }}>{title}</div>
        <div style={{ fontSize: 13, color: T.muted, marginTop: 2 }}>{subtitle}</div>
      </div>
      {onClick && <ChevronRight size={18} style={{ color: T.muted }} />}
    </Tag>
  )
}
