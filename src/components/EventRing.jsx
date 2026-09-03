import { useState } from 'react'
import { Activity } from 'lucide-react'
import { T, C } from '../constants/theme'
import { StatRow } from './StatRow'

// Companion ring next to the score — event-type mix for the night.
// Ring band width/radius matched to fill the same box edge-to-edge as
// ScoreRing, so the two read as the same visual size, not just the
// same pixel dimensions.
export function EventRing({ night, size = 158 }) {
  const [showLegend, setShowLegend] = useState(false)
  if (night.noUsage) {
    return (
      <div style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
        <div style={{ width: '100%', height: '100%', borderRadius: '50%', border: `${size * 0.1}px dashed ${T.line}`, boxSizing: 'border-box' }} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: size * 0.065, fontWeight: 600, color: T.muted, maxWidth: size * 0.65, textAlign: 'center', lineHeight: 1.3 }}>No events logged — machine wasn't used</span>
        </div>
      </div>
    )
  }
  // Segment proportions come from the three sub-categories (each its own
  // independently-rounded STR.edf value), but the number shown at center
  // is the device's own real AHI (same field Today's "Events/hr" reads) —
  // not a re-sum of those already-rounded parts. The two used to be
  // computed two different ways and could differ by ~0.1 purely from
  // independent rounding at each step, which read as a real data
  // contradiction sitting right next to each other on Today. AHI is the
  // authoritative clinical number either way; the sub-categories are only
  // needed here for how the ring's colors are proportioned, not for what
  // the center digit says.
  const segTotal = night.obstructive + night.central + night.hypopnea || 1
  const displayAhi = night.ahi ?? segTotal
  const r = 42, strokeW = 16, c = 2 * Math.PI * r
  const segs = [
    { label: 'Obstructive', v: night.obstructive, color: C.red,
      description: 'Your airway is physically blocked despite effort to breathe — usually from relaxed throat muscles or anatomy. The most common event type for most people.' },
    { label: 'Central', v: night.central, color: C.orange,
      description: "Your brain briefly stops sending the signal to breathe — not a blockage. Can relate to altitude, certain medications, or heart conditions, and doesn't respond to mask/pressure fixes the way obstructive events do." },
    { label: 'Hypopnea', v: night.hypopnea, color: C.blue,
      description: 'A partial narrowing that reduces airflow without stopping it completely — often has similar effects to a full apnea but registers as less severe per event.' },
  ]

  return (
    <div>
      <button onClick={() => setShowLegend((o) => !o)} style={{ position: 'relative', width: size, height: size, margin: '0 auto', display: 'block' }}>
        <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: 'block', transform: 'rotate(-90deg)' }}>
          <circle cx="50" cy="50" r={r} fill="none" stroke={T.bg} strokeWidth={strokeW} />
          {(() => {
            let dCum = 0
            return segs.map((s, i) => {
              const len = (s.v / segTotal) * c
              const el = <circle key={i} cx="50" cy="50" r={r} fill="none" stroke={s.color} strokeWidth={strokeW} strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-dCum} />
              dCum += len
              return el
            })
          })()}
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span className="font-display" style={{ fontSize: size * 0.28, fontWeight: 800, color: T.ink, lineHeight: 1 }}>{displayAhi.toFixed(1)}</span>
          <span style={{ fontSize: size * 0.065, fontWeight: 600, color: T.muted, marginTop: 4, maxWidth: size * 0.65, textAlign: 'center', lineHeight: 1.3 }}>AHI Event Mix</span>
        </div>
      </button>
      {showLegend && (
        <div style={{ marginTop: 10 }}>
          {segs.map((s, i) => (
            <StatRow key={s.label} icon={Activity} iconColor={s.color} label={s.label} value={s.v.toFixed(1)}
              description={s.description} last={i === segs.length - 1} />
          ))}
        </div>
      )}
    </div>
  )
}
