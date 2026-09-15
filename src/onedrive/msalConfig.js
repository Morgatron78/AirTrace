// OneDrive sync (via Microsoft Graph API) - reads CardSync's backed-up
// CPAP data directly from OneDrive, bypassing both the card's own
// mixed-content-blocked direct fetch() and the OS file-picker's inability
// to browse OneDrive as a folder (see docs/wifi-sd-sync.md in this repo,
// gitignored, for the full background on why this approach was chosen
// over talking to the WiFi SD card directly).
//
// Registered 2026-09-14 in the Entra admin center as "AirTrace" -
// account type "Any Entra ID Tenant + Personal Microsoft accounts"
// (deliberately broad, not restricted to the Morgantech tenant, so any
// future AirTrace user - most of whom would have a personal OneDrive,
// not a business one - can sign in too), platform type "Single-page
// application", redirect URI matching this app's real deployed URL.
const CLIENT_ID = '9d3c2fe8-9378-417f-b092-a98b5a7b8360'

// AIRTRACE-FIX: was a hardcoded production URL - meant every sign-in
// attempt requested that as the redirect target regardless of which
// origin the app was actually running from, so testing against the
// local dev server (a separately-registered, valid redirect URI) kept
// silently landing back on the real production site instead, with the
// resulting session trapped in that origin's storage (origins don't
// share localStorage) and invisible to the page that started the flow.
// AIRTRACE-FIX: origin alone isn't enough either - the redirect has to
// land on the exact page that actually calls completeSignIn(), or the
// response is silently dropped (confirmed: landing on the real app's
// own index.html, which has no MSAL code at all, lost it entirely).
// origin + pathname returns to whichever specific page initiated the
// sign-in - correct for both this POC page and, later, wherever the
// real app's own OneDrive UI ends up living - as long as that exact
// path is also registered as a redirect URI in the Entra app.
export const msalConfig = {
  auth: {
    clientId: CLIENT_ID,
    authority: 'https://login.microsoftonline.com/common',
    redirectUri: window.location.origin + window.location.pathname,
  },
  cache: {
    // localStorage (not the default sessionStorage) so the sign-in
    // session survives closing and reopening the installed PWA - same
    // reasoning as why AirTrace is installed to the Home Screen at all,
    // rather than used as a regular Safari tab (see CLAUDE.md's Wake
    // Lock / ITP eviction notes) - only an installed PWA gets exemption
    // from Safari's 7-day storage eviction, so this only reliably
    // persists when used that way.
    cacheLocation: 'localStorage',
  },
}

// AIRTRACE-FIX: was 'Files.Read' - read-only was correct while OneDrive
// Sync only ever pulled CardSync's backed-up CPAP data in. Now that
// AirTrace also pushes its own local backup file to OneDrive
// (onedrive/oneDriveBackup.js), it genuinely needs write access too.
// Real consequence, not free: anyone already signed in under the old
// read-only scope needs a one-time re-consent - acquireTokenSilent fails
// against a broader scope than what was originally granted, falling
// through to an interactive prompt next time they touch OneDrive Sync.
export const graphScopes = ['Files.ReadWrite']
