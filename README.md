<p align="center">
  <img src="src/assets/logo.webp" alt="AirTrace" width="96" />
</p>

<h1 align="center">AirTrace</h1>

<p align="center">
  Local-first CPAP therapy data, parsed entirely on your own device from the SD card in your machine.<br />
  No upload, no account, no server in the loop — ever.
</p>

<p align="center">
  <a href="https://morgatron78.github.io/AirTrace/">Live app →</a>
</p>

---

AirTrace reads the SD card from a ResMed AirSense CPAP machine directly in the browser — the EDF+ files are parsed client-side, stored in IndexedDB on the phone, and never leave it. It exists to do two things neither of ResMed's own myAir app nor the community favourite [OSCAR](https://www.sleepfiles.com/OSCAR/) does on its own: go deeper than myAir's daily score, and be genuinely usable on a phone the way OSCAR is on a desktop.

## The actual point of the app

Every other CPAP app answers "how did I sleep." AirTrace also asks **why** — by letting you log a handful of lifestyle factors each morning (alcohol, a late meal, being away from home, high stress, congestion) and correlating them against that night's AHI. It's the one thing that makes this app worth having alongside myAir rather than instead of it, and every other feature is built to serve that, not to compete with it.

- **Tag correlation** — per-tag AHI impact, computed against your own baseline, not a generic threshold
- **Compounding combinations** — checks all pairwise combinations of what you logged (not just one hardcoded pair), and only surfaces a combination when it's genuinely worse than either factor alone
- **Trend explanations** — when your AHI moves over a week/fortnight/month, AirTrace checks whether any tag's own frequency shifted enough to explain it, and names it
- **A late-start tag that logs itself** — computed from your machine's own session-start time against a target bedtime, no manual entry needed

## Depth where it matters

- **Real EDF parsing**, off the main thread in a Web Worker — a first import of a full multi-year card runs client-side without freezing the UI
- **Full-night waveform charts** — Flow, Mask Pressure, Leak Rate, Flow Limit, Snore, Tidal Volume, Respiratory Rate, Minute Ventilation, Therapy Pressure, individually zoomable and pannable
- **Synchronized multi-channel view** — overlay up to three channels on one shared timeline
- **Tap an event, see everything** — tapping a single flagged event (obstructive/central/hypopnea) in Night View jumps *every* individual channel to that exact moment in synchrony, so you can see what every signal was actually doing during one specific event, not just its AHI count
- **A real backup** — export your night history and tags to a file you control, restore it on a new phone; nothing here depends on a server existing

## Why local-first

A competing cloud-upload tool took 90 minutes and then failed server-side importing the exact same card AirTrace now parses client-side in a fraction of that. Going local-first wasn't a defaults choice — it's a direct response to that failure, and it's why there's no account system, no upload step, and no backend anywhere in this repo.

## Platform

Built primarily for **iOS, installed to the Home Screen**. That's not an afterthought — it's the reason a few specific decisions exist: Home Screen install exempts the PWA from Safari's 7-day tab-eviction policy, which a regular browser tab wouldn't survive; folder import relies on `webkitdirectory`, which needs a real device rather than desktop dev tools to verify properly. Development happens on Windows; testing happens on the phone.

## Tech stack

- **React 19 + Vite** — no framework beyond what's needed
- **IndexedDB** (via [`idb`](https://github.com/jakearchibald/idb)) for on-device storage, with a two-tier retention policy: daily summaries kept forever, full waveform detail rolling on a 90-day window
- **A Web Worker** for parsing, so a 20-minute first import never blocks the UI
- **GitHub Actions → GitHub Pages** — every push to `main` bumps the version, builds, and deploys automatically

## Getting started

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
```

There's no seed data in this repo — real therapy data is inherently personal, so `Sample_CPAP_Data/` (a real SD card layout used for local development) is gitignored and never committed. To develop against real data, point the app's Import screen at your own AirSense SD card's root folder.

## Status

Actively developed. Every push to `main` deploys automatically — the version shown on the splash screen is the single source of truth, read straight from `package.json` at build time.

---

<p align="center"><sub>Built entirely through conversation with <a href="https://claude.com/claude-code">Claude Code</a> — the author has no coding background and hasn't written a line of this by hand.</sub></p>
