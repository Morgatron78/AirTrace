import { Moon, ChevronRight } from 'lucide-react'
import { T } from '../constants/theme'

// The "jump to Night View" exit from every expand-in-place panel — since
// tapping a bar now shows a breakdown in place rather than navigating away,
// this is the one deliberate way back to the full night, everywhere a panel
// can open.
export function ViewNightButton({ onClick }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%',
      marginTop: 12, height: 40, borderRadius: 12, background: T.surface,
    }}>
      <Moon size={14} style={{ color: T.ink }} />
      <span className="font-display" style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>View night detail</span>
      <ChevronRight size={13} style={{ color: T.muted }} />
    </button>
  )
}
