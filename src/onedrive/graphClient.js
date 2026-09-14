// Thin wrapper around MSAL + Microsoft Graph for reading CardSync's
// backed-up CPAP data straight from OneDrive - see msalConfig.js for the
// setup this depends on, and docs/wifi-sd-sync.md (gitignored) for why
// this approach exists at all.
import { PublicClientApplication } from '@azure/msal-browser'
import { msalConfig, graphScopes } from './msalConfig'

const msalInstance = new PublicClientApplication(msalConfig)
let initialized = false
let redirectHandled = false

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
    if (result?.account) msalInstance.setActiveAccount(result.account)
  }
}

// Call once when the app/page loads, before checking isSignedIn() - this
// is what actually completes the sign-in after Microsoft redirects back.
export async function completeSignIn() {
  await ensureInitialized()
}

export function isSignedIn() {
  return msalInstance.getAllAccounts().length > 0
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

// AIRTRACE-FIX: confirmed live, twice, against a real ~100-night sync -
// two distinct throttling failures, both needing their own handling:
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
// 2) A real 429 "Too Many Requests" directly from Graph API itself,
//    confirmed on a real device partway through a real sync (broke at
//    night 75 of 100 after ~90s). The first version of this function
//    threw a plain Error before the 429's own Retry-After header could
//    ever be read, so it always fell back to blind exponential backoff
//    regardless of what Graph actually asked for - not long enough for
//    a sustained throttle window. Reading and honoring Retry-After (the
//    exact wait Graph itself specifies, in seconds) is Microsoft's own
//    documented guidance for this, not a guess.
const MAX_RETRIES = 4
async function graphFetchWithRetry(url, options, attempt = 0) {
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
    await new Promise((resolve) => setTimeout(resolve, retryAfterSec * 1000))
    return graphFetchWithRetry(url, options, attempt + 1)
  }
  throw new Error(`Graph API error: ${res.status} ${res.statusText}`)
}

async function graphFetch(url, options = {}) {
  return graphFetchWithRetry(url, options)
}

// path is relative to the OneDrive root, e.g. "CPAP backup" or
// "CPAP backup/DATALOG/20260913" - matches CardSync's own folder layout
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
