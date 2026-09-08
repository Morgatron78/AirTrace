// Apple Health integration — safe to delete this file entirely,
// see docs/apple-health-integration.md.
import { useState } from 'react'
import { T } from '../../constants/theme'
import { STAGE_LABEL, STAGE_COLOR, STAGE_ICON } from '../../constants/sleepStages'
import { getNightWindowMs } from '../../health/nightWindow'
import { computeAhiByStage } from '../../health/stageAhi'
import { hourTicks } from './chartHelpers'
import { Segmented } from '../Segmented'
import { formatClock, formatDuration } from '../../utils/dates'

// Fixed display order, matching the legend below — not insertion order,
// which would otherwise depend on which stage happened to occur first.
const STAGE_ORDER = ['awake', 'core', 'deep', 'rem']
// Separate top-to-bottom order for the Stages view's own lanes/rows,
// matching myAir's own convention (Awake/REM/Core/Deep) rather than
// STAGE_ORDER above, which is tuned for the AHI-by-stage list instead —
// the two views don't need to agree on row order, only on color/label.
const LANE_ORDER = ['awake', 'rem', 'core', 'deep']

// Standalone card, deliberately not added to DrillDownScreen's own
// CHANNEL_REGISTRY — same precedent EventsChart.jsx already set for a
// chart with no fixed-rate sampled array (sleep-stage segments are
// discrete intervals, not a per-sample values array). No zoom/pan/tap and
// no fullscreen `big` mode in this first pass, unlike EventsChart — the
// whole night always renders at once, kept deliberately simple in this
// first pass — worth revisiting if that ever feels limiting in practice.
//
// `events` is optional and purely additive — passing it renders each
// stage's own AHI underneath the band; omitting it (or a night with no
// scored events) just shows the band and legend as before.
//
// `hasEventDetail` distinguishes "no nightDetail exists for this night at
// all" (pruned past the last-90-used-nights window, or never imported) from "we have
// real per-event data and it genuinely shows zero qualifying events this
// stage." events.length===0 can't carry that distinction on its own —
// it's true in both cases, but only the second one is a real 0.0/hr;
// the first is "we don't know," which should show nothing rather than a
// confident-looking zero. See docs/apple-health-integration.md.
export function HypnogramChart({ night, stages, events, hasEventDetail }) {
  // Always opens on Band, never remembers the last view picked — Band is
  // more compact and its AHI-by-stage numbers are the more important
  // read; Stages is a deliberately optional deeper look, confirmed with
  // the user rather than assumed. Declared before the early return below
  // — React Hooks must run in the same order every render, so this can't
  // sit after a conditional `return null`.
  const [view, setView] = useState('band')

  if (!stages?.length) return null

  const { startMs, endMs } = getNightWindowMs(night)
  const totalMs = endMs - startMs
  const segments = stages
    .map((s) => ({ x0: Math.max(0, (s.startMs - startMs) / totalMs), x1: Math.min(1, (s.endMs - startMs) / totalMs), stage: s.stage }))
    .filter((s) => s.x1 > s.x0)

  const ticks = hourTicks(night.startHour, night.usage, 5)
  const stagesPresent = [...new Set(segments.map((s) => s.stage))]

  const ahiByStage = hasEventDetail ? computeAhiByStage(events, { stages }, night) : null
  const ahiRows = ahiByStage
    ? STAGE_ORDER.filter((s) => ahiByStage.some((r) => r.stage === s)).map((s) => ahiByStage.find((r) => r.stage === s))
    : null

  // Per-stage total minutes, summed from the same clipped `segments` the
  // band above renders — not a separate computation, so the Stages view's
  // own breakdown can never disagree with what the band actually shows.
  const stageMinutes = {}
  for (const s of segments) stageMinutes[s.stage] = (stageMinutes[s.stage] || 0) + ((s.x1 - s.x0) * totalMs) / 60000
  const totalStageMinutes = Object.values(stageMinutes).reduce((a, b) => a + b, 0)
  const laneStages = LANE_ORDER.filter((s) => stagesPresent.includes(s))

  return (
    <div style={{ background: T.surface, borderRadius: 22, padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div>
          <span className="font-display" style={{ fontSize: 15, fontWeight: 700, color: T.ink }}>Sleep stages</span>
          <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>From Apple Health</div>
        </div>
        <Segmented options={[{ key: 'band', label: 'Band' }, { key: 'stages', label: 'Stages' }]} active={view} onChange={setView} />
      </div>

      {view === 'band' ? (
        <>
          <div style={{ position: 'relative', height: 20, borderRadius: 6, overflow: 'hidden', background: T.bg, marginTop: 12 }}>
            {segments.map((s, i) => (
              <div key={i} style={{ position: 'absolute', top: 0, bottom: 0, left: `${s.x0 * 100}%`, width: `${(s.x1 - s.x0) * 100}%`, background: STAGE_COLOR[s.stage] }} />
            ))}
          </div>

          <div style={{ position: 'relative', height: 14, marginTop: 6 }}>
            {ticks.map((t) => (
              <span key={t.label} className="font-display" style={{ position: 'absolute', left: `${t.frac * 100}%`, transform: t.frac < 0.05 ? 'none' : t.frac > 0.95 ? 'translateX(-100%)' : 'translateX(-50%)', fontSize: 10, fontWeight: 600, color: T.muted, whiteSpace: 'nowrap' }}>{t.label}</span>
            ))}
          </div>

          {/* Only shown when AHI by stage isn't — its own rows already carry
              the same icon+label mapping (plus real numbers), so a plain
              legend here would just repeat it. Still needed on a night whose
              waveform detail has aged out of the last-90-used-nights window:
              that's the one case where hasEventDetail is false and this band is the
              only content on the card. */}
          {(!ahiRows || ahiRows.length === 0) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 12, flexWrap: 'wrap' }}>
              {stagesPresent.map((stage) => {
                const Icon = STAGE_ICON[stage]
                return (
                  <span key={stage} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: T.muted }}>
                    <Icon size={12} style={{ color: STAGE_COLOR[stage] }} />{STAGE_LABEL[stage]}
                  </span>
                )
              })}
            </div>
          )}

          {ahiRows && ahiRows.length > 0 && (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${T.line}` }}>
              <span className="font-display" style={{ fontSize: 12.5, fontWeight: 700, color: T.ink }}>AHI by stage</span>
              <div style={{ marginTop: 6 }}>
                {ahiRows.map((r) => {
                  const Icon = STAGE_ICON[r.stage]
                  return (
                    <div key={r.stage} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 30 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: T.ink }}>
                        <Icon size={13} style={{ color: STAGE_COLOR[r.stage] }} />{STAGE_LABEL[r.stage]}
                        <span style={{ fontSize: 10.5, color: T.muted }}>({r.minutes < 60 ? `${Math.round(r.minutes)}m` : `${Math.floor(r.minutes / 60)}h ${Math.round(r.minutes % 60)}m`})</span>
                      </span>
                      <span className="font-display" style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>{r.ahi.toFixed(1)}/hr</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          {/* One lane per stage present, same x0/x1 fractions as the band
              above so both views line up against the identical timeline —
              just split into rows instead of stacked into one, matching
              myAir's own swimlane presentation. */}
          <div style={{ marginTop: 14 }}>
            {laneStages.map((stage, i) => {
              const Icon = STAGE_ICON[stage]
              return (
                <div key={stage} style={{ display: 'grid', gridTemplateColumns: '58px 1fr', alignItems: 'center', height: 26, borderTop: i === 0 ? 'none' : `1px solid ${T.line}` }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Icon size={12} style={{ color: STAGE_COLOR[stage] }} />
                    <span className="font-display" style={{ fontSize: 11.5, fontWeight: 600, color: T.muted }}>{STAGE_LABEL[stage]}</span>
                  </span>
                  <div style={{ position: 'relative', height: 16 }}>
                    {segments.filter((s) => s.stage === stage).map((s, i) => (
                      <div key={i} style={{ position: 'absolute', top: 0, bottom: 0, left: `${s.x0 * 100}%`, width: `${Math.max((s.x1 - s.x0) * 100, 1.2)}%`, borderRadius: 5, background: STAGE_COLOR[stage] }} />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          <div style={{ position: 'relative', height: 14, margin: '2px 0 14px 58px' }}>
            {ticks.map((t) => (
              <span key={t.label} className="font-display" style={{ position: 'absolute', left: `${t.frac * 100}%`, transform: t.frac < 0.05 ? 'none' : t.frac > 0.95 ? 'translateX(-100%)' : 'translateX(-50%)', fontSize: 10, fontWeight: 600, color: T.muted, whiteSpace: 'nowrap' }}>{t.label}</span>
            ))}
          </div>

          {/* Session range/total from night.startHour/usage — the same
              source Today/Night View's own Usage row already uses for
              start/finish — rather than re-deriving it from the Health
              stages' own span, so this can't disagree with the rest of
              the app if a stage export doesn't perfectly cover the
              session window. */}
          <div style={{ background: T.bg, borderRadius: 14, padding: '12px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
              <span className="font-display" style={{ fontSize: 12.5, fontWeight: 600, color: T.ink }}>{formatClock(night.startHour)}&ndash;{formatClock(night.startHour + night.usage)}</span>
              <span className="font-display" style={{ fontSize: 14, fontWeight: 800, color: T.ink }}>{formatDuration(night.usage)}</span>
            </div>
            <div style={{ display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden' }}>
              {laneStages.map((stage) => (
                <div key={stage} style={{ width: `${(stageMinutes[stage] / totalStageMinutes) * 100}%`, background: STAGE_COLOR[stage] }} />
              ))}
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            {laneStages.map((stage, i) => {
              const Icon = STAGE_ICON[stage]
              const mins = stageMinutes[stage]
              const pct = Math.round((mins / totalStageMinutes) * 100)
              const h = Math.floor(mins / 60), m = Math.round(mins % 60)
              // Same source as Band's own "AHI by stage" section — not a
              // separate lookup, so the two views can't disagree about the
              // same night. Omitted (not a fake 0.0/hr) when hasEventDetail
              // is false, matching Band's own quiet-omission convention.
              const ahiRow = ahiByStage?.find((r) => r.stage === stage)
              return (
                <div key={stage} style={{ padding: '10px 0', borderTop: i === 0 ? 'none' : `1px solid ${T.line}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span className="font-display" style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13.5, fontWeight: 600, color: T.ink }}>
                      <Icon size={14} style={{ color: STAGE_COLOR[stage], flexShrink: 0 }} />
                      {STAGE_LABEL[stage]}
                    </span>
                    <span className="font-display" style={{ fontSize: 13.5 }}>
                      <b style={{ fontWeight: 700, color: T.ink }}>{h > 0 ? `${h}hr ${m}min` : `${m}min`}</b>
                      <span style={{ color: T.muted, fontWeight: 600, marginLeft: 4 }}>{pct}%</span>
                      {ahiRow && <b style={{ fontWeight: 700, color: T.ink, marginLeft: 8 }}>{ahiRow.ahi.toFixed(1)}/hr</b>}
                    </span>
                  </div>
                  <div style={{ height: 5, borderRadius: 3, background: T.line, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, borderRadius: 3, background: STAGE_COLOR[stage] }} />
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
