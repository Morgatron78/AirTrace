// Turns the flat FileList a <input webkitdirectory> selection produces
// into { strFile, nightFolders } — the shape src/edf/importWorker.js
// expects. Matches the same DATALOG/YYYYMMDD/*_SUFFIX.edf structure
// scripts/verify-edf-parser.mjs already relies on (confirmed against
// real SD card data), just reading File.webkitRelativePath instead of
// the filesystem directly.
export function groupImportFiles(fileList) {
  const files = Array.from(fileList)
  const strFile = files.find((f) => /(^|\/)STR\.edf$/i.test(f.webkitRelativePath))

  // A single date folder can hold more than one session's files — e.g. the
  // main overnight session plus a brief few-second mask-contact ("fit
  // check") afterward, each with their own BRP/PLD timestamp-prefixed set.
  // Keeping the largest file per kind picks the real overnight session
  // over a tiny leftover one, regardless of which happens to sort last.
  const byFolder = new Map() // YYYYMMDD -> { brp, pld, eve, csl }
  for (const f of files) {
    const m = f.webkitRelativePath.match(/\/DATALOG\/(\d{8})\/[^/]+_(BRP|PLD|EVE|CSL)\.edf$/i)
    if (!m) continue
    const [, folder, kind] = m
    if (!byFolder.has(folder)) byFolder.set(folder, {})
    const bucket = byFolder.get(folder)
    const key = kind.toLowerCase()
    if (!bucket[key] || f.size > bucket[key].size) bucket[key] = f
  }

  // incompleteFolders: found on the card, but missing a required file —
  // previously dropped here with a silent `continue` and zero record of
  // why, which is exactly what let a real, permanent import gap hide
  // for months: these folders never appeared in nightFolders, so they
  // never got attempted, and never generated a parse error either. The
  // used-nights retention window (ImportScreen.jsx) is what finally
  // surfaced this — it reaches back far enough on a long-history card to
  // hit whichever dates this affects, where the old calendar-day window
  // usually didn't. Returned so the caller can tell the user which real
  // dates are affected and why, instead of an unexplained shortfall.
  const nightFolders = []
  const incompleteFolders = []
  for (const [folder, kinds] of byFolder) {
    const date = `${folder.slice(0, 4)}-${folder.slice(4, 6)}-${folder.slice(6, 8)}`
    const missing = ['brp', 'pld', 'eve'].filter((k) => !kinds[k])
    if (missing.length) { incompleteFolders.push({ date, missing }); continue } // csl is optional (a night with zero CSR events may lack a file... unconfirmed, kept lenient)
    nightFolders.push({ date, files: kinds })
  }
  nightFolders.sort((a, b) => (a.date < b.date ? -1 : 1))
  incompleteFolders.sort((a, b) => (a.date < b.date ? -1 : 1))

  return { strFile, nightFolders, incompleteFolders }
}
