import { useMemo } from 'react'
import { EQUIPMENT } from '../constants/equipment'

// Placeholder data source standing in for the real EDF-import pipeline
// (Web Worker + IndexedDB, per CLAUDE.md's real-build architecture — not
// built yet). Every screen consumes nights from this hook today; swapping
// it for the real imported/stored data later shouldn't require changing
// any screen, since they only depend on the night-object shape below.
export function useMockData() {
  return useMemo(() => {
    const tagPool = ['alcohol', 'lateMeal', 'awayFromHome', 'highStress', 'illness']
    const nights = []
    const today = new Date()
    // A day or two a month with the machine untouched entirely — kept out of
    // the most recent few nights so Today's "last night" stays a normal
    // night to demo against; the gap still shows up clearly everywhere else
    // (Trends charts, Session times, Stats).
    const noUsageIdx = 3 + Math.floor(Math.random() * 22)
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const weekend = d.getDay() === 0 || d.getDay() === 6
      const noUsage = nights.length === noUsageIdx
      const alcohol = !noUsage && Math.random() < 0.2
      const ahi = noUsage ? 0 : Math.max(0.2, (alcohol ? 5.4 : weekend ? 3.3 : 2.6) + (Math.random() - 0.5) * 2)
      const obstructive = noUsage ? 0 : ahi * (0.55 + Math.random() * 0.15)
      const central = noUsage ? 0 : ahi * (0.1 + Math.random() * 0.1)
      const hypopnea = noUsage ? 0 : Math.max(0, ahi - obstructive - central)
      const leak = noUsage ? 0 : Math.round(Math.max(2, 12 + (Math.random() - 0.5) * 12 + (i < 4 ? (4 - i) * 1.2 : 0)))
      const usage = noUsage ? 0 : +(Math.max(3.5, 7.2 + (Math.random() - 0.5) * 2)).toFixed(1)
      const pMin = noUsage ? 0 : +(EQUIPMENT.fixedPressure - 0.1 - Math.random() * 0.1).toFixed(1)
      const pMax = noUsage ? 0 : +(EQUIPMENT.fixedPressure + 0.1 + Math.random() * 0.1).toFixed(1)
      const p95 = noUsage ? 0 : EQUIPMENT.fixedPressure
      const maskOff = noUsage ? 0 : (Math.random() < 0.15 ? 1 : 0)
      const sealPct = Math.max(60, 100 - leak * 1.8)
      const seal = noUsage ? null : (sealPct > 90 ? 'Good' : sealPct > 75 ? 'Fair' : 'Poor')
      const tags = noUsage ? [] : tagPool.filter(() => Math.random() < 0.1)
      if (alcohol) tags.push('alcohol')
      const startHour = noUsage ? 22 : 22 + Math.random() * 1.5 // bedtime, 24h float — e.g. 22.75 = 10:45 PM
      nights.push({
        label: d.toLocaleDateString(undefined, { day: '2-digit', month: 'short' }),
        fullLabel: d.toLocaleDateString(undefined, { day: 'numeric', month: 'long' }),
        date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
        wd: d.toLocaleDateString(undefined, { weekday: 'narrow' }),
        weekend, ahi: +ahi.toFixed(1), obstructive: +obstructive.toFixed(1), central: +central.toFixed(1), hypopnea: +hypopnea.toFixed(1),
        leak, usage, pMin, pMax, p95, maskOff, seal, tags: [...new Set(tags)], startHour, noUsage,
      })
    }
    return nights
  }, [])
}
