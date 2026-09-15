// Shared by every import source - physical card (ImportScreen's file
// picker), manual OneDrive sync, and automatic OneDrive auto-sync
// (onedrive/autoSync.js) all converge here once they've each produced the
// same File-shaped array, so grouping, the retention cutoff, worker
// orchestration and persistence are all one code path regardless of where
// the files actually came from or whether a human is watching it run.
//
// Extracted out of ImportScreen.jsx (which used to call setState directly
// throughout) so App.jsx's background auto-sync can drive the exact same
// pipeline without mounting that screen at all - callers pass their own
// `callbacks`, all optional, in place of setState calls. ImportScreen
// passes its real setters; autoSync.js passes none (or just onWorkerReady,
// if it ever needs to cancel on unmount).
import { groupImportFiles } from '../edf/groupImportFiles.js'
import { upsertSummaries } from '../db/nights.js'
import { upsertDetail, pruneOlderThan, getExistingDetailDates, DETAIL_SCHEMA_VERSION } from '../db/detail.js'
import { getMeta, setMeta } from '../db/meta.js'
import { toDateStr } from '../utils/dates.js'
import { computeRetentionCutoff } from '../utils/retentionWindow.js'

export async function runImportPipeline(files, { sourceLabel = 'the selected folder', source, callbacks = {} } = {}) {
  const {
    onError,              // (message) => void
    onStageChange,        // (stage) => void - 'reading'|'summaries'|'waveform'|'pruning'|'done'|'idle'
    onWaveformProgress,    // (done, total) => void
    onImportSourceChange,  // (source|null) => void
    onDetailCountChange,   // (count) => void
    onComplete,            // (record, newHistory) => void - fired once, right before the final onStageChange('done')
    onWorkerReady,         // (worker) => void - fired synchronously the moment the worker is created, so a caller that needs to cancel/cleanup (ImportScreen) can stash a reference
  } = callbacks

  if (files.length === 0) {
    onError?.(`No files were found in ${sourceLabel} — please let Claude know this happened so it can be investigated further.`)
    return
  }

  const { strFile, nightFolders, incompleteFolders } = groupImportFiles(files)
  if (!strFile) {
    const sample = files.slice(0, 6).map((f) => f.webkitRelativePath).join(', ')
    onError?.(`Couldn't find STR.edf in ${sourceLabel} — the root should contain STR.edf and DATALOG together. Found ${files.length} file(s). Sample paths: ${sample || '(none)'}`)
    return
  }

  // Only ever parse full waveform detail for nights inside the retention
  // window - see computeRetentionCutoff's own comment. STR.edf is parsed
  // here, on the main thread, purely to compute that cutoff before deciding
  // which DATALOG folders are even worth handing to the worker; the worker
  // re-parses it a moment later as part of its own normal pipeline.
  let cutoff
  try {
    const strBufferForCutoff = await strFile.arrayBuffer()
    cutoff = computeRetentionCutoff(strBufferForCutoff).cutoff
  } catch (err) {
    onError?.(`Couldn't read STR.edf: ${err.message}`)
    return
  }
  const inWindowFolders = nightFolders.filter((n) => n.date >= cutoff)
  const incompleteInWindow = incompleteFolders.filter((f) => f.date >= cutoff)

  const startedAt = Date.now()
  onWaveformProgress?.(0, 0)
  onImportSourceChange?.(source)
  onStageChange?.('reading')

  const storedSchemaVersion = await getMeta('detailSchemaVersion')
  const skipDates = storedSchemaVersion === DETAIL_SCHEMA_VERSION ? [...await getExistingDetailDates()] : []
  const worker = new Worker(new URL('../edf/importWorker.js', import.meta.url), { type: 'module' })
  onWorkerReady?.(worker)

  let summaries = null

  // Deliberately NOT awaited to full completion - this function's own
  // returned promise resolves right after postMessage below, same as the
  // original inline version did (the worker keeps running in the
  // background; everything from here on is reported via the callbacks
  // below, not via this function's return). ImportScreen's own timing for
  // oneDriveSyncing/oneDriveParsing's handoff depends on this exact
  // behavior - see its own comments. A caller that genuinely needs to
  // await true completion (autoSync.js) wraps its own Promise around the
  // onComplete/onError callbacks instead of relying on this function's own
  // returned promise.
  worker.onmessage = async (evt) => {
    const msg = evt.data
    if (msg.type === 'progress') {
      onStageChange?.(msg.stage)
      onWaveformProgress?.(msg.waveformDone, msg.waveformTotal)
      return
    }
    if (msg.type === 'summaries') {
      summaries = msg.summaries
      return
    }
    if (msg.type === 'nightResult') {
      // Persisted one night at a time as it arrives, instead of held in
      // memory for the whole import - this is what actually fixes the
      // memory-pressure crash, not just the retention-window filter above.
      await upsertDetail([{ date: msg.date, ...msg.night }])
      return
    }
    if (msg.type === 'error') {
      onError?.(msg.message)
      onStageChange?.('idle')
      onImportSourceChange?.(null)
      worker.terminate()
      return
    }
    if (msg.type === 'done') {
      onStageChange?.('pruning')
      await upsertSummaries(summaries)
      // Reuses the exact same cutoff computed above (not recomputed as a
      // day count) - what got parsed and what gets kept need to agree on
      // the identical boundary, or a folder just parsed could get
      // immediately pruned back out again.
      const pruned = await pruneOlderThan(cutoff)
      onDetailCountChange?.((await getExistingDetailDates()).size)

      // Tagging start point per CLAUDE.md: set exactly once, the moment
      // the *first ever* import completes - never recomputed after that.
      const existingTagStart = await getMeta('tagStartDate')
      if (!existingTagStart) await setMeta('tagStartDate', toDateStr(new Date()))
      await setMeta('detailSchemaVersion', DETAIL_SCHEMA_VERSION)

      const elapsedMs = Date.now() - startedAt
      const mins = Math.floor(elapsedMs / 60000), secs = Math.round((elapsedMs % 60000) / 1000)
      const durationStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
      const dateStr = new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
      const foldersFound = nightFolders.length + incompleteFolders.length
      const record = { date: dateStr, nightsAdded: msg.addedCount, pruned, duration: durationStr, foldersFound }

      // Read fresh from meta rather than requiring the caller to pass its
      // own copy of `history` in - a background caller (autoSync.js) has
      // no live component state to hand over, and this is the same data
      // either way.
      const existingHistory = (await getMeta('importHistory')) || []
      const newHistory = [{ date: dateStr, nights: `${msg.addedCount} night${msg.addedCount === 1 ? '' : 's'}` }, ...existingHistory]

      await setMeta('lastImport', record)
      await setMeta('importHistory', newHistory)
      onComplete?.(record, newHistory)

      // Two distinct failure classes, worth telling apart rather than
      // merging into one message: parse errors vs. incomplete folders
      // (caught before parsing is even attempted, see groupImportFiles.js).
      const problems = []
      if (msg.errors.length) problems.push(`${msg.errors.length} night(s) failed to parse: ${msg.errors.map((e) => `${e.date} (${e.message})`).join('; ')}`)
      if (incompleteInWindow.length) problems.push(`${incompleteInWindow.length} night(s) on the card are missing required files, so they can't be imported: ${incompleteInWindow.map((f) => `${f.date} (no ${f.missing.join('/')})`).join('; ')}`)
      if (problems.length) onError?.(problems.join(' — '))

      worker.terminate()
      onStageChange?.('done')
    }
  }
  worker.postMessage({ strFile, nightFolders: inWindowFolders, skipDates })
}
