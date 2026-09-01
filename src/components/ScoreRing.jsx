import { useState } from 'react'
import { PowerOff, Check, Activity, Clock } from 'lucide-react'
import { T, C, SEV } from '../constants/theme'
import { scoreOf, scoreBreakdown } from '../utils/scoring'
import { StatRow } from './StatRow'
import { LeakIcon } from './icons/LeakIcon'

export function ScoreRing({ night, targets, size = 158 }) {
  const [showBreakdown, setShowBreakdown] = useState(false)
  if (night.noUsage) {
    return (
      <div style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
        <div style={{ width: '100%', height: '100%', borderRadius: '50%', border: `${size * 0.1}px dashed ${T.line}`, boxSizing: 'border-box' }} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <PowerOff size={size * 0.22} style={{ color: T.muted }} strokeWidth={1.8} />
          <span style={{ fontSize: size * 0.07, fontWeight: 600, color: T.muted, marginTop: 6, maxWidth: size * 0.6, textAlign: 'center' }}>Not used</span>
        </div>
      </div>
    )
  }
  const score = scoreOf(night, targets)
  const breakdown = scoreBreakdown(night, targets).map((b) => ({
    ...b,
    icon: b.label === 'AHI' ? Activity : b.label === 'Leak' ? LeakIcon : b.label === 'Usage' ? Clock : PowerOff,
    color: b.label === 'AHI' ? C.pink : b.label === 'Leak' ? C.purple : b.label === 'Usage' ? C.blue : C.orange,
  }))
  return (
    <div>
      <button onClick={() => setShowBreakdown((o) => !o)} style={{ position: 'relative', width: size, height: size, margin: '0 auto', display: 'block' }}>
        <div style={{ width: '100%', height: '100%', borderRadius: '50%',
          background: 'conic-gradient(from -100deg, #3B6FE0 0deg, #7C4DE0 90deg, #F0A23C 200deg, #E5484D 280deg, #3B6FE0 350deg, transparent 350deg 360deg)' }} />
        <div style={{ position: 'absolute', inset: size * 0.15, borderRadius: '50%', background: T.surface, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span className="font-display" style={{ fontSize: size * 0.28, fontWeight: 800, color: T.ink, lineHeight: 1 }}>{score}</span>
          <span style={{ fontSize: size * 0.07, fontWeight: 600, color: T.muted, marginTop: 4, maxWidth: size * 0.6, textAlign: 'center' }}>My Score</span>
        </div>
      </button>
      {showBreakdown && (
        <div style={{ marginTop: 10 }}>
          {breakdown.map((b, i) => (
            <StatRow key={b.label} icon={b.icon} iconColor={b.color} label={b.label}
              value={b.met
                ? <Check size={18} style={{ color: SEV.good }} strokeWidth={2.5} />
                : <span style={{ color: T.ink }}>{`-${Math.round(b.penalty)} pts`}</span>}
              last={i === breakdown.length - 1} />
          ))}
        </div>
      )}
    </div>
  )
}
