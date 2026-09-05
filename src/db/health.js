// Apple Health integration (POC) — safe to delete this file entirely,
// see docs/apple-health-integration.md.
import { useState, useEffect } from 'react'
import { getDB } from './schema.js'

export async function getHealthEntry(date) {
  const db = await getDB()
  return db.get('healthData', date)
}

export async function setHealthEntry(date, entry) {
  const db = await getDB()
  await db.put('healthData', { ...entry, date })
}

// APPLE-HEALTH: bulk read for Trends' sleep-architecture card — mirrors
// tags.js's getAllTags() shape exactly.
export async function getAllHealthData() {
  const db = await getDB()
  const rows = await db.getAll('healthData')
  const map = {}
  for (const row of rows) map[row.date] = row
  return map
}

// Same loading/unavailable/ready shape as useNightDetail (src/db/detail.js)
// — independent store, independent fetch, deliberately not sharing that
// hook's effect since nightDetail and healthData have nothing to do with
// each other beyond both being keyed by date.
export function useHealthEntry(date) {
  const [status, setStatus] = useState('loading') // 'loading' | 'unavailable' | 'ready'
  const [entry, setEntry] = useState(null)
  useEffect(() => {
    if (!date) { setStatus('unavailable'); setEntry(null); return }
    let cancelled = false
    setStatus('loading')
    getHealthEntry(date).then((row) => {
      if (cancelled) return
      if (!row) { setStatus('unavailable'); setEntry(null); return }
      setEntry(row)
      setStatus('ready')
    })
    return () => { cancelled = true }
  }, [date])
  return { status, entry }
}
