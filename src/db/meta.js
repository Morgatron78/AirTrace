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
