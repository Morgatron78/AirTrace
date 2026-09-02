import { useState } from 'react'
import {
  ChevronRight, TriangleAlert, Fan, VenetianMask, Hash, RefreshCw, Gauge, Wind,
  TrendingUp, Shield, Droplets, Thermometer, Package,
} from 'lucide-react'
import { T, C, SEV } from '../constants/theme'
import { EQUIPMENT } from '../constants/equipment'
import { daysAgo } from '../utils/dates'
import { dueColor, currentSetPressure } from '../utils/scoring'
import { StatRow } from '../components/StatRow'
import { Segmented } from '../components/Segmented'

function SelectRow({ label, value, children, last }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderBottom: last ? 'none' : `1px solid ${T.line}` }}>
      <div onClick={() => setOpen((o) => !o)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 44, boxSizing: 'border-box', cursor: 'pointer' }}>
        <span className="font-display" style={{ fontSize: 14.5, color: T.ink }}>{label}</span>
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

export function EquipmentScreen({ equipment, onChange, nights }) {
  const set = (key) => (val) => onChange({ ...equipment, [key]: val })
  // Real per-night data (see parseSummaries.js) — the rest of this
  // screen's machine/mask details still come from EQUIPMENT's mockup
  // placeholders, since that would need actually parsing the SD card's
  // SETTINGS folder, a separate piece of work.
  const setPressure = currentSetPressure(nights, EQUIPMENT.fixedPressure)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ background: T.surface, borderRadius: 22, padding: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: `linear-gradient(135deg,${C.blue},${C.purple})`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
            <Fan size={30} style={{ color: '#FFFFFF' }} strokeWidth={1.8} />
          </div>
          <span className="font-display" style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: T.muted, marginBottom: 2 }}>CPAP machine</span>
          <div className="font-display" style={{ fontSize: 16, fontWeight: 700, color: T.ink }}>{EQUIPMENT.machine.brand} {EQUIPMENT.machine.model}</div>
        </div>
        <StatRow icon={Hash} iconColor={T.muted} label="Serial number" value={EQUIPMENT.machine.serial} />
        <StatRow icon={RefreshCw} iconColor={T.muted} label="Last synced" value={EQUIPMENT.machine.lastSynced} />
        <StatRow icon={Gauge} iconColor={T.muted} label="Mode" value={EQUIPMENT.machine.mode} />
        <StatRow icon={Gauge} iconColor={T.muted} label="Pressure mode" value={EQUIPMENT.pressureMode === 'fixed' ? `Fixed · ${setPressure} cmH₂O` : 'Auto'}
          description="A fixed-pressure machine delivers one constant pressure set by your clinician, rather than adjusting automatically through the night the way an APAP machine does." />
        <StatRow icon={Wind} iconColor={T.muted} label="EPR" value={`${EQUIPMENT.machine.epr} · ${EQUIPMENT.machine.eprLevel} cmH₂O`}
          description="Expiratory Pressure Relief slightly lowers pressure as you breathe out, making exhaling feel more natural." />
        <StatRow icon={TrendingUp} iconColor={T.muted} label="Ramp" value={EQUIPMENT.machine.ramp} />
        <MaintenanceRow icon={Wind} label="Filter changed" dateStr={equipment.filterChanged} onChange={set('filterChanged')} intervalDays={180}
          description="Most manufacturers recommend a reusable filter be rinsed monthly and replaced roughly every 6 months, or sooner in dusty environments. A disposable filter is generally replaced monthly." />
        <StatRow icon={Shield} iconColor={T.muted} label="Antibacterial filter" value={EQUIPMENT.machine.antibacterialFilter} />
        <StatRow icon={Droplets} iconColor={T.muted} label="Humidity level" value={EQUIPMENT.machine.humidityLevel} />
        <StatRow icon={Thermometer} iconColor={T.muted} label="Climate control" value={EQUIPMENT.machine.climateControl} />
        <StatRow icon={Droplets} iconColor={T.muted} label="Humidifier" value={EQUIPMENT.machine.humidifier} />
        <StatRow icon={Package} iconColor={T.muted} label="Essentials" value={EQUIPMENT.machine.essentials} last />
      </div>

      <div style={{ background: T.surface, borderRadius: 22, padding: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: `linear-gradient(135deg,${C.pink},${C.purple})`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
            <VenetianMask size={30} style={{ color: '#FFFFFF' }} strokeWidth={1.8} />
          </div>
          <span className="font-display" style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: T.muted, marginBottom: 2 }}>Mask</span>
          <div className="font-display" style={{ fontSize: 16, fontWeight: 700, color: T.ink }}>{EQUIPMENT.mask.brand} {EQUIPMENT.mask.model}</div>
        </div>
        <SelectRow label="Cushion size" value={equipment.cushionSize}>
          <Segmented options={[{ key: 'Small', label: 'S' }, { key: 'Medium', label: 'M' }, { key: 'Large', label: 'L' }]} active={equipment.cushionSize} onChange={set('cushionSize')} />
        </SelectRow>
        <MaintenanceRow icon={RefreshCw} label="Cushion changed" dateStr={equipment.cushionChanged} onChange={set('cushionChanged')} intervalDays={90}
          description="Cushions lose their seal over time as the silicone breaks down. Most manufacturers suggest replacing every 2-3 months — sooner if you're noticing rising leak rates." />
        <MaintenanceRow icon={Droplets} label="Last cleaned" dateStr={equipment.lastCleaned} onChange={set('lastCleaned')} intervalDays={7}
          description="A daily rinse and a weekly proper wash keeps the silicone supple and free of skin oils, which extends the cushion's actual seal life — not just hygiene." />
        <MaintenanceRow icon={Droplets} label="Headgear washed" dateStr={equipment.headgearWashed} onChange={set('headgearWashed')} intervalDays={14} last
          description="Headgear straps lose elasticity with sweat and oils over time, which can show up as a gradually worsening seal even with a fresh cushion. Most guidance suggests washing every 1-2 weeks." />
      </div>
    </div>
  )
}
