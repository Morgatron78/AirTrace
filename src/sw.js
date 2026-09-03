// Switched from generateSW to injectManifest specifically to get a
// `push` event hook — generateSW (the previous, simpler setup) builds
// a fully auto-generated service worker with no room for custom code.
// That means this file is now responsible for precache registration
// too, which generateSW used to handle silently — see the top few
// lines below.
import { precacheAndRoute } from 'workbox-precaching'
import { clientsClaim } from 'workbox-core'

self.skipWaiting()
clientsClaim()
precacheAndRoute(self.__WB_MANIFEST)

import { getAllTags } from './db/tags.js'
import { getMeta, setMeta } from './db/meta.js'
import { getAllSummaries } from './db/nights.js'
import { getUntaggedDates, isOverdue, filterIntervalDays } from './utils/nagLogic.js'

const SCOPE = self.registration.scope // e.g. https://morgatron78.github.io/AirTrace/
const iconUrl = new URL('icons/icon-192.png', SCOPE).href
const daysAgo = (dateStr) => Math.floor((Date.now() - new Date(dateStr)) / 86400000)

// Fixed thresholds matching MaintenanceRow's own (EquipmentScreen.jsx) —
// filter's is dynamic (filterIntervalDays), the other two are constants
// there too, duplicated here rather than imported since EquipmentScreen
// itself isn't safe to pull into a service worker (React component,
// lucide-react icons, DOM).
const CUSHION_INTERVAL_DAYS = 90
const HEADGEAR_INTERVAL_DAYS = 14
const EQUIPMENT_NAG_COOLDOWN_DAYS = 7

// The GitHub Actions cron trigger sends a content-free push — no
// personal data ever crosses the wire. Every decision about whether to
// actually show a notification, and what it says, happens here, using
// this device's own IndexedDB directly (a service worker shares
// storage with its page, unlike the server that sent the push). A day
// that's already fully caught up shows nothing at all, matching the
// rest of the app's own "stays silent rather than asserting a pattern
// that isn't there" rule.
async function handlePush() {
  const [tagsMap, tagStartDate, equipment, summaries, lastEquipmentNag] = await Promise.all([
    getAllTags(), getMeta('tagStartDate'), getMeta('equipment'), getAllSummaries(), getMeta('lastEquipmentNagDate'),
  ])

  // --- Tagging nag: every day it's true, no cooldown — a day you
  // haven't tagged yesterday is worth a nudge every single time, not
  // just once. ---
  const untagged = getUntaggedDates(tagsMap, tagStartDate)
  if (untagged.length > 0) {
    const title = untagged.length === 1 ? "You haven't tagged last night yet" : `${untagged.length} nights need tagging`
    const body = untagged.length === 1
      ? 'Takes a few seconds — what happened before bed?'
      : "A few have piled up — worth catching up when you've got a moment."
    await self.registration.showNotification(title, {
      body, tag: 'tag-nag', icon: iconUrl,
      data: { url: `${SCOPE}?tag=yesterday` },
    })
  }

  // --- Equipment nag: same thresholds already shown in-app (Equipment
  // screen's MaintenanceRow, Today's own getPrimaryInsight banner) —
  // cushion/headgear/filter, not "last cleaned" (stays Equipment-
  // screen-only there too). Own 7-day cooldown so a still-overdue
  // filter doesn't nag every single day once it's already been raised
  // once. ---
  const daysSinceLastEquipmentNag = lastEquipmentNag ? daysAgo(lastEquipmentNag) : Infinity
  if (equipment && daysSinceLastEquipmentNag >= EQUIPMENT_NAG_COOLDOWN_DAYS) {
    const filterInterval = filterIntervalDays(summaries)
    const overdue = []
    if (equipment.cushionChanged) {
      const d = daysAgo(equipment.cushionChanged)
      if (isOverdue(d, CUSHION_INTERVAL_DAYS)) overdue.push({ label: 'Cushion', overBy: d - CUSHION_INTERVAL_DAYS })
    }
    if (equipment.headgearWashed) {
      const d = daysAgo(equipment.headgearWashed)
      if (isOverdue(d, HEADGEAR_INTERVAL_DAYS)) overdue.push({ label: 'Headgear', overBy: d - HEADGEAR_INTERVAL_DAYS })
    }
    if (equipment.filterChanged) {
      const d = daysAgo(equipment.filterChanged)
      if (isOverdue(d, filterInterval)) overdue.push({ label: 'Filter', overBy: d - filterInterval })
    }

    if (overdue.length > 0) {
      overdue.sort((a, b) => b.overBy - a.overBy)
      const worst = overdue[0]
      const title = overdue.length === 1
        ? `${worst.label} overdue by ${worst.overBy} day${worst.overBy === 1 ? '' : 's'}`
        : `${overdue.length} equipment items overdue`
      const body = overdue.length === 1
        ? 'Worth sorting out when you get a chance.'
        : `${overdue.map((o) => o.label).join(', ')} are all overdue.`
      await self.registration.showNotification(title, {
        body, tag: 'equipment-nag', icon: iconUrl,
        data: { url: `${SCOPE}?nag=equipment` },
      })
      await setMeta('lastEquipmentNagDate', new Date().toISOString())
    }
  }
}

self.addEventListener('push', (event) => {
  event.waitUntil(handlePush())
})

// Focus the already-open installed PWA and navigate it, rather than
// always spawning a second window — falls back to opening a new one
// only if nothing's currently open. client.navigate can throw on some
// engines; falling through to openWindow on any failure is the safe
// default rather than leaving the tap doing nothing.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || SCOPE
  event.waitUntil((async () => {
    const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const client of allClients) {
      if ('focus' in client) {
        try {
          await client.navigate(url)
          await client.focus()
          return
        } catch {
          break
        }
      }
    }
    await clients.openWindow(url)
  })())
})
