import { T, currentMode } from '../constants/theme'
import { APP_NAME, APP_VERSION } from '../constants/app'
import logo from '../assets/logo.webp'

export function SplashScreen({ fadingOut }) {
  return (
    <div style={{
      // Deliberately not T.bg — that's a pale grey (#F3F3F5) in light
      // mode, and the splash is meant to be true white there, matching
      // how it always looked before dark mode existed. The earlier fix
      // for this screen's real bug (a hardcoded white background behind
      // theme-aware white text — illegible in dark mode) reached for
      // T.bg as the generic "theme-aware background" token without
      // noticing it isn't actually pure white in light mode. Asking
      // currentMode directly instead of reusing one of T's tokens gets
      // both ends right: true white in light, DARK_T.bg's near-black in
      // dark, not the app's usual off-white/near-black surface tones.
      position: 'fixed', inset: 0, zIndex: 100, background: currentMode === 'dark' ? '#0B0C10' : '#FFFFFF',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      opacity: fadingOut ? 0 : 1, transition: 'opacity 0.3s ease',
    }}>
      <img src={logo} alt="" width={220} height={220} style={{ marginBottom: 22 }} />
      <div className="font-display" style={{ fontSize: 26, fontWeight: 800, color: T.ink, letterSpacing: '-0.01em' }}>{APP_NAME}</div>
      <div className="font-display" style={{ fontSize: 12, fontWeight: 600, color: T.muted, marginTop: 6 }}>v{APP_VERSION}</div>
    </div>
  )
}
