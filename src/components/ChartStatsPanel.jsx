import { T } from '../constants/theme'
import { DetailFields } from './DetailFields'

// Inline, in-flow panel — deliberately NOT a floating overlay like
// ChartInfoOverlay. Night View's own equivalent (the Statistics table
// under Individual channels) is a plain in-flow card, and Trends
// already reveals a bar's own detail the same in-flow way
// (NightDetailPanel, below) — a popup here would've been the odd one
// out next to both of those existing patterns.
export function ChartStatsPanel({ title, periodLabel, rows }) {
  return (
    <div style={{ background: T.bg, borderRadius: 14, padding: 14, marginTop: 12 }}>
      <div className="font-display" style={{ fontSize: 13, fontWeight: 700, color: T.ink, marginBottom: 2 }}>{title}</div>
      <div style={{ fontSize: 11, color: T.muted, marginBottom: 10 }}>Over this {periodLabel}</div>
      <DetailFields fields={rows.map((r) => ({
        label: r.label,
        value: r.sub ? <>{r.value}<div style={{ fontSize: 10, color: T.muted, fontWeight: 500, marginTop: 2 }}>{r.sub}</div></> : r.value,
      }))} />
    </div>
  )
}
