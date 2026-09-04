// Runs only under Node in GitHub Actions (.github/workflows/notify.yml) —
// never shipped to the client. Sends one content-free push: no personal
// data crosses the wire, ever. All real decision-making (is yesterday
// tagged? is equipment overdue? what should the weekly summary say?)
// happens entirely on-device, in src/sw.js's own `push` event handler,
// which has access to this browser's real IndexedDB — something this
// script, running on GitHub's servers, never does and never will. See
// docs/push-notifications.md for the one-time setup this depends on.
//
// The one exception to "no payload at all": FORCE_KIND, set only by a
// manual workflow_dispatch test run (never by the real schedule
// trigger) — still not personal data, just a label telling the service
// worker which of its three checks to run instead of inferring one from
// local time, so any of them can be tested on demand. See sw.js's own
// resolveKind for how it's read.
import webpush from 'web-push'

const { VAPID_PRIVATE_KEY, VAPID_PUBLIC_KEY, PUSH_SUBSCRIPTION, FORCE_KIND } = process.env

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
  // No payload at all on a real scheduled run — the point of the split
  // architecture (see CLAUDE.md / docs/push-notifications.md) is that
  // this trigger carries zero personal data, and src/sw.js's `push`
  // handler decides everything itself from local IndexedDB. FORCE_KIND
  // is the one deliberate exception, and only ever set by hand — see
  // this file's own header comment.
  const payload = FORCE_KIND && FORCE_KIND !== 'auto' ? JSON.stringify({ forceKind: FORCE_KIND }) : undefined
  await webpush.sendNotification(subscription, payload)
  console.log(payload ? `Push sent (forceKind: ${FORCE_KIND}).` : 'Push sent.')
} catch (err) {
  // A 404/410 here means the subscription has expired or been revoked —
  // expected eventually, not a script bug. The app's own
  // resubscribe-check-on-open (SettingsScreen.jsx) is what recovers from
  // this; nothing to retry here.
  console.error(`Push failed: ${err.statusCode || ''} ${err.message}`.trim())
  process.exit(1)
}
