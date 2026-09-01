import { T } from '../constants/theme'

// Small pill segmented control — used for range toggles (Week/2wk/Month)
// and chart metric switchers
export function Segmented({ options, active, onChange }) {
  return (
    <div style={{ display: 'inline-flex', background: T.bg, borderRadius: 10, padding: 3, gap: 2 }}>
      {options.map((opt) => {
        const isActive = active === opt.key
        return (
          <button key={opt.key} onClick={() => onChange(opt.key)} className="font-display"
            style={{
              padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
              background: isActive ? T.surface : 'transparent',
              color: isActive ? T.ink : T.muted,
              boxShadow: isActive ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
            }}>
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
