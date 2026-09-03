import { Sigma } from 'lucide-react'
import { T } from '../constants/theme'

// Same shape/sizing contract as ChartInfoButton (shared box/icon size
// convention across FlatBarChart and SessionTimesChart) so the two
// buttons sit flush together in a chart's header row — Sigma (Σ) reads
// as "summary statistics" without competing visually with Info's "i".
export function ChartStatsButton({ show, onToggle, size = 26, iconSize = 13 }) {
  return (
    <button onClick={onToggle} style={{ width: size, height: size, borderRadius: '50%', background: show ? T.ink : T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <Sigma size={iconSize} style={{ color: show ? '#FFFFFF' : T.muted }} />
    </button>
  )
}
