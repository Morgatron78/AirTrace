export function IconTabRow({ tabs, active, onChange }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      {tabs.map((tb) => {
        const isActive = active === tb.key
        return (
          // "Mask Pressure" is the only two-word label here — left to wrap
          // (or not) based on however much room the flex row happens to
          // have at render time, it was inconsistent: sometimes one line
          // (wider than every other tab, throwing the row's spacing off),
          // sometimes two. maxWidth forces it to reliably wrap onto two
          // lines every time, keeping every tab's own column close to the
          // same width as the 44px icon circle, so the row's icons land
          // evenly spaced regardless of which tab has the longest label.
          <button key={tb.key} onClick={() => onChange(tb.key)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, opacity: isActive ? 1 : 0.35 }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', border: `2px solid ${tb.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <tb.icon size={18} style={{ color: tb.color }} strokeWidth={2} />
            </div>
            <span className="font-display" style={{ fontSize: 12, fontWeight: 600, color: tb.color, maxWidth: 50, textAlign: 'center' }}>{tb.label}</span>
          </button>
        )
      })}
    </div>
  )
}
