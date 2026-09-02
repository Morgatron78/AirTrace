import { useState, useEffect, useRef } from 'react'
import { Check, RefreshCw, ChevronLeft, Upload, TriangleAlert, Sparkles, HardDrive, Package, Clock, Calendar } from 'lucide-react'
import { T, C, SEV } from '../constants/theme'
import { CardTitle } from '../components/CardTitle'
import { StatRow } from '../components/StatRow'
import { groupImportFiles } from '../edf/groupImportFiles.js'
import { upsertSummaries } from '../db/nights.js'
import { upsertDetail, pruneOlderThan, getExistingDetailDates } from '../db/detail.js'
import { getMeta, setMeta } from '../db/meta.js'
import { toDateStr } from '../utils/dates.js'

// Ordered import stages — index also drives the checklist's done/current/pending
// states, so the two can never drift out of sync with each other.
const IMPORT_STAGES = ['reading', 'summaries', 'waveform', 'pruning']
const IMPORT_STAGE_LABEL = {
  reading: 'Reading folder',
  summaries: 'Parsing nightly summaries',
  waveform: 'Parsing waveform detail',
  pruning: 'Pruning data older than 90 days',
}
const RETENTION_DAYS = 90

function ImportStageRow({ label, status }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0' }}>
      <div style={{
        width: 22, height: 22, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: status === 'done' ? SEV.good : status === 'current' ? C.blue : T.bg,
      }}>
        {status === 'done' && <Check size={13} style={{ color: '#FFFFFF' }} strokeWidth={3} />}
        {status === 'current' && <RefreshCw size={12} className="spin" style={{ color: '#FFFFFF' }} strokeWidth={2.5} />}
      </div>
      <span className="font-display" style={{ fontSize: 13, fontWeight: status === 'pending' ? 500 : 700, color: status === 'pending' ? T.muted : T.ink }}>{label}</span>
    </div>
  )
}

export function ImportScreen({ onBack }) {
  // idle -> reading -> summaries -> waveform -> pruning -> done -> (back to idle)
  const [stage, setStage] = useState('idle')
  const [waveformDone, setWaveformDone] = useState(0)
  const [waveformTotal, setWaveformTotal] = useState(0)
  const [error, setError] = useState(null)
  const startedAtRef = useRef(null)
  const workerRef = useRef(null)
  const fileInputRef = useRef(null)
  const [lastImport, setLastImport] = useState(null)
  const [history, setHistory] = useState([])

  // Real prior-import state, loaded once from IndexedDB rather than the
  // hardcoded mock seed this screen used to ship with.
  useEffect(() => {
    getMeta('lastImport').then((v) => v && setLastImport(v))
    getMeta('importHistory').then((v) => v && setHistory(v))
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

  const chooseFolder = () => { setError(null); fileInputRef.current?.click() }

  const onFilesSelected = async (e) => {
    const fileList = e.target.files
    e.target.value = '' // allow re-selecting the same folder later

    // Diagnostic only: iOS Safari's webkitdirectory has known cases where
    // it silently returns zero files (or a shallow, non-recursive list)
    // when the source is an external file provider — like an SD card
    // reader — rather than on-device storage. Previously this returned
    // silently with no feedback at all, which is indistinguishable from
    // "still working" to the user. Surfacing the raw count + a sample of
    // paths turns that into something diagnosable instead of a guess.
    if (!fileList || fileList.length === 0) {
      setError('The folder picker returned 0 files. This can happen on iOS when reading from an external SD card reader rather than on-device storage — please let Claude know this happened so it can be investigated further.')
      return
    }

    const { strFile, nightFolders } = groupImportFiles(fileList)
    if (!strFile) {
      const sample = Array.from(fileList).slice(0, 6).map((f) => f.webkitRelativePath).join(', ')
      setError(`Couldn't find STR.edf in that folder — select the SD card's root folder (the one containing STR.edf and DATALOG together). Picker returned ${fileList.length} file(s). Sample paths: ${sample || '(none)'}`)
      return
    }

    startedAtRef.current = Date.now()
    setWaveformDone(0)
    setWaveformTotal(0)
    setStage('reading')

    const skipDates = [...await getExistingDetailDates()]
    const worker = new Worker(new URL('../edf/importWorker.js', import.meta.url), { type: 'module' })
    workerRef.current = worker

    worker.onmessage = async (evt) => {
      const msg = evt.data
      if (msg.type === 'progress') {
        setStage(msg.stage)
        setWaveformDone(msg.waveformDone)
        setWaveformTotal(msg.waveformTotal)
        return
      }
      if (msg.type === 'error') {
        setError(msg.message)
        setStage('idle')
        worker.terminate()
        return
      }
      if (msg.type === 'done') {
        setStage('pruning')
        await upsertSummaries(msg.summaries)
        await upsertDetail(msg.details)
        const pruned = await pruneOlderThan(RETENTION_DAYS)

        // Tagging start point per CLAUDE.md: set exactly once, the moment
        // the *first ever* import completes — never recomputed after that,
        // regardless of how many more imports happen later.
        const existingTagStart = await getMeta('tagStartDate')
        if (!existingTagStart) await setMeta('tagStartDate', toDateStr(new Date()))

        const elapsedMs = startedAtRef.current ? Date.now() - startedAtRef.current : 0
        const mins = Math.floor(elapsedMs / 60000), secs = Math.round((elapsedMs % 60000) / 1000)
        const durationStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
        const dateStr = new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
        const record = { date: dateStr, nightsAdded: msg.details.length, pruned, duration: durationStr }
        const newHistory = [{ date: dateStr, nights: `${msg.details.length} night${msg.details.length === 1 ? '' : 's'}` }, ...history]

        setLastImport(record)
        setHistory(newHistory)
        await setMeta('lastImport', record)
        await setMeta('importHistory', newHistory)

        if (msg.errors.length) setError(`${msg.errors.length} night(s) failed to parse and were skipped: ${msg.errors.map((e) => e.date).join(', ')}`)
        worker.terminate()
        setStage('done')
      }
    }
    worker.postMessage({ strFile, nightFolders, skipDates })
  }

  const cancelImport = () => {
    workerRef.current?.terminate()
    setStage('idle')
    setWaveformDone(0)
  }
  const handleBack = () => {
    // An accidental tap here mid-import would otherwise silently abandon
    // it with no warning — cheap to guard against given a real import
    // can run well over a minute, not the few seconds this mockup fakes.
    if (isActive && !window.confirm('Import still in progress — leave anyway?')) return
    workerRef.current?.terminate()
    onBack()
  }
  const stageIdx = stage === 'done' ? IMPORT_STAGES.length : IMPORT_STAGES.indexOf(stage)
  const stageDetail = {
    reading: 'Scanning card contents…',
    summaries: 'Reading STR.edf for your full history',
    waveform: `Night ${waveformDone} of ${waveformTotal}`,
    pruning: "Dropping waveform detail that's aged out",
  }[stage]

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
        {stage === 'idle' && (
          <div style={{ background: T.surface, borderRadius: 22, padding: 24, textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: `linear-gradient(135deg,${C.blue},${C.purple})`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Upload size={28} style={{ color: '#FFFFFF' }} strokeWidth={1.8} />
            </div>
            <div className="font-display" style={{ fontSize: 16, fontWeight: 700, color: T.ink, marginBottom: 6 }}>Import from SD card</div>
            <div style={{ fontSize: 13, color: T.muted, marginBottom: 18, lineHeight: 1.5 }}>Plug in your card reader, then select the card's root folder — the one containing STR.edf and DATALOG together.</div>
            <input ref={fileInputRef} type="file" webkitdirectory="" directory="" multiple onChange={onFilesSelected} style={{ display: 'none' }} />
            <button onClick={chooseFolder} style={{ width: '100%', padding: '13px 0', borderRadius: 999, background: C.blue, color: '#FFFFFF' }} className="font-display">
              <span style={{ fontSize: 14, fontWeight: 700 }}>Choose folder</span>
            </button>
            {error && <div style={{ fontSize: 12, color: SEV.bad, marginTop: 12, lineHeight: 1.4 }}>{error}</div>}
            <div style={{ fontSize: 11, color: T.muted, marginTop: 10 }}>First import can take up to 20 minutes — it's reading full nightly summaries plus parsing 90 days of detailed waveform data, all in the browser. Later imports only process what's new, so they're much faster.</div>
          </div>
        )}

        {isActive && (
          <div style={{ background: T.surface, borderRadius: 22, padding: 24 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: C.blue, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <RefreshCw size={22} className="spin" style={{ color: '#FFFFFF' }} strokeWidth={2} />
              </div>
              <div className="font-display" style={{ fontSize: 15, fontWeight: 700, color: T.ink }}>{IMPORT_STAGE_LABEL[stage]}</div>
              <div style={{ fontSize: 12, color: T.muted, marginTop: 3 }}>{stageDetail}</div>
            </div>
            {stage === 'waveform' && waveformTotal > 0 && (
              <div style={{ marginTop: 16, height: 6, borderRadius: 3, background: T.bg, overflow: 'hidden' }}>
                <div style={{ width: `${(waveformDone / waveformTotal) * 100}%`, height: '100%', background: C.blue, borderRadius: 3, transition: 'width 0.15s linear' }} />
              </div>
            )}
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${T.line}` }}>
              {IMPORT_STAGES.map((s, i) => (
                <ImportStageRow key={s} label={IMPORT_STAGE_LABEL[s]} status={i < stageIdx ? 'done' : i === stageIdx ? 'current' : 'pending'} />
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 16, padding: 12, background: T.bg, borderRadius: 12 }}>
              <TriangleAlert size={15} style={{ color: T.muted, flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: 12.5, color: T.muted, lineHeight: 1.4 }}>We try to keep your screen from locking automatically, but it's not guaranteed on every device — keep this screen open and avoid switching apps where you can. If you do get interrupted partway, nothing's lost: starting the import again picks up from where it left off rather than starting over.</span>
            </div>
            <button onClick={cancelImport} className="font-display" style={{ width: '100%', padding: '11px 0', borderRadius: 999, background: 'none', marginTop: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: T.muted }}>Cancel import</span>
            </button>
          </div>
        )}

        {stage === 'done' && lastImport && (
          <div style={{ background: T.surface, borderRadius: 22, padding: 24, textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: SEV.good, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <Check size={24} style={{ color: '#FFFFFF' }} strokeWidth={3} />
            </div>
            <div className="font-display" style={{ fontSize: 16, fontWeight: 700, color: T.ink, marginBottom: 14 }}>Import complete</div>
            <div style={{ textAlign: 'left' }}>
              <StatRow icon={Sparkles} iconColor={C.purple} label="Nights added" value={lastImport.nightsAdded} />
              <StatRow icon={HardDrive} iconColor={C.blue} label="Waveform parsed" value={`${lastImport.nightsAdded} nights`} />
              <StatRow icon={Package} iconColor={T.muted} label="Waveform pruned" value={`${lastImport.pruned} nights`} />
              <StatRow icon={Clock} iconColor={C.orange} label="Duration" value={lastImport.duration} last />
            </div>
            {error && <div style={{ fontSize: 12, color: SEV.bad, marginTop: 12, lineHeight: 1.4, textAlign: 'left' }}>{error}</div>}
            <button onClick={() => { setError(null); setStage('idle') }} style={{ width: '100%', padding: '13px 0', borderRadius: 999, background: T.bg, marginTop: 16 }} className="font-display">
              <span style={{ fontSize: 14, fontWeight: 700, color: T.ink }}>Done</span>
            </button>
          </div>
        )}

        <div style={{ background: T.surface, borderRadius: 22, padding: 20 }}>
          <CardTitle sub="Rolling window, measured from today">What's kept</CardTitle>
          <StatRow icon={Sparkles} iconColor={C.purple} label="Nightly summaries" value="Kept forever"
            description="AHI, leak, usage, mask seal, tags and score — one lightweight record per night, from STR.edf. Small enough to keep your whole history without a second thought." />
          <StatRow icon={HardDrive} iconColor={C.blue} label="Waveform detail" value="Last 90 days" last
            description="Flow, pressure, snore and the other per-second channels from DATALOG — the heavy data. Anything older than 90 days is pruned automatically on each import; the summary for that night stays put, just without the full waveform to drill into." />
        </div>

        {!isActive && lastImport && (
          <>
            <div style={{ background: T.surface, borderRadius: 22, padding: 20 }}>
              <CardTitle>Last import</CardTitle>
              <StatRow icon={Calendar} iconColor={C.blue} label="Date" value={lastImport.date} />
              <StatRow icon={Sparkles} iconColor={C.purple} label="Nights added" value={lastImport.nightsAdded} />
              <StatRow icon={Package} iconColor={T.muted} label="Waveform pruned" value={`${lastImport.pruned} night${lastImport.pruned === 1 ? '' : 's'}`}
                description="Nights that aged out of the 90-day window this import. Their nightly summary is untouched — only the detailed waveform was dropped." />
              <StatRow icon={Clock} iconColor={C.orange} label="Duration" value={lastImport.duration} last />
            </div>

            {history.length > 0 && (
              <div style={{ background: T.surface, borderRadius: 22, padding: 20 }}>
                <CardTitle>Import history</CardTitle>
                {history.map((h, i) => (
                  <StatRow key={`${h.date}-${i}`} icon={Upload} iconColor={T.muted} label={h.date} value={h.nights} last={i === history.length - 1} />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
