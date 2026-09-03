import { getAllSummaries, upsertSummaries } from './nights.js'
import { getAllTags, setTag } from './tags.js'
import { getAllMeta, setMeta } from './meta.js'

// Deliberately scoped to nightSummaries + tags + meta — NOT nightDetail
// (the per-night waveform/event cache). nightDetail is large (90 days
// of ~25Hz Flow/Pressure samples) and, unlike the other three stores,
// fully re-derivable by re-importing the same SD card — it's a cache,
// not a record. tags has zero source outside this app (nothing on the
// card could ever reconstruct a logged "Alcohol" night); nightSummaries
// technically could be re-pulled from STR.edf too, but only by redoing
// the SD-card import from scratch, which is exactly the friction a
// backup exists to avoid. meta covers everything hand-entered that
// isn't on the card either (targets, equipment/maintenance dates,
// patient profile, tagStartDate, themeMode).
export const BACKUP_VERSION = 1

export async function buildBackup() {
  const [nightSummaries, tags, meta] = await Promise.all([
    getAllSummaries(), getAllTags(), getAllMeta(),
  ])
  return {
    app: 'AirTrace',
    kind: 'backup',
    backupVersion: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    nightSummaries,
    tags: Object.values(tags),
    meta,
  }
}

// Throws a descriptive Error on anything that doesn't look like a real
// AirTrace backup — callers show err.message directly, so these are
// written as user-facing sentences, not developer shorthand.
export function parseBackup(jsonText) {
  let data
  try {
    data = JSON.parse(jsonText)
  } catch {
    throw new Error("That file isn't valid JSON — is it really an AirTrace backup file?")
  }
  if (!data || data.app !== 'AirTrace' || data.kind !== 'backup') {
    throw new Error("That doesn't look like an AirTrace backup file.")
  }
  if (typeof data.backupVersion !== 'number' || data.backupVersion > BACKUP_VERSION) {
    throw new Error('This backup was made by a newer version of AirTrace than this one supports — update the app first.')
  }
  if (!Array.isArray(data.nightSummaries) || !Array.isArray(data.tags) || !Array.isArray(data.meta)) {
    throw new Error('That backup file looks corrupted — one or more sections are missing.')
  }
  return data
}

// Upserts only — never deletes. Restoring an older backup onto a phone
// that already has newer nights/tags recorded since then adds/overwrites
// by date or key, but never wipes anything the backup doesn't mention.
export async function restoreBackup(data) {
  await Promise.all([
    upsertSummaries(data.nightSummaries),
    ...data.tags.map((t) => setTag(t.date, t)),
    ...data.meta.map((m) => setMeta(m.key, m.value)),
  ])
  return { nights: data.nightSummaries.length, tags: data.tags.length, meta: data.meta.length }
}
