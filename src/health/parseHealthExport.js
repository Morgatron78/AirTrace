// Apple Health integration (POC) — safe to delete this file entirely,
// see docs/apple-health-integration.md.
//
// Parses the JSON produced by the "Health Data Export" iOS app
// (https://apps.apple.com/gb/app/health-data-export/id6758620223), set to
// Format: JSON, Aggregation: Raw. Pure parse/decode only — no DB, no
// React, no knowledge of CPAP nights (see matchNights.js for that).

// Confirmed against two real exports (7-day and 90-day) by checking real
// time-in-stage proportions (~55% value 3, ~14% value 4, ~30% value 5,
// ~3% value 2) against normal human sleep architecture — a close enough
// match to trust. The export app's own `label` field is NOT trustworthy:
// values 4 and 5 both came through labeled "unknown" in every real
// export seen, and value 3 was mislabeled "asleepUnspecified" rather than
// "asleepCore". Decode by this numeric value only, never by label.
const STAGE_BY_VALUE = { 2: 'awake', 3: 'core', 4: 'deep', 5: 'rem' }

// Throws a plain Error with a user-facing message on anything unrecognized
// — same defensive shape as db/backup.js's parseBackup, which
// SettingsScreen already has an error-display path for.
export function parseHealthExport(json) {
  if (!json || typeof json !== 'object' || (!json.category_metrics && !json.metrics)) {
    throw new Error('This doesn\'t look like a Health Data Export file.')
  }

  const sleepMetric = (json.category_metrics || []).find((m) => m.id === 'Sleep Analysis')
  const hrMetric = (json.metrics || []).find((m) => m.id === 'HKQuantityTypeIdentifierHeartRate')
  const spo2Metric = (json.metrics || []).find((m) => m.id === 'HKQuantityTypeIdentifierOxygenSaturation')

  const stages = (sleepMetric?.data_points || [])
    .map((p) => ({ startMs: Date.parse(p.start_date), endMs: Date.parse(p.end_date), stage: STAGE_BY_VALUE[p.value] }))
    // Unmapped values (e.g. 0=inBed, 1=legacy asleepUnspecified, or a
    // future HealthKit addition) are dropped, not guessed at — matches
    // this codebase's existing "unknown sentinel -> skip" style rather
    // than a silent wrong-color segment.
    .filter((s) => s.stage && Number.isFinite(s.startMs) && Number.isFinite(s.endMs))
    .sort((a, b) => a.startMs - b.startMs)

  // The export's own unit says "%" but the real value is a 0-1 fraction
  // (confirmed against real data, e.g. 0.9677... for a 96.8% reading) —
  // *100 here so every consumer downstream deals in real percent.
  const spo2 = (spo2Metric?.data_points || [])
    .map((p) => ({ ts: Date.parse(p.timestamp), pct: p.value * 100 }))
    .filter((s) => Number.isFinite(s.ts))
    .sort((a, b) => a.ts - b.ts)

  const heartRate = (hrMetric?.data_points || [])
    .map((p) => ({ ts: Date.parse(p.timestamp), bpm: p.value }))
    .filter((s) => Number.isFinite(s.ts))
    .sort((a, b) => a.ts - b.ts)

  return { stages, heartRate, spo2 }
}
