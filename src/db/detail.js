import { useState, useEffect } from 'react'
import { getDB } from './schema.js'
import { toDateStr } from '../utils/dates.js'

// Bump this whenever parseNight.js's `detail` object gains a new channel
// (most recently: therapyPressure). Import is incremental by date — a
// plain re-import silently skips any night already stored, so without
// this a night parsed by an older build stays missing that field forever,
// which crashes Night View when it tries to chart it (see
// DrillDownScreen.jsx). ImportScreen.jsx checks this against the
// 'detailSchemaVersion' meta key before computing its skip-list: on a
// mismatch (including "never set"), every already-stored night is
// re-parsed on the next import instead of skipped, then the meta key is
// updated to match — a one-time catch-up, self-healing the same way for
// whatever field gets added next, no manual IndexedDB wipe ever needed.
// Also bumped for a value-computation change, not just a new field: an
// already-stored night's timeInApneaSec was computed with the old (buggy)
// logic and won't self-correct just because the code changed — a version
// mismatch is what actually forces it to be re-parsed instead of skipped.
export const DETAIL_SCHEMA_VERSION = 4 // 2: added therapyPressure. 3: added inspTime/expTime. 4: timeInApneaSec excludes Hypopnea (matches OSCAR)

export async function getDetail(date) {
  const db = await getDB()
  return db.get('nightDetail', date)
}

// Shared fetch/cancel/status pattern, used by both DrillDownScreen
// (whichever night is being browsed) and TodayScreen (last night, and
// separately the previous night for its own delta) — one implementation
// of "load this date's detail row, tracking loading/unavailable/ready,
// ignoring a stale result if the date changes mid-fetch" instead of a
// hand-copied version per call site. `date` may be null/undefined (e.g.
// TodayScreen has no previous night on day one of tagged history) —
// resolves straight to 'unavailable' without calling getDetail at all.
export function useNightDetail(date) {
  const [status, setStatus] = useState('loading') // 'loading' | 'unavailable' | 'ready'
  const [detail, setDetail] = useState(null)
  useEffect(() => {
    if (!date) { setStatus('unavailable'); setDetail(null); return }
    let cancelled = false
    setStatus('loading')
    getDetail(date).then((row) => {
      if (cancelled) return
      if (!row) { setStatus('unavailable'); setDetail(null); return }
      setDetail(row)
      setStatus('ready')
    })
    return () => { cancelled = true }
  }, [date])
  return { status, detail }
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
