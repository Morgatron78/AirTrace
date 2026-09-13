import { useState } from 'react'
import { T, C } from '../constants/theme'
import { ChartInfoButton } from './ChartInfoButton'
import { ChartExpandButton } from './ChartExpandButton'
import { ChartInfoOverlay } from './ChartInfoOverlay'
import { Segmented } from './Segmented'
import { AllTimeLineChart } from './charts/AllTimeLineChart.jsx'
import { getAnchorMs, bucketAhiWeekly, bucketWeightWeekly } from '../utils/weeklyTrend.js'
import { findPressureConfound } from '../utils/pressureConfound.js'
import { formatWeightKg, bmiFromWeightKg } from '../utils/units.js'

const WEEK_MS = 7 * 86400000

// Real wall-clock quarter boundaries mapped through the same week-index
// math the data itself uses, so gridlines and data points can never read
// as two independent timelines that happen to look similar.
function buildQuarterTicks(anchorMs, maxWeek) {
  const out = []
  let cursor = new Date(anchorMs)
  cursor.setUTCMonth(Math.ceil((cursor.getUTCMonth() + 1) / 3) * 3)
  cursor.setUTCDate(1)
  const endMs = anchorMs + maxWeek * WEEK_MS
  while (cursor.getTime() <= endMs) {
    const week = (cursor.getTime() - anchorMs) / WEEK_MS
    const label = cursor.getUTCMonth() === 0
      ? `Jan '${String(cursor.getUTCFullYear()).slice(2)}`
      : cursor.toLocaleString('en-GB', { month: 'short', timeZone: 'UTC' })
    out.push({ week, label })
    cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 3, 1))
  }
  return out
}

function deltaArrow(pct) { return pct > 0 ? '↑' : pct < 0 ? '↓' : '–' }

export function AllTimeTrendCard({ nights, weightReadings, heightCm, weightUnit, mode }) {
  const [expanded, setExpanded] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const [weightMode, setWeightMode] = useState('weight') // 'weight' | 'bmi'

  const anchorMs = getAnchorMs(nights)
  if (anchorMs == null) return null // no used nights at all yet — nothing to show

  const ahiWeekly = bucketAhiWeekly(nights, anchorMs)
  if (!ahiWeekly.length) return null

  // APPLE-HEALTH: from here down, every hasWeight/canShowBmi-gated branch
  // is Apple-Health-dependent — see docs/apple-health-integration.md.
  const weightWeekly = bucketWeightWeekly(weightReadings, anchorMs)
  const hasWeight = weightWeekly.length > 0
  const hasHeight = heightCm != null
  // BMI needs a height to mean anything — offer the toggle only when both
  // weight and height exist, same optional-data-optional-UI rule as
  // everything else here, rather than computing/showing a broken value.
  const canShowBmi = hasWeight && hasHeight
  const effectiveWeightMode = weightMode === 'bmi' && !canShowBmi ? 'weight' : weightMode

  const maxWeek = Math.max(ahiWeekly[ahiWeekly.length - 1].weekIndex, hasWeight ? weightWeekly[weightWeekly.length - 1].weekIndex : 0)
  const ticks = buildQuarterTicks(anchorMs, maxWeek)

  const latestAhi = ahiWeekly[ahiWeekly.length - 1].value, firstAhi = ahiWeekly[0].value
  const ahiDeltaPct = Math.round(((latestAhi - firstAhi) / firstAhi) * 100)

  const latestWeightKg = hasWeight ? weightWeekly[weightWeekly.length - 1].value : null
  const firstWeightKg = hasWeight ? weightWeekly[0].value : null
  const weightDeltaPct = hasWeight ? Math.round(((latestWeightKg - firstWeightKg) / firstWeightKg) * 100) : null

  // The confound mechanism only means anything on a fixed-pressure (CPAP)
  // machine — S.C.Press has no equivalent single-value meaning on an
  // auto-titrating APAP. No real APAP sample data exists to build/test
  // real APAP support against, so this stays a hard gate.
  const confound = mode === 0 ? findPressureConfound(nights) : null

  const weightPanelData = hasWeight
    ? weightWeekly.map((b) => ({ ...b, value: effectiveWeightMode === 'bmi' ? bmiFromWeightKg(b.value, heightCm) : b.value }))
    : []
  const weightFormatY = effectiveWeightMode === 'bmi' ? (v) => v.toFixed(1) : (v) => formatWeightKg(v, weightUnit)

  const infoOverlay = (
    <ChartInfoOverlay show={showInfo} onClose={() => setShowInfo(false)} color={C.pink}
      title="AHI & Weight"
      desc="Shown together because they're plausibly related — obesity is a well-established factor in OSA severity — not because one's been proven to cause the other. Other changes over time (equipment, pressure) can move AHI independently too." />
  )

  const header = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: expanded ? 0 : 10 }}>
      <div className="font-display" style={{ fontSize: 15, fontWeight: 700, color: T.ink }}>All Time</div>
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        <ChartInfoButton show={showInfo} onToggle={() => setShowInfo((s) => !s)} />
        <ChartExpandButton expanded={expanded} onToggle={() => setExpanded((e) => !e)} />
      </div>
    </div>
  )

  if (!expanded) {
    return (
      <div>
        {header}
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', gap: 12 }}>
            {hasWeight ? (
              <>
                <div style={{ flex: 1, background: T.surface, borderRadius: 16, padding: 16 }}>
                  <div className="font-display" style={{ fontSize: 15, fontWeight: 700, color: T.ink }}>AHI</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginTop: 12 }}>
                    <span className="font-display" style={{ fontSize: 24, fontWeight: 800, color: T.ink }}>{latestAhi.toFixed(1)}</span>
                    <span style={{ fontSize: 12, color: T.muted }}>events/hr</span>
                  </div>
                  <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>Recent weekly avg</div>
                  <div style={{ fontSize: 12, color: T.muted, marginTop: 6 }}>{deltaArrow(ahiDeltaPct)} {Math.abs(ahiDeltaPct)}% since start</div>
                </div>
                <div style={{ flex: 1, background: T.surface, borderRadius: 16, padding: 16 }}>
                  <div className="font-display" style={{ fontSize: 15, fontWeight: 700, color: T.ink }}>Weight</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginTop: 12 }}>
                    <span className="font-display" style={{ fontSize: 24, fontWeight: 800, color: T.ink }}>{formatWeightKg(latestWeightKg, weightUnit)}</span>
                  </div>
                  <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>Recent average</div>
                  <div style={{ fontSize: 12, color: T.muted, marginTop: 6 }}>{deltaArrow(weightDeltaPct)} {Math.abs(weightDeltaPct)}% since start</div>
                </div>
              </>
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, background: T.surface, borderRadius: 16, padding: 16 }}>
                <div>
                  <div className="font-display" style={{ fontSize: 15, fontWeight: 700, color: T.ink }}>AHI</div>
                  <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>Recent weekly avg</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, justifyContent: 'flex-end' }}>
                    <span className="font-display" style={{ fontSize: 24, fontWeight: 800, color: T.ink }}>{latestAhi.toFixed(1)}</span>
                    <span style={{ fontSize: 12, color: T.muted }}>events/hr</span>
                  </div>
                  <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>{deltaArrow(ahiDeltaPct)} {Math.abs(ahiDeltaPct)}% since start</div>
                </div>
              </div>
            )}
          </div>
          {infoOverlay}
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: T.surface, borderRadius: 22, padding: 20 }}>
      {header}
      <div style={{ position: 'relative' }}>
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.ink, marginBottom: 6, padding: '0 2px' }}>AHI</div>
          <AllTimeLineChart data={ahiWeekly} maxWeek={maxWeek} anchorMs={anchorMs} color={C.pink}
            formatY={(v) => v.toFixed(1)} ticks={ticks} showXAxisLabels={!hasWeight} confound={confound} />
          {confound && (
            <div style={{ fontSize: 12, color: T.muted, marginTop: 6, padding: '0 2px', lineHeight: 1.4 }}>
              Shaded — pressure was still being adjusted here. Tap the shaded area for detail.
            </div>
          )}
        </div>
        {hasWeight && (
          <>
            <div style={{ display: 'flex', justifyContent: 'center', margin: '14px 0 4px' }}>
              <Segmented
                options={canShowBmi ? [{ key: 'weight', label: 'Weight' }, { key: 'bmi', label: 'BMI' }] : [{ key: 'weight', label: 'Weight' }]}
                active={effectiveWeightMode} onChange={setWeightMode} />
            </div>
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: T.ink, marginBottom: 6, padding: '0 2px' }}>{effectiveWeightMode === 'bmi' ? 'BMI' : 'Weight'}</div>
              <AllTimeLineChart data={weightPanelData} maxWeek={maxWeek} anchorMs={anchorMs} color={C.purple}
                formatY={weightFormatY} ticks={ticks} showXAxisLabels />
            </div>
          </>
        )}
        {infoOverlay}
      </div>
    </div>
  )
}
