import { useState } from 'react'
import { X, Check, Wine, UtensilsCrossed, Plane, Zap, Thermometer } from 'lucide-react'
import { T, C } from '../constants/theme'
import { TAG_COLOR } from '../constants/tags'

// "Yesterday" reads more naturally than a date when tagging the morning
// after — everywhere else falls back to a plain formatted date.
function formatTagDateLabel(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`)
  const yest = new Date(); yest.setDate(yest.getDate() - 1)
  const yestStr = `${yest.getFullYear()}-${String(yest.getMonth() + 1).padStart(2, '0')}-${String(yest.getDate()).padStart(2, '0')}`
  return dateStr === yestStr ? 'yesterday' : d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'long' })
}

function Chip({ active, label, icon: Icon, color, onClick, last }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '12px 4px',
      borderBottom: last ? 'none' : `1px solid ${T.line}`,
    }}>
      <div style={{ width: 30, height: 30, borderRadius: '50%', background: active ? color : T.bg, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={15} style={{ color: active ? '#FFFFFF' : T.muted }} />
      </div>
      <span className="font-display" style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>{label}</span>
      <div style={{ marginLeft: 'auto', width: 22, height: 22, borderRadius: '50%', background: active ? color : T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {active && <Check size={13} style={{ color: '#FFFFFF' }} strokeWidth={3} />}
      </div>
    </button>
  )
}

// Shared modal for both entry points — same picker whether it's today's
// quick-tag or an edit opened from a past night in Night View, just a
// different date and pre-filled state going in.
export function TagEntryScreen({ date, initialEntry, onSave, onClose }) {
  const [alcohol, setAlcohol] = useState(initialEntry?.alcohol || null)
  const [lateMeal, setLateMeal] = useState(initialEntry?.lateMeal || false)
  const [awayFromHome, setAwayFromHome] = useState(initialEntry?.awayFromHome || false)
  const [highStress, setHighStress] = useState(initialEntry?.highStress || false)
  const [illness, setIllness] = useState(initialEntry?.illness || false)
  const dateLabel = formatTagDateLabel(date)
  const save = () => onSave({ reviewed: true, alcohol, lateMeal, awayFromHome, highStress, illness })
  const saveNothing = () => onSave({ reviewed: true, alcohol: null, lateMeal: false, awayFromHome: false, highStress: false, illness: false })
  return (
    <div style={{ position: 'fixed', inset: 0, background: T.bg, zIndex: 60, display: 'flex', flexDirection: 'column', fontFamily: "'Plus Jakarta Sans', ui-sans-serif, system-ui" }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'env(safe-area-inset-top, 20px) env(safe-area-inset-right, 18px) 8px env(safe-area-inset-left, 18px)', maxWidth: 448, margin: '0 auto', width: '100%', boxSizing: 'border-box', flexShrink: 0 }}>
        <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: '50%', background: T.surface, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <X size={17} style={{ color: T.ink }} />
        </button>
        <div className="font-display" style={{ fontSize: 16, fontWeight: 800, color: T.ink }}>Tag {dateLabel}</div>
        <div style={{ width: 36 }} />
      </div>
      <main style={{ flex: 1, overflow: 'auto', maxWidth: 448, margin: '0 auto', width: '100%', padding: '16px env(safe-area-inset-right, 18px) env(safe-area-inset-bottom, 24px) env(safe-area-inset-left, 18px)', boxSizing: 'border-box' }}>
        <div style={{ fontSize: 13, color: T.muted, marginBottom: 18, lineHeight: 1.4 }}>
          What happened the night of {dateLabel}? This is what actually lets Stats and Insights tell you what's affecting your numbers.
        </div>

        <div style={{ background: T.surface, borderRadius: 22, padding: 20, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: alcohol ? TAG_COLOR.alcohol : T.bg, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Wine size={15} style={{ color: alcohol ? '#FFFFFF' : T.muted }} />
            </div>
            <span className="font-display" style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>Alcohol</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {[[null, 'None'], ['light', 'Light'], ['heavy', 'Heavy']].map(([key, label]) => {
              const active = alcohol === key
              return (
                <button key={label} onClick={() => setAlcohol(key)} style={{ flex: 1, padding: '12px 0', borderRadius: 14, textAlign: 'center', background: active ? TAG_COLOR.alcohol : T.bg }}>
                  <span className="font-display" style={{ fontSize: 13, fontWeight: 700, color: active ? '#FFFFFF' : T.ink }}>{label}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div style={{ background: T.surface, borderRadius: 22, padding: '4px 20px', marginBottom: 20 }}>
          <Chip active={lateMeal} label="Late meal" icon={UtensilsCrossed} color={TAG_COLOR.lateMeal} onClick={() => setLateMeal((v) => !v)} />
          <Chip active={awayFromHome} label="Away from home" icon={Plane} color={TAG_COLOR.awayFromHome} onClick={() => setAwayFromHome((v) => !v)} />
          <Chip active={highStress} label="High stress" icon={Zap} color={TAG_COLOR.highStress} onClick={() => setHighStress((v) => !v)} />
          <Chip active={illness} label="Congestion / illness" icon={Thermometer} color={TAG_COLOR.illness} onClick={() => setIllness((v) => !v)} last />
        </div>

        <button onClick={saveNothing} style={{ width: '100%', padding: '13px 0', borderRadius: 999, background: T.surface }}>
          <span className="font-display" style={{ fontSize: 14, fontWeight: 700, color: T.ink }}>Nothing to report</span>
        </button>
        <button onClick={save} style={{ width: '100%', padding: '13px 0', borderRadius: 999, background: C.blue, marginTop: 10 }}>
          <span className="font-display" style={{ fontSize: 14, fontWeight: 700, color: '#FFFFFF' }}>Save</span>
        </button>
      </main>
    </div>
  )
}
