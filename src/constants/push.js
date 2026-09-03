// The public half of a VAPID key pair — safe to ship in the client
// bundle by design (this is what a push service uses to verify pushes
// actually came from whoever holds the matching private key, not a
// secret in itself). The private half is never in this repo at all —
// it lives only as a GitHub Actions secret (VAPID_PRIVATE_KEY), read by
// scripts/send-push.mjs. See docs/push-notifications.md for the full
// one-time setup.
export const VAPID_PUBLIC_KEY = 'BBYcjT8DoAHZeuBrnUBCQVCNdO3qdqKKgA3CNGzYoh3gBoNrC61HuLfz9x634SARZjcp4ZuHnVH3tsKIuOKm9XY'
