import { T } from '../constants/theme'
import { formatClock, formatDuration } from '../utils/dates'
import { DetailFields } from './DetailFields'
import { ViewNightButton } from './ViewNightButton'

// Session times gets its own panel (separate chart, separate selection
// state) but shares the field-row layout and the same "View night detail"
// exit as NightDetailPanel above.
export function SessionDetailPanel({ night, onViewNight }) {
  if (night.noUsage) {
    return (
      <div style={{ background: T.bg, borderRadius: 14, padding: 14, marginTop: 12 }}>
        <div className="font-display" style={{ fontSize: 13, fontWeight: 700, color: T.ink, marginBottom: 6 }}>{night.fullLabel}</div>
        <div style={{ fontSize: 12.5, color: T.muted, lineHeight: 1.4 }}>Machine wasn't used this night — no session to show.</div>
      </div>
    )
  }
  return (
    <div style={{ background: T.bg, borderRadius: 14, padding: 14, marginTop: 12 }}>
      <div className="font-display" style={{ fontSize: 13, fontWeight: 700, color: T.ink, marginBottom: 10 }}>{night.fullLabel}</div>
      <DetailFields fields={[
        { label: 'Start', value: formatClock(night.startHour) },
        { label: 'Finish', value: formatClock(night.startHour + night.usage) },
        { label: 'Length', value: formatDuration(night.usage) },
      ]} />
      <ViewNightButton onClick={onViewNight} />
    </div>
  )
}
