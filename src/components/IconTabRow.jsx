export function IconTabRow({ tabs, active, onChange }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      {tabs.map((tb) => {
        const isActive = active === tb.key
        return (
          <button key={tb.key} onClick={() => onChange(tb.key)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, opacity: isActive ? 1 : 0.35 }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', border: `2px solid ${tb.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <tb.icon size={18} style={{ color: tb.color }} strokeWidth={2} />
            </div>
            <span className="font-display" style={{ fontSize: 12, fontWeight: 600, color: tb.color }}>{tb.label}</span>
          </button>
        )
      })}
    </div>
  )
}
