import { useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import { C } from '../constants/theme'
import { EQUIPMENT } from '../constants/equipment'
import { TAG_LABEL, AUTO_TAGS } from '../constants/tags'
import { daysAgo, formatDuration } from '../utils/dates'
import { currentSetPressure, nightsForExtremes } from '../utils/scoring'

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

export function ClinicianReportScreen({ nights, onBack, equipment, profile }) {
  // window.print() is a real no-op in an installed Home Screen PWA on
  // iOS — standalone mode strips the browser chrome print/share depends
  // on entirely (same failure class already documented for Wake Lock in
  // this exact project — an API that silently does nothing specifically
  // in this context, not something a try/catch or feature-check can
  // detect, since the call itself doesn't error). navigator.standalone is
  // the classic iOS-specific flag; the media query is the general modern
  // one — checking both covers older and newer engines alike. Full PDF
  // export (a real client-side PDF library, bypassing window.print
  // entirely) would work around this properly, but is real added
  // complexity/bundle weight for what's explicitly an acceptable-to-skip
  // feature — this is the cheap fix: explain the dead end and the actual
  // workaround (this same report, opened in a regular Safari tab, isn't
  // restricted the same way) instead of a button that just does nothing.
  const isStandalone = typeof window !== 'undefined' && (window.matchMedia?.('(display-mode: standalone)').matches || window.navigator?.standalone)
  const [showPrintHelp, setShowPrintHelp] = useState(false)
  const handlePrint = () => { if (isStandalone) setShowPrintHelp(true); else window.print() }
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
  // Real history only — nights.slice(-N) naturally returns whatever's
  // actually there if it's shorter than the window (e.g. a new user a
  // few weeks in), rather than padding out to N with fabricated nights.
  const windows = [
    { key: '30', label: 'Last 30 days', data: nights.slice(-30), labelEvery: 5 },
    { key: '90', label: 'Last 90 days', data: nights.slice(-90), labelEvery: 14 },
    { key: '365', label: 'Last 365 days', data: nights.slice(-365), labelEvery: 56 },
  ]

  // Tag correlation, computed over the 90-day window — long enough for a
  // meaningful sample per tag, recent enough to reflect current patterns.
  // This is the one section a device-generated report structurally can't
  // include, since it doesn't know about the user's own logged context.
  const tagBase = windows[1].data.filter((n) => !n.noUsage)
  const overallAhi90 = tagBase.length ? tagBase.reduce((s, n) => s + n.ahi, 0) / tagBase.length : 0
  const tagRows = Object.keys(TAG_LABEL).map((tk) => {
    const withTag = tagBase.filter((n) => n.tags.includes(tk))
    // A single tagged night isn't a real pattern — same minimum InsightsScreen's
    // own per-tag cards already use, applied here too since a report meant for
    // a clinician showing an n=1 "+45%" with the same confident phrasing as an
    // established finding is worse, not better, than the casual in-app version.
    if (withTag.length < 3) return null
    const a = withTag.reduce((s, n) => s + n.ahi, 0) / withTag.length
    const diff = overallAhi90 ? Math.round(((a - overallAhi90) / overallAhi90) * 100) : 0
    return { tk, diff, n: withTag.length }
  }).filter(Boolean).sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))

  const avgUsed = (arr, k) => {
    const used = arr.filter((n) => !n.noUsage)
    return used.length ? used.reduce((s, n) => s + n[k], 0) / used.length : 0
  }
  // Scoped to the same 90-day window as tag correlation above, not all-time
  // history — every other section on this report states an explicit window
  // (30/90/365 days), and these two silently didn't, which could show a
  // night from 18 months ago as "best" with nothing marking it as such.
  const obs = avgUsed(windows[1].data, 'obstructive'), cen = avgUsed(windows[1].data, 'central'), hyp = avgUsed(windows[1].data, 'hypopnea')
  // Deliberately its own filter, not tagBase — a night with only a
  // minute or two of real usage (see nightsForExtremes) can trivially
  // win "best" purely by having too little time worn to register any
  // events, which tagBase's plain !noUsage filter alone doesn't guard
  // against. tagBase itself stays as-is for the averages above, where
  // diluting one such outlier is harmless.
  const extremeBase = nightsForExtremes(windows[1].data)
  const best = extremeBase.length ? extremeBase.reduce((a, b) => (b.ahi < a.ahi ? b : a)) : null
  const worst = extremeBase.length ? extremeBase.reduce((a, b) => (b.ahi > a.ahi ? b : a)) : null
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
        <button onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 999, background: C.blue, color: '#FFFFFF', fontSize: 13, fontWeight: 700 }}>
          Print / Save PDF
        </button>
      </div>

      {showPrintHelp && (
        <div className="no-print" onClick={() => setShowPrintHelp(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(10,10,12,0.5)', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#FFFFFF', borderRadius: 16, padding: 20, maxWidth: 360 }}>
            <div className="font-display" style={{ fontSize: 15, fontWeight: 800, color: '#0A0A0C', marginBottom: 8 }}>Printing isn't available here</div>
            <p style={{ fontSize: 13, color: '#57575F', lineHeight: 1.5, margin: 0 }}>
              Apps installed to the Home Screen can't open the print/PDF sheet — that's an iOS limitation, not something this app controls. To print or save this report as a PDF, open AirTrace in Safari itself (not the Home Screen icon) and come back to this report from there.
            </p>
            <button onClick={() => setShowPrintHelp(false)} className="font-display"
              style={{ marginTop: 16, width: '100%', padding: '10px 0', borderRadius: 10, background: C.blue, color: '#FFFFFF', fontSize: 13, fontWeight: 700 }}>
              Got it
            </button>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '24px 20px 60px' }}>
        <h1 className="font-display" style={{ fontSize: 24, fontWeight: 800, color: '#0A0A0C', marginBottom: 4 }}>CPAP Therapy Summary</h1>
        {/* Always rendered, not just when set — a blank patient line on a
            clinical document is itself worth surfacing, not silently
            omitting, so an unset name reads as a clear prompt to fill it
            in via Settings rather than just vanishing. */}
        <p className="font-display" style={{ fontSize: 15, fontWeight: 700, color: profile.patientName ? '#0A0A0C' : '#9A9AA5', marginBottom: 2 }}>
          {profile.patientName || 'Patient name not set — add in Settings'}
          {profile.patientNumber ? ` · ID ${profile.patientNumber}` : ''}
        </p>
        <p style={{ fontSize: 13, color: '#7C7C88', marginBottom: 4 }}>{equipment.machineBrand} {equipment.machineModel}, SN {equipment.machineSerial}</p>
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

        <ReportHeading>Event breakdown (avg/hr, last 90 days)</ReportHeading>
        <ReportRow label="Obstructive" value={obs.toFixed(1)} />
        <ReportRow label="Central" value={cen.toFixed(1)} />
        <ReportRow label="Hypopnea" value={hyp.toFixed(1)} />

        <ReportHeading>Best / worst night (last 90 days)</ReportHeading>
        {best && worst ? (
          <>
            <ReportRow label={`Best (${best.label})`} value={`AHI ${best.ahi}`} />
            <ReportRow label={`Worst (${worst.label})`} value={`AHI ${worst.ahi}`} />
          </>
        ) : (
          <ReportRow label="No nights used" value="—" />
        )}

        <ReportHeading>Equipment</ReportHeading>
        <ReportRow label="Machine" value={`${equipment.machineBrand} ${equipment.machineModel}`} />
        <ReportRow label="Serial number" value={equipment.machineSerial} />
        <ReportRow label="Pressure mode" value={EQUIPMENT.pressureMode === 'fixed' ? `Fixed · ${currentSetPressure(nights, EQUIPMENT.fixedPressure)} cmH₂O` : 'Auto'} />
        <ReportRow label="Filter changed" value={`${filterDays} days ago`} />
        <ReportRow label="Mask" value={`${equipment.maskBrand} ${equipment.maskModel}, ${equipment.cushionSize}`} />
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
            {windows[0].data.map((n, i) => (
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
