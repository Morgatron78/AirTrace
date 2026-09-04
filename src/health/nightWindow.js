// Apple Health integration (POC) — safe to delete this file entirely,
// see docs/apple-health-integration.md.

// Converts a CPAP night's own local date/startHour/usage into an absolute
// [startMs, endMs) instant range, treating the browser's local timezone
// as authoritative — same implicit assumption the rest of the app already
// makes about night.startHour (no timezone-aware modeling exists anywhere
// in this codebase). Shared by the import-time matcher (matchNights.js)
// and the render-time popover lookup (EventsChart.jsx) specifically so
// both derivations of "where in the night is this" can't silently drift
// apart from each other.
//
// night.startHour is hours since local midnight of night.date, and can
// exceed 24 for a post-midnight session start (e.g. 25.5 = 1:30am the
// next calendar day) — see CLAUDE.md's noon-anchor convention for why
// night.date itself is anchored to the day the session started.
export function getNightWindowMs(night) {
  const startMs = new Date(`${night.date}T00:00:00`).getTime() + night.startHour * 3600000
  return { startMs, endMs: startMs + night.usage * 3600000 }
}
