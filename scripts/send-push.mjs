// Runs only under Node in GitHub Actions (.github/workflows/notify.yml) —
// never shipped to the client. Sends one content-free push: no personal
// data crosses the wire, ever. All real decision-making (is yesterday
// tagged? is equipment overdue? what should the notification say?)
// happens entirely on-device, in src/sw.js's own `push` event handler,
// which has access to this browser's real IndexedDB — something this
// script, running on GitHub's servers, never does and never will. See
// docs/push-notifications.md for the one-time setup this depends on.
import webpush from 'web-push'

const { VAPID_PRIVATE_KEY, VAPID_PUBLIC_KEY, PUSH_SUBSCRIPTION } = process.env

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
  // No payload body at all — the point of the split architecture (see
  // CLAUDE.md / docs/push-notifications.md) is that this trigger carries
  // zero personal data. src/sw.js's `push` handler ignores event.data
  // entirely and decides everything itself from local IndexedDB.
  await webpush.sendNotification(subscription)
  console.log('Push sent.')
} catch (err) {
  // A 404/410 here means the subscription has expired or been revoked —
  // expected eventually, not a script bug. The app's own
  // resubscribe-check-on-open (SettingsScreen.jsx) is what recovers from
  // this; nothing to retry here.
  console.error(`Push failed: ${err.statusCode || ''} ${err.message}`.trim())
  process.exit(1)
}
