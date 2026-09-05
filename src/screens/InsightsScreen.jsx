import { useState } from 'react'
import { TrendingUp, Trophy, TriangleAlert, PowerOff, Sparkles, Calendar, Building2 } from 'lucide-react'
import { T, C, SEV } from '../constants/theme'
import { EQUIPMENT } from '../constants/equipment'
import { TAG_LABEL, TAG_ICON, TAG_GRADIENT, AUTO_TAGS } from '../constants/tags'
import { daysAgo, formatDuration } from '../utils/dates'
import { currentSetPressure, nightsForExtremes } from '../utils/scoring'
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
  // Every "recent"/"this month" claim on this screen needs an actual
  // recent window behind it, not the full (potentially 18-month)
  // history — the exact bug already found and fixed once on Stats (see
  // its own comment) turned out to have several more unfixed instances
  // here: weekday/weekend, compliance, and the trajectory cards below
  // were all silently computed over all-time history too.
  const last30 = nights.slice(-30)
  const avg = (arr, k) => arr.reduce((s, n) => s + n[k], 0) / arr.length
  const avgUsed = (arr, k) => {
    const used = arr.filter((n) => !n.noUsage)
    return used.length ? used.reduce((s, n) => s + n[k], 0) / used.length : 0
  }
  // "4 nights running" needs 4 real used nights, not just the last 4
  // calendar entries — a no-usage night's leak is a zeroed placeholder
  // (see avgUsed's own reasoning above), and one landing at the front of
  // a plain last-4 slice made the non-decreasing check trivially true
  // forever afterward (anything >= -1 passes).
  const last4Used = nights.filter((n) => !n.noUsage).slice(-4)
  const leakUp = last4Used.length === 4 && last4Used.every((n, i) => i === 0 || n.leak >= last4Used[i - 1].leak - 1)
  const cushionDaysForLeak = daysAgo(equipment.cushionChanged)
  const overall = avgUsed(nights, 'ahi')
  const weekday = last30.filter((n) => !n.weekend), weekend = last30.filter((n) => n.weekend)
  const weekdayAhi = avgUsed(weekday, 'ahi'), weekendAhi = avgUsed(weekend, 'ahi')
  // Only worth surfacing when the weekend really does run meaningfully
  // higher, with enough real nights on each side to mean something —
  // every other card on this screen already stays silent rather than
  // asserting a pattern that isn't actually there; this one and
  // "Compliance is solid" below previously didn't (rendered
  // unconditionally, so a lower weekend AHI or a poor compliance % would
  // still show the same fixed claim right next to the contradicting
  // numbers).
  const weekendHigherShowing = weekday.length >= 3 && weekend.length >= 3 && weekdayAhi > 0 && (weekendAhi - weekdayAhi) / weekdayAhi >= 0.15
  const usedNights = nightsForExtremes(nights)
  const best = usedNights.length ? usedNights.reduce((a, b) => (b.ahi < a.ahi ? b : a)) : null
  const compliance = Math.round((last30.filter((n) => n.usage >= targets.usage).length / last30.length) * 100)
  // Same fix as Troubleshooter's own totalMaskOff — "this month" means
  // the last 30 nights, not every night ever imported.
  const totalMaskOff = last30.reduce((s, n) => s + n.maskOff, 0)

  const tagInsights = Object.keys(TAG_LABEL).map((tk) => {
    const withTag = nights.filter((n) => !n.noUsage && n.tags.includes(tk))
    // A single tagged night isn't a real pattern yet — matches the
    // alcohol+lateMeal combo insight's own n>=3 minimum further below,
    // which every per-tag card here previously didn't have.
    if (withTag.length < 3) return null
    const a = avg(withTag, 'ahi')
    const diff = overall ? Math.round(((a - overall) / overall) * 100) : 0
    if (Math.abs(diff) < 10) return null
    return { tk, diff, n: withTag.length }
  }).filter(Boolean)

  // Trajectory: recent window (last ~60 nights), first half vs second —
  // "recently" in this card's own copy means recently, not "the first
  // half of your entire import history vs the second", which a plain
  // nights.length/2 split silently became for anyone with months of
  // history (their "first half" could be the better part of a year ago).
  const recentWindow = nights.slice(-60)
  const half = Math.floor(recentWindow.length / 2)
  const firstHalf = recentWindow.slice(0, half), secondHalf = recentWindow.slice(half)
  const firstHalfAhi = avgUsed(firstHalf, 'ahi')
  // Same minimum-sample guard Trends' own equivalent comparison already
  // has (its MIN_HALF_FOR_TREND) — without it, a newer user with only a
  // handful of nights imported gets a confident "trending" card off a
  // 2-3-night half, indistinguishable from ordinary noise at that size.
  const trajDiff = half >= 6 && firstHalfAhi ? Math.round(((avgUsed(secondHalf, 'ahi') - firstHalfAhi) / firstHalfAhi) * 100) : 0
  const improving = trajDiff < -5, worsening = trajDiff > 5

  // Combined-tag effect, generalized: every pairwise combination of the
  // 6 tags (5 logged + auto-detected Late start — a logged behavior
  // compounding with an auto-detected one is just as real a combo as two
  // logged ones), not just the one pair (alcohol + late meal) that used
  // to be hardcoded here as its own special case.
  //
  // "Compounds" specifically means worse than EITHER tag alone, not just
  // worse than the population average — that's what tagInsights below
  // already shows per tag, so a combo card needs to earn its own slot by
  // saying something those don't: the two together are worse than either
  // one by itself. Comparing against whichever solo group has the LOWER
  // (better) average AHI is the conservative choice — it's a real
  // compounding claim regardless of which of the two tags happens to run
  // worse on its own, rather than picking one side arbitrarily.
  const TAG_KEYS = Object.keys(TAG_LABEL)
  const tagPairs = []
  for (let i = 0; i < TAG_KEYS.length; i++) {
    for (let j = i + 1; j < TAG_KEYS.length; j++) tagPairs.push([TAG_KEYS[i], TAG_KEYS[j]])
  }
  const comboInsights = tagPairs.map(([a, b]) => {
    const aOnly = nights.filter((n) => !n.noUsage && n.tags.includes(a) && !n.tags.includes(b))
    const bOnly = nights.filter((n) => !n.noUsage && n.tags.includes(b) && !n.tags.includes(a))
    const both = nights.filter((n) => !n.noUsage && n.tags.includes(a) && n.tags.includes(b))
    if (aOnly.length < 3 || bOnly.length < 3 || both.length < 3) return null
    const avgA = avg(aOnly, 'ahi'), avgB = avg(bOnly, 'ahi'), avgBoth = avg(both, 'ahi')
    const [lowerTag, lowerAvg] = avgA <= avgB ? [a, avgA] : [b, avgB]
    if (!lowerAvg || avgBoth <= avgA || avgBoth <= avgB) return null
    const diff = Math.round(((avgBoth - lowerAvg) / lowerAvg) * 100)
    if (diff < 15) return null
    return { a, b, lowerTag, diff, n: both.length }
  }).filter(Boolean).sort((x, y) => y.diff - x.diff).slice(0, 2) // top 2 — a scrolling list of every qualifying pair would bury the rest of the screen for anyone with several overlapping tags

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
      {comboInsights.map((ci) => (
        <NavCard key={`${ci.a}-${ci.b}`} icon={Sparkles} dot={`linear-gradient(135deg,${C.blue},${C.purple})`} title={`${TAG_LABEL[ci.a]} + ${TAG_LABEL[ci.b]} compounds`}
          subtitle={`AHI runs +${ci.diff}% higher when both happen the same night, vs. ${TAG_LABEL[ci.lowerTag]} alone — worth avoiding the combination specifically`} onClick={() => onNavigate('stats')} />
      ))}
      {tagInsights.map((ti) => (
        <NavCard key={ti.tk} icon={TAG_ICON[ti.tk]} dot={TAG_GRADIENT[ti.tk]}
          title={`${TAG_LABEL[ti.tk]} ${ti.diff > 0 ? 'raises' : 'lowers'} your AHI`}
          subtitle={`${ti.diff > 0 ? '+' : ''}${ti.diff}% vs. baseline, based on ${ti.n} nights${AUTO_TAGS.has(ti.tk) ? ' · auto-detected' : ''}`} onClick={() => onNavigate('stats')} />
      ))}
      {weekendHigherShowing && (
        <NavCard icon={Calendar} dot={`linear-gradient(135deg,${C.blue},${C.pink})`} title="Weekends run higher"
          subtitle={`Weekday AHI ${weekdayAhi.toFixed(1)} vs. weekend ${weekendAhi.toFixed(1)} (last 30 nights) — worth noticing what's different about your weekend routine`} onClick={() => onNavigate('stats')} />
      )}
      {compliance >= targets.compliance && (
        <NavCard icon={Sparkles} dot={`linear-gradient(135deg,${C.blue},${C.purple})`} title="Compliance is solid" subtitle={`Hitting 4+ hours on ${compliance}% of nights (last 30) — usage isn't the thing to focus on right now`} onClick={() => onNavigate('stats')} />
      )}
      {best && (
        <NavCard icon={Trophy} dot={`linear-gradient(135deg,${C.orange},${C.red})`} title="Your best night" subtitle={`${best.label} — AHI ${best.ahi}. Worth remembering what was different that night`} onClick={() => onSelectNight(nights.indexOf(best))} />
      )}
      <NavCard icon={Building2} dot={`linear-gradient(135deg,${C.blue},${C.purple})`} title="Clinician visit report" subtitle="A detailed, printable summary of your therapy for your next appointment" onClick={onOpenReport} />
    </div>
  )
}
