// ONEDRIVE — the zero-touch counterpart to oneDriveImport.js, for the
// separate Health Data automation (a personal REST-API upload tool,
// unrelated to CardSync/AirBridge) that writes an Apple-Health-Data-Export-
// shaped JSON file into OneDrive alongside the CPAP data. Far simpler than
// oneDriveImport.js's own fetchOneDriveFiles: no folder-of-folders walk,
// no synthesizing File objects for groupImportFiles.js to regroup - just
// one subfolder holding plain JSON files, pick the newest, parse it.
//
// The subfolder name is fixed, not a Settings field - the user's own
// upload tool is configured to always write relative to whatever
// oneDriveBasePath is already set (the same base CardSync's own
// OneDriveSyncDest writes CPAP data to), so there's nothing here for a
// user to misconfigure independently.
import { listFolder, downloadFile } from './graphClient'
import { parseHealthExport } from '../health/parseHealthExport.js'

const HEALTH_SUBFOLDER = 'AirTrace Health Exports'

// Returns null for "nothing to import right now" - the folder not
// existing yet (the upload tool has never run) and the folder being empty
// are both that, not errors. A real Graph/parse failure still throws, so
// the caller's own try/catch can distinguish "quietly nothing yet" from
// "something's actually wrong."
export async function fetchLatestHealthExport(basePath) {
  const path = `${basePath}/${HEALTH_SUBFOLDER}`
  let entries
  try {
    entries = await listFolder(path)
  } catch {
    return null
  }
  const jsonFiles = entries.filter((e) => e.file && e.name.toLowerCase().endsWith('.json'))
  if (!jsonFiles.length) return null
  // Same "newest wins" rule as ImportScreen.jsx's own manual folder
  // picker (there: each File's own lastModified; here: the equivalent
  // Graph driveItem field) - one convention for "which export is current"
  // regardless of which of the two paths picked it up.
  const newest = jsonFiles.reduce((a, b) =>
    new Date(b.lastModifiedDateTime) > new Date(a.lastModifiedDateTime) ? b : a)
  const buffer = await downloadFile(`${path}/${newest.name}`)
  const json = JSON.parse(new TextDecoder().decode(buffer))
  return { name: newest.name, parsed: parseHealthExport(json) }
}
