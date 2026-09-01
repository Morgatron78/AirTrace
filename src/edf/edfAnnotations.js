// Generic EDF+ TAL (Time-stamped Annotation List) decoder. No ResMed
// interpretation here (that's resmedQuirks.js) — this just decodes the
// spec's own byte format:
//
//   TAL := onset ['\x15' duration] '\x14' {text '\x14'}* '\x00'
//
// with one or more TALs packed back-to-back in a single data record's
// annotation-signal bytes, padded with trailing '\x00' to fill the
// record's fixed byte allocation.
const FIELD_SEP = String.fromCharCode(0x14)
const DURATION_SEP = String.fromCharCode(0x15)
const TAL_END = String.fromCharCode(0x00)

// bytes: Uint8Array of one data record's raw annotation-signal bytes
// (from edfBinary.readRecordRawBytes).
export function parseTALs(bytes) {
  let raw = ''
  for (let i = 0; i < bytes.length; i++) raw += String.fromCharCode(bytes[i])

  const tals = []
  for (const chunk of raw.split(TAL_END)) {
    if (chunk === '') continue // trailing padding
    const parts = chunk.split(FIELD_SEP)
    const [onsetPart, ...rest] = parts
    const texts = rest.slice(0, -1) // drop the always-present trailing empty artifact
    const [onsetStr, durationStr] = onsetPart.split(DURATION_SEP)
    tals.push({
      onset: parseFloat(onsetStr),
      duration: durationStr !== undefined ? parseFloat(durationStr) : undefined,
      texts,
    })
  }
  return tals
}
