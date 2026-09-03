import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, Minus, Plus, User, Hash, Phone, Download, Upload, TriangleAlert } from 'lucide-react'
import { T, SEV } from '../constants/theme'
import { daysAgo, formatClock } from '../utils/dates'
import { CardTitle } from '../components/CardTitle'
import { TextEditRow } from '../components/TextEditRow'
import { Segmented } from '../components/Segmented'
import { buildBackup, parseBackup, restoreBackup } from '../db/backup.js'
import { getMeta, setMeta } from '../db/meta.js'

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

export function SettingsScreen({ onBack, targets, onChange, profile, onChangeProfile, themeMode, onChangeThemeMode }) {
  const set = (key) => (val) => onChange({ ...targets, [key]: val })
  const setProfile = (key) => (val) => onChangeProfile({ ...profile, [key]: val })

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
  const [lastBackup, setLastBackup] = useState(null)
  useEffect(() => { getMeta('lastBackupExport').then((v) => v && setLastBackup(v)) }, [])

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
          <CardTitle sub="Drives your streak goal, Stats targets, and the warning-triangle flags throughout the app">Targets</CardTitle>
          <StepperRow label="AHI target" value={targets.ahi} unit="events/hr" step={0.5} min={1} max={15} onChange={set('ahi')} />
          <StepperRow label="Leak target" value={targets.leak} unit="L/min" step={1} min={5} max={40} onChange={set('leak')} />
          <StepperRow label="Usage target" value={targets.usage} unit="hours" step={0.5} min={2} max={8} onChange={set('usage')} />
          <StepperRow label="Compliance target" value={targets.compliance} unit="%" step={5} min={50} max={100} onChange={set('compliance')} />
          <StepperRow label="Mask-off target" value={targets.maskOff} unit="events" step={1} min={0} max={10} onChange={set('maskOff')} last />
        </div>
        <div style={{ fontSize: 12, color: T.muted, padding: '0 4px', lineHeight: 1.5 }}>
          Today's score follows ResMed's own myAir scoring tables exactly (usage, mask seal, AHI, and mask-off events) — the same universal formula for everyone, so it isn't affected by the targets below. Those targets instead drive your streak goal (including myAir's own 4-freezes-a-month forgiveness), Stats compliance figures, and the warning-triangle flags throughout the app. Defaults match common clinical benchmarks (AHI under 5, 4+ hours on 70% of nights) — adjust if your clinician has given you different numbers to work toward.
        </div>

        <div style={{ background: T.surface, borderRadius: 22, padding: 20 }}>
          <CardTitle sub="Used only for the automatic 'Late start' tag">Tagging</CardTitle>
          <StepperRow label="Target bedtime" value={targets.bedtime} step={0.25} min={19} max={26} onChange={set('bedtime')}
            formatValue={(v) => <>{formatClock(v)}</>} last />
        </div>
        <div style={{ fontSize: 12, color: T.muted, padding: '0 4px', lineHeight: 1.5 }}>
          A session starting more than 2 hours after this is tagged "Late start" automatically — no logging needed, since your machine already records when a session began.
        </div>

        <div style={{ background: T.surface, borderRadius: 22, padding: 20 }}>
          <CardTitle sub="Nothing in your imported data could ever know these — pure user-entered fields">Patient & clinic</CardTitle>
          <TextEditRow icon={User} iconColor={T.muted} label="Patient name" value={profile.patientName} placeholder="Not set" onChange={setProfile('patientName')} />
          <TextEditRow icon={Hash} iconColor={T.muted} label="Patient number" value={profile.patientNumber} placeholder="Not set" onChange={setProfile('patientNumber')} />
          <TextEditRow icon={Phone} iconColor={T.muted} label="Clinic phone" value={profile.clinicPhone} placeholder="Not set" type="tel" onChange={setProfile('clinicPhone')} last />
        </div>
        <div style={{ fontSize: 12, color: T.muted, padding: '0 4px', lineHeight: 1.5 }}>
          Patient name and number appear on the Clinician visit report. Clinic phone adds a one-tap "Call clinic" button to the Equipment page.
        </div>

        <div style={{ background: T.surface, borderRadius: 22, padding: 20 }}>
          <CardTitle sub="A file you keep — nothing here is uploaded anywhere">Backup</CardTitle>
          <div style={{ fontSize: 12, color: lastBackup ? T.muted : SEV.fair, marginBottom: 14, fontWeight: lastBackup ? 400 : 600 }}>
            {lastBackup ? (() => {
              const d = daysAgo(lastBackup)
              return `Last backed up ${d === 0 ? 'today' : d === 1 ? '1 day ago' : `${d} days ago`}`
            })() : 'Never backed up'}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={handleExport} className="font-display" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '11px 14px', borderRadius: 12, background: T.ink, color: '#FFFFFF', fontSize: 13.5, fontWeight: 700 }}>
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
        <div style={{ fontSize: 12, color: T.muted, padding: '0 4px', lineHeight: 1.5 }}>
          Local-first means this data lives in exactly one place — this phone's own storage. Export saves your night summaries and tagged nights (everything that can't be re-read off the SD card) to a file you control; keep it wherever you'd keep any other backup. Waveform detail isn't included — that's a 90-day cache, regenerated the next time you import.
        </div>
      </main>
    </div>
  )
}
