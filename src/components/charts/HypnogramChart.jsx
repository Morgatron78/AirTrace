// Apple Health integration (POC) — safe to delete this file entirely,
// see docs/apple-health-integration.md.
import { T } from '../../constants/theme'
import { STAGE_LABEL, STAGE_COLOR } from '../../constants/sleepStages'
import { getNightWindowMs } from '../../health/nightWindow'
import { hourTicks } from './chartHelpers'

// Standalone card, deliberately not added to DrillDownScreen's own
// CHANNEL_REGISTRY — same precedent EventsChart.jsx already set for a
// chart with no fixed-rate sampled array (sleep-stage segments are
// discrete intervals, not a per-sample values array). No zoom/pan/tap and
// no fullscreen `big` mode in this first pass, unlike EventsChart — the
// whole night always renders at once, kept deliberately simple for a
// proof of concept.
export function HypnogramChart({ night, stages }) {
  if (!stages?.length) return null

  const { startMs, endMs } = getNightWindowMs(night)
  const totalMs = endMs - startMs
  const segments = stages
    .map((s) => ({ x0: Math.max(0, (s.startMs - startMs) / totalMs), x1: Math.min(1, (s.endMs - startMs) / totalMs), stage: s.stage }))
    .filter((s) => s.x1 > s.x0)

  const ticks = hourTicks(night.startHour, night.usage, 5)
  const stagesPresent = [...new Set(segments.map((s) => s.stage))]

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
    </div>
  )
}
