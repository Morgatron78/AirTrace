// Extracted from ImportScreen.jsx's own onFilesSelected, which had this
// inline before OneDrive import needed the identical logic too - both
// paths need to agree on the exact same cutoff date, or nights parsed by
// one path could get pruned straight back out by the other's own import.
import { parseSummaries } from '../edf/parseSummaries.js'
import { toDateStr } from './dates.js'

// Nights actually used, not calendar days — a calendar-day cutoff quietly
// delivers fewer than its own promised number for anyone who doesn't use
// the machine every single night (confirmed by a real user: 76 real
// nights inside what a 90-*day* window would have called "90 days").
export const RETENTION_USED_NIGHTS = 90

// strBuffer: STR.edf's raw ArrayBuffer, from whichever source (physical
// card or OneDrive) - parsing is identical either way.
export function computeRetentionCutoff(strBuffer) {
  const summaries = parseSummaries(strBuffer)
  let cutoff = summaries[0]?.date ?? toDateStr(new Date())
  let usedSeen = 0
  for (let i = summaries.length - 1; i >= 0; i--) {
    if (!summaries[i].noUsage) usedSeen++
    if (usedSeen >= RETENTION_USED_NIGHTS) { cutoff = summaries[i].date; break }
  }
  return { cutoff, summaries }
}
