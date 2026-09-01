export const toDateStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export function daysAgo(dateStr) {
  return Math.floor((Date.now() - new Date(dateStr)) / 86400000)
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
