// Verifies src/edf/* against the real SD card data at Sample_CPAP_Data/
// (gitignored — never committed; see CLAUDE.md). Not part of the shipped
// app — run manually with `node scripts/verify-edf-parser.mjs` whenever
// the parser changes or new sample data is added.
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { parseSummaries } from '../src/edf/parseSummaries.js'
import { parseNight } from '../src/edf/parseNight.js'

const ROOT = join(import.meta.dirname, '..', 'Sample_CPAP_Data')

function toArrayBuffer(nodeBuffer) {
  // Node Buffers can be views into a pooled, larger ArrayBuffer — slice
  // out exactly this buffer's own bytes rather than assuming .buffer is
  // already the right size.
  return nodeBuffer.buffer.slice(nodeBuffer.byteOffset, nodeBuffer.byteOffset + nodeBuffer.byteLength)
}
function readAB(path) {
  return toArrayBuffer(readFileSync(path))
}

let failures = 0
function fail(msg) { failures++; console.log('  \x1b[31mFAIL:\x1b[0m', msg) }
function warn(msg) { console.log('  \x1b[33mWARN:\x1b[0m', msg) }
function ok(msg) { console.log('  \x1b[32mOK:\x1b[0m', msg) }

console.log('=== STR.edf ===')
const strPath = join(ROOT, 'STR.edf')
if (!existsSync(strPath)) {
  console.log('No STR.edf at', strPath, '- skipping. See CLAUDE.md for the expected Sample_CPAP_Data/ layout.')
  process.exit(1)
}
const summaries = parseSummaries(readAB(strPath))
console.log(`Parsed ${summaries.length} daily records ` +
  `(${summaries[0].date} .. ${summaries[summaries.length - 1].date})`)

const usedDays = summaries.filter((s) => !s.noUsage)
const noUsageDays = summaries.length - usedDays.length
console.log(`  ${usedDays.length} days with usage, ${noUsageDays} no-usage/sentinel days`)

// Sanity: every date should be a plausible calendar date, strictly
// increasing by one day per record, and the very last record (today's
// not-yet-recorded day) should be a real sentinel -1 no-usage day.
let datesOk = true
for (let i = 1; i < summaries.length; i++) {
  const prev = new Date(`${summaries[i - 1].date}T00:00:00Z`)
  const cur = new Date(`${summaries[i].date}T00:00:00Z`)
  if ((cur - prev) !== 86400000) { fail(`date gap between record ${i - 1} (${summaries[i - 1].date}) and ${i} (${summaries[i].date})`); datesOk = false }
}
if (datesOk) ok(`all ${summaries.length} dates are consecutive with no gaps`)
const last = summaries[summaries.length - 1]
const today = new Date().toISOString().slice(0, 10)
if (last.date === today && last.noUsage) ok(`last record (${last.date}) is today and correctly flagged no-usage`)
else warn(`last record is ${last.date} (today is ${today}), noUsage=${last.noUsage} — expected today, no-usage`)

console.log('\nMost recent 6 days:')
for (const s of summaries.slice(-6)) {
  if (s.noUsage) { console.log(`  ${s.date}  (no usage)`); continue }
  console.log(`  ${s.date}  AHI ${s.ahi.toFixed(1)}  (obs ${s.obstructive.toFixed(1)} cen ${s.central.toFixed(1)} hyp ${s.hypopnea.toFixed(1)})  ` +
    `usage ${s.usage.toFixed(1)}h  startHour ${s.startHour.toFixed(2)}  leak ${s.leak}  maskOff ${s.maskOff}  seal ${s.seal}`)
}

console.log('\n=== DATALOG nights ===')
const datalogDir = join(ROOT, 'DATALOG')
const nightDirs = existsSync(datalogDir) ? readdirSync(datalogDir).filter((n) => /^\d{8}$/.test(n)).sort() : []
if (nightDirs.length === 0) console.log('No DATALOG/YYYYMMDD folders found.')

const allUnmapped = new Set()
for (const dayFolder of nightDirs) {
  const dir = join(datalogDir, dayFolder)
  const files = readdirSync(dir)
  const find = (suffix) => files.find((f) => f.endsWith(suffix))
  const brpFile = find('_BRP.edf'), pldFile = find('_PLD.edf'), eveFile = find('_EVE.edf'), cslFile = find('_CSL.edf')
  console.log(`\n${dayFolder}:`)
  if (!brpFile || !pldFile || !eveFile) {
    const dateStr = `${dayFolder.slice(0, 4)}-${dayFolder.slice(4, 6)}-${dayFolder.slice(6, 8)}`
    const summary = summaries.find((s) => s.date === dateStr)
    if (files.length === 0 && summary?.noUsage) { console.log('  (empty folder — expected, STR.edf agrees this day has no usage yet)'); continue }
    fail(`missing expected file(s) in ${dir}`)
    continue
  }

  const night = parseNight({
    brp: readAB(join(dir, brpFile)),
    pld: readAB(join(dir, pldFile)),
    eve: readAB(join(dir, eveFile)),
    csl: cslFile ? readAB(join(dir, cslFile)) : undefined,
  })

  console.log(`  ${(night.totalNightSec / 3600).toFixed(2)}h recorded  ` +
    `flow=${night.detail.flow.length} pressure=${night.detail.pressure.length} ` +
    `leak=${night.detail.leak.length} respRate=${night.detail.respRate.length} ` +
    `tidalVolume=${night.detail.tidalVolume.length} minuteVent=${night.detail.minuteVent.length} ` +
    `snore=${night.detail.snore.length} flowLimit=${night.detail.flowLimit.length}`)

  const counts = { obstructive: 0, central: 0, hypopnea: 0 }
  for (const e of night.events) counts[e.type] = (counts[e.type] || 0) + 1
  console.log(`  ${night.events.length} events: obstructive=${counts.obstructive} central=${counts.central} hypopnea=${counts.hypopnea} ` +
    `(${(night.timeInApneaSec / 60).toFixed(1)} min total)`)
  for (const t of night.unmappedEventTypes) { fail(`unmapped event-type text: "${t}"`); allUnmapped.add(t) }

  // Cross-check against that same date's STR.edf summary — rates, not
  // raw counts, so compare the derived rate (count / recorded hours)
  // against STR's own OAI/CAI/HI with a tolerance rather than exact
  // equality (STR's own usage-hours denominator is computed onboard
  // from full-precision session data, ours from summed slot minutes).
  const dateStr = `${dayFolder.slice(0, 4)}-${dayFolder.slice(4, 6)}-${dayFolder.slice(6, 8)}`
  const summary = summaries.find((s) => s.date === dateStr)
  if (!summary) { warn(`no STR.edf record for ${dateStr} to cross-check against`); continue }
  const hours = night.totalNightSec / 3600
  const derivedRate = (key) => (counts[key] || 0) / hours
  const checks = [['obstructive', summary.obstructive], ['central', summary.central], ['hypopnea', summary.hypopnea]]
  for (const [key, strRate] of checks) {
    const derived = derivedRate(key)
    const diff = Math.abs(derived - strRate)
    if (diff > 1.5) fail(`${key}: EVE.edf-derived rate ${derived.toFixed(2)}/hr vs STR.edf ${strRate.toFixed(2)}/hr (diff ${diff.toFixed(2)})`)
    else ok(`${key}: EVE.edf-derived ${derived.toFixed(2)}/hr vs STR.edf ${strRate.toFixed(2)}/hr`)
  }
}

console.log(`\n=== ${failures === 0 ? 'PASS' : `${failures} FAILURE(S)`} ===`)
if (allUnmapped.size) console.log('Unmapped event-type strings seen:', [...allUnmapped])
process.exit(failures === 0 ? 0 : 1)
