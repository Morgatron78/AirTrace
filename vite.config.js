import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vite'

const pkg = JSON.parse(
  readFileSync(fileURLToPath(new URL('./package.json', import.meta.url)), 'utf-8'),
)

// https://vite.dev/config/
export default defineConfig({
  base: '/AirTrace/',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // injectManifest, not the previous (simpler) generateSW default —
      // push notifications need a `push` event listener, and generateSW
      // builds a fully auto-generated worker with no room for custom
      // code. src/sw.js is now responsible for what generateSW used to
      // do silently (skipWaiting/clientsClaim/precacheAndRoute — see
      // that file's own top few lines).
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'AirTrace',
        short_name: 'AirTrace',
        description: 'Local-first CPAP therapy data, parsed on-device from your SD card.',
        theme_color: '#3B6FE0',
        background_color: '#F3F3F5',
        display: 'standalone',
        start_url: '/AirTrace/',
        scope: '/AirTrace/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      // Precache the built app shell only for now — the real offline/caching
      // strategy for imported CPAP data waits for the IndexedDB storage
      // layer (see CLAUDE.md's real-build architecture notes). Same
      // globPatterns value as before injectManifest — just a different
      // config key (injectManifest, not workbox, now that src/sw.js
      // itself calls precacheAndRoute rather than vite-plugin-pwa
      // generating that call for us).
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,webp,woff2}'],
      },
    }),
  ],
})
