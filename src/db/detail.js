import { getDB } from './schema.js'
import { toDateStr } from '../utils/dates.js'

export async function getDetail(date) {
  const db = await getDB()
  return db.get('nightDetail', date)
}

export async function getExistingDetailDates() {
  const db = await getDB()
  return new Set(await db.getAllKeys('nightDetail'))
}

// rows: [{ date, detail, events, timeInApneaSec, totalNightSec }, ...]
// (the shape src/edf/parseNight.js produces, plus the date it's for).
export async function upsertDetail(rows) {
  if (!rows.length) return
  const db = await getDB()
  const tx = db.transaction('nightDetail', 'readwrite')
  await Promise.all([...rows.map((r) => tx.store.put(r)), tx.done])
}

// Two-tier retention per CLAUDE.md: measured from *today*, not from the
// last import — a 3-week gap between imports doesn't break this, it just
// means a bigger one-time catch-up prune. Returns how many rows were
// pruned, for ImportScreen's "Waveform pruned" stat.
export async function pruneOlderThan(days) {
  const db = await getDB()
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  const cutoffStr = toDateStr(cutoff)

  const tx = db.transaction('nightDetail', 'readwrite')
  let cursor = await tx.store.openCursor()
  let pruned = 0
  while (cursor) {
    if (cursor.key < cutoffStr) {
      await cursor.delete()
      pruned++
    }
    cursor = await cursor.continue()
  }
  await tx.done
  return pruned
}
