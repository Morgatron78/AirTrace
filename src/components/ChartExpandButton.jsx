import { Maximize2, Minimize2 } from 'lucide-react'
import { T } from '../constants/theme'

// Direct sibling of ChartInfoButton/ChartStatsButton — same 26px/13px box,
// same muted-at-rest/ink-when-active contract, so all three sit flush
// together in a chart's header row.
export function ChartExpandButton({ expanded, onToggle, size = 26, iconSize = 13 }) {
  const Icon = expanded ? Minimize2 : Maximize2
  return (
    <button onClick={onToggle} aria-label={expanded ? 'Collapse' : 'Expand'}
      style={{ width: size, height: size, borderRadius: '50%', background: expanded ? T.ink : T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <Icon size={iconSize} style={{ color: expanded ? T.bg : T.muted }} />
    </button>
  )
}
