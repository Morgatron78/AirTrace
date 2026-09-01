import { X } from 'lucide-react'
import { T, SEV } from '../constants/theme'

export function NoUsageMarker({ isSelected, style }) {
  return (
    <div style={{
      width: '100%', height: 20, borderRadius: 6, boxSizing: 'border-box',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      outline: isSelected ? `2px solid ${T.ink}` : 'none', outlineOffset: 1,
      ...style,
    }}>
      <X size={14} style={{ color: SEV.bad }} strokeWidth={3} />
    </div>
  )
}
