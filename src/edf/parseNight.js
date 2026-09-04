// One DATALOG/YYYYMMDD/ night's *BRP.edf + *PLD.edf (waveform) and
// *EVE.edf + *CSL.edf (event annotations) files -> real-physical-unit
// channel detail + a merged events list. Deliberately does NOT rescale
// anything to the mockup's synthetic 0-1 fractions, and does NOT
// produce inspTime/expTime — this device has no real source for them
// (confirmed; see CLAUDE.md). Adapting the UI/charts for real units is
// separate follow-up work, not this module's job.
import { parseEdfHeader, readSignal, readRecordRawBytes, findSignalIndex } from './edfBinary.js'
import { parseTALs } from './edfAnnotations.js'
import { toEvent } from './resmedQuirks.js'
import { deriveBreathPhaseTimes } from './deriveBreathTimes.js'

function readNamedSignal(arrayBuffer, header, label) {
  const idx = findSignalIndex(header, label)
  if (idx === -1) throw new Error(`Expected signal "${label}" not found`)
  return readSignal(arrayBuffer, header, idx)
}

// Decodes every event annotation in one *EVE.edf/*CSL.edf file. Returns
// { events, unmapped } so callers can surface unmapped event-type text
// loudly instead of silently dropping it (see CLAUDE.md — only
// "Obstructive Apnea"/"Central Apnea" are confirmed from real bytes so
// far).
function parseEvents(arrayBuffer) {
  const header = parseEdfHeader(arrayBuffer)
  const annotIdx = findSignalIndex(header, 'EDF Annotations')
  if (annotIdx === -1) throw new Error('Expected "EDF Annotations" signal not found')

  const events = []
  const unmapped = new Set()
  for (let r = 0; r < header.numDataRecords; r++) {
    const raw = readRecordRawBytes(arrayBuffer, header, annotIdx, r)
    for (const tal of parseTALs(raw)) {
      const evt = toEvent(tal)
      if (!evt) continue // housekeeping/no-text TAL
      if (evt.type === undefined) { unmapped.add(evt.text); continue }
      events.push(evt)
    }
  }
  return { events, unmapped }
}

// files: { brp, pld, eve, csl } — ArrayBuffers. csl may be omitted (a
// night with no Cheyne-Stokes annotations at all still has an empty
// but present *CSL.edf` on the real device — pass it too when available).
export function parseNight(files) {
  const brpHeader = parseEdfHeader(files.brp)
  const flow = readNamedSignal(files.brp, brpHeader, 'Flow.40ms') // L/s, signed
  const pressure = readNamedSignal(files.brp, brpHeader, 'Press.40ms') // cmH2O

  const pldHeader = parseEdfHeader(files.pld)
  const leak = readNamedSignal(files.pld, pldHeader, 'Leak.2s').map((v) => +(v * 60).toFixed(2)) // L/s -> L/min
  const respRate = readNamedSignal(files.pld, pldHeader, 'RespRate.2s') // bpm
  const tidalVolume = readNamedSignal(files.pld, pldHeader, 'TidVol.2s').map((v) => Math.round(v * 1000)) // L -> ml
  const minuteVent = readNamedSignal(files.pld, pldHeader, 'MinVent.2s') // L/min
  const snore = readNamedSignal(files.pld, pldHeader, 'Snore.2s') // index
  const flowLimit = readNamedSignal(files.pld, pldHeader, 'FlowLim.2s') // 0-1 index
  // The machine's own commanded therapy pressure — distinct from
  // BRP's Press.40ms (the noisy real-time mask sensor reading, "Mask
  // Pressure" elsewhere in this app). OSCAR's own translation table
  // calls this exact PLD.edf signal "Therapy Pres". Confirmed against
  // real data: on a fixed-pressure night it climbs during the ramp
  // (8.0 -> 10.0 -> 11.0 cmH2O) then holds flat at the real set
  // pressure for the rest of the night, exactly as expected for a
  // non-auto-adjusting machine.
  const therapyPressure = readNamedSignal(files.pld, pldHeader, 'Press.2s')

  const eveResult = parseEvents(files.eve)
  const cslResult = files.csl ? parseEvents(files.csl) : { events: [], unmapped: new Set() }
  const unmappedEventTypes = new Set([...eveResult.unmapped, ...cslResult.unmapped])

  // The night's true recorded span, from BRP's own header — annotation
  // onsets in EVE/CSL are relative to each file's own start time, which
  // in practice differs from BRP's by only a few seconds (staggered
  // write times within the same session), immaterial next to an
  // ~6-hour night's worth of x-fraction positioning.
  const totalNightSec = brpHeader.numDataRecords * brpHeader.recordDurationSec
  const events = [...eveResult.events, ...cslResult.events]
    .map((e) => ({ ...e, x: Math.max(0, Math.min(1, e.startSec / totalNightSec)) }))
    .sort((a, b) => a.startSec - b.startSec)
  // Central + Obstructive only, not Hypopnea — matches OSCAR's own
  // "Total time in apnoea" stat exactly (confirmed against a real
  // night's byte-decoded EVE.edf: 11 Central Apnea events summing to
  // 140s = OSCAR's 00:02:20, plus 4 Hypopnea events summing to a
  // separate 40s that OSCAR doesn't count here — a hypopnea is a
  // partial obstruction, not a full apnea). If EVENT_TYPE_MAP
  // (resmedQuirks.js) ever grows a fourth mapped type (Unclassified
  // Apnea — see CLAUDE.md's STR.edf UAI note — or Cheyne-Stokes from
  // CSL.edf), decide then whether it belongs in this sum too.
  const timeInApneaSec = events
    .filter((e) => e.type === 'central' || e.type === 'obstructive')
    .reduce((s, e) => s + e.durationSec, 0)

  // Derived, not a recorded signal — see deriveBreathTimes.js. Output on
  // the same per-night sample grid as every PLD-derived channel (leak's
  // own length), computed from Flow's real sample rate rather than
  // assuming 25Hz, in case a future device/file has a different one.
  const flowSampleRateHz = brpHeader.signals[findSignalIndex(brpHeader, 'Flow.40ms')].samplesPerRecord / brpHeader.recordDurationSec
  const { inspTime, expTime } = deriveBreathPhaseTimes(flow, flowSampleRateHz, totalNightSec, leak.length)

  return {
    detail: { flow, pressure, therapyPressure, leak, respRate, tidalVolume, minuteVent, snore, flowLimit, inspTime, expTime },
    events,
    timeInApneaSec,
    totalNightSec,
    unmappedEventTypes: [...unmappedEventTypes],
  }
}
