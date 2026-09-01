// Custom leak icon — cloud with escaping air streams, matching the app's
// outline-icon style (stroke-based, not filled)
export function LeakIcon({ size = 18, style, strokeWidth = 1.8 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={style?.color || 'currentColor'}
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={style}>
      <g transform="rotate(90 12 12)">
        <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
        <path d="M10 21l1-4" />
        <path d="M13 22.5l1.5-6.5" />
        <path d="M16 21l1-4" />
      </g>
    </svg>
  )
}
