import { Info } from 'lucide-react'
import { T } from '../constants/theme'

// Shared by FlatBarChart and SessionTimesChart so the marker can never
// visually drift between the two — same box, same icon, same size, always.
//
// onBareBg: this button normally sits inside a T.surface card, so its
// resting T.bg fill reads as a visible grey dot against white. A header
// with no card behind it at all (e.g. Trends All Time's collapsed
// state, sitting directly on the page's own T.bg) needs the inverse —
// same T.surface/border treatment "Individual channels"'s own bare
// header already uses for its Sync zoom button — or the button
// disappears into the page background entirely.
export function ChartInfoButton({ show, onToggle, size = 26, iconSize = 13, onBareBg = false }) {
  return (
    <button onClick={onToggle} style={{
      width: size, height: size, borderRadius: '50%',
      background: show ? T.ink : onBareBg ? T.surface : T.bg,
      border: !show && onBareBg ? `1px solid ${T.line}` : 'none',
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <Info size={iconSize} style={{ color: show ? T.bg : T.muted }} />
    </button>
  )
}
