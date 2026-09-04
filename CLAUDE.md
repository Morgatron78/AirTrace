# AirTrace — project context for Claude Code

This file is read automatically at the start of every Claude Code session in
this repo. It exists because the mockup and this repo come from two entirely
separate conversations with no shared memory — everything below is context
that isn't obvious just from reading the ported code, and would otherwise
need re-explaining from scratch every session.

## What this is

A local-first PWA for ResMed CPAP therapy data — parses the SD card
client-side (no upload, no backend), aiming to beat MyAir on depth and OSCAR
on mobile usability. Built entirely through conversation with Claude; the
user has no coding background and isn't writing code themselves.

**Primary target platform: iOS (iPhone/iPad), installed to the Home
Screen.** This isn't an edge case to handle alongside a "real" desktop
target — it's the main case, and it's already the reason for several
decisions made so far: the Home Screen install approach specifically
(exempts the PWA from Safari's 7-day ITP eviction that regular tabs face),
the Wake Lock caveat below, and reliance on `webkitdirectory` for folder
import. No Mac is available for native testing — everything needs to work
as an installed web PWA, not a native app wrapper. Development happens on a
Windows PC; testing happens on the actual iPhone/iPad.

**The core differentiator, and the actual point of the whole app**:
correlating user-logged lifestyle tags (alcohol, late meal, etc.) against
AHI. Neither MyAir nor OSCAR does this at all. If a design decision ever
trades this off against something else, that's the wrong trade.

## Source of truth for UI/UX

`cpap-app-full-dense.jsx` (provided alongside this file) is a single-file
React mockup that went through dozens of review passes — every screen,
interaction pattern, color, and edge case in it is a deliberate, tested
decision, not a first draft. Port from it; don't re-derive the design from
first principles. It needs splitting into proper modules (constants, utils,
shared components, one file per screen, `App.jsx`) — it hit real problems
being previewed as one 3,000+ line file, which is a preview-tool artifact,
not a reason to keep it monolithic in the real build.

**Two deliberate scope boundaries**, so they don't get "fixed" as
oversights: the richer waveform-only channels (Flow Limit, Snore, Tidal
Volume, Resp Rate, Minute Vent, Insp/Exp Time) never get night-level
Trends/Stats aggregates — confirmed correct, not a gap. Pressure trend
analysis is deliberately low-value right now since the device is
fixed-pressure, not APAP — kept for if that ever changes, not because it's
currently useful.

## Real hardware facts (confirmed via actual testing, not assumed)

- Device: ResMed AirSense 10 Elite, fixed pressure (not auto-titrating).
- SD card root has `STR.edf` (nightly summaries, kept indefinitely), a
  `DATALOG` folder (~5,442 files/year) containing per-night detail in dated
  `YYYYMMDD` subfolders, and a `SETTINGS` folder (cryptic `.tgt`/`.log`
  device-internal config and service logs — inspected, nothing in it is
  useful for this app; not worth parsing).
- A real card's contents live locally at `Sample_CPAP_Data/` in this repo
  (gitignored — **never commit this**, it's the user's actual therapy
  history and this repo is public). Structured to mirror the real SD card:
  `STR.edf` at the root, `DATALOG/YYYYMMDD/...` per night. Only the last
  ~4 nights of DATALOG are present, not the full card.
- `webkitdirectory` import in Safari works but takes 60-90s+ even for a
  browse — first real import (parsing everything) is estimated at up to 20
  minutes, unverified against real hardware yet.
- A competing tool (SleepHQ) took 1.5 hours and failed server-side on the
  same card — this is the direct justification for going local-first rather
  than cloud-upload.

### Real file structure (confirmed by reading raw bytes of the actual card)

Each `DATALOG/YYYYMMDD/` night has 5 file pairs (CLAUDE.md previously only
knew about 3 — `*CSL.edf` and `*SAD.edf` were undocumented until inspected),
each with an `.crc` sidecar (8 bytes, a stored checksum — separate from the
`Crc16` pseudo-channel each `.edf` also carries internally):

| File | Real signals | Rate |
|---|---|---|
| `*BRP.edf` | `Flow.40ms`, `Press.40ms` | 25 Hz — confirms the assumption below about waveform charts |
| `*PLD.edf` | `MaskPress`, `Press`, `EprPress`, `Leak`, `RespRate`, `TidVol`, `MinVent`, `Snore`, `FlowLim` (`.2s` suffix on each) | 0.5 Hz (one sample/2s) |
| `*EVE.edf` | Apnea/hypopnea event annotations — `"Central Apnea"`, `"Obstructive Apnea"`, `"Hypopnea"` all confirmed as the exact real annotation text | per-event |
| `*CSL.edf` | Cheyne-Stokes respiration event annotations — same annotation format as `*EVE.edf`, separate file/category. Empty (no events) is normal on a night with no CSR. | per-event |
| `*SAD.edf` | `Pulse.1s`, `SpO2.1s` — real channels, but **not used anywhere in this app's design**; only populated if a pulse oximeter accessory is paired. | 1 Hz |

Two real constraints this surfaced that the mockup's design didn't know
about:
- **This device does not record Insp/Exp Time at all** — those two
  mockup waveform channels have no real source. Either drop them from the
  real build, or infer them from `Flow` zero-crossings (nontrivial DSP,
  probably not worth it).
- `STR.edf` has an `UAI` (unclassified apnea index) channel alongside
  `AI`/`OAI`/`CAI`/`HI` — a fourth event category the mockup's
  obstructive/central/hypopnea model doesn't account for. Needs a decision
  before the real parser ships: fold into one of the three, or add a
  fourth bucket.

`STR.edf` itself is structured very differently from the per-night
waveform files: it's **one data record per day** (EDF record duration =
86400s), not a per-second/per-sample recording — a real sample had 524
daily records, ~1.4 years of history in one compact file. Of its 76
signals, the directly useful ones: `AHI`, `HI` (hypopnea), `AI`, `OAI`
(obstructive), `CAI` (central), `UAI` (see above), `MaskOn`/`MaskOff` (10
slots/day — up to 10 sessions), `Duration`/`OnDuration`, `PatientHours`,
`Leak.50`/`.95`/`.70`/`.Max`, `MaskPress.50`/`.95`/`.Max`, `CSR`. The rest
are machine-settings snapshots (`S.*`) and fault flags, not clinical data.

Confirmed directly from raw annotation bytes: the **first TAL in every
data record of an annotation file (`*EVE.edf`/`*CSL.edf`) is a housekeeping
marker with no event text** (e.g. `+0~0|Recording starts|` on record 0) —
skip it, don't treat it as a real (and therefore zero-duration-defaulted)
event.

Two more findings from decoding actual `STR.edf` data records (not just
its header), both easy to get wrong and both confirmed against real values:

- **`Date` is days since the Unix epoch (1970-01-01), as a plain integer**
  — `new Date(dateValue * 86400000)` decodes it directly. Record 0's Date
  matched the file header's own start date exactly; the last record in a
  real sample decoded to today's date with every other field as `-1`
  (AHI, PatientHours, MaskEvents, all 10 MaskOn/MaskOff slots) — `-1`
  across the board is the "no data yet for this day" sentinel, not a
  parsing error.
- **`MaskOn`/`MaskOff` are minutes since *noon* of that record's `Date`,
  not midnight** — confirmed by decoding real values that only produce
  plausible session times (e.g. a session running ~00:20–07:01) under a
  noon epoch; a midnight epoch produces nonsense (a session "starting" at
  12:20pm). This is the standard CPAP-industry convention of anchoring a
  whole overnight session to the day it started, so one night's sleep
  never gets split across two calendar-day records. Each array holds up
  to 10 on/off slots at matching indices — a day can have several brief
  mask contacts (seconds-long, e.g. a fit check) alongside the real
  session, all as separate slots; `MaskEvents` is the count of populated
  slots × 2 (on + off), not a clinical event count.
- **`PatientHours` is a lifetime cumulative counter, not a daily value**
  — confirmed by real records increasing monotonically by single-digit
  amounts per day (0 → 6 → 15 → … → 2989 → 2994) rather than resetting.
  Daily usage must come from summing that day's own `MaskOn`/`MaskOff`
  session durations, not from this field (and not from diffing
  consecutive records, which breaks on the very first imported record and
  on any gap).

## EDF parsing — start from a real reference, not from spec alone

`github.com/tedpearson/edf-importer` (Go, MIT license) is real-device-tested
against a ResMed AirSense 11 and is worth translating logic from rather than
implementing blind from the EDF+ spec. Its underlying binary parsing is a
separate Go library, so the low-level header/record decode still needs a
real implementation here — but these ResMed-specific quirks came from actual
testing and are easy to lose hours rediscovering:

- **Annotation onset/duration are reversed from the normal EDF+ meaning on
  ResMed devices**: "onset" is the *end* of the event; "duration" is how
  many seconds *earlier* it started. Confirmed by that project's own
  testing, flagged by its author as inconsistent with his own read of the
  spec — trust the tested behavior over the spec here.
- Zero-duration annotations default to a flat 10s, not a range.
- Header date format: `DD.MM.YY HH.MM.SS`.
- Channel names come from the EDF label field (trim, dots→underscores);
  `EDF Annotations` and `Crc16` are pseudo-channels, not real data.

### Real-import bugs found via actual on-device testing (fixed, keep in mind)

The Web Worker + IndexedDB + real `webkitdirectory` import pipeline is
built and has been exercised against the user's real, full-size card
(1.11GB, ~18 months since March 2025, 5,689 files/514 folders). Two real
bugs surfaced this way that a synthetic/small test wouldn't have caught:

- **iOS Safari: clearing a file input's `.value` right after reading
  `.files` silently empties the FileList you already captured.** It
  isn't an independent snapshot there. Confirmed via a side-by-side
  test: a bare page with no `.value` reset correctly saw hundreds of
  real files from the same card that the app reported as 0. Always
  `Array.from(e.target.files)` into a real array *before* touching
  `e.target.value = ''`, never after.
- **A `DATALOG/YYYYMMDD/` folder can hold more than one session** — the
  main overnight one plus a brief, seconds-long "fit check" mask contact
  afterward (matches the MaskOn/MaskOff multi-slot behavior already
  documented above for `STR.edf`), each with their own timestamp-prefixed
  BRP/PLD/EVE/CSL file set. A brief, interrupted session's file can carry
  `-1` in its EDF+ header's numDataRecords field — the spec's own
  documented sentinel for "count unknown," left there because the device
  never went back to finalize it. Two fixes, both needed: (1) when
  grouping same-kind files within one date folder, keep the *largest*
  file per kind, not whichever sorts last — that reliably picks the real
  session over a leftover fit-check file; (2) `parseEdfHeader` should
  derive the true record count from the file's actual byte length
  whenever it sees `-1`, rather than trusting the header and crashing on
  a negative typed-array length.

## Real-build architecture (built)

- Web Worker for parsing (don't block the UI on a 20-minute first import).
- Two-tier retention: nightly summaries kept forever (cheap), waveform
  detail pruned to a rolling 90-day window *measured from today*, not from
  last import — a 3-week gap between imports doesn't break this, it just
  means a bigger one-time catch-up.
- Imports are incremental/idempotent — diff against what's already stored.
  This matters for the Wake Lock item below: an interrupted import isn't a
  full loss, re-running picks up where it left off.
- IndexedDB, typed arrays (Float32Array etc.) for waveform data, not plain
  JS arrays — cheaper to slice for random access.
- Waveform charts must support zooming to ~1 minute windows on raw ~25Hz
  data. The *zoomed-in* case is cheap (few points); the *zoomed-out*
  full-night case (~720k samples/channel) is the real problem — needs
  decimation (bucket per pixel column, plot min/max envelope) and probably
  Canvas instead of SVG once it's real data volume, not synthetic mockup
  data.
- CI/CD: Vite + GitHub Actions, deployed to GitHub Pages (public repo,
  required for the free tier). Goal is `git push` → auto build → auto
  deploy, replacing the manual download/upload workflow used on a prior
  project.

## The tagging feature (the newest, most-designed piece)

Full design, agreed before any of it was built:

- **5 manual tags**: Alcohol (graded light/heavy — dose-dependent effect on
  airway muscles), Late meal, Away from home, High stress (deliberately
  *high*, not baseline stress — the user is "always stressed," so a flat
  stress tag would be near-useless as a signal), Congestion/illness.
- **1 automatic tag**: Late start — session start vs. a "Target bedtime"
  Settings field, >2 hours late, computed from data the device already
  records, never logged.
- **Tags are keyed by calendar date, entirely separate from night/import
  data.** Import never owns or creates a tag — it only merges by date
  whenever both happen to exist. This is the central decision: tagging
  needs to work the morning after, independent of whenever the user next
  gets around to plugging in the SD card.
- **Three states per date**: not yet reviewed / reviewed, nothing to report
  / reviewed with detail. All three are needed — without the middle state,
  a nag can't distinguish "never opened the app" from "opened it, nothing
  happened."
- **A tagging start point**, set once when the first import completes.
  Anything before it is fully exempt from review tracking — first import
  can bring in a year+ of history at once, and pretending accurate same-day
  recall is possible for months-old data would make the nag either fire
  uselessly for hundreds of nights or have to be silenced. No special
  visual treatment for exempt nights — they just look like ordinary
  untagged history.
- **Leak was deliberately dropped from tag correlation entirely.** Most of
  these tags affect breathing, not mask seal — showing a leak % next to
  every tag invited reading noise as signal. AHI only.
- Entry points: same-morning quick-tag (defaults to yesterday's date) and
  editing any past night from its own detail view. Same picker UI both
  ways.
- **Real push notifications are built** (tagging nag + an equipment-overdue
  nag sharing the same delivery mechanism), following the same
  GitHub-Actions-cron-triggers, Web-Push-delivers precedent noted above —
  it worked technically for a prior project, and this nag's tolerance for
  a day's timing slop (unlike that prior *time-sensitive* use case) made
  it worth trying here. The core problem it had to solve: this app has no
  backend and Actions has zero access to a user's local-only IndexedDB, so
  Actions can't itself know whether last night got tagged or the filter's
  overdue. Resolved by splitting trigger from decision — the cron job
  (`.github/workflows/notify.yml`, `scripts/send-push.mjs`) sends one
  content-free push daily, off-the-hour (GitHub recommends avoiding
  `:00`), landing in a UK morning; `src/sw.js`'s own `push` handler is
  what actually reads IndexedDB and decides whether (and what) to show,
  since a service worker shares storage with its page in a way the
  triggering server never can. Shared decision logic
  (`src/utils/nagLogic.js`) is deliberately dependency-free — the service
  worker must never pull in `lucide-react`, which both `scoring.js` and
  `tags.js` import at module scope. Settings has a master toggle (off by
  default) that walks through subscribing and shows the resulting
  subscription JSON for a one-time manual paste into a `PUSH_SUBSCRIPTION`
  GitHub secret — there's no backend to receive it automatically, and
  adding one would reintroduce exactly the external dependency this app's
  local-first design otherwise avoids. Full operational detail (VAPID key
  setup, which secrets, how to resubscribe) lives in
  `docs/push-notifications.md`, kept separate from this file since it's a
  copy-paste command reference with its own update lifecycle, not
  architecture narrative. **Accepted limitation, not a bug**: GitHub
  silently disables scheduled workflows after 60 days of repo inactivity,
  with no notification — Settings says to check the Actions tab if nags
  stop. **Confirmed working end-to-end on the real device**: the actual
  scheduled cron (not a manual `workflow_dispatch` test) delivered a
  correctly-worded tagging nag after the installed PWA had been
  force-quit and wasn't running at all overnight — the subscription
  survives a force-quit fine. (An earlier same-night theory that
  force-quitting kills the subscription was wrong; the real cause of
  that night's flakiness was almost certainly repeated service-worker
  redeploys during active debugging, not how the app was closed.)

## Known research items for the real build (flagged, not resolved)

- **Wake Lock API**: helps prevent screen-lock during a long import, but
  installed Home Screen PWAs on iOS had a real WebKit bug where it silently
  did nothing at all, fixed only in iOS 18.4. Treat as best-effort, keep a
  manual "don't background the app" warning regardless — the two aren't
  redundant, Wake Lock doesn't prevent backgrounding at all, only
  auto-lock.
- **Night View's date picker doesn't scale to 18 months of real history.**
  Flagged directly by the user after navigating back to March 2025 (the
  actual start of their therapy) required many taps through a short
  rolling date-chip strip with no jump-to-date/scrub mechanism. Explicitly
  deferred, not a bug to fix reactively — needs a real design pass.

## App identity

Name: **AirTrace**. A logo exists (blue-gradient crescent moon + a
waveform/wind motif) — ask for it if it's not already in the repo; don't
recreate a placeholder.

## Versioning

`APP_VERSION` (shown on the splash screen) should be sourced from
`package.json`'s own `version` field, not a separately maintained
constant — Vite can bake this in at build time, so there's exactly one
number to bump per release rather than several kept in sync by hand.
Worth adding a version bump (`npm version patch` or similar) as a step
in the GitHub Actions release workflow.

This matters more than it sounds: a prior no-build-step project needed
*four* separate version references bumped together every release (an app
constant, a service worker cache name, and two manual cache-busting query
strings on style/script tags) — a real, recurring pain point. A proper
build step avoids that whole class of problem essentially for free —
Vite's production builds content-hash output filenames automatically,
which handles cache invalidation without any manual query-string
bumping, and a single `package.json` version covers the rest.
