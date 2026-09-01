import { ChevronLeft, Minus, Plus } from 'lucide-react'
import { T } from '../constants/theme'
import { formatClock } from '../utils/dates'
import { CardTitle } from '../components/CardTitle'

function StepperRow({ label, value, unit, onChange, step, min, max, last, formatValue }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 44, boxSizing: 'border-box', borderBottom: last ? 'none' : `1px solid ${T.line}` }}>
      <span className="font-display" style={{ fontSize: 14.5, color: T.ink }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => onChange(Math.max(min, +(value - step).toFixed(2)))} style={{ width: 28, height: 28, borderRadius: '50%', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Minus size={13} style={{ color: T.ink }} />
        </button>
        <span className="font-display" style={{ fontSize: 15, fontWeight: 700, color: T.ink, minWidth: 64, textAlign: 'center' }}>
          {formatValue ? formatValue(value) : <>{value} <span style={{ fontSize: 11, fontWeight: 500, color: T.muted }}>{unit}</span></>}
        </span>
        <button onClick={() => onChange(Math.min(max, +(value + step).toFixed(2)))} style={{ width: 28, height: 28, borderRadius: '50%', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Plus size={13} style={{ color: T.ink }} />
        </button>
      </div>
    </div>
  )
}

export function SettingsScreen({ onBack, targets, onChange }) {
  const set = (key) => (val) => onChange({ ...targets, [key]: val })

  return (
    <div style={{ minHeight: '100vh', background: T.bg, fontFamily: "'Plus Jakarta Sans', ui-sans-serif, system-ui", paddingBottom: 'env(safe-area-inset-bottom, 40px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, maxWidth: 448, margin: '0 auto', padding: 'env(safe-area-inset-top, 20px) env(safe-area-inset-right, 18px) 8px env(safe-area-inset-left, 18px)' }}>
        <button onClick={onBack} style={{ width: 36, height: 36, borderRadius: '50%', background: T.surface, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <ChevronLeft size={18} style={{ color: T.ink }} />
        </button>
        <div className="font-display" style={{ fontSize: 20, fontWeight: 800, color: T.ink }}>Settings</div>
      </div>

      <main style={{ maxWidth: 448, margin: '0 auto', padding: '16px 18px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ background: T.surface, borderRadius: 22, padding: 20 }}>
          <CardTitle sub="Drives your Today score, Stats targets, and the warning-triangle flags throughout the app">Targets</CardTitle>
          <StepperRow label="AHI target" value={targets.ahi} unit="events/hr" step={0.5} min={1} max={15} onChange={set('ahi')} />
          <StepperRow label="Leak target" value={targets.leak} unit="L/min" step={1} min={5} max={40} onChange={set('leak')} />
          <StepperRow label="Usage target" value={targets.usage} unit="hours" step={0.5} min={2} max={8} onChange={set('usage')} />
          <StepperRow label="Compliance target" value={targets.compliance} unit="%" step={5} min={50} max={100} onChange={set('compliance')} />
          <StepperRow label="Mask-off target" value={targets.maskOff} unit="events" step={1} min={0} max={10} onChange={set('maskOff')} last />
        </div>
        <div style={{ fontSize: 12, color: T.muted, padding: '0 4px', lineHeight: 1.5 }}>
          Meeting every target on the same night is what earns a 100 score on Today. Defaults match common clinical benchmarks (AHI under 5, 4+ hours on 70% of nights) — adjust if your clinician has given you different numbers to work toward.
        </div>

        <div style={{ background: T.surface, borderRadius: 22, padding: 20 }}>
          <CardTitle sub="Used only for the automatic 'Late start' tag">Tagging</CardTitle>
          <StepperRow label="Target bedtime" value={targets.bedtime} step={0.25} min={19} max={26} onChange={set('bedtime')}
            formatValue={(v) => <>{formatClock(v)}</>} last />
        </div>
        <div style={{ fontSize: 12, color: T.muted, padding: '0 4px', lineHeight: 1.5 }}>
          A session starting more than 2 hours after this is tagged "Late start" automatically — no logging needed, since your machine already records when a session began.
        </div>
      </main>
    </div>
  )
}
