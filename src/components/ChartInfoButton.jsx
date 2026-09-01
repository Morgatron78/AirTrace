import { Info } from 'lucide-react'
import { T } from '../constants/theme'

// Shared by FlatBarChart and SessionTimesChart so the marker can never
// visually drift between the two — same box, same icon, same size, always.
export function ChartInfoButton({ show, onToggle, size = 26, iconSize = 13 }) {
  return (
    <button onClick={onToggle} style={{ width: size, height: size, borderRadius: '50%', background: show ? T.ink : T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <Info size={iconSize} style={{ color: show ? '#FFFFFF' : T.muted }} />
    </button>
  )
}
