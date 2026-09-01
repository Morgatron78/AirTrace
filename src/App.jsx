import { useState, useEffect, useMemo } from 'react'
import { Home, TrendingUp, Lightbulb, BarChart3, Moon, LayoutGrid, Settings, Upload } from 'lucide-react'
import { T, C } from './constants/theme'
import { DEFAULT_TARGETS } from './constants/equipment'
import { toDateStr } from './utils/dates'
import { useMockData } from './utils/mockData'
import { SplashScreen } from './screens/SplashScreen'
import { TodayScreen } from './screens/TodayScreen'
import { TrendsScreen } from './screens/TrendsScreen'
import { StatsScreen } from './screens/StatsScreen'
import { DrillDownScreen } from './screens/DrillDownScreen'
import { InsightsScreen } from './screens/InsightsScreen'
import { EquipmentScreen } from './screens/EquipmentScreen'
import { ClinicianReportScreen } from './screens/ClinicianReportScreen'
import { ImportScreen } from './screens/ImportScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { TagEntryScreen } from './screens/TagEntryScreen'

export default function App() {
  const rawNights = useMockData()
  const [showReport, setShowReport] = useState(false)
  const [targets, setTargets] = useState(DEFAULT_TARGETS)
  const [splashStage, setSplashStage] = useState('visible') // visible -> fading -> gone
  useEffect(() => {
    const t1 = setTimeout(() => setSplashStage('fading'), 1000)
    const t2 = setTimeout(() => setSplashStage('gone'), 1300)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])
  const [equipment, setEquipment] = useState({
    cushionSize: 'Medium',
    cushionChanged: '2026-08-05',
    lastCleaned: '2026-08-27',
    headgearWashed: '2026-08-14',
    filterChanged: '2026-07-02',
  })
  // Tags are keyed by calendar date, entirely separate from night/import
  // data — import (or, here, the mock generator) never owns or creates a
  // tag, it's just merged in below by date whenever both exist. Mock-only
  // seed: simulates "the user completed their first import 9 days ago"
  // (tagStartDate) with a few days already logged, and the most recent 2
  // nights left unreviewed so the Today prompt/nag has something real to
  // show. In the real build tagStartDate is set exactly once, the moment
  // the first import actually completes — nothing recomputed like this.
  const [tagStartDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 9)
    return toDateStr(d)
  })
  const [tagLog, setTagLog] = useState(() => {
    const seed = {}
    const mk = (daysAgo) => { const d = new Date(); d.setDate(d.getDate() - daysAgo); return toDateStr(d) }
    seed[mk(9)] = { reviewed: true, alcohol: 'light', lateMeal: false, awayFromHome: false, highStress: false, illness: false }
    seed[mk(7)] = { reviewed: true, alcohol: null, lateMeal: false, awayFromHome: false, highStress: false, illness: false }
    seed[mk(6)] = { reviewed: true, alcohol: null, lateMeal: true, awayFromHome: false, highStress: true, illness: false }
    seed[mk(4)] = { reviewed: true, alcohol: null, lateMeal: false, awayFromHome: true, highStress: false, illness: false }
    // days -3 through -1 deliberately left unreviewed — this is the gap
    // the Today prompt/nag is meant to catch.
    return seed
  })
  // Merges the raw (imported/mock) nights with the tag log by date. Any
  // night before tagStartDate is exempt from review-state tracking
  // entirely — first-import history can span a year or more, so treating
  // all of it as "unreviewed" would either nag uselessly for hundreds of
  // nights at once, or pretend accurate same-day recall is possible for
  // data that old. Exempt nights just carry whatever their own data has
  // (the mock's pre-existing random tags) with no status attached.
  const nights = useMemo(() => rawNights.map((n) => {
    const exempt = n.date < tagStartDate
    const entry = tagLog[n.date]
    const status = exempt ? 'exempt' : entry ? 'reviewed' : 'unreviewed'
    // An explicit edit always takes effect, even on an exempt night — the
    // user can still choose to retroactively tag older history via Night
    // View. Exemption only controls whether an *unedited* date counts
    // toward the nag/review tracking, not whether editing it works.
    let tags = entry ? [
      ...(entry.alcohol ? ['alcohol'] : []),
      ...(entry.lateMeal ? ['lateMeal'] : []),
      ...(entry.awayFromHome ? ['awayFromHome'] : []),
      ...(entry.highStress ? ['highStress'] : []),
      ...(entry.illness ? ['illness'] : []),
    ] : exempt ? n.tags : []
    // Late start is auto-detected from the machine's own data (session
    // start vs. Target bedtime), independent of tagStartDate/review status
    // entirely — there's nothing to review for a number the device
    // already recorded, so it's just always there once a night has data.
    if (!n.noUsage && n.startHour > targets.bedtime + 2) tags = [...tags, 'lateStart']
    return { ...n, tags, tagStatus: status, alcoholLevel: entry ? entry.alcohol : null }
  }), [rawNights, tagLog, tagStartDate, targets.bedtime])
  // Every date from tagStartDate through yesterday with no tagLog entry —
  // computed independent of rawNights entirely, since the whole point is
  // catching up on a date even if that night hasn't been imported yet.
  const untaggedDates = useMemo(() => {
    const out = []
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1); yesterday.setHours(0, 0, 0, 0)
    for (const d = new Date(`${tagStartDate}T00:00:00`); d <= yesterday; d.setDate(d.getDate() + 1)) {
      const ds = toDateStr(d)
      if (!tagLog[ds]) out.push(ds)
    }
    return out
  }, [tagLog, tagStartDate])
  const [tagEntryDate, setTagEntryDate] = useState(null)
  const saveTagEntry = (entry) => { setTagLog((log) => ({ ...log, [tagEntryDate]: entry })); setTagEntryDate(null) }
  const [showImport, setShowImport] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [tab, setTab] = useState('today')
  const [nightIdx, setNightIdx] = useState(nights.length - 1)
  const goToNight = (i) => { setNightIdx(i); setTab('night') }
  const tabs = [
    { key: 'today', label: 'Today', icon: Home },
    { key: 'trends', label: 'Trends', icon: TrendingUp },
    { key: 'stats', label: 'Stats', icon: BarChart3 },
    { key: 'night', label: 'Night View', icon: Moon },
    { key: 'insights', label: 'Insights', icon: Lightbulb },
    { key: 'equipment', label: 'Equipment', icon: LayoutGrid },
  ]
  // Derived from the actual last night's date rather than hardcoded — the
  // mock data itself is anchored to the real current date, so a fixed
  // string here would silently drift out of sync with it (and already had).
  const lastNight = nights[nights.length - 1]
  const todayTitle = lastNight
    ? new Date(`${lastNight.date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })
    : ''
  const titles = { today: todayTitle, trends: 'Trends', stats: 'Stats', night: 'Night detail', insights: 'Insights', equipment: 'Equipment' }

  if (splashStage !== 'gone') {
    return <SplashScreen fadingOut={splashStage === 'fading'} />
  }
  if (showReport) {
    return <ClinicianReportScreen nights={nights} onBack={() => setShowReport(false)} equipment={equipment} />
  }
  if (showImport) {
    return <ImportScreen onBack={() => setShowImport(false)} />
  }
  if (showSettings) {
    return <SettingsScreen onBack={() => setShowSettings(false)} targets={targets} onChange={setTargets} />
  }

  return (
    <div style={{ minHeight: '100vh', width: '100%', paddingBottom: 96, background: T.bg, fontFamily: "'Plus Jakarta Sans', ui-sans-serif, system-ui", color: T.ink }}>
      <header style={{ maxWidth: 448, margin: '0 auto', padding: 'max(20px, env(safe-area-inset-top)) max(18px, env(safe-area-inset-right)) 8px max(18px, env(safe-area-inset-left))', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={() => setShowSettings(true)} style={{ width: 36, height: 36, borderRadius: '50%', background: T.surface, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Settings size={17} style={{ color: T.ink }} />
        </button>
        <div className="font-display" style={{ fontSize: 22, fontWeight: 800, color: T.ink, letterSpacing: '-0.01em' }}>{titles[tab]}</div>
        <button onClick={() => setShowImport(true)} style={{ width: 36, height: 36, borderRadius: '50%', background: T.surface, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Upload size={17} style={{ color: T.ink }} />
        </button>
      </header>

      <main style={{ maxWidth: 448, margin: '0 auto', padding: '12px 18px 0' }}>
        {tab === 'today' && <TodayScreen nights={nights} onNavigate={setTab} onSelectNight={goToNight} targets={targets} equipment={equipment} untaggedDates={untaggedDates} onOpenTagEntry={setTagEntryDate} />}
        {tab === 'trends' && <TrendsScreen nights={nights} onSelectNight={goToNight} targets={targets} />}
        {tab === 'stats' && <StatsScreen nights={nights} targets={targets} />}
        {tab === 'night' && <DrillDownScreen nights={nights} idx={nightIdx} setIdx={setNightIdx} targets={targets} onOpenTagEntry={setTagEntryDate} />}
        {tab === 'insights' && <InsightsScreen nights={nights} onOpenReport={() => setShowReport(true)} onNavigate={setTab} onSelectNight={goToNight} targets={targets} equipment={equipment} />}
        {tab === 'equipment' && <EquipmentScreen equipment={equipment} onChange={setEquipment} />}
      </main>

      {tagEntryDate && (
        <TagEntryScreen date={tagEntryDate} initialEntry={tagLog[tagEntryDate]} onSave={saveTagEntry} onClose={() => setTagEntryDate(null)} />
      )}

      <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, display: 'flex', justifyContent: 'center', background: T.surface, borderTop: `1px solid ${T.line}` }}>
        <div style={{ maxWidth: 448, width: '100%', display: 'flex', padding: '8px max(4px, env(safe-area-inset-right)) max(8px, env(safe-area-inset-bottom)) max(4px, env(safe-area-inset-left))' }}>
          {tabs.map((tb) => {
            const Icon = tb.icon; const active = tab === tb.key
            return (
              <button key={tb.key} onClick={() => setTab(tb.key)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '6px 0' }}>
                <Icon size={18} style={{ color: active ? C.blue : T.muted }} />
                <span className="font-display" style={{ fontSize: 10, fontWeight: 500, color: active ? C.blue : T.muted }}>{tb.label}</span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
