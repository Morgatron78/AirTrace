import { useState } from 'react'
import { TrendingUp, Trophy, TriangleAlert, PowerOff, Sparkles, Calendar, Building2 } from 'lucide-react'
import { T, C, SEV } from '../constants/theme'
import { EQUIPMENT } from '../constants/equipment'
import { TAG_LABEL, TAG_ICON, TAG_GRADIENT, AUTO_TAGS } from '../constants/tags'
import { daysAgo, formatDuration } from '../utils/dates'
import { currentSetPressure } from '../utils/scoring'
import { CardTitle } from '../components/CardTitle'
import { NavCard } from '../components/NavCard'

function Troubleshooter({ nights, equipment }) {
  const [symptom, setSymptom] = useState(null)
  const avg = (arr, k) => arr.reduce((s, n) => s + n[k], 0) / arr.length
  const last7 = nights.slice(-7)
  // AHI/leak on a no-usage night are zeroed placeholders, not real
  // readings, so they're excluded here — same avg/avgUsed split used
  // in Trends/Stats/Insights/ClinicianReport. Usage stays inclusive:
  // 0 hours is real signal for "how much are you actually using it."
  const last7Used = last7.filter((n) => !n.noUsage)
  const leakAvg = last7Used.length ? avg(last7Used, 'leak') : 0
  const ahiAvg = last7Used.length ? avg(last7Used, 'ahi') : 0
  const usageAvg = avg(last7, 'usage')
  const cushionDays = daysAgo(equipment.cushionChanged)
  const headgearDays = daysAgo(equipment.headgearWashed)
  // "This month" means the last 30 nights, not the whole imported
  // history — nights.reduce with no slice was summing every night ever
  // imported (500+ for a real multi-year card) and calling that "this
  // month", wildly inflating the real recent count.
  const totalMaskOff = nights.slice(-30).reduce((s, n) => s + n.maskOff, 0)
  const setPressure = currentSetPressure(nights, EQUIPMENT.fixedPressure)

  const SYMPTOMS = [
    { key: 'tired', label: 'Tired / unrested' },
    { key: 'dry', label: 'Dry mouth/throat' },
    { key: 'noise', label: 'Noise' },
    { key: 'leak', label: 'Leak / whistling' },
    { key: 'uncomfortable', label: 'Mask uncomfortable' },
    { key: 'gasping', label: 'Waking up gasping' },
  ]
  const CAUSES = {
    tired: [
      { label: 'Usage hours', detail: `Your 7-night average is ${formatDuration(usageAvg)} — most guidelines treat 4+ hours as a full night of therapeutic use, and falling short is the single most common cause of residual daytime tiredness on CPAP.` },
      { label: 'Residual AHI', detail: `Your 7-night average AHI is ${ahiAvg.toFixed(1)} — even well-controlled therapy leaves some events, and those still fragment sleep even when you don't consciously wake for them.` },
    ],
    dry: [
      { label: 'Pressure setting', detail: `Dry mouth or throat often points to mouth breathing at your set pressure of ${setPressure} cmH₂O — worth discussing a humidity or pressure change with your clinician if it persists.` },
      { label: 'Mask type', detail: 'Full-face masks reduce dryness from mouth breathing compared to nasal masks, if that\'s a recurring issue for you.' },
    ],
    noise: [
      { label: 'Leak rate', detail: `Your 7-night average leak is ${leakAvg.toFixed(0)} L/min — whistling or hissing is almost always leak, not the machine itself.` },
      { label: 'Hose seating', detail: 'Check both ends of the hose are fully clicked in — a partial seat is a common, easy-to-miss noise source.' },
    ],
    leak: [
      { label: 'Cushion age', detail: `Your cushion was last changed ${cushionDays} days ago — silicone degrades over time and stops sealing as well.` },
      { label: 'Headgear fit', detail: `Headgear last washed ${headgearDays} days ago — stretched-out straps are a common, overlooked leak cause.` },
    ],
    uncomfortable: [
      { label: 'Cushion size', detail: `You're currently on a ${equipment.cushionSize} cushion — if it's newly uncomfortable, trying a different size often helps more than expected.` },
      { label: 'Mask-off events', detail: `${totalMaskOff} mask-off events this month — recurring removal is usually a fit issue, not habit.` },
    ],
    gasping: [
      { label: 'Recent AHI', detail: `Your 7-night average AHI is ${ahiAvg.toFixed(1)} — check the Trends tab for the specific night(s) driving it if this feels new.` },
      { label: 'Worth flagging', detail: 'Waking specifically gasping (rather than general restlessness) is worth mentioning to your clinician, since it can point to central rather than obstructive events.' },
    ],
  }

  return (
    <div style={{ background: T.surface, borderRadius: 22, padding: 20 }}>
      <CardTitle sub="Tap what you're noticing">Something feel off?</CardTitle>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {SYMPTOMS.map((s) => (
          <button key={s.key} onClick={() => setSymptom(symptom === s.key ? null : s.key)} className="font-display"
            style={{
              padding: '8px 14px', borderRadius: 999, fontSize: 13, fontWeight: 600,
              background: symptom === s.key ? C.blue : T.bg,
              color: symptom === s.key ? '#FFFFFF' : T.ink,
              border: `1px solid ${symptom === s.key ? C.blue : T.line}`,
            }}>
            {s.label}
          </button>
        ))}
      </div>
      {symptom && (
        <div style={{ marginTop: 16 }}>
          {CAUSES[symptom].map((c, i) => (
            <div key={i} style={{ padding: '12px 0', borderBottom: i === CAUSES[symptom].length - 1 ? 'none' : `1px solid ${T.line}` }}>
              <div className="font-display" style={{ fontSize: 13, fontWeight: 700, color: T.ink, marginBottom: 3 }}>{c.label}</div>
              <div style={{ fontSize: 12.5, color: T.muted, lineHeight: 1.5 }}>{c.detail}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function InsightsScreen({ nights, onOpenReport, onNavigate, onSelectNight, targets, equipment }) {
  const last4 = nights.slice(-4)
  const leakUp = last4.every((n, i) => i === 0 || n.leak >= last4[i - 1].leak - 1)
  const cushionDaysForLeak = daysAgo(equipment.cushionChanged)
  const avg = (arr, k) => arr.reduce((s, n) => s + n[k], 0) / arr.length
  const avgUsed = (arr, k) => {
    const used = arr.filter((n) => !n.noUsage)
    return used.length ? used.reduce((s, n) => s + n[k], 0) / used.length : 0
  }
  const overall = avgUsed(nights, 'ahi')
  const weekday = nights.filter((n) => !n.weekend), weekend = nights.filter((n) => n.weekend)
  const usedNights = nights.filter((n) => !n.noUsage)
  const best = usedNights.length ? usedNights.reduce((a, b) => (b.ahi < a.ahi ? b : a)) : null
  const compliance = Math.round((nights.filter((n) => n.usage >= targets.usage).length / nights.length) * 100)
  // Same fix as Troubleshooter's own totalMaskOff above — "this month"
  // means the last 30 nights, not every night ever imported.
  const totalMaskOff = nights.slice(-30).reduce((s, n) => s + n.maskOff, 0)

  const tagInsights = Object.keys(TAG_LABEL).map((tk) => {
    const withTag = nights.filter((n) => !n.noUsage && n.tags.includes(tk))
    if (!withTag.length) return null
    const a = avg(withTag, 'ahi')
    const diff = overall ? Math.round(((a - overall) / overall) * 100) : 0
    if (Math.abs(diff) < 10) return null
    return { tk, diff, n: withTag.length }
  }).filter(Boolean)

  // trajectory: first half of the window vs second half
  const half = Math.floor(nights.length / 2)
  const firstHalf = nights.slice(0, half), secondHalf = nights.slice(half)
  const firstHalfAhi = avgUsed(firstHalf, 'ahi')
  const trajDiff = firstHalfAhi ? Math.round(((avgUsed(secondHalf, 'ahi') - firstHalfAhi) / firstHalfAhi) * 100) : 0
  const improving = trajDiff < -5, worsening = trajDiff > 5

  // combined-tag effect: alcohol + late meal together vs either alone
  const alcoholOnly = nights.filter((n) => n.tags.includes('alcohol') && !n.tags.includes('lateMeal'))
  const bothTags = nights.filter((n) => n.tags.includes('alcohol') && n.tags.includes('lateMeal'))
  const comboWorthShowing = bothTags.length >= 3 && alcoholOnly.length >= 3
  const comboDiff = comboWorthShowing ? Math.round(((avg(bothTags, 'ahi') - avg(alcoholOnly, 'ahi')) / avg(alcoholOnly, 'ahi')) * 100) : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Troubleshooter nights={nights} equipment={equipment} />
      {worsening && (
        <NavCard icon={TrendingUp} dot={`linear-gradient(135deg,${C.orange},${C.red})`} title="Trending in the wrong direction"
          subtitle={`AHI up ${Math.abs(trajDiff)}% over this window — worth a closer look at what's changed recently`} onClick={() => onNavigate('trends')} />
      )}
      {improving && (
        <NavCard icon={Trophy} dot={`linear-gradient(135deg,${C.blue},${SEV.good})`} title="Trending in the right direction"
          subtitle={`AHI down ${Math.abs(trajDiff)}% over this window — whatever you're doing, keep it up`} onClick={() => onNavigate('trends')} />
      )}
      {leakUp && (
        <NavCard icon={TriangleAlert} dot={`linear-gradient(135deg,${C.orange},${C.red})`} title="Leak trending up"
          subtitle={cushionDaysForLeak > 60
            ? `4 nights running — your cushion is ${cushionDaysForLeak} days old, right in the range where seals typically start failing. Worth replacing it before troubleshooting anything else.`
            : '4 nights running — try reseating the mask and checking the lower straps first, since that\'s the most common cause of a slow drift'} onClick={() => onNavigate('trends')} />
      )}
      {totalMaskOff >= 3 && (
        <NavCard icon={PowerOff} dot={`linear-gradient(135deg,${C.purple},${C.pink})`} title="Mask coming off overnight"
          subtitle={`${totalMaskOff} mask-off events this month — if it's discomfort rather than accident, a different cushion size or style is worth trying`} onClick={() => onNavigate('equipment')} />
      )}
      {comboWorthShowing && Math.abs(comboDiff) >= 15 && (
        <NavCard icon={Sparkles} dot={`linear-gradient(135deg,${C.blue},${C.purple})`} title="Alcohol + late meal compounds"
          subtitle={`AHI runs ${comboDiff > 0 ? '+' : ''}${comboDiff}% higher when both happen the same night, vs. alcohol alone — worth avoiding the combination specifically`} onClick={() => onNavigate('stats')} />
      )}
      {tagInsights.map((ti) => (
        <NavCard key={ti.tk} icon={TAG_ICON[ti.tk]} dot={TAG_GRADIENT[ti.tk]}
          title={`${TAG_LABEL[ti.tk]} raises your AHI`}
          subtitle={`${ti.diff > 0 ? '+' : ''}${ti.diff}% vs. baseline, based on ${ti.n} nights${AUTO_TAGS.has(ti.tk) ? ' · auto-detected' : ''}`} onClick={() => onNavigate('stats')} />
      ))}
      <NavCard icon={Calendar} dot={`linear-gradient(135deg,${C.blue},${C.pink})`} title="Weekends run higher"
        subtitle={`Weekday AHI ${avg(weekday, 'ahi').toFixed(1)} vs. weekend ${avg(weekend, 'ahi').toFixed(1)} — worth noticing what's different about your weekend routine`} onClick={() => onNavigate('stats')} />
      <NavCard icon={Sparkles} dot={`linear-gradient(135deg,${C.blue},${C.purple})`} title="Compliance is solid" subtitle={`Hitting 4+ hours on ${compliance}% of nights — usage isn't the thing to focus on right now`} onClick={() => onNavigate('stats')} />
      {best && (
        <NavCard icon={Trophy} dot={`linear-gradient(135deg,${C.orange},${C.red})`} title="Your best night" subtitle={`${best.label} — AHI ${best.ahi}. Worth remembering what was different that night`} onClick={() => onSelectNight(nights.indexOf(best))} />
      )}
      <NavCard icon={Building2} dot={`linear-gradient(135deg,${C.blue},${C.purple})`} title="Clinician visit report" subtitle="A detailed, printable summary of your therapy for your next appointment" onClick={onOpenReport} />
    </div>
  )
}
