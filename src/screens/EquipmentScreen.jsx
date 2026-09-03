import { useState, useEffect } from 'react'
import {
  ChevronRight, TriangleAlert, VenetianMask, Hash, RefreshCw, Gauge, Wind,
  TrendingUp, Shield, Droplets, Thermometer, Package, Zap, Ruler, Tag, Box, Phone,
} from 'lucide-react'
import { T, C, SEV } from '../constants/theme'
import { EQUIPMENT } from '../constants/equipment'
import { daysAgo } from '../utils/dates'
import { dueColor, currentSetPressure, mostRecentValue, filterIntervalDays } from '../utils/scoring'
import { getMeta } from '../db/meta.js'
import { TextEditRow } from '../components/TextEditRow'
import { NavCard } from '../components/NavCard'
// Real product photos of this user's own confirmed hardware (AirSense 10
// Elite; mask style per S.Mask confirmed elsewhere in this file) — used
// in place of the generic Fan/VenetianMask header icons specifically,
// per direct request. Those two icons stay as the fallback/default
// everywhere else they're used (e.g. Mask type's own StatRow below),
// this is only about the big circular header avatar on each card.
import machinePhoto from '../assets/equipment-machine.jpg'
import maskPhoto from '../assets/equipment-mask.jpg'

// Enum meanings confirmed against OSCAR's own resmed_loader.cpp (channel/
// addOption definitions, and for EPR specifically its actual STR.edf
// derivation logic — see parseSummaries.js), cross-checked field-by-field
// against a real OSCAR "Device Settings" screenshot for this exact card.
// Tube type has no confirmed enum available, so that one stays unread.
const MODE_LABEL = { 0: 'CPAP' }
const RAMP_LABEL = { 0: 'Off', 1: 'On', 2: 'Auto' }
const ON_OFF_LABEL = { 0: 'Off', 1: 'On' }
const ON_OFF_AUTO_LABEL = { 0: 'Off', 1: 'On', 2: 'Auto' }
const YES_NO_LABEL = { 0: 'No', 1: 'Yes' }
const AUTO_MANUAL_LABEL = { 0: 'Auto', 1: 'Manual' }
// OSCAR's own label for value 3 is literally "Patient???" (an
// unresolved/uncertain state even in its own source) — relabeled here
// since that reads as a debug artifact, not something to surface as-is.
const EPR_LABEL = { 0: 'Off', 1: 'Ramp Only', 2: 'Full Time', 3: 'Unknown' }
const MASK_TYPE_LABEL = { 0: 'Pillows', 1: 'Full Face', 2: 'Nasal', 3: 'Unknown' }
function labelOr(rawValue, labelMap, fallbackLabel) {
  return rawValue == null ? fallbackLabel : (labelMap[rawValue] ?? fallbackLabel)
}
import { StatRow } from '../components/StatRow'
import { Segmented } from '../components/Segmented'

function SelectRow({ icon: Icon, iconColor, label, value, children, last }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderBottom: last ? 'none' : `1px solid ${T.line}` }}>
      <div onClick={() => setOpen((o) => !o)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 44, boxSizing: 'border-box', cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {Icon && <Icon size={18} style={{ color: iconColor }} strokeWidth={1.8} />}
          <span className="font-display" style={{ fontSize: 14.5, color: T.ink }}>{label}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="font-display" style={{ fontSize: 18, fontWeight: 700, color: T.ink }}>{value}</span>
          <ChevronRight size={14} style={{ color: T.muted, transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }} />
        </div>
      </div>
      {open && <div style={{ paddingBottom: 14, display: 'flex', justifyContent: 'flex-end' }}>{children}</div>}
    </div>
  )
}


function MaintenanceRow({ icon: Icon, label, dateStr, onChange, intervalDays, description, last }) {
  const [open, setOpen] = useState(false)
  const days = daysAgo(dateStr)
  const color = dueColor(days, intervalDays)
  const overdue = days >= intervalDays
  const today = new Date().toISOString().slice(0, 10)
  return (
    <div style={{ borderBottom: last ? 'none' : `1px solid ${T.line}` }}>
      <div onClick={() => setOpen((o) => !o)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 44, boxSizing: 'border-box', cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Icon size={18} style={{ color }} strokeWidth={1.8} />
          <span className="font-display" style={{ fontSize: 14.5, color: T.ink }}>{label}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {overdue && <TriangleAlert size={18} style={{ color: SEV.bad }} />}
          <span className="font-display" style={{ fontSize: 18, fontWeight: 700, color: T.ink }}>{days === 0 ? 'Today' : `${days} days ago`}</span>
          <ChevronRight size={14} style={{ color: T.muted, transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }} />
        </div>
      </div>
      {open && (
        <div style={{ paddingBottom: 14 }}>
          {description && <p className="font-display" style={{ fontSize: 12.5, fontWeight: 500, lineHeight: 1.5, color: T.muted, margin: '0 0 12px' }}>{description}</p>}
          {overdue && (
            <p className="font-display" style={{ fontSize: 12.5, fontWeight: 600, color: SEV.bad, margin: '0 0 12px' }}>
              Past the typical replacement window — worth doing soon.
            </p>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <input type="date" value={dateStr} max={today} onChange={(e) => onChange(e.target.value)}
              style={{ flex: 1, padding: '9px 10px', borderRadius: 10, border: `1px solid ${T.line}`, fontFamily: "'Plus Jakarta Sans'", fontSize: 13, color: T.ink, background: T.bg }} />
            <button onClick={() => onChange(today)} className="font-display"
              style={{ padding: '9px 14px', borderRadius: 10, background: C.blue, color: '#FFFFFF', fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap' }}>
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export function EquipmentScreen({ equipment, onChange, nights, profile }) {
  const set = (key) => (val) => onChange({ ...equipment, [key]: val })
  // Real per-night data (see parseSummaries.js) wherever a confirmed
  // signal exists. Machine identity (brand/model/serial), specific mask
  // product, cushion size, and Essentials tier stay EQUIPMENT's mockup
  // placeholders — those aren't things the device itself records (mask
  // *style* is, and is wired below; the exact product isn't).
  const setPressure = currentSetPressure(nights, EQUIPMENT.fixedPressure)
  const modeLabel = labelOr(mostRecentValue(nights, 'mode', null), MODE_LABEL, EQUIPMENT.machine.mode)
  const rampEnableRaw = mostRecentValue(nights, 'rampEnable', null)
  const rampTimeRaw = mostRecentValue(nights, 'rampTime', null)
  const rampLabel = rampEnableRaw == null ? EQUIPMENT.machine.ramp
    : `${RAMP_LABEL[rampEnableRaw] ?? 'Unknown'}${rampEnableRaw > 0 && rampTimeRaw ? ` · ${rampTimeRaw} min` : ''}`
  const eprRaw = mostRecentValue(nights, 'epr', null)
  const eprLevelRaw = mostRecentValue(nights, 'eprLevel', null)
  const eprLabel = eprRaw == null ? `${EQUIPMENT.machine.epr} · ${EQUIPMENT.machine.eprLevel} cmH₂O`
    : `${EPR_LABEL[eprRaw] ?? 'Unknown'}${eprRaw > 0 ? ` · ${eprLevelRaw} cmH₂O` : ''}`
  const humidityLevel = mostRecentValue(nights, 'humidityLevel', EQUIPMENT.machine.humidityLevel)
  const antibacterialLabel = labelOr(mostRecentValue(nights, 'antibacterialFilter', null), YES_NO_LABEL, EQUIPMENT.machine.antibacterialFilter)
  const climateLabel = labelOr(mostRecentValue(nights, 'climateControl', null), AUTO_MANUAL_LABEL, EQUIPMENT.machine.climateControl)
  const humidifierLabel = labelOr(mostRecentValue(nights, 'humidifierStatus', null), ON_OFF_LABEL, EQUIPMENT.machine.humidifier)
  const maskTypeRaw = mostRecentValue(nights, 'mask', null)
  const maskTypeLabel = maskTypeRaw == null ? null : (MASK_TYPE_LABEL[maskTypeRaw] ?? 'Unknown')
  const smartStartLabel = labelOr(mostRecentValue(nights, 'smartStart', null), ON_OFF_LABEL, null)
  const temperatureRaw = mostRecentValue(nights, 'temperature', null)
  const temperatureEnableLabel = labelOr(mostRecentValue(nights, 'temperatureEnable', null), ON_OFF_AUTO_LABEL, null)
  // Same interval Today's overdue-filter warning uses (see scoring.js) —
  // a single source of truth for the 30-vs-180-day distinction.
  const filterInterval = filterIntervalDays(nights)
  // Real last-import date/time, from the same meta record ImportScreen
  // itself writes and reads — not a fake "lastSynced" placeholder.
  const [lastSynced, setLastSynced] = useState(null)
  useEffect(() => { getMeta('lastImport').then((v) => v && setLastSynced(v.date)) }, [])
  // Rarely used and deliberately placed at the very bottom of the page —
  // an easy-to-reach button up top risked an accidental dial while
  // scrolling past. Tapping it opens a confirm step rather than dialing
  // immediately, both as a second guard against that and because the
  // patient number needs to be visible and stay on screen to read out to
  // the clinic — showing it only in a fleeting toast or mid-dial wouldn't
  // actually be "to hand" the way this request asked for.
  const [showCallInfo, setShowCallInfo] = useState(false)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ background: T.surface, borderRadius: 22, padding: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, marginBottom: 10 }}>
            <img src={machinePhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <span className="font-display" style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: T.muted, marginBottom: 2 }}>CPAP machine</span>
          <div className="font-display" style={{ fontSize: 16, fontWeight: 700, color: T.ink }}>{equipment.machineBrand} {equipment.machineModel}</div>
        </div>
        {/* Make/model/serial: the device can't self-report any of this
            over the SD card (STR.edf has no such field), so these three
            are pure user-entered text — everything else on this card is
            either read from real per-night data or a device-recorded
            setting. */}
        <TextEditRow icon={Tag} iconColor={T.muted} label="Brand" value={equipment.machineBrand} placeholder="e.g. ResMed" onChange={set('machineBrand')} />
        <TextEditRow icon={Box} iconColor={T.muted} label="Model" value={equipment.machineModel} placeholder="e.g. AirSense 10 Elite" onChange={set('machineModel')} />
        <TextEditRow icon={Hash} iconColor={T.muted} label="Serial number" value={equipment.machineSerial} placeholder="Not set" onChange={set('machineSerial')} />
        <StatRow icon={RefreshCw} iconColor={T.muted} label="Last synced" value={lastSynced ?? EQUIPMENT.machine.lastSynced} />
        <StatRow icon={Gauge} iconColor={T.muted} label="Mode" value={modeLabel} />
        <StatRow icon={Gauge} iconColor={T.muted} label="Pressure mode" value={EQUIPMENT.pressureMode === 'fixed' ? `Fixed · ${setPressure} cmH₂O` : 'Auto'}
          description="A fixed-pressure machine delivers one constant pressure set by your clinician, rather than adjusting automatically through the night the way an APAP machine does." />
        <StatRow icon={Wind} iconColor={T.muted} label="EPR" value={eprLabel}
          description="Expiratory Pressure Relief slightly lowers pressure as you breathe out, making exhaling feel more natural." />
        <StatRow icon={TrendingUp} iconColor={T.muted} label="Ramp" value={rampLabel} />
        {smartStartLabel != null && <StatRow icon={Zap} iconColor={T.muted} label="Smart Start" value={smartStartLabel}
          description="Starts therapy automatically when it detects you've put the mask on and begun breathing into it, rather than needing a button press." />}
        <MaintenanceRow icon={Wind} label="Filter changed" dateStr={equipment.filterChanged} onChange={set('filterChanged')} intervalDays={filterInterval}
          description="Most manufacturers recommend a reusable filter be rinsed monthly and replaced roughly every 6 months, or sooner in dusty environments. A disposable filter is generally replaced monthly." />
        <StatRow icon={Shield} iconColor={T.muted} label="Antibacterial filter" value={antibacterialLabel} />
        <StatRow icon={Droplets} iconColor={T.muted} label="Humidity level" value={humidityLevel} />
        <StatRow icon={Thermometer} iconColor={T.muted} label="Climate control" value={climateLabel}
          description="Auto lets the machine balance humidity and tube temperature together against room conditions; Manual means you've set the temperature yourself." />
        {temperatureRaw != null && <StatRow icon={Thermometer} iconColor={T.muted} label="Temperature" value={`${temperatureRaw}°C${temperatureEnableLabel ? ` · ${temperatureEnableLabel}` : ''}`} />}
        <StatRow icon={Droplets} iconColor={T.muted} label="Humidifier" value={humidifierLabel} />
        <StatRow icon={Package} iconColor={T.muted} label="Essentials" value={EQUIPMENT.machine.essentials} last />
      </div>

      <div style={{ background: T.surface, borderRadius: 22, padding: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, marginBottom: 10 }}>
            <img src={maskPhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <span className="font-display" style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: T.muted, marginBottom: 2 }}>Mask</span>
          <div className="font-display" style={{ fontSize: 16, fontWeight: 700, color: T.ink }}>{equipment.maskBrand} {equipment.maskModel}</div>
        </div>
        {/* Same reasoning as the machine card above — the device only
            records mask *style* (Mask type, below), never the specific
            product, so brand/model are pure user-entered text. */}
        <TextEditRow icon={Tag} iconColor={T.muted} label="Brand" value={equipment.maskBrand} placeholder="e.g. ResMed" onChange={set('maskBrand')} />
        <TextEditRow icon={Box} iconColor={T.muted} label="Model" value={equipment.maskModel} placeholder="e.g. AirFit F40" onChange={set('maskModel')} />
        {maskTypeLabel && <StatRow icon={VenetianMask} iconColor={T.muted} label="Mask type" value={maskTypeLabel}
          description="The style your machine has recorded (Pillows, Full Face, or Nasal) — a separate field from the specific brand/model above, which the device itself never records." />}
        <SelectRow icon={Ruler} iconColor={T.muted} label="Cushion size" value={equipment.cushionSize}>
          <Segmented options={[{ key: 'Small', label: 'S' }, { key: 'Medium', label: 'M' }, { key: 'Large', label: 'L' }]} active={equipment.cushionSize} onChange={set('cushionSize')} />
        </SelectRow>
        <MaintenanceRow icon={RefreshCw} label="Cushion changed" dateStr={equipment.cushionChanged} onChange={set('cushionChanged')} intervalDays={90}
          description="Cushions lose their seal over time as the silicone breaks down. Most manufacturers suggest replacing every 2-3 months — sooner if you're noticing rising leak rates." />
        <MaintenanceRow icon={Droplets} label="Last cleaned" dateStr={equipment.lastCleaned} onChange={set('lastCleaned')} intervalDays={7}
          description="A daily rinse and a weekly proper wash keeps the silicone supple and free of skin oils, which extends the cushion's actual seal life — not just hygiene." />
        <MaintenanceRow icon={Droplets} label="Headgear washed" dateStr={equipment.headgearWashed} onChange={set('headgearWashed')} intervalDays={14} last
          description="Headgear straps lose elasticity with sweat and oils over time, which can show up as a gradually worsening seal even with a fresh cushion. Most guidance suggests washing every 1-2 weeks." />
      </div>

      {/* Only rendered once a number's actually set (Settings) — a "Call
          clinic" button that does nothing when tapped is worse than no
          button at all. */}
      {profile.clinicPhone && (
        <NavCard icon={Phone} dot={`linear-gradient(135deg,${C.blue},${SEV.good})`} title="Call clinic"
          subtitle={profile.clinicPhone} onClick={() => setShowCallInfo(true)} />
      )}

      {showCallInfo && (
        <div onClick={() => setShowCallInfo(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(10,10,12,0.5)', zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: T.surface, borderRadius: 20, padding: 20, maxWidth: 340, width: '100%' }}>
            <div className="font-display" style={{ fontSize: 16, fontWeight: 800, color: T.ink, marginBottom: 4 }}>Call clinic</div>
            <div style={{ fontSize: 13, color: T.muted, marginBottom: 16, lineHeight: 1.4 }}>Have your patient number ready — it's shown below so it's to hand for the call.</div>
            <div style={{ background: T.bg, borderRadius: 14, padding: 14, marginBottom: 10 }}>
              <div className="font-display" style={{ fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Clinic phone</div>
              <div className="font-display" style={{ fontSize: 20, fontWeight: 800, color: T.ink, marginTop: 2 }}>{profile.clinicPhone}</div>
            </div>
            {profile.patientNumber && (
              <div style={{ background: T.bg, borderRadius: 14, padding: 14, marginBottom: 16 }}>
                <div className="font-display" style={{ fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Your patient number</div>
                <div className="font-display" style={{ fontSize: 20, fontWeight: 800, color: T.ink, marginTop: 2 }}>{profile.patientNumber}</div>
              </div>
            )}
            {/* tel: via window.location.href, not a dedicated <a> tag —
                same native call-dialer behavior on mobile. Deliberately
                doesn't close this panel on its own afterward — if the
                call doesn't connect (or gets cancelled) and the user
                lands back here, the number staying visible is exactly
                the point. */}
            <button onClick={() => { window.location.href = `tel:${profile.clinicPhone}` }} className="font-display"
              style={{ width: '100%', padding: '12px 0', borderRadius: 12, background: C.blue, color: '#FFFFFF', fontSize: 14, fontWeight: 700, marginBottom: 8 }}>
              Call now
            </button>
            <button onClick={() => setShowCallInfo(false)} className="font-display"
              style={{ width: '100%', padding: '12px 0', borderRadius: 12, background: T.bg, color: T.ink, fontSize: 14, fontWeight: 700 }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
