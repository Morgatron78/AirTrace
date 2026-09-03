import { useState, useEffect } from 'react'
import { ChevronRight } from 'lucide-react'
import { T, C } from '../constants/theme'

// Free-text fields nothing else can populate automatically (originally
// built for Equipment's make/model/serial, since the device can't
// self-report any of that over the SD card; also used for Settings'
// patient/clinic fields, same reasoning — nothing in the imported data
// could ever know a patient's name). Same tap-to-expand shape as
// MaintenanceRow's date picker, but a plain text input + explicit Save
// rather than an immediate-apply control, since a stray keystroke
// shouldn't overwrite a real value the way a date/dropdown pick can't.
export function TextEditRow({ icon: Icon, iconColor, label, value, onChange, placeholder, type = 'text', last }) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(value)
  useEffect(() => { setDraft(value) }, [value])
  const save = () => { onChange(draft.trim()); setOpen(false) }
  return (
    <div style={{ borderBottom: last ? 'none' : `1px solid ${T.line}` }}>
      <div onClick={() => setOpen((o) => !o)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 44, boxSizing: 'border-box', cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {Icon && <Icon size={18} style={{ color: iconColor }} strokeWidth={1.8} />}
          <span className="font-display" style={{ fontSize: 14.5, color: T.ink }}>{label}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="font-display" style={{ fontSize: 18, fontWeight: 700, color: T.ink }}>{value || placeholder}</span>
          <ChevronRight size={14} style={{ color: T.muted, transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }} />
        </div>
      </div>
      {open && (
        <div style={{ paddingBottom: 14, display: 'flex', gap: 8 }}>
          <input type={type} value={draft} placeholder={placeholder} onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') save() }}
            style={{ flex: 1, padding: '9px 10px', borderRadius: 10, border: `1px solid ${T.line}`, fontFamily: "'Plus Jakarta Sans'", fontSize: 13, color: T.ink, background: T.bg }} />
          <button onClick={save} className="font-display"
            style={{ padding: '9px 14px', borderRadius: 10, background: C.blue, color: '#FFFFFF', fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap' }}>
            Save
          </button>
        </div>
      )}
    </div>
  )
}
