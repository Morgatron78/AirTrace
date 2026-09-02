// Runs the (already-verified, pure) parsing functions off the main
// thread so a 20-minute first import doesn't block the UI. Deliberately
// has no IndexedDB access of its own — it parses and posts results back;
// persisting (and pruning) happens on the main thread. Keeps this module
// a pure function of its inputs, easy to reason about and test.
//
// Posts each parsed night back individually (transferring its typed
// arrays, not copying them) rather than accumulating every night's
// waveform detail in memory for the whole import. A real 18-month card
// (500+ nights, each several MB of decoded Float32Arrays) crashed the
// app under memory pressure when everything was held until one final
// batched message at the end — confirmed on real hardware, not
// theoretical. The caller is expected to have already filtered
// nightFolders down to whatever range it actually wants full waveform
// detail for (e.g. the 90-day retention window), since this module has
// no opinion on retention policy.
import { parseSummaries } from './parseSummaries.js'
import { parseNight } from './parseNight.js'

function post(msg, transfer) {
  self.postMessage(msg, transfer || [])
}

self.onmessage = async (e) => {
  const { strFile, nightFolders, skipDates } = e.data
  const skip = new Set(skipDates)
  try {
    post({ type: 'progress', stage: 'reading', waveformDone: 0, waveformTotal: nightFolders.length })
    const strBuffer = await strFile.arrayBuffer()

    post({ type: 'progress', stage: 'summaries', waveformDone: 0, waveformTotal: nightFolders.length })
    const summaries = parseSummaries(strBuffer)
    post({ type: 'summaries', summaries })

    const toParse = nightFolders.filter((n) => !skip.has(n.date))
    const errors = []
    let addedCount = 0
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
        const transfer = Object.values(night.detail).map((arr) => arr.buffer)
        post({ type: 'nightResult', date, night }, transfer)
        addedCount++
      } catch (err) {
        errors.push({ date, message: err.message })
      }
      post({ type: 'progress', stage: 'waveform', waveformDone: i + 1, waveformTotal: toParse.length })
    }

    post({ type: 'done', addedCount, errors, skippedCount: nightFolders.length - toParse.length })
  } catch (err) {
    post({ type: 'error', message: err.message })
  }
}
