import { T } from '../constants/theme'

export function ChartInfoOverlay({ show, onClose, title, desc, color }) {
  if (!show) return null
  return (
    <>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 1 }} />
      <div onClick={onClose} style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        zIndex: 2, width: '80%', maxWidth: 230, boxSizing: 'border-box',
        background: T.surface, border: `1.5px solid ${color}`, borderRadius: 14,
        boxShadow: '0 8px 24px rgba(0,0,0,0.16)', padding: '12px 14px', textAlign: 'center', cursor: 'pointer',
      }}>
        <span className="font-display" style={{ fontSize: 12, fontWeight: 700, color: T.ink }}>{title}</span>
        <span style={{ display: 'block', fontSize: 11, color: T.muted, marginTop: 4, lineHeight: 1.4 }}>{desc}</span>
      </div>
    </>
  )
}
