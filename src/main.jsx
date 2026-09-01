import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.jsx'

registerSW({ immediate: true })

// registerType: 'autoUpdate' (see vite.config.js) makes a new service worker
// skip waiting and claim clients as soon as it's installed, but an already
// open tab/standalone session doesn't reload itself just because a new
// worker took control — it keeps running the JS it already loaded. Without
// this, "deploy a fix, relaunch the installed PWA" can still show stale
// content until the OS eventually kills and restarts the WebView on its
// own schedule. One controlled reload the first time control changes fixes
// that without risking a reload loop.
if ('serviceWorker' in navigator) {
  let refreshed = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshed) return
    refreshed = true
    window.location.reload()
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
