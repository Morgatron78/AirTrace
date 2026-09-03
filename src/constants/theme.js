// T's five neutral tokens are mutated in place (not reassigned) when dark
// mode toggles — see applyTheme below — so every file that already does
// `import { T } from '.../theme'` and reads T.bg/T.surface/etc. inside its
// own render picks up the change automatically on the next render, with
// no change needed to any of the ~30 files that already import T this
// way. This only works because those reads happen live, during render —
// a module-level constant that captures T.muted's *value* once at import
// time (rather than reading T.muted itself) would never see the update;
// tags.js's TAG_COLOR/TAG_GRADIENT.lateStart hit exactly this and use
// fixed literals instead, for that reason.
//
// C (the five accent colors) and SEV (good/fair/bad) are deliberately
// NOT part of dark mode at all — they're vivid enough to read on both
// light and dark surfaces already, and every screen's own charts/rings/
// tag colors assume they're constant. Only T's neutrals differ between
// themes.
const LIGHT_T = { bg: '#F3F3F5', surface: '#FFFFFF', line: '#EDEDF0', ink: '#0A0A0C', muted: '#7C7C88' }
const DARK_T = { bg: '#0B0C10', surface: '#17181D', line: '#26272C', ink: '#F2F2F5', muted: '#93939F' }

export const T = { ...LIGHT_T }
export const C = { blue: '#3B6FE0', purple: '#7C4DE0', pink: '#E85C9A', orange: '#F0A23C', red: '#E5484D' }
export const SEV = { good: '#22B36B', fair: '#F0A23C', bad: '#E5484D' }

// mode: 'light' | 'dark'. Called once on load (after resolving the
// user's stored preference, defaulting to their OS setting) and again
// any time either changes — see App.jsx's own useEffect for both. Every
// caller is responsible for forcing a re-render afterward (mutating T's
// properties doesn't itself notify React); App.jsx does this by keying
// its whole tree on the resolved mode.
export function applyTheme(mode) {
  Object.assign(T, mode === 'dark' ? DARK_T : LIGHT_T)
}
