// Runs the (already-verified, pure) parsing functions off the main
// thread so a 20-minute first import doesn't block the UI. Deliberately
// has no IndexedDB access of its own — it parses and posts results back;
// persisting (and pruning) happens on the main thread. Keeps this module
// a pure function of its inputs, easy to reason about and test.
import { parseSummaries } from './parseSummaries.js'
import { parseNight } from './parseNight.js'

function post(msg) {
  self.postMessage(msg)
}

self.onmessage = async (e) => {
  const { strFile, nightFolders, skipDates } = e.data
  const skip = new Set(skipDates)
  try {
    post({ type: 'progress', stage: 'reading', waveformDone: 0, waveformTotal: nightFolders.length })
    const strBuffer = await strFile.arrayBuffer()

    post({ type: 'progress', stage: 'summaries', waveformDone: 0, waveformTotal: nightFolders.length })
    const summaries = parseSummaries(strBuffer)

    const toParse = nightFolders.filter((n) => !skip.has(n.date))
    const details = []
    const errors = []
    post({ type: 'progress', stage: 'waveform', waveformDone: 0, waveformTotal: toParse.length })
    for (let i = 0; i < toParse.length; i++) {
      const { date, files } = toParse[i]
      try {
        const [brp, pld, eve, csl] = await Promise.all([
          files.brp.arrayBuffer(),
          files.pld.arrayBuffer(),
          files.eve.arrayBuffer(),
          files.csl ? files.csl.arrayBuffer() : Promise.resolve(undefined),
        ])
        const night = parseNight({ brp, pld, eve, csl })
        details.push({ date, ...night })
      } catch (err) {
        errors.push({ date, message: err.message })
      }
      post({ type: 'progress', stage: 'waveform', waveformDone: i + 1, waveformTotal: toParse.length })
    }

    post({ type: 'done', summaries, details, errors, skippedCount: nightFolders.length - toParse.length })
  } catch (err) {
    post({ type: 'error', message: err.message })
  }
}
