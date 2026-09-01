import { openDB } from 'idb'

const DB_NAME = 'airtrace'
const DB_VERSION = 1

let dbPromise = null

// Two-tier retention per CLAUDE.md: nightSummaries kept forever (cheap —
// one row per day, from STR.edf), nightDetail pruned to a rolling 90-day
// window measured from today (see src/db/detail.js's pruneOlderThan).
// tags/meta are the persistence this phase adds for what used to live
// only in React state and was lost on every reload.
export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        db.createObjectStore('nightSummaries', { keyPath: 'date' })
        db.createObjectStore('nightDetail', { keyPath: 'date' })
        db.createObjectStore('tags', { keyPath: 'date' })
        db.createObjectStore('meta', { keyPath: 'key' })
      },
    })
  }
  return dbPromise
}
