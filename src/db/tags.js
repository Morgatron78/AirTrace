import { getDB } from './schema.js'

// Returns { [date]: entry } to match the shape App.jsx's tagLog state
// used to hold — callers don't need to know this is now IndexedDB-backed.
export async function getAllTags() {
  const db = await getDB()
  const rows = await db.getAll('tags')
  const map = {}
  for (const row of rows) map[row.date] = row
  return map
}

export async function setTag(date, entry) {
  const db = await getDB()
  await db.put('tags', { ...entry, date })
}
