import { useState } from 'react'
import { T } from '../constants/theme'
import { ChartInfoButton } from './ChartInfoButton'

// info is optional, longer explanatory text (the kind that used to sit as
// its own always-visible paragraph below a Settings card, making the
// screen read as a wall of text) — collapsed behind the same info-icon
// toggle already used on charts elsewhere in the app (ChartInfoButton),
// expanding inline in place rather than a popup/overlay. sub stays
// always-visible — it's meant to be a short one-liner, not the thing
// this was built to hide.
export function CardTitle({ children, sub, info }) {
  const [showInfo, setShowInfo] = useState(false)
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div className="font-display" style={{ fontSize: 15, fontWeight: 700, color: T.ink }}>{children}</div>
        {info && <ChartInfoButton show={showInfo} onToggle={() => setShowInfo((s) => !s)} size={24} iconSize={12} />}
      </div>
      {sub && <div style={{ fontSize: 12, color: T.muted, marginTop: 6 }}>{sub}</div>}
      {info && showInfo && <div style={{ fontSize: 12, color: T.muted, marginTop: 8, lineHeight: 1.5 }}>{info}</div>}
    </div>
  )
}
