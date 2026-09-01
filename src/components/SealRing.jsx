import { useState } from 'react'
import { LockKeyhole } from 'lucide-react'
import { T, SEV } from '../constants/theme'
import { StatRow } from './StatRow'

// Same ring language as EventRing, for a categorical Good/Fair/Poor split
// instead of an events-per-hour count.
export function SealRing({ nights, size = 158 }) {
  const [showLegend, setShowLegend] = useState(false)
  const good = nights.filter((n) => n.seal === 'Good').length
  const fair = nights.filter((n) => n.seal === 'Fair').length
  const poor = nights.filter((n) => n.seal === 'Poor').length
  const total = good + fair + poor || 1
  const goodPct = Math.round((good / total) * 100)
  const r = 42, strokeW = 16, c = 2 * Math.PI * r
  const segs = [
    { label: 'Good nights', v: good, color: SEV.good,
      description: 'Nights your mask held a consistent seal throughout, with leak staying low and steady.' },
    { label: 'Fair nights', v: fair, color: SEV.fair,
      description: 'Nights with some leak — not severe, but often the first sign a cushion is starting to wear or needs adjusting.' },
    { label: 'Poor nights', v: poor, color: SEV.bad,
      description: "Nights with a real seal problem. If this keeps climbing, check Equipment for cushion/headgear age — Trends' Leak & mask fit card shows exactly which nights." },
  ]

  return (
    <div>
      <button onClick={() => setShowLegend((o) => !o)} style={{ position: 'relative', width: size, height: size, margin: '0 auto', display: 'block' }}>
        <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: 'block', transform: 'rotate(-90deg)' }}>
          <circle cx="50" cy="50" r={r} fill="none" stroke={T.bg} strokeWidth={strokeW} />
          {(() => {
            let dCum = 0
            return segs.map((s, i) => {
              const len = (s.v / total) * c
              const el = <circle key={i} cx="50" cy="50" r={r} fill="none" stroke={s.color} strokeWidth={strokeW} strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-dCum} />
              dCum += len
              return el
            })
          })()}
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span className="font-display" style={{ fontSize: size * 0.28, fontWeight: 800, color: T.ink, lineHeight: 1 }}>{goodPct}%</span>
          <span style={{ fontSize: size * 0.065, fontWeight: 600, color: T.muted, marginTop: 4, maxWidth: size * 0.65, textAlign: 'center', lineHeight: 1.3 }}>Nights, good seal</span>
        </div>
      </button>
      {showLegend && (
        <div style={{ marginTop: 10 }}>
          {segs.map((s, i) => (
            <StatRow key={s.label} icon={LockKeyhole} iconColor={s.color} label={s.label} value={`${Math.round((s.v / total) * 100)}%`}
              description={s.description} last={i === segs.length - 1} />
          ))}
        </div>
      )}
    </div>
  )
}
