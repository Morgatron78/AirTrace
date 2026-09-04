// Runs only under Node in GitHub Actions (.github/workflows/notify.yml) —
// never shipped to the client. Sends a push carrying, at most, one small
// label: no personal data crosses the wire, ever. All real
// decision-making (is yesterday tagged? is equipment overdue? what
// should the weekly summary say?) happens entirely on-device, in
// src/sw.js's own `push` event handler, which has access to this
// browser's real IndexedDB — something this script, running on GitHub's
// servers, never does and never will. See docs/push-notifications.md
// for the one-time setup this depends on.
//
// The label: KIND, set by notify.yml's own "Determine push kind" step
// from which of the three fixed cron schedules actually triggered this
// run — still not personal data, just naming a public, fixed schedule.
// This used to not exist at all; src/sw.js instead guessed the same
// thing from the device's own local clock, which broke on a delayed
// scheduled run or genuine device-timezone travel. FORCE_KIND is the
// one thing set by hand, only on a manual workflow_dispatch test run,
// and takes priority over KIND when present so a specific check can be
// tested on demand.
import webpush from 'web-push'

const { VAPID_PRIVATE_KEY, VAPID_PUBLIC_KEY, PUSH_SUBSCRIPTION, KIND, FORCE_KIND } = process.env

if (!VAPID_PRIVATE_KEY || !VAPID_PUBLIC_KEY || !PUSH_SUBSCRIPTION) {
  console.error('Missing one or more required env vars: VAPID_PRIVATE_KEY, VAPID_PUBLIC_KEY, PUSH_SUBSCRIPTION')
  process.exit(1)
}

// Never log the subscription or any payload — this repo is public, and
// Actions log redaction only catches exact-substring matches, which
// pretty-printed/re-serialized JSON can slip past.
let subscription
try {
  subscription = JSON.parse(PUSH_SUBSCRIPTION)
} catch {
  console.error('PUSH_SUBSCRIPTION is not valid JSON (not logging its contents).')
  process.exit(1)
}

webpush.setVapidDetails(
  // A mailto: contact is required by the Web Push protocol (it's how a
  // push service could reach the sender about a misbehaving app) — not
  // used for anything else here.
  'mailto:morgan_cope@hotmail.com',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY,
)

try {
  // FORCE_KIND (manual test override) wins over KIND (the real
  // schedule-derived label) when it's explicitly set to something other
  // than "auto". Otherwise KIND, if the schedule-match step found one.
  // Neither set at all (e.g. a workflow_dispatch run left on "auto")
  // means no payload — src/sw.js's resolveKind() falls back to its own
  // local-clock guess in that case, same as it always could.
  const kind = (FORCE_KIND && FORCE_KIND !== 'auto') ? FORCE_KIND : (KIND || null)
  const payload = kind ? JSON.stringify({ kind }) : undefined
  await webpush.sendNotification(subscription, payload)
  console.log(payload ? `Push sent (kind: ${kind}).` : 'Push sent (no kind — sw.js will infer from local time).')
} catch (err) {
  // A 404/410 here means the subscription has expired or been revoked —
  // expected eventually, not a script bug. The app's own
  // resubscribe-check-on-open (SettingsScreen.jsx) is what recovers from
  // this; nothing to retry here.
  console.error(`Push failed: ${err.statusCode || ''} ${err.message}`.trim())
  process.exit(1)
}
