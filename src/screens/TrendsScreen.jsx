import { useState, useEffect } from 'react'
import { Activity, Clock, Gauge, Trophy, ChevronRight, ChevronLeft, Calendar } from 'lucide-react'
import { T, C, SEV } from '../constants/theme'
import { TAG_LABEL, AUTO_TAGS } from '../constants/tags'
import { AHI_BREAKDOWN } from '../constants/events'
import { scoreOf, nightsForExtremes } from '../utils/scoring'
import { formatDuration, formatClock } from '../utils/dates'
import { ahiTrend } from '../utils/nagLogic.js'
import { Segmented } from '../components/Segmented'
import { IconTabRow } from '../components/IconTabRow'
import { ChartInfoButton } from '../components/ChartInfoButton'
import { ChartStatsButton } from '../components/ChartStatsButton'
import { ChartStatsPanel } from '../components/ChartStatsPanel'
import { FlatBarChart } from '../components/FlatBarChart'
import { BarChartLabels } from '../components/BarChartLabels'
import { NightDetailPanel } from '../components/NightDetailPanel'
import { SessionTimesChart } from '../components/SessionTimesChart'
import { SessionDetailPanel } from '../components/SessionDetailPanel'
import { StatRow } from '../components/StatRow'
import { CardTitle } from '../components/CardTitle'
import { LeakIcon } from '../components/icons/LeakIcon'

export function TrendsScreen({ nights, onSelectNight, targets }) {
  const [range, setRange] = useState('month')
  const [metric, setMetric] = useState('ahi')
  const [chartDetailIdx, setChartDetailIdx] = useState(null)
  const [sessionDetailIdx, setSessionDetailIdx] = useState(null)
  const [eventType, setEventType] = useState(null) // drill-down within the Events breakdown: null = full stack, else one type
  const [showChartInfo, setShowChartInfo] = useState(false)
  const [showSessionInfo, setShowSessionInfo] = useState(false)
  const [showChartStats, setShowChartStats] = useState(false)
  const [showSessionStats, setShowSessionStats] = useState(false)
  // Bar indices are only meaningful for the current range/metric's data
  // array — a stale index would otherwise point at the wrong night (or
  // nothing) the moment either changes, so both panels close instead.
  useEffect(() => { setChartDetailIdx(null); setSessionDetailIdx(null) }, [range])
  useEffect(() => { setChartDetailIdx(null); setShowChartInfo(false); setShowChartStats(false) }, [metric])
  // The type drill-down only makes sense while a night's breakdown is open —
  // closing the breakdown (whichever way) always clears it too, so
  // re-opening a breakdown never starts already drilled into a type.
  useEffect(() => { if (chartDetailIdx === null) setEventType(null) }, [chartDetailIdx])
  useEffect(() => { setShowChartInfo(false); setShowChartStats(false) }, [eventType])
  const rangeDays = range === 'week' ? 7 : range === '2weeks' ? 14 : 30
  const rawData = nights.slice(-rangeDays)
  const data = rawData.map((n) => ({ ...n, score: scoreOf(n) }))
  const labelEvery = rangeDays <= 7 ? 1 : rangeDays <= 14 ? 2 : 5
  const prevPeriod = nights.slice(-rangeDays * 2, -rangeDays)
  const periodLabel = range === 'week' ? 'week' : range === '2weeks' ? '2 weeks' : 'month'
  const avg = (arr, k) => arr.reduce((s, n) => s + n[k], 0) / arr.length
  // avgUsed skips no-usage nights for metrics that don't exist without a
  // session (AHI, leak, pressure) — their zeroed fields would otherwise
  // drag a physiological average down as if that were a real great reading.
  // Usage itself stays on plain avg: 0 hours on a skipped night is real
  // compliance signal, not a gap to paper over.
  const avgUsed = (arr, k) => {
    const used = arr.filter((n) => !n.noUsage)
    return used.length ? used.reduce((s, n) => s + n[k], 0) / used.length : 0
  }
  const pct = (a, b) => Math.round(((a - b) / b) * 100)
  const compliance = Math.round((data.filter((n) => n.usage >= targets.usage).length / data.length) * 100)
  const noUsageCount = data.filter((n) => n.noUsage).length
  // best/worst are picked only among nights actually used — a no-usage
  // night's zeroed AHI would otherwise win "best night" trivially every
  // time it appears. Index lookup stays reference-based (data.indexOf),
  // same reason as the comment below: data's entries are spread copies.
  const usedNights = nightsForExtremes(data)
  const best = usedNights.length ? usedNights.reduce((a, b) => (b.ahi < a.ahi ? b : a)) : null
  const worst = usedNights.length ? usedNights.reduce((a, b) => (b.ahi > a.ahi ? b : a)) : null
  // best/worst need an index into rawData/nights, not just the data object —
  // data's entries are spread copies (for the added score field), so they're
  // never reference-equal to anything in nights and nights.indexOf(best)
  // would silently fail to find them.
  const bestIdx = best ? data.indexOf(best) : -1
  const worstIdx = worst ? data.indexOf(worst) : -1

  const half = Math.floor(data.length / 2)
  const firstHalf = data.slice(0, half), secondHalf = data.slice(half)
  // A fixed ±8% threshold is fine comparing two 15-night halves (Month
  // view), but the same threshold on two 3-4 night halves (Week view) lets
  // ordinary night-to-night noise masquerade as a confident trend claim —
  // there's no way to tell "one rough night in a tiny sample" apart from
  // an actual drift at that size. Below a minimum half-size, say so
  // honestly instead of guessing, same pattern as the "Not enough history
  // yet" fallback already used for the previous-period comparison below.
  // The banner used to stop at "something changed" — a real AHI shift
  // with no link back to what was actually logged, even though Insights'
  // tag-correlation cards are computed from these exact same nights.
  // ahiTrend (nagLogic.js) is the shared implementation of both the
  // shift-detection and the tag-correlate check — also used by the
  // weekly-summary push, which must never disagree with what this screen
  // says about the same nights.
  const { diffPct: summaryDiff, tagShift, insufficientData } = ahiTrend(firstHalf, secondHalf)
  const tagShiftClause = tagShift ? (() => {
    const label = TAG_LABEL[tagShift.tk] + (AUTO_TAGS.has(tagShift.tk) ? ' (auto-detected)' : '')
    return ` ${label} came up on ${tagShift.c2} of ${secondHalf.length} nights this half vs ${tagShift.c1} of ${firstHalf.length} last half — may be part of it.`
  })() : ''
  const summary = insufficientData
    ? `Not enough nights in this range to call a clear trend — ${range === 'week' ? 'try 2 Weeks or Month' : 'try Month'} for a steadier read.`
    : summaryDiff > 8
    ? `AHI has risen ${Math.abs(summaryDiff)}% across this period — worth a closer look.${tagShiftClause}`
    : summaryDiff < -8
    ? `AHI has improved ${Math.abs(summaryDiff)}% across this period — whatever's changed, it's working.${tagShiftClause}`
    : 'A steady period overall, no real drift either way.'

  const wkLeakAvg = avgUsed(data, 'leak'), wkUsageAvg = avg(data, 'usage')

  const metricTabs = [
    { key: 'ahi', label: 'Events', color: C.pink, icon: Activity, max: 10,
      desc: 'Apnea and hypopnea events per hour of use, split into Obstructive, Central, and Hypopnea. Lower is better — most targets sit under 5.' },
    { key: 'leak', label: 'Leak', color: C.purple, icon: LeakIcon, max: 30,
      desc: 'How much air escaped around your mask each night, in litres per minute. A poor mask seal flag means the fit itself was the likely cause.' },
    { key: 'usage', label: 'Usage', color: C.blue, icon: Clock, max: 10,
      desc: 'Hours the machine ran each night, from mask-on to mask-off. Consistent, longer sessions give therapy more chance to actually work.' },
    // "Mask Pressure" (matching OSCAR's own naming, and Night View's), not
    // "Pressure" — this is the real measured range at the mask (STR.edf's
    // MaskPress.50/.95/.Max), not the flat set pressure a fixed-mode CPAP
    // holds.
    { key: 'pMax', label: 'Mask Pressure', color: C.orange, icon: Gauge, max: 16,
      desc: 'The mask pressure range delivered overnight, including the 95th percentile — roughly the level needed for all but the highest 5% of the night.' },
    { key: 'score', label: 'Score', color: SEV.good, icon: Trophy, max: 100,
      desc: 'A single number combining events, leak, usage and mask seal against your targets, out of 100.' },
  ]
  const active = metricTabs.find((tb) => tb.key === metric)
  const viewNight = (i) => onSelectNight(nights.indexOf(rawData[i]))
  const handleChartBarClick = (i) => setChartDetailIdx((cur) => (cur === i ? null : i))
  const handleSessionBarClick = (i) => setSessionDetailIdx((cur) => (cur === i ? null : i))

  // Average/high/low for whichever metric (or AHI-breakdown sub-type) is
  // currently on screen, behind the new stats (Σ) button next to each
  // chart's info button — the number the chart shows visually, spelled
  // out precisely rather than eyeballed off the bars.
  const statsKey = metric === 'ahi' && eventType ? eventType : metric
  // usage stays on the plain (not no-usage-filtered) data, same reasoning
  // as avg vs. avgUsed above: a skipped night's 0 hours is real
  // compliance signal for a usage stat, not a gap to exclude. Every other
  // metric only exists when the machine actually ran, so a no-usage
  // night's zeroed field would otherwise win "best"/"lowest" trivially.
  const statsData = metric === 'usage' ? data : data.filter((n) => !n.noUsage)
  const extremum = (arr, cmp) => arr.reduce((a, b) => (cmp(b[statsKey], a[statsKey]) ? b : a))
  const formatMetricValue = (v) => {
    if (metric === 'usage') return formatDuration(v)
    if (metric === 'leak') return `${v.toFixed(0)} L/min`
    if (metric === 'pMax') return `${v.toFixed(1)} cmH₂O`
    if (metric === 'score') return `${Math.round(v)}`
    return v.toFixed(1) // ahi and its obstructive/central/hypopnea sub-types — events/hr
  }
  const chartStatRows = statsData.length ? (() => {
    const avgV = statsData.reduce((s, n) => s + n[statsKey], 0) / statsData.length
    const highN = extremum(statsData, (b, a) => b > a)
    const lowN = extremum(statsData, (b, a) => b < a)
    return [
      { label: 'Average', value: formatMetricValue(avgV) },
      { label: 'High', value: formatMetricValue(highN[statsKey]), sub: highN.label },
      { label: 'Low', value: formatMetricValue(lowN[statsKey]), sub: lowN.label },
    ]
  })() : null
  const chartStatsTitle = metric === 'ahi' && eventType ? AHI_BREAKDOWN.find((s) => s.key === eventType).label : active.label

  // Session times' own "value" is bedtime, not session length (Usage's
  // stats already cover duration) — average, earliest, and latest start
  // are the more actionable read on a wandering bedtime. No-usage nights
  // have no real start time to average in.
  const sessionStatsData = data.filter((n) => !n.noUsage)
  const sessionStatRows = sessionStatsData.length ? (() => {
    const avgStart = sessionStatsData.reduce((s, n) => s + n.startHour, 0) / sessionStatsData.length
    const earliestN = sessionStatsData.reduce((a, b) => (b.startHour < a.startHour ? b : a))
    const latestN = sessionStatsData.reduce((a, b) => (b.startHour > a.startHour ? b : a))
    return [
      { label: 'Average start', value: formatClock(avgStart) },
      { label: 'Earliest', value: formatClock(earliestN.startHour), sub: earliestN.label },
      { label: 'Latest', value: formatClock(latestN.startHour), sub: latestN.label },
    ]
  })() : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <Segmented options={[{ key: 'week', label: 'Week' }, { key: '2weeks', label: '2 Weeks' }, { key: 'month', label: 'Month' }]} active={range} onChange={setRange} />
      </div>

      <div style={{ background: T.surface, borderRadius: 16, padding: 16 }}>
        <div className="font-display" style={{ fontSize: 14, fontWeight: 700, color: T.ink, lineHeight: 1.4 }}>{summary}</div>
      </div>

      {best && worst ? (
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={() => viewNight(bestIdx)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch', background: T.surface, borderRadius: 16, padding: 16, textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div className="font-display" style={{ fontSize: 15, fontWeight: 700, color: T.ink }}>Best night</div>
              <ChevronRight size={15} style={{ color: T.muted, flexShrink: 0 }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginTop: 12 }}>
              <span className="font-display" style={{ fontSize: 24, fontWeight: 800, color: T.ink }}>{best.ahi}</span>
              <span style={{ fontSize: 12, color: T.muted }}>AHI</span>
            </div>
            <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>{best.label}</div>
            {best.tags.length > 0 && (
              <div style={{ fontSize: 11, color: T.muted, marginTop: 6 }}>{best.tags.map((tk) => TAG_LABEL[tk]).join(', ')}</div>
            )}
          </button>
          <button onClick={() => viewNight(worstIdx)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch', background: T.surface, borderRadius: 16, padding: 16, textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div className="font-display" style={{ fontSize: 15, fontWeight: 700, color: T.ink }}>Worst night</div>
              <ChevronRight size={15} style={{ color: T.muted, flexShrink: 0 }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginTop: 12 }}>
              <span className="font-display" style={{ fontSize: 24, fontWeight: 800, color: T.ink }}>{worst.ahi}</span>
              <span style={{ fontSize: 12, color: T.muted }}>AHI</span>
            </div>
            <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>{worst.label}</div>
            {worst.tags.length > 0 && (
              <div style={{ fontSize: 11, color: T.muted, marginTop: 6 }}>{worst.tags.map((tk) => TAG_LABEL[tk]).join(', ')}</div>
            )}
          </button>
        </div>
      ) : (
        <div style={{ background: T.surface, borderRadius: 16, padding: 16, textAlign: 'center' }}>
          <span style={{ fontSize: 12.5, color: T.muted }}>No nights used this {periodLabel} yet.</span>
        </div>
      )}

      <div style={{ background: T.surface, borderRadius: 22, padding: 20 }}>
        <IconTabRow tabs={metricTabs} active={metric} onChange={setMetric} />
        <div style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {metric === 'ahi' && eventType && (
                <button onClick={() => setEventType(null)} style={{ display: 'flex', alignItems: 'center', padding: 0, marginRight: 2, background: 'none' }}>
                  <ChevronLeft size={16} style={{ color: T.muted }} />
                </button>
              )}
              <div className="font-display" style={{ fontSize: 15, fontWeight: 700, color: T.ink }}>
                {metric === 'ahi' && eventType ? AHI_BREAKDOWN.find((s) => s.key === eventType).label : active.label} — {rangeDays} nights
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {chartStatRows && <ChartStatsButton show={showChartStats} onToggle={() => { setShowChartStats((s) => !s); setShowChartInfo(false) }} />}
              <ChartInfoButton show={showChartInfo} onToggle={() => { setShowChartInfo((s) => !s); setShowChartStats(false) }} />
            </div>
          </div>
          <div style={{ fontSize: 12, color: T.muted, marginBottom: 14 }}>
            Tap a bar for a breakdown{metric === 'leak' && ' · Colored by how close to target, flagged nights had a poor mask seal'}
          </div>
          <FlatBarChart data={data}
            dataKey={metric === 'ahi' && eventType ? eventType : metric}
            color={metric === 'ahi' && eventType ? AHI_BREAKDOWN.find((s) => s.key === eventType).color : active.color}
            // Events uses FlatBarChart's own dynamic max (actual peak + 15%
            // headroom) rather than a fixed scale — a fixed max of 10 made
            // every bar tiny for anyone whose AHI runs consistently low, the
            // exact opposite of what a trend chart should do. Every other
            // metric keeps its fixed max: those have a real fixed ceiling
            // (score is 0-100 by definition, usage tops out near a realistic
            // night's length, etc.), so a fixed scale is the right call there.
            max={metric === 'ahi' ? undefined : active.max}
            labelEvery={labelEvery}
            onBarClick={handleChartBarClick} selectedIdx={chartDetailIdx}
            stack={metric === 'ahi' && chartDetailIdx != null && !eventType ? AHI_BREAKDOWN : undefined}
            colorFn={metric === 'leak' ? (d) => d.leak >= targets.leak ? SEV.bad : d.leak >= targets.leak * 0.75 ? SEV.fair : SEV.good : undefined}
            markFn={metric === 'leak' ? (d) => d.seal === 'Poor' : undefined}
            showInfo={showChartInfo} onCloseInfo={() => setShowChartInfo(false)}
            infoTitle={metric === 'ahi' && eventType ? AHI_BREAKDOWN.find((s) => s.key === eventType).label : active.label}
            infoDesc={metric === 'ahi' && eventType ? AHI_BREAKDOWN.find((s) => s.key === eventType).description : active.desc}
            infoColor={metric === 'ahi' && eventType ? AHI_BREAKDOWN.find((s) => s.key === eventType).color : active.color} />
          <BarChartLabels data={data} labelEvery={labelEvery} />
          {metric === 'leak' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 }}>
              <div style={{ width: 6, height: 6, borderRadius: 3, background: SEV.bad, flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: T.muted }}>Poor mask seal that night</span>
            </div>
          )}
          {showChartStats && chartStatRows && (
            <ChartStatsPanel title={chartStatsTitle} periodLabel={periodLabel} rows={chartStatRows} />
          )}
          {chartDetailIdx != null && (
            <NightDetailPanel night={data[chartDetailIdx]} metric={metric} targets={targets}
              activeEventType={eventType} onSelectEventType={setEventType}
              onViewNight={() => viewNight(chartDetailIdx)} />
          )}
        </div>
      </div>

      <div style={{ background: T.surface, borderRadius: 22, padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
          <div className="font-display" style={{ fontSize: 15, fontWeight: 700, color: T.ink }}>Session times</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {sessionStatRows && <ChartStatsButton show={showSessionStats} onToggle={() => { setShowSessionStats((s) => !s); setShowSessionInfo(false) }} />}
            <ChartInfoButton show={showSessionInfo} onToggle={() => { setShowSessionInfo((s) => !s); setShowSessionStats(false) }} />
          </div>
        </div>
        <div style={{ fontSize: 12, color: T.muted, marginBottom: 14 }}>Tap a night for start, finish &amp; length</div>
        <SessionTimesChart data={data} onBarClick={handleSessionBarClick} selectedIdx={sessionDetailIdx}
          showInfo={showSessionInfo} onCloseInfo={() => setShowSessionInfo(false)}
          infoTitle="Session times" infoDesc="When you started and finished each session, and how long it ran — useful for spotting inconsistent bedtimes or early mask removals."
          infoColor={C.blue} />
        <BarChartLabels data={data} labelEvery={labelEvery} labelWidth={30} />
        {showSessionStats && sessionStatRows && (
          <ChartStatsPanel title="Session times" periodLabel={periodLabel} rows={sessionStatRows} />
        )}
        {sessionDetailIdx != null && <SessionDetailPanel night={data[sessionDetailIdx]} onViewNight={() => onSelectNight(nights.indexOf(rawData[sessionDetailIdx]))} />}
      </div>

      <div style={{ background: T.surface, borderRadius: 22, padding: 20 }}>
        <CardTitle sub={prevPeriod.length ? undefined : 'Not enough history yet for a previous-period comparison'}>Trends (vs. previous {periodLabel})</CardTitle>
        <div style={{ display: 'flex', marginTop: 4 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: T.muted, marginBottom: 4 }}>This {periodLabel}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
              <span className="font-display" style={{ fontSize: 24, fontWeight: 800, color: T.ink }}>{avgUsed(data, 'ahi').toFixed(1)}</span>
              <span style={{ fontSize: 12, color: T.muted }}>AHI</span>
            </div>
          </div>
          <div style={{ width: 1, background: T.line, margin: '4px 20px' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: T.muted, marginBottom: 4 }}>Last {periodLabel}</div>
            {prevPeriod.length ? (
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                <span className="font-display" style={{ fontSize: 24, fontWeight: 800, color: T.muted }}>{avgUsed(prevPeriod, 'ahi').toFixed(1)}</span>
                <span style={{ fontSize: 12, color: T.muted }}>AHI</span>
              </div>
            ) : (
              <div style={{ fontSize: 13, color: T.muted, fontStyle: 'italic' }}>Not enough history yet</div>
            )}
          </div>
        </div>
        <div style={{ marginTop: 8 }}>
          <StatRow icon={LeakIcon} iconColor={C.purple} label="Avg leak" value={`${wkLeakAvg.toFixed(0)} L/min`} warn={wkLeakAvg >= targets.leak} delta={prevPeriod.length ? pct(wkLeakAvg, avgUsed(prevPeriod, 'leak')) : undefined} />
          <StatRow icon={Clock} iconColor={C.blue} label="Avg usage" value={formatDuration(wkUsageAvg)} warn={wkUsageAvg < targets.usage} delta={prevPeriod.length ? pct(wkUsageAvg, avg(prevPeriod, 'usage')) : undefined} />
          <StatRow icon={Gauge} iconColor={C.orange} label={`${rangeDays}-night compliance`} value={`${compliance}%`} warn={compliance < targets.compliance} />
          <StatRow icon={Calendar} iconColor={SEV.bad} label="Nights not used" value={noUsageCount} warn={noUsageCount > 0} last />
        </div>
      </div>
    </div>
  )
}
