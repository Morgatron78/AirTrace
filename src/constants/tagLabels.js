// The plain-data half of tags.js, split out specifically so the service
// worker can import it safely — tags.js itself pulls in lucide-react for
// TAG_ICON, which nagLogic.js's own header comment already explains must
// never end up in the service worker bundle. tags.js re-exports these two,
// so nothing else in the app needs to know this split exists.
export const TAG_LABEL = { alcohol: 'Alcohol', lateMeal: 'Late meal', awayFromHome: 'Away from home', highStress: 'High stress', illness: 'Congestion/illness', lateStart: 'Late start' }

// Auto-detected from the machine's own data (session start vs. Target
// bedtime) — never logged by the user, always known, never part of the
// review/nag flow. Flagged separately so anywhere tags are shown can mark
// it as computed rather than something the user reported.
export const AUTO_TAGS = new Set(['lateStart'])
