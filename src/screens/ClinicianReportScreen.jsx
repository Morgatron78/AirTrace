import { useMemo } from 'react'
import { ChevronLeft } from 'lucide-react'
import { C } from '../constants/theme'
import { EQUIPMENT } from '../constants/equipment'
import { TAG_LABEL, AUTO_TAGS } from '../constants/tags'
import { daysAgo, formatDuration } from '../utils/dates'

function ReportRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #E5E5EA' }}>
      <span style={{ fontSize: 13, color: '#57575F' }}>{label}</span>
      <span className="font-display" style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0C' }}>{value}</span>
    </div>
  )
}
function ReportHeading({ children }) {
  return <h2 className="font-display" style={{ fontSize: 15, fontWeight: 800, color: '#0A0A0C', marginTop: 28, marginBottom: 10 }}>{children}</h2>
}
function ReportBarChart({ data, dataKey, height = 90, max, colorFn, threshold, labelEvery = 5, logScale, logFloor = 0.3, logTicks }) {
  const m = max || Math.max(...data.map((d) => d[dataKey])) * 1.2
  const w = 600
  const barW = w / data.length
  // logScale maps value->y with a floor (can't take log(0)) so no-events
  // nights sit flat at the bottom rather than at -infinity, and spans
  // enough range that a rare spike doesn't flatten every normal night
  // into an unreadable sliver the way a linear scale would.
  const yFor = (v) => {
    if (!logScale) return height - Math.max(1, (v / m) * height)
    const clamped = Math.max(logFloor, v)
    const frac = Math.log(clamped / logFloor) / Math.log(m / logFloor)
    return height * (1 - Math.max(0, Math.min(1, frac)))
  }
  const yTicks = logScale ? (logTicks || [1, 2, 4, 10, 20, 40]).filter((t) => t <= m) : [0, m * 0.25, m * 0.5, m * 0.75, m]
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      <div style={{ position: 'relative', width: 20, height, flexShrink: 0 }}>
        {yTicks.map((t) => (
          <span key={t} style={{ position: 'absolute', top: `${(yFor(t) / height) * 100}%`, transform: 'translateY(-50%)', fontSize: 9, color: '#7C7C88' }}>
            {Number.isInteger(t) ? t : t.toFixed(1)}
          </span>
        ))}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <svg width="100%" height={height + 4} viewBox={`0 0 ${w} ${height + 4}`} preserveAspectRatio="none">
          {yTicks.map((t) => (
            <line key={t} x1={0} x2={w} y1={yFor(t)} y2={yFor(t)} stroke="#E5E5EA" strokeWidth="1" />
          ))}
          {threshold !== undefined && (
            <line x1={0} x2={w} y1={yFor(threshold)} y2={yFor(threshold)} stroke="#0A0A0C" strokeDasharray="4 3" strokeWidth="1" />
          )}
          {data.map((d, i) => {
            const cx = i * barW + barW * 0.5
            if (d.noUsage) {
              return <circle key={i} cx={cx} cy={height - 2} r={Math.min(2.5, barW * 0.25)} fill="#0A0A0C" />
            }
            const val = d[dataKey]
            const y = yFor(val)
            return <rect key={i} x={i * barW + barW * 0.15} y={y} width={barW * 0.7} height={height - y} fill={colorFn(d)} />
          })}
        </svg>
        <div style={{ position: 'relative', height: 12, marginTop: 4 }}>
          {data.map((d, i) => {
            if (i % labelEvery !== 0) return null
            const frac = (i + 0.5) / data.length
            return (
              <div key={i} style={{
                position: 'absolute', left: `${frac * 100}%`, top: 0,
                transform: frac < 0.06 ? 'none' : frac > 0.94 ? 'translateX(-100%)' : 'translateX(-50%)',
                fontSize: 9, color: '#7C7C88', whiteSpace: 'nowrap',
              }}>{d.label}</div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
function ReportLegendDot({ color, label }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#57575F', marginRight: 16 }}>
      <span style={{ width: 10, height: 10, background: color, display: 'inline-block' }} />{label}
    </span>
  )
}

export function ClinicianReportScreen({ nights, onBack, equipment }) {
  // Real history is whatever `nights` holds (the mockup's 30 nights). A
  // proper multi-window report needs up to 365 days to compare against, so
  // this screen synthesizes ~335 additional preceding nights, scoped
  // entirely to itself — nothing else in the app (Stats' "30-night
  // average" copy, Trends' month view, etc.) sees or is affected by this.
  // In the real build this whole block goes away; there's just more real
  // history to read as it accumulates.
  const fullHistory = useMemo(() => {
    const extra = []
    const today = new Date(`${nights[0].date}T00:00:00`)
    const tagPool = ['alcohol', 'lateMeal', 'awayFromHome', 'highStress', 'illness']
    for (let i = 335; i >= 1; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const weekend = d.getDay() === 0 || d.getDay() === 6
      const noUsage = Math.random() < 0.03
      const alcohol = !noUsage && Math.random() < 0.15
      const ahi = noUsage ? 0 : Math.max(0.2, (alcohol ? 4.8 : weekend ? 2.9 : 2.2) + (Math.random() - 0.5) * 2.2)
      const obstructive = noUsage ? 0 : ahi * (0.55 + Math.random() * 0.15)
      const central = noUsage ? 0 : ahi * (0.1 + Math.random() * 0.1)
      const hypopnea = noUsage ? 0 : Math.max(0, ahi - obstructive - central)
      const leak = noUsage ? 0 : Math.round(Math.max(2, 10 + (Math.random() - 0.5) * 12))
      const usage = noUsage ? 0 : +(Math.max(2.5, 6.6 + (Math.random() - 0.5) * 3)).toFixed(1)
      const tags = noUsage ? [] : tagPool.filter(() => Math.random() < 0.08)
      if (alcohol) tags.push('alcohol')
      extra.push({
        label: d.toLocaleDateString(undefined, { day: '2-digit', month: 'short' }),
        date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
        weekend, ahi: +ahi.toFixed(1), obstructive: +obstructive.toFixed(1), central: +central.toFixed(1), hypopnea: +hypopnea.toFixed(1),
        leak, usage, tags: [...new Set(tags)], noUsage,
      })
    }
    return [...extra, ...nights]
  }, [nights])

  const pctl = (arr, p) => {
    if (!arr.length) return 0
    const sorted = [...arr].sort((a, b) => a - b)
    return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))]
  }
  // 4h/6h are standard clinical/insurance compliance thresholds — kept
  // fixed here rather than tied to the user's own configurable target
  // below, since a clinician report should read against the standard
  // benchmark, not a personal setting that may differ from it.
  function windowStats(win) {
    const used = win.filter((n) => !n.noUsage)
    const usageAvg = win.reduce((s, n) => s + n.usage, 0) / win.length // 0-usage nights count as real signal, same avg/avgUsed split used everywhere else in the app
    const ahiAvg = used.length ? used.reduce((s, n) => s + n.ahi, 0) / used.length : 0
    const leak95 = pctl(used.map((n) => n.leak), 0.95)
    const days4 = win.filter((n) => n.usage >= 4).length
    const days6 = win.filter((n) => n.usage >= 6).length
    return { usageAvg, ahiAvg, leak95, days4, days4Pct: Math.round((days4 / win.length) * 100), days6, days6Pct: Math.round((days6 / win.length) * 100) }
  }
  const windows = [
    { key: '30', label: 'Last 30 days', data: fullHistory.slice(-30), labelEvery: 5 },
    { key: '90', label: 'Last 90 days', data: fullHistory.slice(-90), labelEvery: 14 },
    { key: '365', label: 'Last 365 days', data: fullHistory.slice(-365), labelEvery: 56 },
  ]

  // Tag correlation, computed over the 90-day window — long enough for a
  // meaningful sample per tag, recent enough to reflect current patterns.
  // This is the one section a device-generated report structurally can't
  // include, since it doesn't know about the user's own logged context.
  const tagBase = windows[1].data.filter((n) => !n.noUsage)
  const overallAhi90 = tagBase.length ? tagBase.reduce((s, n) => s + n.ahi, 0) / tagBase.length : 0
  const tagRows = Object.keys(TAG_LABEL).map((tk) => {
    const withTag = tagBase.filter((n) => n.tags.includes(tk))
    if (!withTag.length) return null
    const a = withTag.reduce((s, n) => s + n.ahi, 0) / withTag.length
    const diff = overallAhi90 ? Math.round(((a - overallAhi90) / overallAhi90) * 100) : 0
    return { tk, diff, n: withTag.length }
  }).filter(Boolean).sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))

  const avgUsed = (arr, k) => {
    const used = arr.filter((n) => !n.noUsage)
    return used.length ? used.reduce((s, n) => s + n[k], 0) / used.length : 0
  }
  const obs = avgUsed(nights, 'obstructive'), cen = avgUsed(nights, 'central'), hyp = avgUsed(nights, 'hypopnea')
  const usedNights = nights.filter((n) => !n.noUsage)
  const best = usedNights.length ? usedNights.reduce((a, b) => (b.ahi < a.ahi ? b : a)) : null
  const worst = usedNights.length ? usedNights.reduce((a, b) => (b.ahi > a.ahi ? b : a)) : null
  const cushionDays = daysAgo(equipment.cushionChanged)
  const filterDays = daysAgo(equipment.filterChanged)

  return (
    <div style={{ background: '#FFFFFF', minHeight: '100vh', fontFamily: "'Plus Jakarta Sans', ui-sans-serif, system-ui" }}>
      <style>{`@media print { .no-print { display: none !important; } body { background: #fff; } }
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap');
        .font-display { font-family: 'Plus Jakarta Sans', ui-sans-serif, system-ui; }`}</style>

      <div className="no-print" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 600, margin: '0 auto', padding: 'max(20px, calc(env(safe-area-inset-top, 0px) + 24px)) max(20px, env(safe-area-inset-right, 0px)) 0 max(20px, env(safe-area-inset-left, 0px))' }}>
        <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 600, color: '#0A0A0C' }}>
          <ChevronLeft size={16} /> Back
        </button>
        <button onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 999, background: C.blue, color: '#FFFFFF', fontSize: 13, fontWeight: 700 }}>
          Print / Save PDF
        </button>
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '24px 20px 60px' }}>
        <h1 className="font-display" style={{ fontSize: 24, fontWeight: 800, color: '#0A0A0C', marginBottom: 4 }}>CPAP Therapy Summary</h1>
        <p style={{ fontSize: 13, color: '#7C7C88', marginBottom: 4 }}>{EQUIPMENT.machine.brand} {EQUIPMENT.machine.model}, SN {EQUIPMENT.machine.serial}</p>
        <p style={{ fontSize: 12, color: '#9A9AA5' }}>Generated {new Date().toLocaleDateString()} · Not a substitute for clinical review</p>

        {windows.map((win) => {
          const stats = windowStats(win.data)
          return (
            <div key={win.key} style={{ marginTop: 28 }}>
              <div className="font-display" style={{ background: '#0A0A0C', color: '#FFFFFF', padding: '9px 12px', fontSize: 13, fontWeight: 700, borderRadius: 6 }}>
                {win.label} ({win.data.length} nights)
              </div>
              <div style={{ display: 'flex', gap: 24, marginTop: 2 }}>
                <div style={{ flex: 1 }}>
                  <ReportRow label="Average usage" value={formatDuration(stats.usageAvg)} />
                  <ReportRow label="Leak 95th %" value={`${stats.leak95.toFixed(2)} L/min`} />
                  <ReportRow label="Average AHI" value={`${stats.ahiAvg.toFixed(2)} events/hr`} />
                </div>
                <div style={{ flex: 1 }}>
                  <ReportRow label="Days used ≥4h" value={`${stats.days4}/${win.data.length} (${stats.days4Pct}%)`} />
                  <ReportRow label="Days used ≥6h" value={`${stats.days6}/${win.data.length} (${stats.days6Pct}%)`} />
                </div>
              </div>

              <div className="font-display" style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0C', marginTop: 14, marginBottom: 4 }}>Usage hours</div>
              <div style={{ marginBottom: 6 }}>
                <ReportLegendDot color="#7CB68C" label="≥4 hours" />
                <ReportLegendDot color="#C4453D" label="<4 hours" />
                <ReportLegendDot color="#0A0A0C" label="No usage" />
              </div>
              <ReportBarChart data={win.data} dataKey="usage" max={12} threshold={4} labelEvery={win.labelEvery} colorFn={(d) => (d.usage >= 4 ? '#7CB68C' : '#C4453D')} />

              <div className="font-display" style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0C', marginTop: 14, marginBottom: 4 }}>Events per hour (AHI)</div>
              <ReportBarChart data={win.data} dataKey="ahi" logScale max={40} labelEvery={win.labelEvery} colorFn={() => '#7C4DE0'} />
            </div>
          )
        })}

        <ReportHeading>Tag correlation (last 90 days)</ReportHeading>
        {tagRows.length ? tagRows.map((r) => (
          <ReportRow key={r.tk} label={`${TAG_LABEL[r.tk]}${AUTO_TAGS.has(r.tk) ? ' (auto-detected)' : ''} (${r.n} nights)`} value={`AHI ${r.diff > 0 ? '+' : ''}${r.diff}%`} />
        )) : (
          <ReportRow label="No tagged nights yet" value="—" />
        )}

        <ReportHeading>Event breakdown (avg/hr)</ReportHeading>
        <ReportRow label="Obstructive" value={obs.toFixed(1)} />
        <ReportRow label="Central" value={cen.toFixed(1)} />
        <ReportRow label="Hypopnea" value={hyp.toFixed(1)} />

        <ReportHeading>Best / worst night</ReportHeading>
        {best && worst ? (
          <>
            <ReportRow label={`Best (${best.label})`} value={`AHI ${best.ahi}`} />
            <ReportRow label={`Worst (${worst.label})`} value={`AHI ${worst.ahi}`} />
          </>
        ) : (
          <ReportRow label="No nights used" value="—" />
        )}

        <ReportHeading>Equipment</ReportHeading>
        <ReportRow label="Machine" value={`${EQUIPMENT.machine.brand} ${EQUIPMENT.machine.model}`} />
        <ReportRow label="Serial number" value={EQUIPMENT.machine.serial} />
        <ReportRow label="Pressure mode" value={EQUIPMENT.pressureMode === 'fixed' ? `Fixed · ${EQUIPMENT.fixedPressure} cmH₂O` : 'Auto'} />
        <ReportRow label="Filter changed" value={`${filterDays} days ago`} />
        <ReportRow label="Mask" value={`${EQUIPMENT.mask.brand} ${EQUIPMENT.mask.model}, ${equipment.cushionSize}`} />
        <ReportRow label="Cushion changed" value={`${cushionDays} days ago`} />

        <ReportHeading>Nightly log (last 30 days)</ReportHeading>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #0A0A0C' }}>
              {['Date', 'AHI', 'Leak', 'Usage'].map((h) => (
                <th key={h} className="font-display" style={{ textAlign: h === 'Date' ? 'left' : 'right', padding: '6px 4px', fontSize: 11, fontWeight: 700, color: '#57575F' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {nights.map((n, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #EDEDF0' }}>
                <td style={{ padding: '6px 4px', color: '#0A0A0C' }}>{n.label}</td>
                <td style={{ padding: '6px 4px', textAlign: 'right', color: '#0A0A0C' }}>{n.ahi}</td>
                <td style={{ padding: '6px 4px', textAlign: 'right', color: '#0A0A0C' }}>{n.leak}</td>
                <td style={{ padding: '6px 4px', textAlign: 'right', color: '#0A0A0C' }}>{formatDuration(n.usage)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
