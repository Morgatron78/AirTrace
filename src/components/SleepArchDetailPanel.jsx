// Apple Health integration (POC) — safe to delete this file entirely,
// see docs/apple-health-integration.md.
import { ChevronRight } from 'lucide-react'
import { T } from '../constants/theme'
import { STAGE_COLOR, STAGE_ICON, STAGE_LABEL } from '../constants/sleepStages'
import { useNightDetail } from '../db/detail.js'
import { computeAhiByStage } from '../health/stageAhi.js'
import { formatDuration } from '../utils/dates'
import { ViewNightButton } from './ViewNightButton'

const STAGES = ['core', 'deep', 'rem']

// Trends' own equivalent of NightDetailPanel — a different component
// (not a new metric branch on that one) since sleep-stage rows have their
// own shape (AHI parenthetical, duration as the headline value) that
// doesn't fit NightDetailPanel's per-metric structure. Anchored to one
// night throughout: clicking a row drills the *chart* into that stage's
// own cross-night trend (handled by the caller via onSelectStage), but
// this panel keeps showing the same night's own numbers regardless of
// which row is expanded.
export function SleepArchDetailPanel({ night, healthEntry, focus, onSelectStage, trendSentence, onViewNight }) {
  // AHI needs real per-event timestamps (nightDetail), which — unlike the
  // permanent minutes already on `night` — is pruned after 90 days.
  // Trends never shows more than 30 days back, comfortably inside that
  // window, so this is expected to resolve to 'ready'; hasEventDetail
  // still gates the computation properly rather than assuming, the same
  // fix already applied to Night View's own HypnogramChart.
  const { status, detail } = useNightDetail(night.noUsage ? null : night.date)
  const hasEventDetail = status === 'ready'

  if (night.noUsage) {
    return (
      <div style={{ background: T.bg, borderRadius: 14, padding: 14, marginTop: 12 }}>
        <div className="font-display" style={{ fontSize: 13, fontWeight: 700, color: T.ink, marginBottom: 6 }}>{night.fullLabel}</div>
        <div style={{ fontSize: 12.5, color: T.muted, lineHeight: 1.4 }}>No Watch data this night — nothing to break down.</div>
      </div>
    )
  }

  const ahiByStage = hasEventDetail ? computeAhiByStage(detail.events, healthEntry, night) : null
  const ahiFor = (s) => ahiByStage?.find((r) => r.stage === s)?.ahi

  return (
    <div style={{ background: T.bg, borderRadius: 14, padding: 14, marginTop: 12 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
        <span className="font-display" style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>{night.fullLabel}</span>
        <span className="font-display" style={{ fontSize: 13, color: T.ink }}>
          Total <span style={{ fontWeight: 800 }}>{formatDuration(night.totalHr)}</span>
        </span>
      </div>

      {STAGES.map((s, i) => {
        const isActive = focus === s
        const Icon = STAGE_ICON[s]
        const ahi = ahiFor(s)
        return (
          <div key={s} style={{ borderBottom: i < STAGES.length - 1 ? `1px solid ${T.line}` : 'none' }}>
            <button onClick={() => onSelectStage(isActive ? null : s)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '6px 0', background: 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon size={13} style={{ color: STAGE_COLOR[s], flexShrink: 0 }} />
                <span className="font-display" style={{ fontSize: 12, fontWeight: isActive ? 700 : 500, color: isActive ? T.ink : T.muted }}>{STAGE_LABEL[s]}</span>
                <span style={{ fontSize: 10.5, color: T.muted }}>({ahi != null ? `${ahi.toFixed(1)} AHI/hr` : '— AHI/hr'})</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span className="font-display" style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>{formatDuration(night[`${s}Hr`])}</span>
                <ChevronRight size={12} style={{ color: T.muted, transform: isActive ? 'rotate(90deg)' : 'none' }} />
              </div>
            </button>
            {isActive && (
              <div style={{ fontSize: 12.5, color: T.muted, lineHeight: 1.4, paddingBottom: 8 }}>{trendSentence}</div>
            )}
          </div>
        )
      })}

      <ViewNightButton onClick={onViewNight} />
    </div>
  )
}
