import { Maximize2, Minimize2 } from 'lucide-react'
import { T } from '../constants/theme'

// Direct sibling of ChartInfoButton/ChartStatsButton, same 26px/13px box,
// same muted-at-rest/ink-when-active contract, so all three sit flush
// together in a chart's header row.
//
// onBareBg: see ChartInfoButton.jsx's own comment — a header with no
// card behind it needs T.surface/border instead of T.bg, or the button
// disappears into the page background.
export function ChartExpandButton({ expanded, onToggle, size = 26, iconSize = 13, onBareBg = false }) {
  const Icon = expanded ? Minimize2 : Maximize2
  return (
    <button onClick={onToggle} aria-label={expanded ? 'Collapse' : 'Expand'} style={{
      width: size, height: size, borderRadius: '50%',
      background: expanded ? T.ink : onBareBg ? T.surface : T.bg,
      border: !expanded && onBareBg ? `1px solid ${T.line}` : 'none',
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <Icon size={iconSize} style={{ color: expanded ? T.bg : T.muted }} />
    </button>
  )
}
