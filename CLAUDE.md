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
- SD card root has `STR.edf` (nightly summaries, kept indefinitely) plus a
  `DATALOG` folder (~5,442 files/year) containing per-night waveform detail
  in dated `YYYYMMDD` subfolders, files named `*BRP.edf` / `*EVE.edf` /
  `*PLD.edf`.
- `webkitdirectory` import in Safari works but takes 60-90s+ even for a
  browse — first real import (parsing everything) is estimated at up to 20
  minutes, unverified against real hardware yet.
- A competing tool (SleepHQ) took 1.5 hours and failed server-side on the
  same card — this is the direct justification for going local-first rather
  than cloud-upload.

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

## Real-build architecture (agreed, not started)

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
- Real push notification for the nag is a real-build research item, not
  mocked. Relevant precedent: GitHub Actions + Web Push was built for a
  prior project and technically worked, but Actions' cron scheduling proved
  loose enough in practice that it was set aside for a *time-sensitive* use
  case. This nag is much more tolerant of timing slop (a day late doesn't
  matter), so the same approach may well be fine here — worth trying, not
  assuming.

## Known research items for the real build (flagged, not resolved)

- **Wake Lock API**: helps prevent screen-lock during a long import, but
  installed Home Screen PWAs on iOS had a real WebKit bug where it silently
  did nothing at all, fixed only in iOS 18.4. Treat as best-effort, keep a
  manual "don't background the app" warning regardless — the two aren't
  redundant, Wake Lock doesn't prevent backgrounding at all, only
  auto-lock.

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
