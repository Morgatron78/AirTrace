import { ChevronRight } from 'lucide-react'
import { T, SEV } from '../constants/theme'
import { TAG_LABEL } from '../constants/tags'
import { AHI_BREAKDOWN } from '../constants/events'
import { scoreBreakdown } from '../utils/scoring'
import { formatClock, formatDuration } from '../utils/dates'
import { DetailFields } from './DetailFields'
import { ViewNightButton } from './ViewNightButton'

// Expanding detail panel under the Trends bar charts — shown in place of
// navigating to the night, so a tap gives a quick breakdown without leaving
// Trends. Content is metric-specific: each tab surfaces the numbers a flat
// bar can't show on its own. "View night detail" is the deliberate way to
// still reach the full Night View for that date.
export function NightDetailPanel({ night, metric, targets, onViewNight, activeEventType, onSelectEventType }) {
  if (night.noUsage) {
    return (
      <div style={{ background: T.bg, borderRadius: 14, padding: 14, marginTop: 12 }}>
        <div className="font-display" style={{ fontSize: 13, fontWeight: 700, color: T.ink, marginBottom: 6 }}>{night.fullLabel}</div>
        <div style={{ fontSize: 12.5, color: T.muted, lineHeight: 1.4 }}>Machine wasn't used this night — no data was recorded.</div>
      </div>
    )
  }
  // Events/Score/Usage all show a breakdown of parts, but unlike the
  // rings (where the total sits fixed in the center regardless of the
  // breakdown), this panel's breakdown was the whole content — so the
  // number the bar itself represents never actually appeared anywhere.
  // Leak and Pressure don't need this: their own fields already state
  // the bar's value directly ("Leak rate", "High").
  const headerTotal = metric === 'ahi' ? { label: 'AHI', value: night.ahi.toFixed(1) }
    : metric === 'score' ? { label: 'Score', value: night.score }
    : metric === 'usage' ? { label: 'Usage', value: formatDuration(night.usage) }
    : null
  return (
    <div style={{ background: T.bg, borderRadius: 14, padding: 14, marginTop: 12 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
        <span className="font-display" style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>{night.fullLabel}</span>
        {headerTotal && (
          <span className="font-display" style={{ fontSize: 13, color: T.ink }}>
            {headerTotal.label} <span style={{ fontWeight: 800 }}>{headerTotal.value}</span>
          </span>
        )}
      </div>

      {metric === 'ahi' && (
        <>
          {AHI_BREAKDOWN.map((s, i) => {
            const isActive = activeEventType === s.key
            return (
              <div key={s.key} style={{ borderBottom: i < AHI_BREAKDOWN.length - 1 ? `1px solid ${T.line}` : 'none' }}>
                <button onClick={() => onSelectEventType && onSelectEventType(isActive ? null : s.key)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '6px 0', background: 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 9, height: 9, borderRadius: 5, background: s.color, flexShrink: 0 }} />
                    <span className="font-display" style={{ fontSize: 12, fontWeight: isActive ? 700 : 500, color: isActive ? T.ink : T.muted }}>{s.label}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span className="font-display" style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>{night[s.key].toFixed(1)}</span>
                    <ChevronRight size={12} style={{ color: T.muted, transform: isActive ? 'rotate(90deg)' : 'none' }} />
                  </div>
                </button>
                {isActive && (
                  <div style={{ fontSize: 12.5, color: T.muted, lineHeight: 1.4, paddingBottom: 8 }}>{s.description}</div>
                )}
              </div>
            )
          })}
          {night.tags.length > 0 && (
            <div style={{ fontSize: 11, color: T.muted, marginTop: 10, paddingTop: 10, borderTop: `1px solid ${T.line}` }}>
              Tagged: {night.tags.map((tk) => TAG_LABEL[tk]).join(', ')}
            </div>
          )}
        </>
      )}

      {metric === 'leak' && (
        <DetailFields fields={[
          { label: 'Leak rate', value: `${night.leak} L/min` },
          { label: 'Mask seal', value: night.seal, color: night.seal === 'Poor' ? SEV.bad : undefined },
          { label: 'Vs. target', value: night.leak <= targets.leak ? 'Under' : `+${(night.leak - targets.leak).toFixed(1)} L/min`, color: night.leak <= targets.leak ? SEV.good : SEV.bad },
        ]} />
      )}

      {metric === 'usage' && (
        <DetailFields fields={[
          { label: 'Start', value: formatClock(night.startHour) },
          { label: 'Finish', value: formatClock(night.startHour + night.usage) },
          { label: 'Mask off', value: night.maskOff },
        ]} />
      )}

      {metric === 'pMax' && (
        <DetailFields fields={[
          { label: 'Low', value: `${night.pMin} cmH₂O` },
          { label: 'High', value: `${night.pMax} cmH₂O` },
          { label: '95th %ile', value: `${night.p95} cmH₂O` },
        ]} />
      )}

      {metric === 'score' && scoreBreakdown(night).map((b, i, arr) => (
        <div key={b.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: i < arr.length - 1 ? `1px solid ${T.line}` : 'none' }}>
          <span className="font-display" style={{ fontSize: 12, fontWeight: 500, color: T.muted }}>{b.label}</span>
          <span className="font-display" style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>{`${Math.round(b.points)}/${b.max} pts`}</span>
        </div>
      ))}

      <ViewNightButton onClick={onViewNight} />
    </div>
  )
}
