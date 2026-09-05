import { useState, useEffect } from 'react'
import { Clock, Activity, PowerOff, Calendar, Flame, Trophy, Moon } from 'lucide-react'
import { T, C } from '../constants/theme'
import { TAG_LABEL, TAG_ICON, TAG_COLOR, AUTO_TAGS } from '../constants/tags'
import { computeStreak, computeBestStreak } from '../utils/scoring'
import { CardTitle } from '../components/CardTitle'
import { EventRing } from '../components/EventRing'
import { SealRing } from '../components/SealRing'
import { StatRow } from '../components/StatRow'
import { LeakIcon } from '../components/icons/LeakIcon'
// APPLE-HEALTH: this screen's first touch — see
// docs/apple-health-integration.md for the full strip-out list.
import { getAllHealthData } from '../db/health.js'
import { stageMinutes } from '../health/stageMinutes.js'

export function StatsScreen({ nights, targets }) {
  // Everything under "This month" claims "30-night" — actually slicing
  // to the last 30 nights here, rather than using the full (potentially
  // 18-month) history passed in, is what makes that true. "All-time"
  // stats (best streak, lifetime compliance) deliberately use the full
  // `nights` instead, not `data` — see below.
  const data = nights.slice(-30)
  // APPLE-HEALTH: local self-fetch, matching the exact precedent already
  // set by Trends/DrillDownScreen — never through App.jsx.
  const [healthData, setHealthData] = useState({})
  useEffect(() => { getAllHealthData().then(setHealthData) }, [])
  const avg = (arr, k) => arr.reduce((s, n) => s + n[k], 0) / arr.length
  // avgUsed skips no-usage nights for anything that only exists because a
  // session happened (AHI, leak, event mix) — same reasoning as Trends'
  // avgUsed. Threshold/hit-rate stats below take a different approach: a
  // no-usage night stays in the denominator but can never count as a pass,
  // since "no session" isn't the same as "target met."
  const avgUsed = (arr, k) => {
    const used = arr.filter((n) => !n.noUsage)
    return used.length ? used.reduce((s, n) => s + n[k], 0) / used.length : 0
  }
  const obs = avgUsed(data, 'obstructive'), cen = avgUsed(data, 'central'), hyp = avgUsed(data, 'hypopnea')
  const under3 = Math.round((data.filter((n) => !n.noUsage && n.ahi < targets.ahi).length / data.length) * 100)
  const leakUnder20 = Math.round((data.filter((n) => !n.noUsage && n.leak < targets.leak).length / data.length) * 100)
  const maskOffUnder = Math.round((data.filter((n) => !n.noUsage && n.maskOff <= targets.maskOff).length / data.length) * 100)
  // Streak intentionally uses the full history, not the 30-night slice —
  // it's not labeled "30-night" anywhere on this screen, and a genuinely
  // longer streak would be wrongly truncated by capping the scan window.
  // bestStreak scans the same full history for the longest run ever, not
  // just the current trailing one — the one thing here Trends (capped at
  // 30 days) structurally can't answer.
  const streak = computeStreak(nights, targets)
  const bestStreak = computeBestStreak(nights, targets)
  const lifetimeCompliance = Math.round((nights.filter((n) => n.usage >= targets.usage).length / nights.length) * 100)
  const weekday = data.filter((n) => !n.weekend), weekend = data.filter((n) => n.weekend)

  // APPLE-HEALTH: percent of time in bed actually asleep — the opposite
  // framing from Trends' Sleep architecture chart, which deliberately
  // *excludes* Awake to answer "how much did I sleep." This stat answers
  // "was time in bed used efficiently," so Awake belongs in the
  // denominator here. null (not 0) when no night in range has Watch
  // data — the row itself is omitted rather than shown as a confident 0%.
  const avgSleepEfficiency = (() => {
    const effs = data.map((n) => {
      const m = stageMinutes(healthData[n.date], n)
      if (!m) return null
      const asleep = (m.core ?? 0) + (m.deep ?? 0) + (m.rem ?? 0)
      const total = asleep + (m.awake ?? 0)
      return total ? (asleep / total) * 100 : null
    }).filter((v) => v != null)
    return effs.length ? Math.round(effs.reduce((s, v) => s + v, 0) / effs.length) : null
  })()

  const tagKeys = Object.keys(TAG_LABEL)
  const overallAhi = avgUsed(data, 'ahi')
  const rows = tagKeys.map((tk) => {
    const withTag = data.filter((n) => !n.noUsage && n.tags.includes(tk))
    const ahiPct = withTag.length ? Math.round(((avg(withTag, 'ahi') - overallAhi) / overallAhi) * 100) : null
    return { tk, n: withTag.length, ahiPct }
  })
  // Ranked by effect size, not fixed tag-key order, so the tag actually
  // worth acting on reads first — but only once it has enough nights to
  // trust: a 2-night outlier no longer gets to sit at the top just
  // because its number happens to be loud. Below-threshold tags keep
  // today's original order among themselves.
  const MIN_NIGHTS_FOR_RANKING = 5
  const sortedRows = [
    ...rows.filter((r) => r.n >= MIN_NIGHTS_FOR_RANKING).sort((a, b) => Math.abs(b.ahiPct) - Math.abs(a.ahiPct)),
    ...rows.filter((r) => r.n < MIN_NIGHTS_FOR_RANKING),
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ background: T.surface, borderRadius: 22, padding: 20 }}>
        <CardTitle sub="30-night average">Event breakdown & mask seal</CardTitle>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: 12, marginTop: 12 }}>
          <div style={{ flex: 1 }}>
            <EventRing night={{ obstructive: obs, central: cen, hypopnea: hyp }} size={140} />
          </div>
          <div style={{ flex: 1 }}>
            <SealRing nights={data} size={140} />
          </div>
        </div>
      </div>

      <div style={{ background: T.surface, borderRadius: 22, padding: 20 }}>
        <CardTitle>Targets &amp; habits</CardTitle>
        <div className="font-display" style={{ fontSize: 12.5, fontWeight: 700, color: T.ink, marginBottom: 2 }}>This month</div>
        <StatRow icon={Activity} iconColor={C.blue} label={`AHI under ${targets.ahi}`} value={`${under3}%`} warn={under3 < targets.compliance}
          description="The share of nights your AHI stayed under your target — a commonly used marker of well-controlled therapy. Occasional dips below this aren't unusual; a persistently low percentage is worth discussing." />
        <StatRow icon={LeakIcon} iconColor={C.purple} label={`Leak under ${targets.leak}`} value={`${leakUnder20}%`} warn={leakUnder20 < targets.compliance}
          description="The share of nights your leak stayed under your target. A falling percentage over time often traces back to cushion or headgear wear — check Equipment if this looks low." />
        <StatRow icon={PowerOff} iconColor={T.muted} label={`Mask-off under ${targets.maskOff}`} value={`${maskOffUnder}%`} warn={maskOffUnder < targets.compliance}
          description="The share of nights you stayed at or under your mask-off target. Frequent mask-off events usually trace back to comfort — fit, pressure, or something disrupting sleep enough to prompt removal." />
        <StatRow icon={Calendar} iconColor={T.muted} label="Avg weekday AHI" value={avgUsed(weekday, 'ahi').toFixed(1)} />
        <StatRow icon={Calendar} iconColor={T.muted} label="Avg weekend AHI" value={avgUsed(weekend, 'ahi').toFixed(1)} />
        {/* APPLE-HEALTH: entirely absent, not a placeholder, when zero
            nights in range have Watch data — same quiet-omission
            convention used throughout this feature. See
            docs/apple-health-integration.md. */}
        {avgSleepEfficiency != null && (
          <StatRow icon={Moon} iconColor={C.blue} label="Avg sleep efficiency" value={`${avgSleepEfficiency}%`}
            description="Percent of time in bed actually asleep (Core+Deep+REM against Core+Deep+REM+Awake), from your Apple Watch. A different question from Sleep architecture on Trends, which looks at how much you slept, not how efficiently." />
        )}
        <StatRow icon={Flame} iconColor={C.orange} label="Current streak" value={streak > 0 ? `${streak} night${streak === 1 ? '' : 's'}` : 'None active'} last
          description={`Consecutive nights at or above your ${targets.usage}h usage target — the one thing on this list that's entirely within your control, night to night.`} />

        <div className="font-display" style={{ fontSize: 12.5, fontWeight: 700, color: T.ink, marginTop: 14, paddingTop: 14, borderTop: `1px solid ${T.line}`, marginBottom: 2 }}>All-time</div>
        <StatRow icon={Trophy} iconColor={C.orange} label="Best streak ever" value={`${bestStreak} night${bestStreak === 1 ? '' : 's'}`}
          description={`The longest run you've ever had at or above your ${targets.usage}h usage target, across your full history — not just the streak currently running.`} />
        <StatRow icon={Clock} iconColor={C.orange} label="Lifetime compliance" value={`${lifetimeCompliance}%`} warn={lifetimeCompliance < targets.compliance} last
          description={`Share of every night you've logged at or above your ${targets.usage}h usage target — the same target as "Current streak" above, but over your whole history instead of the last 30 nights.`} />
      </div>

      <div style={{ background: T.surface, borderRadius: 22, padding: 20 }}>
        <CardTitle sub="vs. your 30-night baseline">Tag correlation</CardTitle>
        {sortedRows.map((r, i) => (
          <StatRow key={r.tk} icon={TAG_ICON[r.tk]} iconColor={TAG_COLOR[r.tk]}
            label={AUTO_TAGS.has(r.tk) ? `${TAG_LABEL[r.tk]} (auto · ${r.n})` : `${TAG_LABEL[r.tk]} (${r.n})`}
            value={r.ahiPct === null ? 'AHI —' : r.n < MIN_NIGHTS_FOR_RANKING ? 'Not enough nights yet' : `AHI ${r.ahiPct > 0 ? '+' : ''}${r.ahiPct}%`}
            last={i === sortedRows.length - 1} />
        ))}
      </div>
    </div>
  )
}
