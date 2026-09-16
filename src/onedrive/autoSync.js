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
import { isSignedIn, completeSignIn } from './graphClient.js'
import { fetchOneDriveFiles } from './oneDriveImport.js'
import { pushBackupToOneDrive } from './oneDriveBackup.js'
import { runImportPipeline } from '../import/runImportPipeline.js'
import { getMeta, setMeta } from '../db/meta.js'
import { getExistingDetailDates, DETAIL_SCHEMA_VERSION } from '../db/detail.js'
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
  await new Promise((resolve, reject) => {
    runImportPipeline(files, {
      sourceLabel: 'your OneDrive sync folder',
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

  if (!(await withinCooldown('lastOneDriveSyncAt', SYNC_COOLDOWN_MS))) {
    // Stamped before the attempt, not after - closes a real (if narrow)
    // window where a second rapid app open during a slow sync could start
    // a concurrent second one, and matches the "cooldown on attempt, not
    // on outcome" reasoning above.
    await setMeta('lastOneDriveSyncAt', new Date().toISOString())
    try {
      await syncNewNightsFromOneDrive(oneDriveBasePath)
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
