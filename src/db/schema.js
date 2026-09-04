import { openDB } from 'idb'

const DB_NAME = 'airtrace'
const DB_VERSION = 2

let dbPromise = null

// Two-tier retention per CLAUDE.md: nightSummaries kept forever (cheap —
// one row per day, from STR.edf), nightDetail pruned to a rolling 90-day
// window measured from today (see src/db/detail.js's pruneOlderThan).
// tags/meta are the persistence this phase adds for what used to live
// only in React state and was lost on every reload.
export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      // oldVersion-gated: a browser already at version 1 must NOT have
      // createObjectStore called again for a store it already has — that
      // throws ConstraintError and aborts the whole upgrade transaction
      // (confirmed the hard way against a real pre-existing v1 database).
      // Each version's own stores only get created the first time a
      // browser crosses that version boundary.
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          db.createObjectStore('nightSummaries', { keyPath: 'date' })
          db.createObjectStore('nightDetail', { keyPath: 'date' })
          db.createObjectStore('tags', { keyPath: 'date' })
          db.createObjectStore('meta', { keyPath: 'key' })
        }
        if (oldVersion < 2) {
          // APPLE-HEALTH: sleep stage / HR / SpO2 samples matched to a CPAP
          // night's own session window, see src/db/health.js. Safe to delete
          // this block to strip the feature — see docs/apple-health-integration.md.
          // DB_VERSION must NOT be decremented after this ships (see that doc).
          db.createObjectStore('healthData', { keyPath: 'date' })
        }
      },
    })
  }
  return dbPromise
}
