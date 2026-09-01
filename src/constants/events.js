import { C } from './theme'

// Event-type rows shared between NightDetailPanel and TrendsScreen (via
// key/color) — anywhere obstructive/central/hypopnea needs consistent
// coloring and copy.
export const AHI_BREAKDOWN = [
  { key: 'obstructive', label: 'Obstructive', color: C.red,
    description: 'Your airway is physically blocked despite effort to breathe — usually from relaxed throat muscles or anatomy. The most common event type for most people.' },
  { key: 'central', label: 'Central', color: C.orange,
    description: "Your brain briefly stops sending the signal to breathe — not a blockage. Can relate to altitude, certain medications, or heart conditions, and doesn't respond to mask/pressure fixes the way obstructive events do." },
  { key: 'hypopnea', label: 'Hypopnea', color: C.blue,
    description: 'A partial narrowing that reduces airflow without stopping it completely — often has similar effects to a full apnea but registers as less severe per event.' },
]
