// Thin wrapper around MSAL + Microsoft Graph for reading CardSync's
// backed-up CPAP data straight from OneDrive - see msalConfig.js for the
// setup this depends on, and docs/wifi-sd-sync.md (gitignored) for why
// this approach exists at all.
import { PublicClientApplication } from '@azure/msal-browser'
import { msalConfig, graphScopes } from './msalConfig'

const msalInstance = new PublicClientApplication(msalConfig)
let initialized = false
let redirectHandled = false
// AIRTRACE-FEATURE: true only for the one load that's the actual return
// trip from Microsoft (handleRedirectPromise() got a real result) - lets
// a caller tell "just signed back in this exact load" apart from "was
// already signed in from before," which autoSync.js's own cooldown needs
// (see its own comment on completeSignIn()'s return value).
let justCompletedRedirect = false

// AIRTRACE-FIX: loginPopup() fails in some automated/sandboxed browser
// contexts (confirmed: popup_window_error) - loginRedirect() instead
// navigates the current tab to Microsoft's sign-in page and back, which
// doesn't depend on window.open() succeeding at all. This also means any
// page using this module must call completeSignIn() once on load, to
// process the return trip from Microsoft.
async function ensureInitialized() {
  if (!initialized) {
    await msalInstance.initialize()
    initialized = true
  }
  if (!redirectHandled) {
    redirectHandled = true
    const result = await msalInstance.handleRedirectPromise()
    if (result?.account) {
      msalInstance.setActiveAccount(result.account)
      justCompletedRedirect = true
    }
  }
}

// Call once when the app/page loads, before checking isSignedIn() - this
// is what actually completes the sign-in after Microsoft redirects back.
// Returns whether THIS load is genuinely that return trip - see
// autoSync.js for the one real consumer of this.
export async function completeSignIn() {
  await ensureInitialized()
  return justCompletedRedirect
}

export function isSignedIn() {
  return msalInstance.getAllAccounts().length > 0
}

// The signed-in account's own username (its email/UPN, per MSAL) - Settings'
// "Connected as ___" line is the only current consumer. null when signed
// out; never throws even if called before ensureInitialized() has run.
export function getAccountEmail() {
  const account = msalInstance.getActiveAccount() ?? msalInstance.getAllAccounts()[0]
  return account?.username ?? null
}

export async function signIn() {
  await ensureInitialized()
  // prompt: 'select_account' forces Microsoft's own account chooser to
  // show explicitly, rather than the OS-level credential broker trying
  // to silently resolve to a single saved account (which surfaced only
  // personal accounts, not the actual Morgantech business one wanted).
  // Navigates away - nothing after this line runs until the app reloads
  // post-redirect and completeSignIn() picks the result back up.
  await msalInstance.loginRedirect({ scopes: graphScopes, prompt: 'select_account' })
}

export function signOut() {
  const account = msalInstance.getActiveAccount()
  if (account) msalInstance.logoutRedirect({ account })
}

// Silently renews using the cached session where possible - only falls
// back to an interactive redirect if the cached session has genuinely
// expired (matches how this is documented to behave for MSAL SPA apps).
async function getAccessToken() {
  await ensureInitialized()
  const account = msalInstance.getActiveAccount() ?? msalInstance.getAllAccounts()[0]
  if (!account) throw new Error('Not signed in to OneDrive')

  try {
    const result = await msalInstance.acquireTokenSilent({ scopes: graphScopes, account })
    return result.accessToken
  } catch {
    await msalInstance.acquireTokenRedirect({ scopes: graphScopes, account })
    throw new Error('Redirecting for re-authentication...')
  }
}

// AIRTRACE-FIX: confirmed live, three times now, against a real ~100-night
// sync - each fix so far addressed a real failure but not the underlying
// one:
//
// 1) A burst of concurrent /content requests (each redirects to a short-
//    lived, pre-authenticated SharePoint download.aspx URL) started
//    throwing as a browser CORS error even though most of the same burst
//    succeeded fine. That's SharePoint's own throttling under concurrent
//    load, not a real CORS misconfiguration - a throttled redirect
//    target can come back without the CORS header a healthy one carries,
//    and the browser reports that as a blocked fetch rather than
//    surfacing the actual throttling response. No Retry-After to read
//    here (the browser hides the throttled response entirely), so this
//    case just gets a short fixed backoff.
// 2) A real 429 "Too Many Requests" directly from Graph API itself
//    (broke at night 75 of 100 after ~90s). Reading and honoring
//    Retry-After (the exact wait Graph itself specifies) fixed that
//    specific request - but confirmed still failing on a retry: with
//    NIGHT_CONCURRENCY nights fetching at once, a throttling event tends
//    to hit several of them at the same moment, and each one backing off
//    and retrying independently meant they all came back in lockstep and
//    re-triggered the exact same throttle, burning through every retry
//    without ever actually spacing the request rate out.
// 3) The real fix: a MODULE-LEVEL shared cooldown, not a per-request one.
//    The instant any request sees a 429, every other request - in-flight
//    retries and requests that haven't started yet alike - waits out the
//    same cooldown before hitting Graph again, so one throttle event
//    actually slows the whole sync down instead of just the one unlucky
//    request that happened to receive it.
const MAX_RETRIES = 5
let throttledUntilMs = 0
async function waitOutSharedThrottle() {
  const remaining = throttledUntilMs - Date.now()
  if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining))
}
async function graphFetchWithRetry(url, options, attempt = 0) {
  await waitOutSharedThrottle()
  const token = await getAccessToken()
  let res
  try {
    res = await fetch(url, {
      ...options,
      headers: { ...options.headers, Authorization: `Bearer ${token}` },
    })
  } catch (err) {
    // Network-level failure (fetch threw outright) - the SharePoint-
    // redirect CORS case above. No response to inspect, just back off.
    if (attempt >= MAX_RETRIES) throw err
    await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt))
    return graphFetchWithRetry(url, options, attempt + 1)
  }
  if (res.ok) return res
  if (res.status === 429 && attempt < MAX_RETRIES) {
    const retryAfterSec = Number(res.headers.get('Retry-After')) || 2 * 2 ** attempt
    // Math.max, not a plain overwrite - a second, later 429 with a
    // shorter Retry-After (or one that arrives after another request
    // already extended the cooldown further) must never shrink the
    // window everyone else is already waiting on.
    throttledUntilMs = Math.max(throttledUntilMs, Date.now() + retryAfterSec * 1000)
    await waitOutSharedThrottle()
    return graphFetchWithRetry(url, options, attempt + 1)
  }
  // AIRTRACE-FEATURE: .status attached (not just baked into the message
  // string) so a caller that genuinely needs to tell "this specific
  // resource doesn't exist" (404) apart from any other failure can do so
  // without parsing text - see oneDriveHealthImport.js's own use of this,
  // where only a 404 (the Health Exports folder never having been
  // created) should be treated as "nothing to do yet" rather than a real
  // error worth surfacing.
  throw Object.assign(new Error(`Graph API error: ${res.status} ${res.statusText}`), { status: res.status })
}

async function graphFetch(url, options = {}) {
  return graphFetchWithRetry(url, options)
}

// path is relative to the OneDrive root, e.g. "CPAP Data" or
// "CPAP Data/DATALOG/20260913" - matches CardSync's own folder layout
// exactly, since it's the same folder CardSync writes into.
//
// AIRTRACE-FIX: Graph API pages /children at a server-chosen size (seen:
// exactly 200) - a DATALOG folder with a year+ of nightly folders is well
// past that, and an unpaginated call silently returned only the first
// page (earliest-dated folders, since Graph's default order put those
// first), losing every night from partway through 2025 onward with no
// error at all. Follow @odata.nextLink until it's absent.
export async function listFolder(path) {
  let url = `https://graph.microsoft.com/v1.0/me/drive/root:/${encodeURIComponent(path)}:/children?$top=200`
  const entries = []
  while (url) {
    const res = await graphFetch(url)
    const body = await res.json()
    entries.push(...body.value) // [{ name, size, file: {...} | folder: {...}, ... }]
    url = body['@odata.nextLink'] ?? null
  }
  return entries
}

export async function downloadFile(path) {
  const res = await graphFetch(
    `https://graph.microsoft.com/v1.0/me/drive/root:/${encodeURIComponent(path)}:/content`
  )
  return res.arrayBuffer()
}

// Graph's "simple upload" - a single PUT, whole file in one request, no
// resumable-upload-session complexity. Only used for AirTrace's own local
// backup file (onedrive/oneDriveBackup.js) - summaries/tags/settings only,
// no waveform data, so it stays well under the 4MB ceiling this endpoint
// imposes regardless of import history length. Requires Files.ReadWrite
// (see msalConfig.js's own AIRTRACE-FIX note on that). Per Microsoft's
// documented behavior for path-based addressing, a PUT to a path that
// doesn't exist yet creates it along with any missing intermediate
// folders - not independently confirmed against a real account yet, worth
// checking on the very first real push rather than assuming.
export async function uploadFile(path, content, contentType) {
  await graphFetch(
    `https://graph.microsoft.com/v1.0/me/drive/root:/${encodeURIComponent(path)}:/content`,
    { method: 'PUT', headers: { 'Content-Type': contentType }, body: content }
  )
}
