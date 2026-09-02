export const toDateStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export function daysAgo(dateStr) {
  return Math.floor((Date.now() - new Date(dateStr)) / 86400000)
}

// Compact duration display used everywhere a measured length of time
// (usage, session length, averages) is shown — "4h 36m", never a decimal
// like "4.6h". Distinct from a target/threshold label like "4h+ usage",
// which is a round configured number, not a measurement, and stays as-is.
export function formatDuration(hoursDecimal) {
  const totalMin = Math.round(hoursDecimal * 60)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return `${h}h ${m}m`
}

export function formatClock(hourFloat) {
  const h24 = ((hourFloat % 24) + 24) % 24
  const h = Math.floor(h24)
  const m = Math.round((h24 - h) * 60)
  const ampm = h < 12 ? 'AM' : 'PM'
  let h12 = h % 12
  if (h12 === 0) h12 = 12
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`
}
