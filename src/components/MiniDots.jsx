import { T, SEV } from '../constants/theme'
import { scoreColor } from '../utils/scoring'

export function MiniDots({ nights, targets, onSelect, allNights }) {
  return (
    <div>
      <div style={{ display: 'flex', gap: 5 }}>
        {nights.map((n, i) => (
          <button key={i} onClick={onSelect ? () => onSelect(allNights.indexOf(n)) : undefined}
            style={{
              flex: 1, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: onSelect ? 'pointer' : 'default',
              background: n.noUsage ? T.bg : scoreColor(n.ahi, targets),
              border: n.noUsage ? `1.5px dashed ${T.muted}` : 'none', boxSizing: 'border-box',
            }}>
            <span className="font-display" style={{ fontSize: 13, fontWeight: 700, color: n.noUsage ? T.muted : '#FFFFFF' }}>{n.wd}</span>
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 14, flexWrap: 'wrap' }}>
        {[['Good', SEV.good], ['Fair', SEV.fair], ['Rough', SEV.bad]].map(([label, c]) => (
          <span key={label} className="font-display" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: T.ink }}>
            <span style={{ width: 9, height: 9, borderRadius: 5, background: c }} />{label}
          </span>
        ))}
        <span className="font-display" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: T.ink }}>
          <span style={{ width: 9, height: 9, borderRadius: 5, border: `1.5px dashed ${T.muted}`, boxSizing: 'border-box' }} />Not used
        </span>
      </div>
    </div>
  )
}
