// ONEDRIVE — the "zero touch" piece: once CardSync's own scheduled task
// has backed a night up to OneDrive, this is what pulls it into AirTrace
// without the user ever opening the Import screen. Called once from
// App.jsx's mount effect; see docs/wifi-sd-sync.md (gitignored) for the
// full background and docs/onedrive-auto-sync.md-equivalent context in
// the airtrace-next-up memory this was planned from.
//
// Two independent daily steps, each gated on its OWN success timestamp
// rather than a shared "did we attempt this today" marker — gating on
// success (not attempt) means a failed step never gets stamped, so it
// naturally retries on the very next app open rather than sitting stuck
// until the next calendar day. The two steps don't share one gate either:
// if the sync succeeds today but the backup push fails, the next app open
// retries only the push, not both.
import { isSignedIn, completeSignIn } from './graphClient.js'
import { fetchOneDriveFiles } from './oneDriveImport.js'
import { pushBackupToOneDrive } from './oneDriveBackup.js'
import { runImportPipeline } from '../import/runImportPipeline.js'
import { getMeta, setMeta } from '../db/meta.js'
import { getExistingDetailDates, DETAIL_SCHEMA_VERSION } from '../db/detail.js'
import { toDateStr } from '../utils/dates.js'

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
  await new Promise((resolve, reject) => {
    runImportPipeline(files, {
      sourceLabel: 'your OneDrive backup',
      source: 'onedrive',
      callbacks: {
        // onComplete fires on a genuine 'done', even if some individual
        // nights had problems (those are reported separately via onError
        // right after, same as a manual sync) - resolve() wins over a
        // later reject() from that informational-only error, a promise
        // can only settle once. Only the true early-abort paths (no
        // files, no STR.edf, a worker-level error) call onError without
        // ever calling onComplete first, and those should genuinely count
        // as a failed attempt for gating purposes.
        onComplete: () => resolve(),
        onError: (message) => reject(new Error(message)),
      },
    })
  })
}

export async function maybeAutoSyncFromOneDrive({ oneDriveSyncEnabled, oneDriveBasePath }) {
  if (!oneDriveSyncEnabled) return

  // Safe to call unconditionally - a no-op unless this load happens to be
  // the return trip from a Microsoft redirect (matches both screens' own
  // pattern for this).
  await completeSignIn()

  // Auto-sync must NEVER trigger signIn()'s full-page redirect on its own
  // - sending the user to a Microsoft login page the instant they open the
  // app, unprompted, would be a genuinely bad surprise. If the session's
  // expired, this just quietly skips until they next sign in manually via
  // the Import screen's own button.
  if (!isSignedIn()) return

  if (!(await attemptedToday('lastOneDriveSyncAt'))) {
    try {
      await syncNewNightsFromOneDrive(oneDriveBasePath)
      await setMeta('lastOneDriveSyncAt', new Date().toISOString())
    } catch (err) {
      // Silently swallowed - no error UI on app open. The manual "Sync
      // now" button on the Import screen remains the user-visible way to
      // force/retry a sync right now regardless. Logged so it's still
      // visible in devtools while debugging.
      console.error('Auto-sync from OneDrive failed:', err)
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
