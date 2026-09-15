// ONEDRIVE — pushes AirTrace's own local backup file (the same data the
// Settings screen's manual "Export backup" button produces) up to
// OneDrive automatically, so a lost/wiped phone doesn't lose this history
// for anyone who has OneDrive Sync turned on. Additive only — the manual
// Export/Restore flow in SettingsScreen.jsx is completely untouched and
// keeps working exactly the same for everyone, OneDrive-enabled or not.
// Called from onedrive/autoSync.js as the second half of its once-daily
// routine; see docs/wifi-sd-sync.md (gitignored) for the full background.
import { buildBackup } from '../db/backup.js'
import { uploadFile } from './graphClient.js'

// A single fixed filename, overwritten every run — this is a safety-net
// restore point, not a version history, so there's no reason to accumulate
// dated snapshots. Lives in its own subfolder under the OneDrive Sync base
// path, deliberately separate from CardSync's own DATALOG/STR.edf mirror
// at that same base path, so the two tools' files never get mixed together.
const BACKUP_SUBFOLDER = 'AirTrace Backups'
const BACKUP_FILENAME = 'airtrace-backup-latest.json'

export async function pushBackupToOneDrive(basePath) {
  const data = await buildBackup()
  const path = `${basePath}/${BACKUP_SUBFOLDER}/${BACKUP_FILENAME}`
  await uploadFile(path, JSON.stringify(data, null, 2), 'application/json')
}
