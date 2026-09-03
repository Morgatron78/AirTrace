import { getDB } from './schema.js'

export async function getMeta(key) {
  const db = await getDB()
  const row = await db.get('meta', key)
  return row ? row.value : undefined
}

export async function setMeta(key, value) {
  const db = await getDB()
  await db.put('meta', { key, value })
}

// Every meta row as-is ({ key, value } objects) — used by backup export
// so a newly-added meta key (themeMode, say) is included automatically,
// with no hardcoded key list to keep in sync.
export async function getAllMeta() {
  const db = await getDB()
  return db.getAll('meta')
}
