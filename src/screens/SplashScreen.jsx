import { T } from '../constants/theme'
import { APP_NAME, APP_VERSION } from '../constants/app'
import logo from '../assets/logo.webp'

export function SplashScreen({ fadingOut }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100, background: '#FFFFFF',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      opacity: fadingOut ? 0 : 1, transition: 'opacity 0.3s ease',
    }}>
      <img src={logo} alt="" width={220} height={220} style={{ marginBottom: 22 }} />
      <div className="font-display" style={{ fontSize: 26, fontWeight: 800, color: T.ink, letterSpacing: '-0.01em' }}>{APP_NAME}</div>
      <div className="font-display" style={{ fontSize: 12, fontWeight: 600, color: T.muted, marginTop: 6 }}>v{APP_VERSION}</div>
    </div>
  )
}
