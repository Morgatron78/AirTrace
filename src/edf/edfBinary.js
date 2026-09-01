// Generic EDF/EDF+ binary reader. No ResMed-specific knowledge lives here
// — see resmedQuirks.js for that. Works against a plain ArrayBuffer so it
// runs identically in Node (verification scripts) and in the browser
// (eventually inside a Web Worker), without relying on Node's Buffer.
//
// Field layout confirmed by hand against real STR.edf / BRP.edf / PLD.edf
// / EVE.edf / CSL.edf / SAD.edf files from a ResMed AirSense 10 Elite —
// see CLAUDE.md's "Real file structure" section for what was verified.

function bytesToAsciiTrim(bytes, start, len) {
  let s = ''
  for (let i = start; i < start + len; i++) s += String.fromCharCode(bytes[i])
  return s.trim()
}

// EDF's fixed general header is 256 bytes, followed by per-signal header
// blocks whose fields are grouped by field (all labels, then all
// transducer types, etc.) rather than interleaved per signal.
const GENERAL_HEADER_BYTES = 256
const SIGNAL_FIELD_LAYOUT = [
  ['label', 16], ['transducer', 80], ['dimension', 8], ['physMin', 8], ['physMax', 8],
  ['digMin', 8], ['digMax', 8], ['prefilter', 80], ['samplesPerRecord', 8], ['reserved', 32],
]

export function parseEdfHeader(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer)
  const str = (start, len) => bytesToAsciiTrim(bytes, start, len)

  const startDate = str(168, 8) // DD.MM.YY
  const startTime = str(176, 8) // HH.MM.SS
  const headerBytes = parseInt(str(184, 8), 10)
  const reserved44 = str(192, 44) // "EDF+C" / "EDF+D" on annotation-bearing files, blank on plain EDF
  const numDataRecords = parseInt(str(236, 8), 10)
  const recordDurationSec = parseFloat(str(244, 8))
  const numSignals = parseInt(str(252, 4), 10)

  let off = GENERAL_HEADER_BYTES
  const signals = []
  for (const [field, len] of SIGNAL_FIELD_LAYOUT) {
    for (let i = 0; i < numSignals; i++) {
      signals[i] = signals[i] || {}
      signals[i][field] = str(off, len)
      off += len
    }
  }
  for (const sig of signals) {
    sig.physMin = parseFloat(sig.physMin)
    sig.physMax = parseFloat(sig.physMax)
    sig.digMin = parseInt(sig.digMin, 10)
    sig.digMax = parseInt(sig.digMax, 10)
    sig.samplesPerRecord = parseInt(sig.samplesPerRecord, 10)
  }

  const recordBytes = signals.reduce((s, sig) => s + sig.samplesPerRecord * 2, 0)

  return {
    startDate, startTime, headerBytes, isEdfPlus: reserved44.startsWith('EDF+'),
    numDataRecords, recordDurationSec, numSignals, signals, recordBytes,
  }
}

function scale(sig, digital) {
  if (sig.digMax === sig.digMin) return digital
  return (digital - sig.digMin) * (sig.physMax - sig.physMin) / (sig.digMax - sig.digMin) + sig.physMin
}

// Byte offset, within one data record, where a given signal's samples start.
function signalByteOffsetInRecord(header, signalIndex) {
  let off = 0
  for (let i = 0; i < signalIndex; i++) off += header.signals[i].samplesPerRecord * 2
  return off
}

// Reads one numeric signal across every data record into a single
// physically-scaled Float32Array. Not for the annotations signal — use
// readAnnotationRecordBytes for that (raw bytes, decoded by
// edfAnnotations.js, not physically scaled).
export function readSignal(arrayBuffer, header, signalIndex) {
  const view = new DataView(arrayBuffer)
  const sig = header.signals[signalIndex]
  const inRecordOffset = signalByteOffsetInRecord(header, signalIndex)
  const out = new Float32Array(header.numDataRecords * sig.samplesPerRecord)
  let outIdx = 0
  for (let r = 0; r < header.numDataRecords; r++) {
    let pos = header.headerBytes + r * header.recordBytes + inRecordOffset
    for (let i = 0; i < sig.samplesPerRecord; i++) {
      out[outIdx++] = scale(sig, view.getInt16(pos, true)) // little-endian, per EDF spec
      pos += 2
    }
  }
  return out
}

// Raw (unscaled) bytes of one signal's data for one record — used for the
// annotations signal, whose "samples" are actually ASCII/control-byte
// annotation text, not numeric data.
export function readRecordRawBytes(arrayBuffer, header, signalIndex, recordIndex) {
  const sig = header.signals[signalIndex]
  const inRecordOffset = signalByteOffsetInRecord(header, signalIndex)
  const start = header.headerBytes + recordIndex * header.recordBytes + inRecordOffset
  const nBytes = sig.samplesPerRecord * 2
  return new Uint8Array(arrayBuffer, start, nBytes)
}

export function findSignalIndex(header, label) {
  return header.signals.findIndex((s) => s.label === label)
}
