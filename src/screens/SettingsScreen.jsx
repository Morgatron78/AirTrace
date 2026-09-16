import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, Minus, Plus, User, Hash, Phone, Download, Upload, TriangleAlert, Copy, Check } from 'lucide-react'
import { T, SEV } from '../constants/theme'
import { daysAgo, formatClock } from '../utils/dates'
import { CardTitle } from '../components/CardTitle'
import { TextEditRow } from '../components/TextEditRow'
import { Segmented } from '../components/Segmented'
import { buildBackup, parseBackup, restoreBackup } from '../db/backup.js'
import { getMeta, setMeta } from '../db/meta.js'
import { VAPID_PUBLIC_KEY } from '../constants/push.js'
import { APP_VERSION } from '../constants/app.js'
import { cmToFeetInches } from '../utils/units.js'
// ONEDRIVE — see docs/wifi-sd-sync.md (gitignored) for the full
// background. This screen only ever reads sign-in status and offers
// disconnect - the sign-in flow itself stays on the Import screen, where
// the actual sync action lives, so there's exactly one place that starts
// it rather than two slightly different entry points that could drift.
import { completeSignIn, getAccountEmail, signOut } from '../onedrive/graphClient.js'

// Standard Web Push conversion — pushManager.subscribe wants the VAPID
// public key as a raw Uint8Array, not the base64url string it's
// generated/shared/stored as everywhere else.
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

function StepperRow({ label, value, unit, onChange, step, min, max, last, formatValue }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 44, boxSizing: 'border-box', borderBottom: last ? 'none' : `1px solid ${T.line}` }}>
      <span className="font-display" style={{ fontSize: 14.5, color: T.ink }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => onChange(Math.max(min, +(value - step).toFixed(2)))} style={{ width: 28, height: 28, borderRadius: '50%', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Minus size={13} style={{ color: T.ink }} />
        </button>
        <span className="font-display" style={{ fontSize: 15, fontWeight: 700, color: T.ink, minWidth: 64, textAlign: 'center' }}>
          {formatValue ? formatValue(value) : <>{value} <span style={{ fontSize: 11, fontWeight: 500, color: T.muted }}>{unit}</span></>}
        </span>
        <button onClick={() => onChange(Math.min(max, +(value + step).toFixed(2)))} style={{ width: 28, height: 28, borderRadius: '50%', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Plus size={13} style={{ color: T.ink }} />
        </button>
      </div>
    </div>
  )
}

export function SettingsScreen({ onBack, targets, onChange, profile, onChangeProfile, themeMode, onChangeThemeMode, heightUnit, onChangeHeightUnit, weightUnit, onChangeWeightUnit,
  oneDriveSyncEnabled, onChangeOneDriveSyncEnabled, oneDriveBasePath, onChangeOneDriveBasePath }) {
  const set = (key) => (val) => onChange({ ...targets, [key]: val })
  const setProfile = (key) => (val) => onChangeProfile({ ...profile, [key]: val })

  // ONEDRIVE — self-fetched the same way hasWeightData is below: a
  // screen-local read on mount, since nothing else on this screen needs
  // it. null until completeSignIn() resolves (a no-op unless this load
  // happens to be the return trip from a Microsoft redirect) or if
  // genuinely signed out - the "Connected as ___" line and Disconnect
  // button both key off this being non-null.
  const [oneDriveEmail, setOneDriveEmail] = useState(null)
  useEffect(() => { completeSignIn().then(() => setOneDriveEmail(getAccountEmail())) }, [])
  const handleOneDriveDisconnect = () => {
    signOut() // navigates away via logoutRedirect; nothing after this runs
  }

  // APPLE-HEALTH: self-fetched purely to decide whether the weight-unit
  // toggle is worth showing at all — same self-fetch-for-a-single-screen
  // pattern TrendsScreen/StatsScreen already use independently for
  // healthData. No weight data imported yet means no unit preference to
  // set, so the toggle stays hidden rather than greyed out.
  const [hasWeightData, setHasWeightData] = useState(false)
  useEffect(() => { getMeta('weightReadings').then((v) => setHasWeightData(!!v?.length)) }, [])

  // 'confirm' (a valid file was picked, showing what it'll restore before
  // touching anything) -> 'restoring' -> 'done' (reloads shortly after,
  // so every piece of state — not just IndexedDB — picks up the restored
  // values) | 'error' (bad file, or the write itself failed).
  const [restoreState, setRestoreState] = useState(null)
  const [pendingBackup, setPendingBackup] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const fileInputRef = useRef(null)
  // Same pattern EquipmentScreen already uses for "Last synced" — a
  // screen-local read on mount, not threaded through App.jsx's props,
  // since nothing else on the app needs this value.
  //
  // AIRTRACE-FEATURE: reads both lastBackupExport (manual Export button)
  // and lastOneDriveBackupPush (the automatic push in onedrive/autoSync.js)
  // and shows whichever is more recent — a lexicographic comparison works
  // fine since both are ISO 8601 strings. An automatic OneDrive push counts
  // as a real backup for this indicator just as much as a manual export;
  // there's deliberately no separate "last pushed" line elsewhere on this
  // screen duplicating the same information.
  const [lastBackup, setLastBackup] = useState(null)
  useEffect(() => {
    Promise.all([getMeta('lastBackupExport'), getMeta('lastOneDriveBackupPush')]).then(([exported, pushed]) => {
      const latest = [exported, pushed].filter(Boolean).sort().at(-1)
      if (latest) setLastBackup(latest)
    })
  }, [])

  // ONEDRIVE — mirrors lastBackup's own pattern above, just for the
  // separate "pulling new nights in" timestamp (as opposed to the backup
  // push) written by onedrive/autoSync.js. null until an automatic sync
  // has actually succeeded at least once.
  const [lastOneDriveSync, setLastOneDriveSync] = useState(null)
  useEffect(() => { getMeta('lastOneDriveSyncAt').then((v) => v && setLastOneDriveSync(v)) }, [])

  const handleExport = async () => {
    const data = await buildBackup()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `airtrace-backup-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    await setMeta('lastBackupExport', data.exportedAt)
    setLastBackup(data.exportedAt)
  }

  const handleFileSelected = async (e) => {
    // Capture the File before touching .value — clearing a file input's
    // .value right after reading .files silently empties it on iOS
    // Safari (confirmed the hard way during real-import testing; see
    // ImportScreen.jsx). Only one file here, not the folder-picker's
    // whole FileList, but the same order-of-operations applies.
    const file = e.target.files[0]
    e.target.value = ''
    if (!file) return
    try {
      const data = parseBackup(await file.text())
      setPendingBackup(data)
      setRestoreState('confirm')
    } catch (err) {
      setErrorMsg(err.message)
      setRestoreState('error')
    }
  }

  const handleConfirmRestore = async () => {
    setRestoreState('restoring')
    try {
      await restoreBackup(pendingBackup)
      setRestoreState('done')
      setTimeout(() => window.location.reload(), 900)
    } catch (err) {
      setErrorMsg(`Restore failed: ${err.message}`)
      setRestoreState('error')
    }
  }

  // Notifications — off by default, same meta-key load/save pattern as
  // themeMode elsewhere on this screen. `subscription` mirrors whatever
  // the browser actually has active right now rather than trusting the
  // stored `notificationsEnabled` flag blindly — re-checked on every
  // mount so a subscription that quietly expired (or got revoked outside
  // the app) shows as off again instead of claiming to work forever. See
  // the plan's "resubscribe-check on open" note.
  const [notifSupported, setNotifSupported] = useState(true)
  const [notifPermission, setNotifPermission] = useState('default')
  const [notifBusy, setNotifBusy] = useState(false)
  const [notifError, setNotifError] = useState('')
  const [subscription, setSubscription] = useState(null)
  const [copied, setCopied] = useState(false)
  // The endpoint of whichever subscription was last actually copied to the
  // clipboard — lets the copy panel below tell "already pasted into the
  // GitHub secret" apart from "this is a different subscription than what's
  // there now," instead of showing the same one-time setup prompt on every
  // single visit to this screen regardless of whether anything changed.
  const [copiedEndpoint, setCopiedEndpoint] = useState(null)
  useEffect(() => { getMeta('copiedSubscriptionEndpoint').then((v) => v && setCopiedEndpoint(v)) }, [])
  const needsCopy = subscription && subscription.endpoint !== copiedEndpoint

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || typeof Notification === 'undefined') {
      setNotifSupported(false)
      return
    }
    setNotifPermission(Notification.permission)
    if (Notification.permission !== 'granted') return
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        if (sub) setSubscription(sub)
        else setMeta('notificationsEnabled', false)
      })
      .catch(() => {})
  }, [])

  const handleEnable = async () => {
    setNotifBusy(true)
    setNotifError('')
    try {
      const permission = await Notification.requestPermission()
      setNotifPermission(permission)
      if (permission !== 'granted') {
        setNotifBusy(false)
        return
      }
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })
      setSubscription(sub)
      await setMeta('notificationsEnabled', true)
      setCopied(false)
    } catch (err) {
      setNotifError(err.message || 'Something went wrong subscribing.')
    }
    setNotifBusy(false)
  }

  const handleDisable = async () => {
    setNotifBusy(true)
    try {
      if (subscription) await subscription.unsubscribe()
    } catch {
      // Unsubscribe can fail if the subscription's already gone server-side
      // (e.g. the browser silently expired it) — either way the local
      // intent is "off", so still clear state below rather than getting stuck.
    }
    setSubscription(null)
    await setMeta('notificationsEnabled', false)
    setNotifBusy(false)
  }

  const handleCopySubscription = async () => {
    if (!subscription) return
    try {
      await navigator.clipboard.writeText(JSON.stringify(subscription.toJSON(), null, 2))
      setCopied(true)
      await setMeta('copiedSubscriptionEndpoint', subscription.endpoint)
      setCopiedEndpoint(subscription.endpoint)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API can be unavailable (e.g. non-HTTPS, denied
      // permission) — the JSON's still on screen via inspecting the
      // button's own state if this silently fails, nothing to recover.
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: T.bg, fontFamily: "'Plus Jakarta Sans', ui-sans-serif, system-ui", paddingBottom: 'max(40px, env(safe-area-inset-bottom, 0px))' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, maxWidth: 448, margin: '0 auto', padding: 'max(20px, calc(env(safe-area-inset-top, 0px) + 24px)) max(18px, env(safe-area-inset-right, 0px)) 8px max(18px, env(safe-area-inset-left, 0px))' }}>
        <button onClick={onBack} style={{ width: 36, height: 36, borderRadius: '50%', background: T.surface, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <ChevronLeft size={18} style={{ color: T.ink }} />
        </button>
        <div className="font-display" style={{ fontSize: 20, fontWeight: 800, color: T.ink }}>Settings</div>
      </div>

      <main style={{ maxWidth: 448, margin: '0 auto', padding: '16px 18px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ background: T.surface, borderRadius: 22, padding: 20 }}>
          <CardTitle sub="System follows your device's own setting automatically">Appearance</CardTitle>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 44 }}>
            <span className="font-display" style={{ fontSize: 14.5, color: T.ink }}>Theme</span>
            <Segmented options={[{ key: 'system', label: 'System' }, { key: 'light', label: 'Light' }, { key: 'dark', label: 'Dark' }]}
              active={themeMode} onChange={onChangeThemeMode} />
          </div>
        </div>

        <div style={{ background: T.surface, borderRadius: 22, padding: 20 }}>
          <CardTitle sub="Drives your streak goal, Stats targets, and the warning-triangle flags throughout the app"
            info={<>Today's score follows ResMed's own myAir scoring tables exactly (usage, mask seal, AHI, and mask-off events) — the same universal formula for everyone, so it isn't affected by the targets below. Those targets instead drive your streak goal (including myAir's own 4-freezes-a-month forgiveness), Stats compliance figures, and the warning-triangle flags throughout the app. Defaults match common clinical benchmarks (AHI under 5, 4+ hours on 70% of nights) — adjust if your clinician has given you different numbers to work toward.</>}>
            Targets
          </CardTitle>
          <StepperRow label="AHI target" value={targets.ahi} unit="events/hr" step={0.5} min={1} max={15} onChange={set('ahi')} />
          <StepperRow label="Leak target" value={targets.leak} unit="L/min" step={1} min={5} max={40} onChange={set('leak')} />
          <StepperRow label="Usage target" value={targets.usage} unit="hours" step={0.5} min={2} max={8} onChange={set('usage')} />
          <StepperRow label="Compliance target" value={targets.compliance} unit="%" step={5} min={50} max={100} onChange={set('compliance')} />
          <StepperRow label="Mask-off target" value={targets.maskOff} unit="events" step={1} min={0} max={10} onChange={set('maskOff')} last />
        </div>

        <div style={{ background: T.surface, borderRadius: 22, padding: 20 }}>
          <CardTitle sub="Used only for the automatic 'Late start' tag"
            info={'A session starting more than 2 hours after this is tagged "Late start" automatically — no logging needed, since your machine already records when a session began.'}>
            Tagging
          </CardTitle>
          <StepperRow label="Target bedtime" value={targets.bedtime} step={0.25} min={19} max={26} onChange={set('bedtime')}
            formatValue={(v) => <>{formatClock(v)}</>} last />
        </div>

        <div style={{ background: T.surface, borderRadius: 22, padding: 20 }}>
          <CardTitle sub="Nothing in your imported data could ever know these — pure user-entered fields"
            info={'Patient name and number appear on the Clinician visit report. Clinic phone adds a one-tap "Call clinic" button to the Equipment page.'}>
            Patient &amp; clinic
          </CardTitle>
          <TextEditRow icon={User} iconColor={T.muted} label="Patient name" value={profile.patientName} placeholder="Not set" onChange={setProfile('patientName')} />
          <TextEditRow icon={Hash} iconColor={T.muted} label="Patient number" value={profile.patientNumber} placeholder="Not set" onChange={setProfile('patientNumber')} />
          <TextEditRow icon={Phone} iconColor={T.muted} label="Clinic phone" value={profile.clinicPhone} placeholder="Not set" type="tel" onChange={setProfile('clinicPhone')} last={!hasWeightData} />
          {/* Height: used only for Trends' All Time BMI. Stored value
              always stays in cm — heightUnit only changes how this
              stepper is entered/displayed, same "store the real number,
              convert at the display layer only" principle as formatClock. */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 44, borderBottom: hasWeightData ? `1px solid ${T.line}` : 'none' }}>
            <span className="font-display" style={{ fontSize: 14.5, color: T.ink }}>Height</span>
            <Segmented options={[{ key: 'cm', label: 'cm' }, { key: 'ft', label: 'ft/in' }]} active={heightUnit} onChange={onChangeHeightUnit} />
          </div>
          <StepperRow label="Height value" value={profile.heightCm ?? 170}
            step={heightUnit === 'cm' ? 1 : 2.54} min={100} max={250}
            onChange={setProfile('heightCm')} last={!hasWeightData}
            formatValue={(v) => {
              if (heightUnit === 'cm') return `${Math.round(v)} cm`
              const { feet, inches } = cmToFeetInches(v)
              return `${feet}'${inches}"`
            }} />
          {/* APPLE-HEALTH: only shown once weight data actually exists —
              same optional-data-optional-UI rule as the rest of Trends'
              All Time section. Resolves the weight-unit preference this
              feature's spec originally left "considered, not decided". */}
          {hasWeightData && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 44 }}>
              <span className="font-display" style={{ fontSize: 14.5, color: T.ink }}>Weight unit</span>
              <Segmented options={[{ key: 'stlb', label: 'St/lb' }, { key: 'kg', label: 'kg' }]} active={weightUnit} onChange={onChangeWeightUnit} />
            </div>
          )}
        </div>

        <div style={{ background: T.surface, borderRadius: 22, padding: 20 }}>
          <CardTitle sub="Morning and evening checks for untagged nights and overdue equipment, plus a Saturday weekly summary — silent unless there's actually something to say"
            info="Tagging is checked morning and evening — the evening one only shows up if you still haven't tagged by then. Equipment is checked each morning, at most once a week. The Saturday weekly summary always sends something, even on a steady week — a quick AHI-vs-last-week recap. If nags ever stop arriving, check this repo's Actions tab: GitHub silently disables scheduled workflows after 60 days without any repository activity.">
            Notifications
          </CardTitle>

          {!notifSupported && (
            <div style={{ fontSize: 12.5, color: T.muted, lineHeight: 1.5 }}>
              Not supported in this browser. On iPhone, install AirTrace to the Home Screen first — Safari can't deliver push notifications to a regular browser tab.
            </div>
          )}

          {notifSupported && notifPermission === 'denied' && (
            <div style={{ fontSize: 12.5, color: T.muted, lineHeight: 1.5 }}>
              Blocked at the OS level. There's no in-app way to re-prompt for this — enable notifications for AirTrace in your device's own Settings, then reopen this screen.
            </div>
          )}

          {notifSupported && notifPermission !== 'denied' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 44 }}>
                <span className="font-display" style={{ fontSize: 14.5, color: T.ink }}>Untagged nights & overdue equipment</span>
                <button
                  onClick={subscription ? handleDisable : handleEnable}
                  disabled={notifBusy}
                  className="font-display"
                  style={{
                    padding: '8px 16px', borderRadius: 20, fontSize: 13, fontWeight: 700,
                    background: subscription ? T.bg : T.ink,
                    // T.bg, not a hardcoded white — T.ink is near-white in
                    // dark mode, and white text on that was invisible.
                    // T.bg is always T.ink's correct contrast partner,
                    // in either theme.
                    color: subscription ? T.ink : T.bg,
                    border: subscription ? `1px solid ${T.line}` : 'none',
                    opacity: notifBusy ? 0.6 : 1,
                  }}
                >
                  {notifBusy ? 'Working…' : subscription ? 'On' : 'Turn on'}
                </button>
              </div>

              {notifError && (
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <TriangleAlert size={16} style={{ color: SEV.bad, flexShrink: 0, marginTop: 1 }} />
                  <span style={{ fontSize: 12.5, color: SEV.bad, lineHeight: 1.5 }}>{notifError}</span>
                </div>
              )}

              {subscription && (needsCopy || copied) && (
                <div style={{ marginTop: 14, background: T.bg, borderRadius: 14, padding: 14 }}>
                  <div style={{ fontSize: 12.5, color: T.ink, lineHeight: 1.5, marginBottom: 10 }}>
                    {copiedEndpoint
                      ? <>The subscription changed since you last copied one &mdash; copy the new one and paste it into this repo's <b>PUSH_SUBSCRIPTION</b> GitHub secret to replace the old value.</>
                      : <>One manual step to finish setup: copy this and paste it into this repo's <b>PUSH_SUBSCRIPTION</b> GitHub secret.</>}
                  </div>
                  <button onClick={handleCopySubscription} className="font-display" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, width: '100%', padding: '9px 0', borderRadius: 10, background: T.surface, color: T.ink, fontSize: 13, fontWeight: 700, border: `1px solid ${T.line}` }}>
                    {copied ? <Check size={15} style={{ color: SEV.good }} /> : <Copy size={15} />}
                    {copied ? 'Copied' : 'Copy subscription JSON'}
                  </button>
                </div>
              )}

              {/* Steady state — already copied and nothing's changed since.
                  A quiet way back to the JSON (e.g. to double-check the
                  GitHub secret still matches) without the setup panel
                  reappearing on every single visit to this screen. */}
              {subscription && !needsCopy && !copied && (
                <button onClick={handleCopySubscription} className="font-display" style={{ marginTop: 10, padding: 0, background: 'none', border: 'none', fontSize: 12, color: T.muted, textDecoration: 'underline', textUnderlineOffset: 2 }}>
                  Copy subscription JSON again
                </button>
              )}
            </>
          )}
        </div>

        {/* ONEDRIVE — a settings-gated feature rather than an always-on
            card on the Import screen, since most AirTrace installs will
            never have a WiFi SD card (and CardSync) behind them at all -
            the toggle keeps Import clean for everyone else. Enabling it
            never requires signing in again if a session already exists;
            disabling it never signs out - the two are deliberately
            independent, so toggling this off is just "don't show me
            this for now," not "forget my Microsoft account." */}
        <div style={{ background: T.surface, borderRadius: 22, padding: 20 }}>
          <CardTitle sub="Adds a second import option on the Import screen, alongside the physical card"
            info="A companion PC tool (CardSync) copies your WiFi SD card's data to a OneDrive folder on whatever schedule you run it. Turning this on lets AirTrace sync straight from there instead of needing the physical card in hand every time. Off by default - most installs won't have this hardware set up at all.">
            OneDrive Sync
          </CardTitle>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 44 }}>
            <span className="font-display" style={{ fontSize: 14.5, color: T.ink }}>Enable OneDrive Sync</span>
            <button
              onClick={() => onChangeOneDriveSyncEnabled(!oneDriveSyncEnabled)}
              className="font-display"
              style={{
                padding: '8px 16px', borderRadius: 20, fontSize: 13, fontWeight: 700,
                background: oneDriveSyncEnabled ? T.bg : T.ink,
                color: oneDriveSyncEnabled ? T.ink : T.bg,
                border: oneDriveSyncEnabled ? `1px solid ${T.line}` : 'none',
              }}
            >
              {oneDriveSyncEnabled ? 'On' : 'Turn on'}
            </button>
          </div>

          {oneDriveSyncEnabled && (
            <>
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${T.line}` }}>
                <div style={{ fontSize: 12.5, color: T.muted, marginBottom: 8, lineHeight: 1.4 }}>Sync folder, relative to your OneDrive root — must match CardSync's own <code>OneDriveSyncDest</code> setting exactly.</div>
                <input
                  type="text"
                  value={oneDriveBasePath}
                  onChange={(e) => onChangeOneDriveBasePath(e.target.value)}
                  className="font-display"
                  style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 10, background: T.bg, color: T.ink, fontSize: 14, border: `1px solid ${T.line}` }}
                />
              </div>

              <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <span style={{ fontSize: 12.5, color: T.muted, lineHeight: 1.4 }}>
                  {oneDriveEmail ? <>Connected as <b style={{ color: T.ink }}>{oneDriveEmail}</b></> : "Not connected yet — connect from the Import screen's Sync from OneDrive button."}
                </span>
                {oneDriveEmail && (
                  <button onClick={handleOneDriveDisconnect} className="font-display" style={{ flexShrink: 0, fontSize: 12.5, fontWeight: 700, color: SEV.bad, background: 'none', padding: 0 }}>
                    Disconnect
                  </button>
                )}
              </div>

              {/* AIRTRACE-FEATURE: onedrive/autoSync.js runs this
                  automatically on app open (once per day, capped) once
                  OneDrive Sync is on and signed in — this just surfaces
                  when it last actually succeeded. Distinct from the
                  Backup card's own "Last backed up" below, which is about
                  pushing local data OUT rather than pulling new nights IN. */}
              {lastOneDriveSync && (
                <div style={{ marginTop: 10, fontSize: 11.5, color: T.muted }}>
                  {(() => {
                    const d = daysAgo(lastOneDriveSync)
                    return `Last auto-synced ${d === 0 ? 'today' : d === 1 ? '1 day ago' : `${d} days ago`}`
                  })()}
                </div>
              )}
            </>
          )}
        </div>

        <div style={{ background: T.surface, borderRadius: 22, padding: 20 }}>
          {/* AIRTRACE-FEATURE: this promise ("nothing is uploaded
              anywhere") stops being literally true the moment OneDrive
              Sync is on — onedrive/autoSync.js also pushes this same data
              to OneDrive automatically. Conditional rather than rewritten
              outright: the non-OneDrive copy stays word-for-word what it
              always was, since that promise is still completely accurate
              for anyone without this feature turned on. */}
          <CardTitle
            sub={oneDriveSyncEnabled ? 'A copy is also kept in your OneDrive automatically' : 'A file you keep — nothing here is uploaded anywhere'}
            info={oneDriveSyncEnabled
              ? "Export saves your night summaries and tagged nights (everything that can't be re-read off the SD card) to a file you control. With OneDrive Sync on, the same data is also pushed to your OneDrive automatically once a day, as a second safety net — a lost or wiped phone doesn't lose this history. Waveform detail isn't included either way — that's a cache of your last 90 used nights, regenerated the next time you import."
              : "Local-first means this data lives in exactly one place — this phone's own storage. Export saves your night summaries and tagged nights (everything that can't be re-read off the SD card) to a file you control; keep it wherever you'd keep any other backup. Waveform detail isn't included — that's a cache of your last 90 used nights, regenerated the next time you import."}
          >
            Backup
          </CardTitle>
          <div style={{ fontSize: 12, color: lastBackup ? T.muted : SEV.fair, marginBottom: 14, fontWeight: lastBackup ? 400 : 600 }}>
            {lastBackup ? (() => {
              const d = daysAgo(lastBackup)
              return `Last backed up ${d === 0 ? 'today' : d === 1 ? '1 day ago' : `${d} days ago`}`
            })() : 'Never backed up'}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={handleExport} className="font-display" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '11px 14px', borderRadius: 12, background: T.ink, color: T.bg, fontSize: 13.5, fontWeight: 700 }}>
              <Download size={15} /> Export backup
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="font-display" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '11px 14px', borderRadius: 12, background: T.bg, color: T.ink, fontSize: 13.5, fontWeight: 700, border: `1px solid ${T.line}` }}>
              <Upload size={15} /> Restore from file
            </button>
            <input ref={fileInputRef} type="file" accept="application/json" onChange={handleFileSelected} style={{ display: 'none' }} />
          </div>

          {restoreState === 'confirm' && pendingBackup && (
            <div style={{ marginTop: 14, background: T.bg, borderRadius: 14, padding: 14 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <TriangleAlert size={16} style={{ color: SEV.fair, flexShrink: 0, marginTop: 1 }} />
                <span style={{ fontSize: 12.5, color: T.ink, lineHeight: 1.5 }}>
                  This backup has <b>{pendingBackup.nightSummaries.length}</b> nights and <b>{pendingBackup.tags.length}</b> tagged nights, from {new Date(pendingBackup.exportedAt).toLocaleDateString()}. Restoring will overwrite anything already stored for those same dates — anything more recent than the backup stays untouched.
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setRestoreState(null)} className="font-display" style={{ flex: 1, padding: '9px 0', borderRadius: 10, background: T.surface, color: T.ink, fontSize: 13, fontWeight: 700, border: `1px solid ${T.line}` }}>Cancel</button>
                <button onClick={handleConfirmRestore} className="font-display" style={{ flex: 1, padding: '9px 0', borderRadius: 10, background: SEV.bad, color: '#FFFFFF', fontSize: 13, fontWeight: 700 }}>Restore</button>
              </div>
            </div>
          )}
          {restoreState === 'restoring' && (
            <div style={{ marginTop: 14, fontSize: 12.5, color: T.muted, textAlign: 'center' }}>Restoring…</div>
          )}
          {restoreState === 'done' && (
            <div style={{ marginTop: 14, fontSize: 12.5, color: SEV.good, textAlign: 'center', fontWeight: 600 }}>Restored — reloading…</div>
          )}
          {restoreState === 'error' && (
            <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
              <TriangleAlert size={16} style={{ color: SEV.bad, flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: 12.5, color: SEV.bad, lineHeight: 1.5 }}>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Only other place the version shows is the splash screen, which
            is gone half a second after launch — no way to check it again
            without a fresh screenshot. Useful for confirming a fix has
            actually deployed (GitHub Pages + the service worker can both
            lag a push by a minute or two) without restarting the app.
            location.host alongside it for the same reason: an installed
            Home Screen PWA has no address bar at all, so after a domain
            migration this is the only way to confirm which origin (and
            therefore which IndexedDB storage) a given installed icon is
            actually still pointing at, short of deleting and reinstalling
            it to find out. */}
        <div style={{ textAlign: 'center', fontSize: 11.5, color: T.muted, marginTop: 4 }}>AirTrace v{APP_VERSION} · {window.location.host}</div>
      </main>
    </div>
  )
}
