// STR.edf -> one summary record per calendar day. Field mappings and the
// MaskOn/MaskOff noon-epoch, PatientHours-is-cumulative, and Date-is-
// days-since-epoch facts are all confirmed against real device output —
// see CLAUDE.md's "Real file structure" section.
import { parseEdfHeader, readSignal, findSignalIndex } from './edfBinary.js'

const SENTINEL = -1
const MASK_SLOTS = 10

function dateFromEpochDays(days) {
  const d = new Date(days * 86400000)
  const yyyy = d.getUTCFullYear()
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(d.getUTCDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

// Mirrors the leak-derived heuristic in src/utils/mockData.js — there's
// no direct "mask seal" field on the device, this is the same formula
// kept in sync, not re-derived independently.
function sealFromLeak(leak) {
  const sealPct = Math.max(60, 100 - leak * 1.8)
  return sealPct > 90 ? 'Good' : sealPct > 75 ? 'Fair' : 'Poor'
}

export function parseSummaries(arrayBuffer) {
  const header = parseEdfHeader(arrayBuffer)
  const sig = (label) => {
    const idx = findSignalIndex(header, label)
    if (idx === -1) throw new Error(`STR.edf: expected signal "${label}" not found`)
    return readSignal(arrayBuffer, header, idx)
  }

  const dateArr = sig('Date')
  const ahiArr = sig('AHI'), hiArr = sig('HI'), oaiArr = sig('OAI'), caiArr = sig('CAI'), uaiArr = sig('UAI')
  const maskEventsArr = sig('MaskEvents')
  const maskOnArr = sig('MaskOn'), maskOffArr = sig('MaskOff')
  const leak95Arr = sig('Leak.95')
  const pMinArr = sig('MaskPress.50'), p95Arr = sig('MaskPress.95'), pMaxArr = sig('MaskPress.Max')
  // The actual prescribed pressure — confirmed via OSCAR's own ResMed
  // loader source (resmed_loader.cpp's resmed_codes[RMS9_SetPressure]
  // maps to this exact STR.edf signal name for fixed-CPAP-mode devices)
  // and verified against real values in this device's own STR.edf: not
  // a fixed constant, genuinely changes over time as a prescription is
  // adjusted (11, 12, 13, 11.6 cmH2O all appear across one real card's
  // history). physMin for this signal is 4 cmH2O — a real device can't
  // be set below that — so any decoded value <= 0 is the day's -1
  // sentinel scaled through this signal's own physical range, not a
  // real reading; treated as unavailable that day rather than shown.
  const setPressArr = sig('S.C.Press')
  // Machine settings, same real-per-night-value treatment as set pressure
  // — none of these are UI-string-mapped here, that's the display layer's
  // job (EquipmentScreen.jsx); this just extracts sentinel-aware raw
  // values. Enum meanings confirmed against OSCAR's own resmed_loader.cpp
  // (both its channel/addOption definitions and, for EPR specifically,
  // its actual STR.edf derivation logic — see below), not guessed, and
  // cross-checked field-by-field against a real OSCAR "Device Settings"
  // screenshot for this exact card. Tube type has no confirmed enum
  // available and is deliberately not read here.
  const modeArr = sig('Mode')
  const rampEnableArr = sig('S.RampEnable'), rampTimeArr = sig('S.RampTime')
  const humLevelArr = sig('S.HumLevel')
  const abFilterArr = sig('S.ABFilter')
  const climateControlArr = sig('S.ClimateControl')
  const maskArr = sig('S.Mask')
  const smartStartArr = sig('S.SmartStart')
  const humidifierArr = sig('Humidifier')
  const tempArr = sig('S.Temp'), tempEnableArr = sig('S.TempEnable')
  // EPR is not the simple on/off S.EPR.EPREnable alone — OSCAR's own STR
  // parser derives a 4-value mode (0=Off, 1=Ramp Only, 2=Full Time, 3=
  // "Patient???") from EPRType+1, then forces it (and the level) to 0
  // whenever EPREnable and ClinEnable aren't *both* true. (OSCAR also
  // subtracts 1 for AirSense 11 devices specifically — this is a
  // confirmed AirSense 10 Elite, so that adjustment doesn't apply here.)
  // Verified record-by-record against a real OSCAR Device Settings
  // screenshot for this exact card: EPRType=1, EPREnable=1, ClinEnable=1
  // -> epr=2 ("Full Time"), matching exactly.
  const eprTypeArr = sig('S.EPR.EPRType'), eprEnableArr = sig('S.EPR.EPREnable')
  const clinEnableArr = sig('S.EPR.ClinEnable'), eprLevelArr = sig('S.EPR.Level')

  const summaries = []
  for (let r = 0; r < header.numDataRecords; r++) {
    const noUsage = maskEventsArr[r] === SENTINEL
    const date = dateFromEpochDays(dateArr[r])
    const d = new Date(`${date}T00:00:00Z`)
    const weekend = d.getUTCDay() === 0 || d.getUTCDay() === 6

    if (noUsage) {
      summaries.push({
        date,
        label: d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', timeZone: 'UTC' }),
        fullLabel: d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', timeZone: 'UTC' }),
        wd: d.toLocaleDateString(undefined, { weekday: 'narrow', timeZone: 'UTC' }),
        weekend, noUsage: true,
        ahi: 0, obstructive: 0, central: 0, hypopnea: 0,
        leak: 0, usage: 0, startHour: 22, pMin: 0, pMax: 0, p95: 0, maskOff: 0, seal: null, setPressure: null,
        mode: null, rampEnable: null, rampTime: null, epr: null, eprLevel: null,
        humidityLevel: null, antibacterialFilter: null, climateControl: null,
        mask: null, smartStart: null, humidifierStatus: null, temperature: null, temperatureEnable: null,
      })
      continue
    }

    // Up to 10 matched-index on/off slots, in minutes since *noon* of this
    // record's date (confirmed, not midnight) — see CLAUDE.md. A day can
    // have several brief mask contacts alongside the real session; the
    // longest valid slot is treated as the night's actual session for
    // startHour, total usage sums every valid slot.
    let longestIdx = -1, longestDurationMin = -1, totalUsageMin = 0, validSlotCount = 0
    for (let i = 0; i < MASK_SLOTS; i++) {
      const on = maskOnArr[r * MASK_SLOTS + i]
      const off = maskOffArr[r * MASK_SLOTS + i]
      if (on === SENTINEL || off === SENTINEL) continue
      const durationMin = off - on
      if (durationMin <= 0) continue
      validSlotCount++
      totalUsageMin += durationMin
      if (durationMin > longestDurationMin) { longestDurationMin = durationMin; longestIdx = i }
    }
    const startHour = longestIdx === -1 ? 22 : 12 + maskOnArr[r * MASK_SLOTS + longestIdx] / 60
    const usage = +(totalUsageMin / 60).toFixed(2)
    // Best-effort: extra on/off cycles beyond the single main session,
    // i.e. how many times the mask came off and went back on. Not
    // validated against a real night with an actual mid-sleep removal
    // yet — flagged in the implementation plan as approximate.
    const maskOff = Math.max(0, validSlotCount - 1)

    // STR.edf's own header declares this channel's dimension as "L/s",
    // not L/min — confirmed by reading the real field directly (parseEdfHeader's
    // sig.dimension), same underlying unit PLD.edf's per-night Leak.2s
    // already needed ×60 for (see parseNight.js) — this summary-level
    // read was missing that conversion entirely, silently showing every
    // leak value in the app at ~1/60th its real size. Small negative
    // raw readings are real (sensor noise right around zero on a good
    // night), clamped to 0 here since a negative leak rate is physically
    // meaningless to display.
    const leak = Math.max(0, +(leak95Arr[r] * 60).toFixed(1))
    // UAI (unclassified apnea) folded into obstructive — a deliberate,
    // easily-revisited judgment call (see CLAUDE.md / plan), not a gap.
    const obstructive = +(oaiArr[r] + uaiArr[r]).toFixed(2)
    const central = +caiArr[r].toFixed(2)
    const hypopnea = +hiArr[r].toFixed(2)
    const setPressureRaw = setPressArr[r]
    const setPressure = setPressureRaw > 0 ? +setPressureRaw.toFixed(1) : null
    const mode = modeArr[r] === SENTINEL ? null : modeArr[r]
    const rampEnable = rampEnableArr[r] === SENTINEL ? null : rampEnableArr[r]
    const rampTime = rampTimeArr[r] === SENTINEL ? null : rampTimeArr[r]
    const humidityLevel = humLevelArr[r] >= 1 ? Math.round(humLevelArr[r]) : null
    const antibacterialFilter = abFilterArr[r] === SENTINEL ? null : abFilterArr[r]
    const climateControl = climateControlArr[r] === SENTINEL ? null : climateControlArr[r]
    const mask = maskArr[r] === SENTINEL ? null : maskArr[r]
    const smartStart = smartStartArr[r] === SENTINEL ? null : smartStartArr[r]
    const humidifierStatus = humidifierArr[r] === SENTINEL ? null : humidifierArr[r]
    const temperature = tempArr[r] > 0 ? Math.round(tempArr[r]) : null
    const temperatureEnable = tempEnableArr[r] === SENTINEL ? null : tempEnableArr[r]

    // OSCAR's exact STR.edf derivation (see the comment above this
    // function's signal reads) — not a simple EPREnable boolean.
    let epr = null, eprLevel = null
    if (eprTypeArr[r] !== SENTINEL && eprEnableArr[r] !== SENTINEL && clinEnableArr[r] !== SENTINEL) {
      epr = eprTypeArr[r] + 1
      eprLevel = eprLevelArr[r] > 0 ? Math.round(eprLevelArr[r]) : 0
      if (!(eprEnableArr[r] && clinEnableArr[r])) { epr = 0; eprLevel = 0 }
    }

    summaries.push({
      date,
      label: d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', timeZone: 'UTC' }),
      fullLabel: d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', timeZone: 'UTC' }),
      wd: d.toLocaleDateString(undefined, { weekday: 'narrow', timeZone: 'UTC' }),
      weekend, noUsage: false,
      ahi: +ahiArr[r].toFixed(2), obstructive, central, hypopnea,
      leak, usage, startHour,
      pMin: +pMinArr[r].toFixed(1), p95: +p95Arr[r].toFixed(1), pMax: +pMaxArr[r].toFixed(1),
      maskOff, seal: sealFromLeak(leak), setPressure,
      mode, rampEnable, rampTime, epr, eprLevel, humidityLevel, antibacterialFilter, climateControl,
      mask, smartStart, humidifierStatus, temperature, temperatureEnable,
    })
  }
  return summaries
}
