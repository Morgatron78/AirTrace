import { Clock, Activity, PowerOff, Calendar, Flame } from 'lucide-react'
import { T, C, SEV } from '../constants/theme'
import { TAG_LABEL, TAG_ICON, TAG_COLOR, AUTO_TAGS } from '../constants/tags'
import { computeStreak } from '../utils/scoring'
import { CardTitle } from '../components/CardTitle'
import { EventRing } from '../components/EventRing'
import { SealRing } from '../components/SealRing'
import { StatRow } from '../components/StatRow'
import { LeakIcon } from '../components/icons/LeakIcon'

export function StatsScreen({ nights, targets }) {
  // Every stat and label on this screen claims "30-night" — actually
  // slicing to the last 30 nights here, rather than using the full
  // (potentially 18-month) history passed in, is what makes that true.
  // Previously every figure here (compliance %, streak, "Nights not
  // used", tag correlation) was silently computed over the entire
  // history instead.
  const data = nights.slice(-30)
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
  const compliance = Math.round((data.filter((n) => n.usage >= targets.usage).length / data.length) * 100)
  const under3 = Math.round((data.filter((n) => !n.noUsage && n.ahi < targets.ahi).length / data.length) * 100)
  const leakUnder20 = Math.round((data.filter((n) => !n.noUsage && n.leak < targets.leak).length / data.length) * 100)
  const maskOffUnder = Math.round((data.filter((n) => !n.noUsage && n.maskOff <= targets.maskOff).length / data.length) * 100)
  const noUsageCount = data.filter((n) => n.noUsage).length
  // Streak intentionally uses the full history, not the 30-night slice —
  // it's not labeled "30-night" anywhere on this screen, and a genuinely
  // longer streak would be wrongly truncated by capping the scan window.
  const streak = computeStreak(nights, targets)
  const weekday = data.filter((n) => !n.weekend), weekend = data.filter((n) => n.weekend)

  const tagKeys = Object.keys(TAG_LABEL)
  const overallAhi = avgUsed(data, 'ahi')
  const rows = tagKeys.map((tk) => {
    const withTag = data.filter((n) => !n.noUsage && n.tags.includes(tk))
    const ahiPct = withTag.length ? Math.round(((avg(withTag, 'ahi') - overallAhi) / overallAhi) * 100) : null
    return { tk, n: withTag.length, ahiPct }
  })

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
        <CardTitle>30-night targets</CardTitle>
        <StatRow icon={Clock} iconColor={C.orange} label={`${targets.usage}h+ usage`} value={`${compliance}%`} warn={compliance < targets.compliance}
          description={`Your compliance target is ${targets.usage}+ hours on ${targets.compliance}% of nights — adjustable in Settings, and commonly used by insurers and clinicians as the standard benchmark for ongoing therapy.`} />
        <StatRow icon={Activity} iconColor={C.blue} label={`AHI under ${targets.ahi}`} value={`${under3}%`} warn={under3 < targets.compliance}
          description="The share of nights your AHI stayed under your target — a commonly used marker of well-controlled therapy. Occasional dips below this aren't unusual; a persistently low percentage is worth discussing." />
        <StatRow icon={LeakIcon} iconColor={C.purple} label={`Leak under ${targets.leak}`} value={`${leakUnder20}%`} warn={leakUnder20 < targets.compliance}
          description="The share of nights your leak stayed under your target. A falling percentage over time often traces back to cushion or headgear wear — check Equipment if this looks low." />
        <StatRow icon={PowerOff} iconColor={T.muted} label={`Mask-off under ${targets.maskOff}`} value={`${maskOffUnder}%`} warn={maskOffUnder < targets.compliance}
          description="The share of nights you stayed at or under your mask-off target. Frequent mask-off events usually trace back to comfort — fit, pressure, or something disrupting sleep enough to prompt removal." />
        <StatRow icon={Calendar} iconColor={T.muted} label="Weekday AHI avg" value={avgUsed(weekday, 'ahi').toFixed(1)} />
        <StatRow icon={Calendar} iconColor={T.muted} label="Weekend AHI avg" value={avgUsed(weekend, 'ahi').toFixed(1)} />
        <StatRow icon={Flame} iconColor={C.orange} label="Current streak" value={streak > 0 ? `${streak} night${streak === 1 ? '' : 's'}` : 'None active'}
          description={`Consecutive nights at or above your ${targets.usage}h usage target — the one thing on this list that's entirely within your control, night to night.`} />
        <StatRow icon={Calendar} iconColor={SEV.bad} label="Nights not used" value={noUsageCount} warn={noUsageCount > 0} last
          description="Nights the machine wasn't used at all. Counted against your targets above rather than left out of them — a skipped night is still a night without therapy." />
      </div>

      <div style={{ background: T.surface, borderRadius: 22, padding: 20 }}>
        <CardTitle sub="vs. your 30-night baseline">Tag correlation</CardTitle>
        {rows.map((r, i) => (
          <StatRow key={r.tk} icon={TAG_ICON[r.tk]} iconColor={TAG_COLOR[r.tk]}
            label={AUTO_TAGS.has(r.tk) ? `${TAG_LABEL[r.tk]} (auto · ${r.n})` : `${TAG_LABEL[r.tk]} (${r.n})`}
            value={r.ahiPct === null ? 'AHI —' : `AHI ${r.ahiPct > 0 ? '+' : ''}${r.ahiPct}%`}
            last={i === rows.length - 1} />
        ))}
      </div>
    </div>
  )
}
