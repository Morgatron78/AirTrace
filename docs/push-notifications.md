# Push notifications — operational runbook

How the tagging/equipment nags actually get delivered, and the exact
steps for setting up or recovering the one manual piece. Architecture and
design rationale live in `CLAUDE.md`; this is the copy-paste reference.

## How it works, in one paragraph

A GitHub Actions cron job (`.github/workflows/notify.yml`) sends one
content-free push a day via `scripts/send-push.mjs`. It carries no
personal data — it can't, since Actions has no access to your phone's
IndexedDB. The service worker (`src/sw.js`) is what actually decides
whether to show anything, and what it says, by reading your real data
locally when the push arrives. A day that's already fully caught up shows
nothing at all.

## One-time setup

### 1. Generate a VAPID key pair

Only needs doing once per app instance. If you're reading this because
you already have a pair (check whether `src/constants/push.js` already
has a `VAPID_PUBLIC_KEY` committed), skip to step 2.

```bash
npx web-push generate-vapid-keys --json
```

This prints a `publicKey` and `privateKey`. The public key is safe to
commit (it's baked into `src/constants/push.js` and the workflow file
already) — it's how a push service verifies a push came from whoever
holds the matching private key, not a secret in itself. The private key
must **never** be committed anywhere in this repo.

### 2. Set the private key as a GitHub secret

Repo → Settings → Secrets and variables → Actions → New repository
secret:

- Name: `VAPID_PRIVATE_KEY`
- Value: the `privateKey` from step 1

### 3. Enable notifications in the app, and copy the subscription

Open AirTrace on your phone (must be the installed Home Screen app on
iOS — Safari itself can't receive push in a regular tab) → Settings →
Notifications → **Turn on**. Accept the permission prompt. Once
subscribed, the card shows a **Copy subscription JSON** button.

### 4. Paste the subscription as a second GitHub secret

Same place as step 2:

- Name: `PUSH_SUBSCRIPTION`
- Value: the JSON copied in step 3, pasted exactly as-is

### 5. Test it

Repo → Actions → "Send push notification" → Run workflow
(`workflow_dispatch`) — don't wait on the cron schedule for a first
test. If nothing arrives, check the workflow's own logs first (they
never contain the subscription or payload by design, but they do show
whether the send itself succeeded or failed), then reread step 3 — a
mismatched or stale subscription is the most likely cause.

From then on it runs automatically once a day, off-the-hour, landing in
a UK morning (see the cron schedule and comment in `notify.yml`).

## Resubscribing

Subscriptions can expire or get silently revoked by the browser. The app
checks this itself every time Settings is opened — if the stored
subscription is gone, the toggle shows as off again rather than claiming
to still work. If that happens: Settings → Notifications → **Turn on**
again, then repeat step 4 above with the new JSON (it'll be different
from the old one).

## If nags stop arriving after a long quiet spell

GitHub silently disables scheduled workflows after 60 days without any
activity in the repository — no email, no warning. Check Actions → "Send
push notification" — if it shows as disabled, there's a button there to
re-enable it. This is a known, accepted limitation of using Actions'
free scheduler for a low-traffic personal project, not a bug.

## Local testing without GitHub Actions

`scripts/send-push.mjs` reads the same three values from plain
environment variables, so it's testable by hand before ever touching the
workflow:

```bash
VAPID_PUBLIC_KEY="<public key>" \
VAPID_PRIVATE_KEY="<private key>" \
PUSH_SUBSCRIPTION='<subscription JSON, single-quoted>' \
node scripts/send-push.mjs
```

A `410` response means the subscription's expired or doesn't exist —
expected if you're testing against a fake one, a real bug if it happens
against a subscription you just copied from a live device.
