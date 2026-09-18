import { useState, useEffect, useRef } from 'react'
import { Check, RefreshCw, ChevronLeft, ChevronRight, Upload, TriangleAlert, Sparkles, HardDrive, Package, Clock, Calendar, HeartPulse, FolderOpen, Cloud } from 'lucide-react'
import { T, C, SEV } from '../constants/theme'
import { CardTitle } from '../components/CardTitle'
import { StatRow } from '../components/StatRow'
import { getExistingDetailDates, DETAIL_SCHEMA_VERSION } from '../db/detail.js'
import { getMeta, setMeta } from '../db/meta.js'
import { RETENTION_USED_NIGHTS } from '../utils/retentionWindow.js'
import { runImportPipeline as runImportPipelineCore } from '../import/runImportPipeline.js'
// APPLE-HEALTH — see docs/apple-health-integration.md for the full
// strip-out list; this whole card + handler below is one of the entries.
import { parseHealthExport } from '../health/parseHealthExport.js'
import { matchHealthDataToNights, countEligibleNights } from '../health/matchNights.js'
import { setHealthEntry } from '../db/health.js'
// ONEDRIVE — see docs/wifi-sd-sync.md (gitignored) for the full
// background. Reads whatever CardSync's most recent run backed up to
// OneDrive, converging on the exact same File-shaped objects a physical
// card import produces, so everything downstream (groupImportFiles, the
// worker, retention pruning) is shared code, not a parallel path.
import { isSignedIn, signIn, completeSignIn } from '../onedrive/graphClient.js'
import { fetchOneDriveFiles } from '../onedrive/oneDriveImport.js'

const IMPORT_STAGE_LABEL = {
  reading: 'Reading folder',
  summaries: 'Parsing nightly summaries',
  waveform: 'Parsing waveform detail',
  pruning: 'Pruning older waveform detail',
}
// Shared by every "syncing/parsing" button (SD card, OneDrive's own fetch
// phase, OneDrive's own subsequent parse phase) so the three never drift
// into three slightly different progress-bar implementations.
function ThinProgressBar({ pct }) {
  return (
    <div style={{ marginTop: 10, height: 6, borderRadius: 3, background: T.bg, overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: C.blue, borderRadius: 3, transition: 'width 0.15s linear' }} />
    </div>
  )
}

export function ImportScreen({ onBack, nights, oneDriveSyncEnabled, oneDriveBasePath }) {
  // idle -> reading -> summaries -> waveform -> pruning -> done -> (back to idle)
  const [stage, setStage] = useState('idle')
  const [waveformDone, setWaveformDone] = useState(0)
  const [waveformTotal, setWaveformTotal] = useState(0)
  const [error, setError] = useState(null)
  const workerRef = useRef(null)
  const fileInputRef = useRef(null)
  const [lastImport, setLastImport] = useState(null)
  const [history, setHistory] = useState([])
  // Display-only cap — the stored importHistory meta itself is never
  // trimmed, so the full record stays available (useful diagnostic
  // history, same reasoning as keeping every night's summary forever).
  // Just how much of it renders by default before it turns into an
  // ever-growing wall of "0 nights" entries from routine daily syncs.
  // A repeatable "Load 10 more" rather than one "Show all N" jump —
  // this needs to stay reasonable at hundreds of imports (a year of
  // daily syncs, more once WiFi auto-sync exists), not just the dozen
  // or so it's actually seen in testing so far.
  const HISTORY_PAGE_SIZE = 10
  const [historyShown, setHistoryShown] = useState(HISTORY_PAGE_SIZE)
  // Collapsed by default, same reasoning as the Equipment screen's own
  // Maintenance history card — a plain log kept out of the way so it
  // doesn't compete with this screen's actual purpose (running an import).
  const [historyOpen, setHistoryOpen] = useState(false)
  // How many nights currently have real waveform detail stored — not the
  // same as RETENTION_USED_NIGHTS (the cap), since a fresh install or one
  // with under 90 used nights ever will genuinely have fewer than that.
  // Refreshed on mount and again after every import completes, since
  // that's the only time this store's contents actually change.
  const [detailCount, setDetailCount] = useState(null)
  // True from the moment the OS file picker hands focus back to the page
  // until our own onChange actually fires. On a large card the native
  // picker can take 45s+ to enumerate everything after you've already
  // picked the folder and closed its UI — there's no JS event for that
  // enumeration itself, but the window regaining focus when the picker's
  // UI closes reliably happens before onChange does, so it's usable as an
  // early "something is happening" signal. The Choose folder button stays
  // visible and re-clickable throughout (not swapped out) so a cancelled
  // picker never leaves the screen stuck with no way forward.
  const [picking, setPicking] = useState(false)

  // APPLE-HEALTH — 'importing' -> 'done' (shows the match summary)
  // | 'error'. No confirm-before-write step, unlike the CPAP import above:
  // this only ever writes to the isolated healthData store via idempotent
  // put, so nothing existing is at risk of being overwritten.
  const [healthImportState, setHealthImportState] = useState(null)
  const [healthImportSummary, setHealthImportSummary] = useState('')
  const [healthImportError, setHealthImportError] = useState('')
  const healthFileInputRef = useRef(null)

  // ONEDRIVE — oneDriveConnected reflects MSAL's own cached session, not
  // anything this component tracks itself; refreshed after
  // completeSignIn() resolves (below) and again after syncFromOneDrive
  // finishes, since a first-ever sign-in only becomes visible once the
  // redirect round-trip completes and the page reloads.
  const [oneDriveConnected, setOneDriveConnected] = useState(false)
  const [oneDriveSyncing, setOneDriveSyncing] = useState(false)
  // ONEDRIVE — surfaces fetchOneDriveFiles's own onProgress, which used to
  // go nowhere: a real ~100-night fetch runs several minutes even with
  // concurrency, and a bare spinner for that whole stretch is
  // indistinguishable from a hang. null until the first progress event.
  const [oneDriveProgress, setOneDriveProgress] = useState(null)
  // Which source triggered the import currently in progress ('sd' |
  // 'onedrive' | null) - both paths converge on the same runImportPipeline
  // and the same `stage` state machine, so this is the only way to know
  // which button should show that shared progress inline on itself.
  const [importSource, setImportSource] = useState(null)

  // APPLE-HEALTH: picks a whole folder rather than one file, same
  // webkitdirectory mechanism as the SD card import above, so the daily
  // routine is "tap the folder you already export into" instead of
  // hunting for today's specific export among however many are in
  // there. Same iOS Safari ordering as onFilesSelected below — snapshot
  // the FileList into a real array before touching .value, which
  // silently empties it out from under you otherwise. There's no
  // reliable export-timestamp convention in the filename itself to sort
  // by, so this uses each File's own OS-reported lastModified instead —
  // the same signal Files/Finder show as "Date Modified", and robust to
  // whatever the export app happens to name things.
  const handleHealthFileSelected = async (e) => {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    if (files.length === 0) return // picker cancelled, nothing to report
    const jsonFiles = files.filter((f) => f.name.toLowerCase().endsWith('.json'))
    if (jsonFiles.length === 0) {
      setHealthImportError('No .json export found in that folder.')
      setHealthImportState('error')
      return
    }
    const file = jsonFiles.reduce((latest, f) => (f.lastModified > latest.lastModified ? f : latest))
    setHealthImportState('importing')
    try {
      const parsed = parseHealthExport(JSON.parse(await file.text()))
      const matched = matchHealthDataToNights(parsed, nights || [])
      const dates = Object.keys(matched)
      await Promise.all(dates.map((date) => setHealthEntry(date, { ...matched[date], importedAt: new Date().toISOString() })))
      // APPLE-HEALTH: weight deliberately does NOT go through
      // matchHealthDataToNights above — it has no per-night sleep-window
      // relationship the way heart rate/SpO2/sleep-stage do (a reading
      // every few days at most, unrelated to any specific session), so
      // bucketing it against night windows doesn't make sense. Stored
      // whole under its own meta key instead, same generic getMeta/setMeta
      // pattern `profile`/`themeMode` already use elsewhere. This is a
      // whole-array replace, not a merge — a smaller re-import will
      // shrink the stored history, an accepted tradeoff matching this
      // function's existing no-confirm-before-write stance.
      if (parsed.weightReadings.length) await setMeta('weightReadings', parsed.weightReadings)
      // Against the export's own actual date coverage, not the user's
      // whole therapy history — see countEligibleNights's own comment.
      const eligible = countEligibleNights(parsed, nights || [])
      // Names the file picked, not just "done" — the choice is now
      // automatic (newest by lastModified) rather than something the
      // user explicitly confirmed by hand-picking it, so this is what
      // lets them notice if the wrong export ever got picked.
      setHealthImportSummary(`Imported ${file.name} — matched ${dates.length} of ${eligible} nights in this export's date range.`)
      setHealthImportState('done')
    } catch (err) {
      setHealthImportError(err.message)
      setHealthImportState('error')
    }
  }

  // Real prior-import state, loaded once from IndexedDB rather than the
  // hardcoded mock seed this screen used to ship with.
  useEffect(() => {
    getMeta('lastImport').then((v) => v && setLastImport(v))
    getMeta('importHistory').then((v) => v && setHistory(v))
    getExistingDetailDates().then((dates) => setDetailCount(dates.size))
    // ONEDRIVE — completes the redirect-based sign-in if this load is the
    // return trip from Microsoft (a no-op otherwise), then reflects
    // whatever the real cached session state turns out to be.
    completeSignIn().then(() => setOneDriveConnected(isSignedIn()))
  }, [])

  useEffect(() => () => workerRef.current?.terminate(), [])

  const isActive = stage !== 'idle' && stage !== 'done'

  // Best-effort screen wake lock while actively importing. This is not a
  // substitute for the warning shown below, only a supplement to it:
  // support varies by browser/OS version, the OS can revoke it anytime
  // (low battery, etc.), and — notably, since installing to the home
  // screen is how this app is meant to be used on iOS — installed
  // Home Screen web apps had a WebKit bug where wake lock silently did
  // nothing at all until iOS 18.4 fixed it. Wrapped in try/catch per
  // MDN's guidance since the request can reject for any of the above.
  useEffect(() => {
    if (!isActive) return
    let cancelled = false
    let sentinel = null
    const acquire = async () => {
      try {
        if ('wakeLock' in navigator) sentinel = await navigator.wakeLock.request('screen')
      } catch {
        // Silently falls back to the on-screen warning — nothing to
        // recover from here, this path is expected on plenty of devices.
      }
    }
    acquire()
    // The lock is released automatically whenever the document goes
    // hidden (app backgrounded, screen locked) — re-acquiring on return
    // to visible is what the platform's own wake-lock demos recommend,
    // otherwise a single backgrounding permanently drops it for the
    // rest of the import even after the user comes back.
    const onVisibility = () => { if (!cancelled && document.visibilityState === 'visible') acquire() }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisibility)
      sentinel?.release().catch(() => {})
    }
  }, [isActive])

  const chooseFolder = () => {
    setError(null)
    const onFocus = () => setPicking(true)
    window.addEventListener('focus', onFocus, { once: true })
    fileInputRef.current?.click()
  }

  // Shared by both import sources — physical card (onFilesSelected below)
  // and OneDrive (syncFromOneDrive below), and (via the same extracted
  // module) the automatic OneDrive auto-sync in onedrive/autoSync.js. The
  // real orchestration (grouping, retention cutoff, worker, persistence)
  // lives in src/import/runImportPipeline.js now — this is just this
  // screen's own setState wiring passed in as callbacks, so the manual
  // buttons' behavior/timing here is unchanged from before the extraction.
  const runImportPipeline = (files, { sourceLabel, source } = {}) =>
    runImportPipelineCore(files, {
      sourceLabel,
      source,
      callbacks: {
        onError: setError,
        onStageChange: setStage,
        onWaveformProgress: (done, total) => { setWaveformDone(done); setWaveformTotal(total) },
        onImportSourceChange: setImportSource,
        onDetailCountChange: setDetailCount,
        onComplete: (record, newHistory) => { setLastImport(record); setHistory(newHistory) },
        onWorkerReady: (worker) => { workerRef.current = worker },
      },
    })

  const onFilesSelected = async (e) => {
    setPicking(false)
    // Snapshot into a real array BEFORE touching e.target.value — on iOS
    // Safari, clearing the input's value right after reading .files was
    // silently emptying the FileList out from under us (confirmed via a
    // side-by-side test: a plain page with no such reset correctly saw
    // hundreds of real files from the same card that this app reported
    // as 0). Array.from copies the entries out, so the later reset can't
    // touch them.
    const files = Array.from(e.target.files || [])
    e.target.value = '' // allow re-selecting the same folder later
    await runImportPipeline(files, { sourceLabel: 'the folder picker returned', source: 'sd' })
  }

  // ONEDRIVE — mirrors onFilesSelected above, just fetching files from
  // OneDrive (via CardSync's own backed-up copy) instead of reading a
  // physical card. Everything from runImportPipeline onward is identical
  // either way.
  const syncFromOneDrive = async () => {
    setError(null)
    if (!isSignedIn()) {
      await signIn() // navigates away - resumes after the redirect completes
      return
    }
    setOneDriveSyncing(true)
    setOneDriveProgress(null)
    try {
      const storedSchemaVersion = await getMeta('detailSchemaVersion')
      const skipDates = storedSchemaVersion === DETAIL_SCHEMA_VERSION ? [...await getExistingDetailDates()] : []
      const files = await fetchOneDriveFiles(oneDriveBasePath, { skipDates, onProgress: setOneDriveProgress })
      await runImportPipeline(files, { sourceLabel: 'your OneDrive sync folder', source: 'onedrive' })
    } catch (err) {
      setError(`OneDrive sync failed: ${err.message}`)
    } finally {
      setOneDriveSyncing(false)
      setOneDriveProgress(null)
    }
  }

  const cancelImport = () => {
    workerRef.current?.terminate()
    setStage('idle')
    setWaveformDone(0)
    setImportSource(null)
  }
  const handleBack = () => {
    // An accidental tap here mid-import would otherwise silently abandon
    // it with no warning — cheap to guard against given a real import
    // can run well over a minute, not the few seconds this mockup fakes.
    if (isActive && !window.confirm('Import still in progress — leave anyway?')) return
    workerRef.current?.terminate()
    onBack()
  }
  // Shared by every button that can show this shared runImportPipeline
  // progress inline on itself (SD card, and OneDrive's own subsequent
  // parse phase once its fetch is done) — one string so the two never
  // drift into slightly different wording for the same underlying stage.
  const activeStageLabel = stage === 'waveform' && waveformTotal > 0
    ? `Night ${waveformDone} of ${waveformTotal}…`
    : `${IMPORT_STAGE_LABEL[stage]}…`
  const sdActive = importSource === 'sd' && isActive
  const oneDriveParsing = importSource === 'onedrive' && isActive
  // Only one import (either source) can ever run at once — both buttons
  // disable together the instant either one starts, closing what was
  // otherwise a real race: nothing previously stopped tapping "Choose
  // folder" while a OneDrive fetch was still in flight (stage stays
  // 'idle' throughout that phase), which would have run two imports
  // concurrently against the same IndexedDB stores.
  const anyImportBusy = isActive || oneDriveSyncing

  return (
    <div style={{ minHeight: '100vh', background: T.bg, fontFamily: "'Plus Jakarta Sans', ui-sans-serif, system-ui", paddingBottom: 'max(40px, env(safe-area-inset-bottom, 0px))' }}>
      <style>{`@keyframes import-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin { animation: import-spin 0.9s linear infinite; }`}</style>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, maxWidth: 448, margin: '0 auto', padding: 'max(20px, calc(env(safe-area-inset-top, 0px) + 24px)) max(18px, env(safe-area-inset-right, 0px)) 8px max(18px, env(safe-area-inset-left, 0px))' }}>
        <button onClick={handleBack} style={{ width: 36, height: 36, borderRadius: '50%', background: T.surface, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <ChevronLeft size={18} style={{ color: T.ink }} />
        </button>
        <div className="font-display" style={{ fontSize: 20, fontWeight: 800, color: T.ink }}>Import</div>
      </div>

      <main style={{ maxWidth: 448, margin: '0 auto', padding: '16px 18px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {stage !== 'done' && (
          <div style={{ background: T.surface, borderRadius: 22, padding: 24, textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: `linear-gradient(135deg,${C.blue},${C.purple})`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Upload size={28} style={{ color: '#FFFFFF' }} strokeWidth={1.8} />
            </div>
            <div className="font-display" style={{ fontSize: 16, fontWeight: 700, color: T.ink, marginBottom: 6 }}>Import from SD card</div>
            <div style={{ fontSize: 13, color: T.muted, marginBottom: 18, lineHeight: 1.5 }}>Plug in your card reader, then select the card's root folder — the one containing STR.edf and DATALOG together.</div>
            {/* Hidden off-screen rather than display:none — iOS Safari has
                known quirks where a display:none file input still opens
                the native picker via .click() but silently fails to
                populate .files on selection. Positioning off-screen
                keeps the element live in the layout, which is the
                standard cross-browser-safe way to visually hide a file
                input. */}
            <input ref={fileInputRef} type="file" webkitdirectory="" directory="" multiple onChange={onFilesSelected}
              style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 }} />
            <button onClick={chooseFolder} disabled={anyImportBusy} className="font-display"
              style={{ width: '100%', padding: '13px 0', borderRadius: 999, background: C.blue, color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: anyImportBusy && !sdActive ? 0.5 : 1 }}>
              {(picking || sdActive) && <RefreshCw size={15} className="spin" style={{ color: '#FFFFFF' }} strokeWidth={2.5} />}
              <span style={{ fontSize: 14, fontWeight: 700 }}>{sdActive ? activeStageLabel : picking ? 'Reading card…' : 'Choose folder'}</span>
            </button>
            {sdActive && stage === 'waveform' && waveformTotal > 0 && <ThinProgressBar pct={(waveformDone / waveformTotal) * 100} />}
            {error && <div style={{ fontSize: 12, color: SEV.bad, marginTop: 12, lineHeight: 1.4 }}>{error}</div>}
            <div style={{ fontSize: 11, color: T.muted, marginTop: 10 }}>Reading a large card can take a few minutes. The import itself completes quickly once the card read is done, and later imports only process what's new.</div>
          </div>
        )}

        {/* ONEDRIVE — a second, independent way to get the same CPAP data
            in, alongside the physical-card card above rather than a
            toggle against it (matches the Apple Health card's own
            existing pattern below: parallel data-source cards, not
            mutually exclusive modes). Reads whatever CardSync's most
            recent run backed up to OneDrive - see docs/wifi-sd-sync.md
            (gitignored) for the full background on why this exists.
            Its button shows the exact same kind of inline status +
            progress bar the SD card button above does, whether it's
            currently in its own fetch phase (oneDriveSyncing) or in the
            shared runImportPipeline parse phase afterward
            (oneDriveParsing) - one consistent treatment regardless of
            which half of the sync is actually running. Hidden entirely
            (not greyed out) when the Settings toggle is off - same rule
            as everywhere else in this app for a feature/data source that
            doesn't apply to this install, most of which will never have
            a WiFi SD card behind them at all. */}
        {stage !== 'done' && oneDriveSyncEnabled && (
          <div style={{ background: T.surface, borderRadius: 22, padding: 20 }}>
            <CardTitle sub="Syncs your WiFi SD card's data from OneDrive">OneDrive Sync</CardTitle>
            <button onClick={syncFromOneDrive} disabled={oneDriveSyncing || anyImportBusy} className="font-display"
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '11px 14px', borderRadius: 12, background: T.bg, color: T.ink, fontSize: 13.5, fontWeight: 700, border: `1px solid ${T.line}`, opacity: anyImportBusy && !oneDriveSyncing && !oneDriveParsing ? 0.5 : oneDriveSyncing ? 0.6 : 1 }}>
              {(oneDriveSyncing || oneDriveParsing) ? <RefreshCw size={15} className="spin" /> : <Cloud size={15} />}
              <span>
                {oneDriveParsing
                  ? activeStageLabel
                  : oneDriveSyncing
                    ? oneDriveProgress?.stage === 'str' ? 'Reading STR.edf…'
                      : oneDriveProgress?.stage === 'listing' ? 'Listing DATALOG…'
                      : oneDriveProgress?.stage === 'nights' && oneDriveProgress.total > 0 ? `Night ${oneDriveProgress.done} of ${oneDriveProgress.total}…`
                      : 'Syncing…'
                    : !oneDriveConnected ? 'Connect OneDrive' : 'Sync from OneDrive'}
              </span>
            </button>
            {oneDriveSyncing && oneDriveProgress?.stage === 'nights' && oneDriveProgress.total > 0 && <ThinProgressBar pct={(oneDriveProgress.done / oneDriveProgress.total) * 100} />}
            {oneDriveParsing && stage === 'waveform' && waveformTotal > 0 && <ThinProgressBar pct={(waveformDone / waveformTotal) * 100} />}
            {oneDriveConnected && !oneDriveSyncing && !oneDriveParsing && (
              <div style={{ fontSize: 11, color: T.muted, marginTop: 10 }}>Only pulls nights that are new since your last import, same retention window as a physical card import.</div>
            )}
          </div>
        )}

        {/* APPLE-HEALTH — whole card is one self-contained block, listed
            in docs/apple-health-integration.md's strip-out steps. Sits
            directly below OneDrive Sync — the app's three data-source
            cards read top to bottom as SD card, OneDrive, Apple Health,
            rather than Apple Health being separated from its siblings by
            the "What's kept" card below. */}
        <div style={{ background: T.surface, borderRadius: 22, padding: 20 }}>
          <CardTitle sub="Import sleep stages, heart rate and SpO2 from Apple Health data"
            info="Pick the folder you export into from the Health Data Export app (Format: JSON, Aggregation: Raw) — the newest .json file in it is read automatically, matched to whichever CPAP night's own session it falls inside, and stored locally. Nothing is uploaded anywhere. Re-importing is always safe — it just overwrites matched nights with the newer file.">
            Apple Health Data
          </CardTitle>
          <button onClick={() => healthFileInputRef.current?.click()} disabled={healthImportState === 'importing'} className="font-display"
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '11px 14px', borderRadius: 12, background: T.bg, color: T.ink, fontSize: 13.5, fontWeight: 700, border: `1px solid ${T.line}`, opacity: healthImportState === 'importing' ? 0.6 : 1 }}>
            <HeartPulse size={15} /> {healthImportState === 'importing' ? 'Importing…' : 'Import Apple Health Data'}
          </button>
          {/* webkitdirectory, not a single-file accept — see
              handleHealthFileSelected's own comment. Hidden off-screen
              rather than display:none, same reasoning as the SD card
              input above: a display:none webkitdirectory input still
              opens the picker via .click() on iOS Safari but silently
              fails to populate .files on selection. */}
          <input ref={healthFileInputRef} type="file" webkitdirectory="" directory="" multiple onChange={handleHealthFileSelected}
            style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 }} />

          {healthImportState === 'done' && (
            <div style={{ marginTop: 12, fontSize: 12.5, color: SEV.good, textAlign: 'center', fontWeight: 600 }}>{healthImportSummary}</div>
          )}
          {healthImportState === 'error' && (
            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <TriangleAlert size={16} style={{ color: SEV.bad, flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: 12.5, color: SEV.bad, lineHeight: 1.5 }}>{healthImportError}</span>
            </div>
          )}
        </div>

        {/* Compact, shared between both sources rather than a separate
            full-screen replacement — the wake-lock caveat and cancel
            option matter most for the SD card's own potentially very
            long native read, but apply just as well to a slow OneDrive
            sync, so one banner covers both instead of duplicating it. */}
        {isActive && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: 12, background: T.surface, borderRadius: 16 }}>
            <TriangleAlert size={15} style={{ color: T.muted, flexShrink: 0, marginTop: 1 }} />
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 12.5, color: T.muted, lineHeight: 1.4 }}>We try to keep your screen from locking automatically, but it's not guaranteed on every device — keep this screen open and avoid switching apps where you can. If you do get interrupted partway, nothing's lost: starting the import again picks up from where it left off rather than starting over.</span>
              <button onClick={cancelImport} className="font-display" style={{ display: 'block', marginTop: 8, padding: 0, background: 'none' }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: T.ink, textDecoration: 'underline' }}>Cancel import</span>
              </button>
            </div>
          </div>
        )}

        {stage === 'done' && lastImport && (
          <div style={{ background: T.surface, borderRadius: 22, padding: 24, textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: SEV.good, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <Check size={24} style={{ color: '#FFFFFF' }} strokeWidth={3} />
            </div>
            <div className="font-display" style={{ fontSize: 16, fontWeight: 700, color: T.ink, marginBottom: 14 }}>Import complete</div>
            <div style={{ textAlign: 'left' }}>
              {/* Ground truth for spotting a picker enumeration shortfall
                  — every DATALOG folder found this import, regardless of
                  the retention window or what's already stored. Compare
                  against a real folder count checked another way (e.g.
                  the card plugged into a PC) if the numbers here ever
                  look stuck below what you know is really on the card. */}
              <StatRow icon={FolderOpen} iconColor={T.muted} label="DATALOG folders found" value={lastImport.foldersFound} />
              <StatRow icon={Sparkles} iconColor={C.purple} label="Nights added" value={lastImport.nightsAdded} />
              <StatRow icon={HardDrive} iconColor={C.blue} label="Waveform parsed" value={`${lastImport.nightsAdded} nights`} />
              <StatRow icon={Package} iconColor={T.muted} label="Waveform pruned" value={`${lastImport.pruned} nights`} />
              <StatRow icon={Clock} iconColor={C.orange} label="Duration" value={lastImport.duration} last />
            </div>
            {error && <div style={{ fontSize: 12, color: SEV.bad, marginTop: 12, lineHeight: 1.4, textAlign: 'left' }}>{error}</div>}
            <button onClick={() => { setError(null); setStage('idle'); setImportSource(null) }} style={{ width: '100%', padding: '13px 0', borderRadius: 999, background: T.bg, marginTop: 16 }} className="font-display">
              <span style={{ fontSize: 14, fontWeight: 700, color: T.ink }}>Done</span>
            </button>
          </div>
        )}

        <div style={{ background: T.surface, borderRadius: 22, padding: 20 }}>
          <CardTitle sub="Rolling window of your last 90 used nights">What's kept</CardTitle>
          <StatRow icon={Sparkles} iconColor={C.purple} label="Nightly summaries" value="Kept forever"
            description="AHI, leak, usage, mask seal, tags and score — one lightweight record per night, from STR.edf. Small enough to keep your whole history without a second thought." />
          <StatRow icon={HardDrive} iconColor={C.blue} label="Waveform detail" value={detailCount != null ? `${detailCount} of ${RETENTION_USED_NIGHTS} nights` : '…'} last
            description="Flow, pressure, snore and the other per-second channels from DATALOG — the heavy data. Kept for your most recent 90 nights that actually have a session (not the last 90 calendar days, which would shrink below 90 real nights if you ever skip a night) and pruned automatically on each import; the summary for that night stays put either way, just without the full waveform to drill into. Fewer than 90 just means you haven't used the machine 90 times yet, or an older night's detail hasn't been imported at all." />
        </div>

        {!isActive && lastImport && (
          <>
            <div style={{ background: T.surface, borderRadius: 22, padding: 20 }}>
              <CardTitle>Last import</CardTitle>
              <StatRow icon={Calendar} iconColor={C.blue} label="Date" value={lastImport.date} />
              {/* Absent, not shown as blank/undefined, for a record saved
                  before this field existed — same quiet-omission
                  convention used throughout the app for missing data. */}
              {lastImport.foldersFound != null && (
                <StatRow icon={FolderOpen} iconColor={T.muted} label="DATALOG folders found" value={lastImport.foldersFound} />
              )}
              <StatRow icon={Sparkles} iconColor={C.purple} label="Nights added" value={lastImport.nightsAdded} />
              <StatRow icon={Package} iconColor={T.muted} label="Waveform pruned" value={`${lastImport.pruned} night${lastImport.pruned === 1 ? '' : 's'}`}
                description="Nights that fell outside your last 90 used nights this import. Their nightly summary is untouched — only the detailed waveform was dropped." />
              <StatRow icon={Clock} iconColor={C.orange} label="Duration" value={lastImport.duration} last />
            </div>

            {history.length > 0 && (() => {
              const visibleHistory = history.slice(0, historyShown)
              const remaining = history.length - visibleHistory.length
              return (
                <div style={{ background: T.surface, borderRadius: 22, padding: 20 }}>
                  <div onClick={() => setHistoryOpen((o) => !o)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                      <span className="font-display" style={{ fontSize: 15, fontWeight: 700, color: T.ink }}>Import history</span>
                      <span className="font-display" style={{ fontSize: 12, fontWeight: 600, color: T.muted }}>{history.length}</span>
                    </div>
                    <ChevronRight size={16} style={{ color: T.muted, transform: historyOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }} />
                  </div>
                  {historyOpen && (
                    <div style={{ marginTop: 12 }}>
                      {visibleHistory.map((h, i) => (
                        <StatRow key={`${h.date}-${i}`} icon={Upload} iconColor={T.muted}
                          label={h.automatic ? <>{h.date} <span style={{ fontSize: 11, fontWeight: 500, color: T.muted }}>Auto</span></> : h.date}
                          value={h.nights} last={remaining === 0 && i === visibleHistory.length - 1} />
                      ))}
                      {/* Repeatable "load more", not one "show all N" jump —
                          only ever renders HISTORY_PAGE_SIZE additional rows
                          per tap regardless of how large history has grown,
                          so this stays reasonable at hundreds of imports. */}
                      {remaining > 0 && (
                        <button onClick={() => setHistoryShown((n) => n + HISTORY_PAGE_SIZE)} className="font-display"
                          style={{ width: '100%', padding: '12px 0 2px', textAlign: 'center', fontSize: 13, fontWeight: 700, color: T.muted }}>
                          Load {Math.min(HISTORY_PAGE_SIZE, remaining)} more ({remaining} left)
                        </button>
                      )}
                      {remaining === 0 && historyShown > HISTORY_PAGE_SIZE && (
                        <button onClick={() => setHistoryShown(HISTORY_PAGE_SIZE)} className="font-display"
                          style={{ width: '100%', padding: '12px 0 2px', textAlign: 'center', fontSize: 13, fontWeight: 700, color: T.muted }}>
                          Show fewer
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })()}
          </>
        )}
      </main>
    </div>
  )
}
