import { getDB } from './schema.js'

export async function getAllSummaries() {
  const db = await getDB()
  const rows = await db.getAll('nightSummaries')
  return rows.sort((a, b) => (a.date < b.date ? -1 : 1))
}

// STR.edf always contains the device's full history, so every import
// upserts the complete set — cheap (~a few hundred small rows even after
// years of use), and naturally idempotent.
export async function upsertSummaries(rows) {
  if (!rows.length) return
  const db = await getDB()
  const tx = db.transaction('nightSummaries', 'readwrite')
  await Promise.all([...rows.map((r) => tx.store.put(r)), tx.done])
}
