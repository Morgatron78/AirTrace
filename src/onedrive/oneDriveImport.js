// Fetches the same STR.edf + DATALOG structure a physical SD card import
// would, but from OneDrive via Graph API instead - the two paths converge
// on identical File-shaped objects, so groupImportFiles.js and the import
// worker need no knowledge of where the data actually came from.
import { listFolder, downloadFile } from './graphClient'
import { computeRetentionCutoff } from '../utils/retentionWindow.js'

// File's constructor doesn't accept webkitRelativePath, and the property
// is read-only on real picker-provided Files - Object.defineProperty is
// what lets a synthesized File claim one anyway, the same way a couple of
// other CPAP-parsing libraries do this exact trick for testing.
//
// AIRTRACE-FIX: groupImportFiles.js's DATALOG regex (\/DATALOG\/...) has
// no start-of-string alternation the way its STR.edf regex does - it
// requires an actual "/" before "DATALOG", which only exists on a real
// picker's path because webkitdirectory always prefixes every entry with
// the selected root folder's own name (e.g. "SDCARD/DATALOG/..."). A bare
// "DATALOG/20260531/..." (no such prefix) silently matched nothing at
// all - confirmed live: a real ~100-night fetch completed successfully
// but groupImportFiles reported 0 DATALOG folders every time, because
// every single file this function produced was being dropped by that
// regex. ONEDRIVE_ROOT_LABEL below stands in for the picker's root
// folder name so the two paths are shaped identically.
const ONEDRIVE_ROOT_LABEL = 'OneDrive'
function toFile(buffer, relativePath) {
  const fullPath = `${ONEDRIVE_ROOT_LABEL}/${relativePath}`
  const name = relativePath.split('/').pop()
  const file = new File([buffer], name)
  Object.defineProperty(file, 'webkitRelativePath', { value: fullPath, writable: false })
  return file
}

// basePath: the OneDrive folder matching CardSync's own BackupDest
// (e.g. "CPAP backup") - same layout CardSync itself writes, so this is
// always reading whatever CardSync's most recent run last backed up.
//
// skipDates: ISO dates (YYYY-MM-DD) already imported - same pattern
// ImportScreen.jsx's own skipDates already uses for the physical-card
// path, so a night imported once via either path is never re-fetched by
// the other. Only ever lists/downloads DATALOG folders inside the same
// used-nights retention window the physical import already enforces -
// deliberately never the full history in one go, same reasoning as
// CardSync's own --recent default (see docs/wifi-sd-sync.md, gitignored).
export async function fetchOneDriveFiles(basePath, { skipDates = [], onProgress } = {}) {
  onProgress?.({ stage: 'str' })
  const strBuffer = await downloadFile(`${basePath}/STR.edf`)
  const strFile = toFile(strBuffer, 'STR.edf')

  const { cutoff } = computeRetentionCutoff(strBuffer)

  onProgress?.({ stage: 'listing' })
  const dateEntries = await listFolder(`${basePath}/DATALOG`)
  const dateFolders = dateEntries
    .filter((e) => e.folder && /^\d{8}$/.test(e.name))
    .map((e) => e.name)
    .sort()

  const files = [strFile]
  const inWindow = dateFolders.filter((f) => {
    const iso = `${f.slice(0, 4)}-${f.slice(4, 6)}-${f.slice(6, 8)}`
    return iso >= cutoff && !skipDates.includes(iso)
  })

  // AIRTRACE-FIX: was one night at a time, fully serial - confirmed live
  // against a real ~100-night backlog that this took several minutes with
  // the UI showing nothing but a bare spinner the whole time. Each night
  // is still its own small handful of sequential per-file requests (that
  // part's cheap - only a few files), but NIGHT_CONCURRENCY nights now run
  // at once. onProgress fires as each night actually finishes downloading,
  // not as it starts, so the count the UI shows only ever grows.
  // AIRTRACE-FIX: was 3 - confirmed live (twice, on a real device) that
  // this was enough to trigger real Graph API 429 throttling partway
  // through a ~100-night sync. graphClient.js's shared cooldown now
  // handles a 429 correctly when one happens, but a lower concurrency
  // also just means one happens less often in the first place.
  const NIGHT_CONCURRENCY = 2
  let completed = 0
  onProgress?.({ stage: 'nights', done: 0, total: inWindow.length })

  async function fetchNight(dateFolder) {
    const nightEntries = await listFolder(`${basePath}/DATALOG/${dateFolder}`)
    const nightFiles = []
    for (const entry of nightEntries) {
      if (entry.folder) continue
      const buffer = await downloadFile(`${basePath}/DATALOG/${dateFolder}/${entry.name}`)
      nightFiles.push(toFile(buffer, `DATALOG/${dateFolder}/${entry.name}`))
    }
    return nightFiles
  }

  let nextIndex = 0
  async function worker() {
    while (nextIndex < inWindow.length) {
      const dateFolder = inWindow[nextIndex++]
      const nightFiles = await fetchNight(dateFolder)
      files.push(...nightFiles)
      completed++
      onProgress?.({ stage: 'nights', done: completed, total: inWindow.length, date: dateFolder })
    }
  }
  await Promise.all(Array.from({ length: Math.min(NIGHT_CONCURRENCY, inWindow.length) }, worker))

  return files
}
