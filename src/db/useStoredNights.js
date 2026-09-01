import { useState, useEffect, useCallback } from 'react'
import { getAllSummaries } from './nights.js'
import { getAllTags, setTag } from './tags.js'
import { getMeta } from './meta.js'

// Replaces the old useMockData() — same idea (App.jsx's merge logic
// downstream doesn't need to change), but reading real IndexedDB-backed
// data instead of generating synthetic nights. status distinguishes
// "still loading" from "loaded, but nothing imported yet" so App.jsx can
// show a real first-run prompt instead of an empty Today screen.
export function useStoredNights() {
  const [status, setStatus] = useState('loading') // 'loading' | 'empty' | 'ready'
  const [rawNights, setRawNights] = useState([])
  const [tagLog, setTagLogState] = useState({})
  const [tagStartDate, setTagStartDate] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const [summaries, tags, startDate] = await Promise.all([
        getAllSummaries(), getAllTags(), getMeta('tagStartDate'),
      ])
      if (cancelled) return
      setRawNights(summaries)
      setTagLogState(tags)
      setTagStartDate(startDate || null)
      setStatus(summaries.length === 0 ? 'empty' : 'ready')
    }
    load()
    return () => { cancelled = true }
  }, [reloadKey])

  // Call after an import completes (ImportScreen writes directly to
  // IndexedDB — this hook has no way to know that happened on its own).
  const refresh = useCallback(() => setReloadKey((k) => k + 1), [])

  const saveTagEntry = useCallback(async (date, entry) => {
    await setTag(date, entry)
    setTagLogState((log) => ({ ...log, [date]: { ...entry, date } }))
  }, [])

  return { status, rawNights, tagLog, tagStartDate, saveTagEntry, refresh }
}
