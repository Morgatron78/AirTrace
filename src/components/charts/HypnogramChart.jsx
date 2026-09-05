// Apple Health integration (POC) — safe to delete this file entirely,
// see docs/apple-health-integration.md.
import { T } from '../../constants/theme'
import { STAGE_LABEL, STAGE_COLOR } from '../../constants/sleepStages'
import { getNightWindowMs } from '../../health/nightWindow'
import { computeAhiByStage } from '../../health/stageAhi'
import { hourTicks } from './chartHelpers'

// Fixed display order, matching the legend below — not insertion order,
// which would otherwise depend on which stage happened to occur first.
const STAGE_ORDER = ['awake', 'core', 'deep', 'rem']

// Standalone card, deliberately not added to DrillDownScreen's own
// CHANNEL_REGISTRY — same precedent EventsChart.jsx already set for a
// chart with no fixed-rate sampled array (sleep-stage segments are
// discrete intervals, not a per-sample values array). No zoom/pan/tap and
// no fullscreen `big` mode in this first pass, unlike EventsChart — the
// whole night always renders at once, kept deliberately simple for a
// proof of concept.
//
// `events` is optional and purely additive — passing it renders each
// stage's own AHI underneath the band; omitting it (or a night with no
// scored events) just shows the band and legend as before.
//
// `hasEventDetail` distinguishes "no nightDetail exists for this night at
// all" (pruned past the 90-day window, or never imported) from "we have
// real per-event data and it genuinely shows zero qualifying events this
// stage." events.length===0 can't carry that distinction on its own —
// it's true in both cases, but only the second one is a real 0.0/hr;
// the first is "we don't know," which should show nothing rather than a
// confident-looking zero. See docs/apple-health-integration.md.
export function HypnogramChart({ night, stages, events, hasEventDetail }) {
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

  return (
    <div style={{ background: T.surface, borderRadius: 22, padding: 20 }}>
      <span className="font-display" style={{ fontSize: 15, fontWeight: 700, color: T.ink }}>Sleep stages</span>
      <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>From Apple Health &middot; tap an event above for detail</div>

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

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 12, flexWrap: 'wrap' }}>
        {stagesPresent.map((stage) => (
          <span key={stage} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: T.muted }}>
            <span style={{ width: 8, height: 8, borderRadius: 4, background: STAGE_COLOR[stage] }} />{STAGE_LABEL[stage]}
          </span>
        ))}
      </div>

      {ahiRows && ahiRows.length > 0 && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${T.line}` }}>
          <span className="font-display" style={{ fontSize: 12.5, fontWeight: 700, color: T.ink }}>AHI by stage</span>
          <div style={{ marginTop: 6 }}>
            {ahiRows.map((r) => (
              <div key={r.stage} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 30 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: T.ink }}>
                  <span style={{ width: 8, height: 8, borderRadius: 4, background: STAGE_COLOR[r.stage] }} />{STAGE_LABEL[r.stage]}
                  <span style={{ fontSize: 10.5, color: T.muted }}>({r.minutes < 60 ? `${Math.round(r.minutes)}m` : `${Math.floor(r.minutes / 60)}h ${Math.round(r.minutes % 60)}m`})</span>
                </span>
                <span className="font-display" style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>{r.ahi.toFixed(1)}/hr</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
