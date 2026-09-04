// ResMed-specific interpretation of the generic EDF+ format — the facts
// here came from reading real device output byte-by-byte (see CLAUDE.md's
// "EDF parsing" and "Real file structure" sections), not from the EDF+
// spec, and in one case (onset/duration) directly contradict a literal
// spec reading.

const ZERO_DURATION_DEFAULT_SEC = 10

// All three confirmed from real bytes: "Obstructive Apnea", "Central
// Apnea", and "Hypopnea" (the last one initially only presumed from
// ResMed's documented event vocabulary — since confirmed against a real
// night with 4 real Hypopnea annotations, each landing on the flat 10s
// zero-duration default below). Callers should still treat an unmapped
// `type` (undefined) as a loud signal to go verify against real data,
// not silently drop the event — Unclassified Apnea (see CLAUDE.md's
// STR.edf UAI note) and Cheyne-Stokes Respiration text are both
// plausible candidates for a still-unconfirmed fourth/fifth mapping.
export const EVENT_TYPE_MAP = {
  'Obstructive Apnea': 'obstructive',
  'Central Apnea': 'central',
  'Hypopnea': 'hypopnea',
}

// tal: { onset, duration, texts } from edfAnnotations.parseTALs.
// Returns null for the housekeeping TAL every data record starts with
// (no real annotation text — e.g. the confirmed `+0~0|Recording starts|`
// on record 0, or a bare empty-text TAL like `+0||`). Real per-event
// TALs always have exactly one text on this device.
export function toEvent(tal) {
  const text = tal.texts.find((t) => t !== '' && t !== 'Recording starts')
  if (text === undefined) return null

  // Confirmed: ResMed's onset/duration meaning is reversed from the
  // normal EDF+ reading — "onset" is the event's END, and "duration" is
  // how many seconds *earlier* it started. A zero or absent duration
  // means a flat 10s, not a zero-length event.
  const durationSec = tal.duration > 0 ? tal.duration : ZERO_DURATION_DEFAULT_SEC
  const endSec = tal.onset
  const startSec = endSec - durationSec

  return {
    text,
    type: EVENT_TYPE_MAP[text], // undefined if unmapped — caller's job to surface loudly
    startSec,
    endSec,
    durationSec,
  }
}
