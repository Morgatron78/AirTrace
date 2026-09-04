# Apple Health integration — what it is, and how to remove it

A proof of concept, not a committed feature. Sleep stages, heart rate,
and SpO₂ from an Apple Watch — imported from a JSON file produced by the
[Health Data Export](https://apps.apple.com/gb/app/health-data-export/id6758620223)
iOS app (Format: JSON, Aggregation: Raw) — overlaid on Night View:

- A "Sleep stages" hypnogram card, next to the Events chart.
- Additive rows (sleep stage / heart rate / SpO₂) in the existing
  tap-an-event popover, showing what was happening at that exact moment.

No server, no new backend — the export file is picked by hand from
Settings → Health data → Import Health Data, same file-picker pattern as
backup restore.

## Deliberately out of scope for this pass

- The Stats "REM correlation" row from the original mockup — needs a
  separate 30-night aggregate computation, not yet built.
- `db/backup.js` — Apple Health data isn't included in AirTrace's own
  backup/restore. It's fully re-importable at any time from the export
  app itself, so losing it on a fresh device isn't a real loss the way
  losing `tags` would be.

## Known simplifications

- No buffer around a CPAP night's own session window — exact containment
  only, so Watch sleep just before mask-on/after mask-off is excluded.
- `event.x` (EDF-seconds space, from the CPAP recording itself) and
  health-data x-fractions (wall-clock space, via `night.startHour`/
  `night.usage`) are two independent measurement chains — they should
  agree closely but aren't literally the same clock.
- No DST-aware handling in `getNightWindowMs` — an existing limitation of
  how the whole app already treats `night.date`/`startHour`, not new here.
- Overlapping/multiple Watch sleep sessions in one window aren't
  deduplicated.
- Popover values are the single nearest raw sample within a threshold
  (15min for heart rate, 60min for SpO₂, which is genuinely sparse) — no
  interpolation or averaging.
- Sleep stage is decoded from HealthKit's numeric value only
  (`2=awake, 3=core, 4=deep, 5=rem`) — the export app's own `label`
  string is unreliable (confirmed against real exports: values 4 and 5
  both come through labeled `"unknown"`). If a future export format ever
  shifts these numeric codes, this would silently misclassify rather than
  error.

## If this doesn't earn its place — how to strip it out cleanly

Every touch point in an existing file is marked `// APPLE-HEALTH:` (or
inline `/* APPLE-HEALTH */`). Find them all with:

```bash
grep -rn "APPLE-HEALTH" src/
```

**1. Delete these files outright** (nothing outside this feature imports them):
- `src/health/parseHealthExport.js`
- `src/health/nightWindow.js`
- `src/health/matchNights.js`
- `src/health/lookupAtTime.js`
- `src/constants/sleepStages.js`
- `src/db/health.js`
- `src/components/charts/HypnogramChart.jsx`
- `docs/apple-health-integration.md` (this file)

**2. Revert each marked block:**
- `src/db/schema.js` — remove the whole `if (oldVersion < 2) { ... }` block (leave the `if (oldVersion < 1) { ... }` block for the original four stores untouched — it's now load-bearing, not just historical: a real bug surfaced during this feature's own build was `upgrade()` unconditionally recreating the original four stores on every version bump, which throws `ConstraintError` on any browser that already has them. The version-gating fixes that permanently, not just for this feature). **Do not decrement `DB_VERSION`** — any browser that has already opened the DB at version 2 throws a `VersionError` if the app later requests version 1. The version number stays at 2 forever, whether or not this feature exists.
- `src/App.jsx` — remove the `nights={nights}` prop passed to `<SettingsScreen>`.
- `src/screens/SettingsScreen.jsx` — remove the `nights` prop from the component signature, the `parseHealthExport`/`matchHealthDataToNights`/`setHealthEntry` imports, the `HeartPulse` icon import, the health-import state/handler block, and the whole "Health data" card.
- `src/screens/DrillDownScreen.jsx` — remove the `HypnogramChart`/`useHealthEntry` imports, the `useHealthEntry(night.date)` call, the `<HypnogramChart>` render block, and the `date`/`healthEntry` props passed into both `<EventsChart>` call sites (the inline card and the fullscreen modal).
- `src/components/charts/EventsChart.jsx` — remove the `STAGE_LABEL`/`getNightWindowMs`/`stageAt`/`nearestReading` imports, the `date`/`healthEntry` props, the `healthNightStartMs` computed value, and the corroboration-rows block inside the popover's `openCluster.items.map(...)`.

**3. Optional, purely cosmetic:** the orphaned `healthData` IndexedDB
object store can be left in place on any browser that already has it —
an empty/unused store costs nothing once no code queries it. Removing it
fully would need a further version bump (`DB_VERSION` 2→3) with
`db.deleteObjectStore('healthData')` in `upgrade()`, which is not
necessary for a clean strip-out.
