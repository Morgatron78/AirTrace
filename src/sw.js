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
import { getUntaggedDates, isOverdue, filterIntervalDays, computeNightTags, ahiTrend, toDateStr } from './utils/nagLogic.js'
import { TAG_LABEL, AUTO_TAGS } from './constants/tagLabels.js'
import { DEFAULT_TARGETS } from './constants/equipment.js'

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

// The GitHub Actions cron trigger sends a push carrying, at most, a
// label naming which of three fixed public schedules fired — no
// personal data ever crosses the wire. Every decision about whether to
// actually show a notification, and what it says, happens here, using
// this device's own IndexedDB directly (a service worker shares
// storage with its page, unlike the server that sent the push). A day
// that's already fully caught up shows nothing at all, matching the
// rest of the app's own "stays silent rather than asserting a pattern
// that isn't there" rule.
//
// Three checks share this one push handler, each triggered by its own
// notify.yml cron entry at a different time of day — see that file's own
// comment for the exact schedule. notify.yml tells this handler which
// check a real scheduled push is for (via github.event.schedule mapped to
// a plain 'morning'/'weekly'/'evening' string — still zero personal data,
// just a label for which of three fixed, public schedules fired) rather
// than this file reconstructing it from the device's own clock — see
// resolveKind's own comment for why guessing from wall-clock time turned
// out not to be safe enough to rely on.
//
// Shared by both tagging checks below (morning's softer nudge, evening's
// "last call") — fetches what's untagged and shows one notification if
// anything's outstanding, silent otherwise. copy(count) returns this
// check's own { title, body } wording for however many nights are
// untagged; only the wording and the notification's own `tag` (so an
// evening nag doesn't silently replace an unread morning one) differ
// between the two callers.
async function checkTagging(copy, notifTag) {
  const [tagsMap, tagStartDate] = await Promise.all([getAllTags(), getMeta('tagStartDate')])
  const untagged = getUntaggedDates(tagsMap, tagStartDate)
  if (untagged.length === 0) return
  const { title, body } = copy(untagged.length)
  await self.registration.showNotification(title, {
    body, tag: notifTag, icon: iconUrl,
    data: { url: `${SCOPE}?tag=yesterday` },
  })
}

async function handleMorningCheck() {
  const [equipment, summaries, lastEquipmentNag] = await Promise.all([
    getMeta('equipment'), getAllSummaries(), getMeta('lastEquipmentNagDate'),
  ])

  // --- Tagging nag: every day it's true, no cooldown — a day you
  // haven't tagged yesterday is worth a nudge every single time, not
  // just once. ---
  await checkTagging((n) => ({
    title: n === 1 ? "You haven't tagged last night yet" : `${n} nights need tagging`,
    body: n === 1
      ? 'Takes a few seconds — what happened before bed?'
      : "A few have piled up — worth catching up when you've got a moment.",
  }), 'tag-nag')

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

// Evening "last call" — tagging only, no equipment check at all (that
// stays morning-only; its own 7-day cooldown already makes a second
// check pointless). Only fires if still untagged since the morning
// check — no congratulatory notification if it's already done, matching
// the same anti-nag philosophy as the tagging nag itself. Its own
// notification `tag` (not 'tag-nag') so it doesn't silently replace an
// unread morning notification still sitting in Notification Center.
async function handleEveningCheck() {
  await checkTagging((n) => ({
    title: n === 1 ? 'Last call to tag last night' : `Last call — ${n} nights still need tagging`,
    body: n === 1
      ? 'A couple of minutes before bed — what happened?'
      : "Still a backlog — worth catching up before it grows.",
  }), 'tag-nag-evening')
}

// Saturday-midday weekly digest. Unlike the two nags above, this is
// deliberately not conditional on anything being "wrong" — it's a
// ritual recap, so it fires every week regardless of whether the news is
// good, bad, or steady. The only thing that stays it entirely is zero
// nights recorded in the trailing week: that's genuinely ambiguous (no
// real usage, or just a stale import) rather than something worth
// guessing about, the same "don't assert a pattern that isn't there"
// rule the rest of the app follows elsewhere. ahiTrend is given a lower
// minHalfSize than Trends' own UI use (3, not 6) — Trends can just fall
// back to a wider range instead of showing nothing, a scheduled weekly
// push has no equivalent fallback, so it degrades to a "not enough
// nights yet" clause rather than suppressing the whole notification.
async function handleWeeklySummary() {
  const [summaries, tagsMap, targets, tagStartDate] = await Promise.all([
    getAllSummaries(), getAllTags(), getMeta('targets'), getMeta('tagStartDate'),
  ])
  const t = targets || DEFAULT_TARGETS

  const yesterday = new Date(); yesterday.setHours(0, 0, 0, 0); yesterday.setDate(yesterday.getDate() - 1)
  const weekStart = new Date(yesterday); weekStart.setDate(weekStart.getDate() - 6)
  const priorWeekEnd = new Date(weekStart); priorWeekEnd.setDate(priorWeekEnd.getDate() - 1)
  const priorWeekStart = new Date(priorWeekEnd); priorWeekStart.setDate(priorWeekStart.getDate() - 6)
  const inRange = (n, start, end) => n.date >= toDateStr(start) && n.date <= toDateStr(end)
  // Filtered to the ~14 nights actually needed before computeNightTags
  // ever runs — summaries covers the device's entire lifetime history
  // (500+ nights for 18 months of data), and tagging them all just to
  // throw away everything outside these two weeks was pure waste.
  const relevant = summaries.filter((n) => inRange(n, priorWeekStart, yesterday))
  const merged = relevant.map((n) => ({ ...n, tags: computeNightTags(n, tagsMap, t.bedtime) }))
  const thisWeek = merged.filter((n) => inRange(n, weekStart, yesterday))
  const priorWeek = merged.filter((n) => inRange(n, priorWeekStart, priorWeekEnd))

  if (thisWeek.length === 0) return

  const { diffPct, tagShift, insufficientData } = ahiTrend(priorWeek, thisWeek, { minHalfSize: 3 })
  const trendClause = insufficientData
    ? 'Not enough nights yet to compare with last week.'
    : diffPct > 8
    ? `AHI up ${diffPct}% vs last week.`
    : diffPct < -8
    ? `AHI down ${Math.abs(diffPct)}% vs last week.`
    : 'AHI held steady vs last week.'
  const tagClause = tagShift
    ? ` ${TAG_LABEL[tagShift.tk]}${AUTO_TAGS.has(tagShift.tk) ? ' (auto-detected)' : ''} came up ${tagShift.ptDiff > 0 ? 'more' : 'less'} often — may be part of it.`
    : ''
  // Same exemption App.jsx and getUntaggedDates already apply — a night
  // before tagStartDate was never eligible for tagging (first import can
  // bring in a year+ of history at once), so it must not count against
  // this week's completion any more than it counts toward the daily nag.
  // Omitted entirely, not "0 of 0", if the whole week happens to predate
  // tagStartDate (or nothing's been imported yet at all).
  const taggedEligible = thisWeek.filter((n) => tagStartDate && n.date >= tagStartDate)
  const tagCompletionClause = taggedEligible.length > 0
    ? ` Tagged ${taggedEligible.filter((n) => tagsMap[n.date]).length} of ${taggedEligible.length} nights.`
    : ''

  await self.registration.showNotification('Your week in review', {
    body: trendClause + tagClause + tagCompletionClause,
    tag: 'weekly-summary', icon: iconUrl,
    data: { url: `${SCOPE}?nag=insights` },
  })
}

// Figures out which of the three checks this push is for. notify.yml
// maps github.event.schedule (which of the three cron entries actually
// fired) to a plain 'morning'/'weekly'/'evening' string and sends that
// in the payload — still zero personal data, just a label naming one of
// three fixed public schedules, the same category of thing FORCE_KIND
// already proved safe to send for manual testing.
//
// This used to be inferred from the device's own local clock hour
// instead, with no day-of-week check and no tie to which cron actually
// fired — looked safe (three cron times, three non-overlapping local-hour
// buckets) but wasn't: GitHub Actions documents that scheduled runs can
// be delayed, sometimes by hours, and a delayed morning push landing
// after 10am local silently ran the Saturday-summary branch instead of
// the real tagging/equipment check, on any day of the week. Travel adds
// the same failure a different way — the cron times were tuned for UK
// local time, so a genuine timezone difference (this app's own "Away
// from home" tag scenario) shifts which bucket a push lands in. Kept as
// a fallback below, not the primary signal, for the one real gap this
// can't close: an old, cached service worker that predates this fix
// receiving a `kind`-carrying payload it doesn't know to read.
function resolveKind(event) {
  let kind = null
  try {
    if (event.data) kind = event.data.json()?.kind || null
  } catch {
    // No payload on a push from a build that predates this — event.data
    // is null and this never even runs. A malformed payload would land
    // here too; either way, falling through to the clock-based guess
    // below is the safest available default, not a guaranteed-correct one.
  }
  if (kind && kind !== 'auto') return kind
  const hour = new Date().getHours()
  if (hour < 10) return 'morning'
  if (hour < 16) return 'weekly'
  return 'evening'
}

async function handlePush(event) {
  const kind = resolveKind(event)
  if (kind === 'evening') return handleEveningCheck()
  if (kind === 'weekly') return handleWeeklySummary()
  return handleMorningCheck()
}

self.addEventListener('push', (event) => {
  // No Mac means no Safari Web Inspector access to this service worker's
  // own console on a real iOS device — an exception in handlePush()
  // would otherwise fail completely silently, indistinguishable from a
  // day that's legitimately fully caught up. Surfacing it as a
  // notification is the only debugging visibility available here.
  event.waitUntil(
    handlePush(event).catch((err) => self.registration.showNotification('AirTrace: notification check failed', {
      body: String(err?.message || err),
      tag: 'debug-error',
    })),
  )
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
