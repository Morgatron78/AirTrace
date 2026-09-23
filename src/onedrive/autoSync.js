// ONEDRIVE — the "zero touch" piece: once CardSync's own scheduled task
// has backed a night up to OneDrive, this is what pulls it into AirTrace
// without the user ever opening the Import screen. Called once from
// App.jsx's mount effect; see docs/wifi-sd-sync.md (gitignored) for the
// full background and docs/onedrive-auto-sync.md-equivalent context in
// the airtrace-next-up memory this was planned from.
//
// Two independent steps with two different gating rules, not one shared
// rule - they turned out to need different things:
//
// - The OneDrive SYNC step is gated on a short, flat cooldown (stamped on
//   every attempt, success or failure), not a calendar day. AIRTRACE-FIX,
//   confirmed happening for real: the original once-a-day rule stamped
//   on success even when a check found nothing new, so an early app open
//   (before CardSync had actually pushed that night to OneDrive yet)
//   would silently block a real check for the rest of the day once real
//   data did land. A flat cooldown fixes that directly - short enough to
//   catch same-day data soon after it appears, long enough that a burst
//   of app opens/closes doesn't turn into a burst of Graph API calls.
//   (An earlier version of this fix tried "only stamp when something's
//   actually found" instead - that's broken with a short cooldown: on a
//   day nothing's ever found, that branch never stamps anything, so the
//   cooldown never engages and every single open re-checks regardless of
//   timing. Stamping on every attempt is what makes the cooldown actually
//   cooldown.)
// - The BACKUP PUSH step stays on the original once-a-day-on-success rule
//   - it always has *something* to push (whatever the current local data
//   is), so there's no "checked but found nothing" ambiguity the sync
//   step has, and once-a-day is a perfectly reasonable cap for it.
//
// AIRTRACE-FEATURE: once a real night has actually been found and
// imported today, the flat 5-minute cooldown above stops being useful -
// the AirSense only ever produces one real DATALOG folder per calendar
// day (see the noon-anchoring note in CLAUDE.md), so there's no
// realistic chance of a second "new" night appearing before tomorrow's
// session even starts. Confirmed as real clutter in practice: Import
// history filling up with "0 nights" entries every 5 minutes for the
// rest of a day that had already found its one real night hours
// earlier. lastOneDriveNightsFoundAt is stamped only when a sync
// actually adds ≥1 night, and gates on the same calendar-day comparison
// (attemptedToday) already proven correct for the backup-push step
// below - deliberately NOT a rolling 24-hour window, so a night found
// at 7am doesn't keep blocking a genuine check at 7pm the same day, and
// doesn't linger into the next morning either. The 5-minute cooldown
// stays exactly as-is for a day nothing's been found yet - this snooze
// only ever kicks in *after* a real success, never instead of the
// existing fast-retry behavior on an empty day.
import { isSignedIn, completeSignIn } from './graphClient.js'
import { fetchOneDriveFiles } from './oneDriveImport.js'
import { fetchLatestHealthExport } from './oneDriveHealthImport.js'
import { pushBackupToOneDrive } from './oneDriveBackup.js'
import { runImportPipeline } from '../import/runImportPipeline.js'
import { getMeta, setMeta } from '../db/meta.js'
import { getExistingDetailDates, DETAIL_SCHEMA_VERSION } from '../db/detail.js'
import { getAllSummaries } from '../db/nights.js'
import { setHealthEntry } from '../db/health.js'
import { matchHealthDataToNights } from '../health/matchNights.js'
import { toDateStr } from '../utils/dates.js'

// Deliberately short - real-world data volumes here are tiny (a night or
// two at most), so the risk of actually hitting Graph API's own rate
// limits from this is negligible; the existing shared-throttle/retry
// logic in graphClient.js handles a real 429 gracefully regardless.
const SYNC_COOLDOWN_MS = 5 * 60 * 1000

const withinCooldown = async (metaKey, cooldownMs) => {
  const last = await getMeta(metaKey)
  return last && (Date.now() - new Date(last).getTime()) < cooldownMs
}

const attemptedToday = async (metaKey) => {
  const last = await getMeta(metaKey)
  return last && toDateStr(new Date(last)) === toDateStr(new Date())
}

// Wraps runImportPipeline's callback-based reporting in a real promise -
// it deliberately does NOT await full completion on its own (see its own
// comment), since ImportScreen's UI timing depends on that. A background
// caller with no UI to update needs the opposite: a way to know once the
// whole thing has genuinely finished, success or failure.
async function syncNewNightsFromOneDrive(oneDriveBasePath) {
  const storedSchemaVersion = await getMeta('detailSchemaVersion')
  const skipDates = storedSchemaVersion === DETAIL_SCHEMA_VERSION ? [...await getExistingDetailDates()] : []
  const files = await fetchOneDriveFiles(oneDriveBasePath, { skipDates })
  // AIRTRACE-FEATURE: resolves with the real nightsAdded count now
  // (previously just resolve(), the caller had no way to know whether
  // anything was actually found) - the new next-calendar-day snooze
  // below needs to know this to decide whether to stamp itself.
  return new Promise((resolve, reject) => {
    runImportPipeline(files, {
      sourceLabel: 'your OneDrive sync folder',
      source: 'onedrive',
      // AIRTRACE-FEATURE: `source` alone can't tell this apart from the
      // Import screen's own manual "Sync from OneDrive" button - both
      // pass source: 'onedrive'. `automatic` is the one thing genuinely
      // unique to this background trigger, so Import history can show
      // which entries never had a human involved at all.
      automatic: true,
      callbacks: {
        // onComplete fires on a genuine 'done', even if some individual
        // nights had problems (those are reported separately via onError
        // right after, same as a manual sync) - resolve() wins over a
        // later reject() from that informational-only error, a promise
        // can only settle once. Only the true early-abort paths (no
        // files, no STR.edf, a worker-level error) call onError without
        // ever calling onComplete first, and those should genuinely count
        // as a failed attempt for gating purposes.
        onComplete: (record) => resolve(record.nightsAdded),
        onError: (message) => reject(new Error(message)),
      },
    })
  })
}

// AIRTRACE-FEATURE: the Health Data counterpart to syncNewNightsFromOneDrive
// above - a separate personal upload tool, unrelated to CardSync, writes a
// Health-Data-Export-shaped JSON into OneDrive (see
// oneDriveHealthImport.js). Deliberately does NOT track "have I already
// processed this file" (by Graph item id, lastModifiedDateTime, or
// anything else) and just re-parses + re-matches on every cooldown-gated
// call - the obvious-looking "skip an unchanged file" optimization is
// actually unsafe here: a health export can land before that night's own
// CPAP data has been imported yet (the two automations run on
// independent schedules), and matchHealthDataToNights below silently
// finds nothing for a night it doesn't know about yet. Marking that
// file's identity as "done" at that point would permanently lose the
// health data for that night once the CPAP side finally catches up,
// since it would never be reconsidered. Safe to just redo the work every
// time instead: setHealthEntry overwrites idempotently by date, and the
// weight merge (matchNights.js/ImportScreen.jsx) is idempotent by
// timestamp, so reprocessing the same unchanged file repeatedly has no
// effect beyond one small, cheap Graph list+download - the same "re-derive
// what's new from current state, never from file identity" shape the CPAP
// sync above already relies on.
//
// getAllSummaries() (not App.jsx's own tag-enriched `nights`) is
// sufficient - matchHealthDataToNights only ever reads each night's
// date/noUsage/startHour/usage, all present on these raw rows, so there's
// no need to replicate App.jsx's tag-enrichment logic in this background
// context.
async function syncHealthDataFromOneDrive(oneDriveBasePath) {
  const result = await fetchLatestHealthExport(oneDriveBasePath)
  if (!result) return
  const nights = await getAllSummaries()
  const matched = matchHealthDataToNights(result.parsed, nights)
  await Promise.all(Object.entries(matched).map(([date, entry]) =>
    setHealthEntry(date, { ...entry, importedAt: new Date().toISOString() })))
  // Same whole-history-merge-by-timestamp fix as the manual Import Health
  // Data flow (ImportScreen.jsx) - a smaller/partial export landing here
  // must not silently shrink whatever weight history is already stored.
  if (result.parsed.weightReadings.length) {
    const existing = (await getMeta('weightReadings')) || []
    const byTs = new Map([...existing, ...result.parsed.weightReadings].map((r) => [r.ts, r]))
    await setMeta('weightReadings', [...byTs.values()].sort((a, b) => a.ts - b.ts))
  }
}

export async function maybeAutoSyncFromOneDrive({ oneDriveSyncEnabled, oneDriveBasePath }) {
  if (!oneDriveSyncEnabled) return

  // Safe to call unconditionally - a no-op unless this load happens to be
  // the return trip from a Microsoft redirect (matches both screens' own
  // pattern for this).
  const justSignedIn = await completeSignIn()

  // Auto-sync must NEVER trigger signIn()'s full-page redirect on its own
  // - sending the user to a Microsoft login page the instant they open the
  // app, unprompted, would be a genuinely bad surprise. If the session's
  // expired, this just quietly skips until they next sign in manually via
  // the Import screen's own button.
  if (!isSignedIn()) return

  // See the top-of-file AIRTRACE-FEATURE note for why this comes first -
  // once today's real night has already been found, nothing below this
  // point should run at all, regardless of the cooldown.
  const foundNightsToday = await attemptedToday('lastOneDriveNightsFoundAt')

  // AIRTRACE-FIX: confirmed happening for real - the cooldown below is
  // stamped *before* the attempt (see its own comment), so a session whose
  // cached token had genuinely expired hits getAccessToken()'s own
  // acquireTokenRedirect() fallback mid-attempt, which navigates the whole
  // page away to Microsoft and back. lastOneDriveSyncAt survives that
  // reload (it's in IndexedDB, not memory) even though the attempt itself
  // never got anywhere near finishing, so the real retry on return found
  // itself still "within cooldown" from the interrupted one and silently
  // skipped - the user saw the Microsoft login flash by, the app reload,
  // and then nothing. justSignedIn (this load IS that exact return trip)
  // bypasses the cooldown for this one call, since it's the direct
  // continuation of the attempt that got cut off, not a new trigger.
  if (!foundNightsToday && (justSignedIn || !(await withinCooldown('lastOneDriveSyncAt', SYNC_COOLDOWN_MS)))) {
    // Stamped before the attempt, not after - closes a real (if narrow)
    // window where a second rapid app open during a slow sync could start
    // a concurrent second one, and matches the "cooldown on attempt, not
    // on outcome" reasoning above.
    await setMeta('lastOneDriveSyncAt', new Date().toISOString())
    try {
      const nightsAdded = await syncNewNightsFromOneDrive(oneDriveBasePath)
      // AIRTRACE-FIX: lastOneDriveSyncAt (above) is stamped on every
      // attempt, success or failure - that's deliberate, the cooldown
      // needs it. But Settings' own "Last auto-synced" label was reading
      // that same field as if it only meant success (its own comment said
      // so outright), which is wrong - confirmed live: a genuine silent
      // failure still showed "Last auto-synced today," with nothing
      // actually imported and no way to tell why. A separate field for
      // "last time this genuinely succeeded" is what that label should
      // actually read.
      await setMeta('lastOneDriveSyncSuccessAt', new Date().toISOString())
      await setMeta('lastOneDriveSyncError', null)
      if (nightsAdded > 0) await setMeta('lastOneDriveNightsFoundAt', new Date().toISOString())
    } catch (err) {
      // AIRTRACE-FIX: previously silently swallowed to devtools-only
      // console.error - no way to see it on a real device with no remote
      // debugging attached. Still no intrusive error UI on app open (that
      // stays a deliberate choice - a background check failing shouldn't
      // interrupt opening the app), but now recorded somewhere Settings
      // can actually show it, instead of only ever reaching a console
      // nobody's watching.
      console.error('Auto-sync from OneDrive failed:', err)
      await setMeta('lastOneDriveSyncError', err.message || String(err))
    }
  }

  // Own independent cooldown, not shared with lastOneDriveSyncAt above -
  // this is a completely separate Graph list+download against a different
  // folder, for a different purpose, and shouldn't gate (or be gated by)
  // the CPAP sync's own timing.
  if (!(await withinCooldown('lastHealthAutoSyncAt', SYNC_COOLDOWN_MS))) {
    await setMeta('lastHealthAutoSyncAt', new Date().toISOString())
    try {
      await syncHealthDataFromOneDrive(oneDriveBasePath)
      // Same "attempt vs. success" distinction as lastOneDriveSyncAt/
      // lastOneDriveSyncSuccessAt above - lastHealthAutoSyncAt alone is
      // stamped on every attempt (needed for the cooldown), so Settings'
      // own "last synced" label needs a separate field that only moves on
      // a genuine success, or it could read "synced just now" on an
      // attempt that actually failed.
      await setMeta('lastHealthAutoSyncSuccessAt', new Date().toISOString())
      await setMeta('lastHealthAutoSyncError', null)
    } catch (err) {
      // Same "record it somewhere Settings can show, don't interrupt app
      // open" stance as the CPAP sync's own error handling above.
      console.error('Auto-sync of Health data from OneDrive failed:', err)
      await setMeta('lastHealthAutoSyncError', err.message || String(err))
    }
  }

  if (!(await attemptedToday('lastOneDriveBackupPush'))) {
    try {
      await pushBackupToOneDrive(oneDriveBasePath)
      await setMeta('lastOneDriveBackupPush', new Date().toISOString())
    } catch (err) {
      console.error('Auto-backup push to OneDrive failed:', err)
    }
  }
}
