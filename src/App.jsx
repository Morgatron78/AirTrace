import { useState, useEffect, useMemo } from 'react'
import { Home, TrendingUp, Lightbulb, BarChart3, Moon, LayoutGrid, Settings, Upload, CalendarDays } from 'lucide-react'
import { T, C, applyTheme } from './constants/theme'
import { EQUIPMENT, DEFAULT_TARGETS } from './constants/equipment'
import { useStoredNights } from './db/useStoredNights.js'
import { getMeta, setMeta } from './db/meta.js'
import { getUntaggedDates, toDateStr, computeNightTags } from './utils/nagLogic.js'
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
import { NavCard } from './components/NavCard'

export default function App() {
  const { status, rawNights, tagLog, tagStartDate, saveTagEntry: persistTagEntry, refresh } = useStoredNights()
  const [showReport, setShowReport] = useState(false)
  const [targets, setTargets] = useState(DEFAULT_TARGETS)
  const [splashStage, setSplashStage] = useState('visible') // visible -> fading -> gone
  useEffect(() => {
    const t1 = setTimeout(() => setSplashStage('fading'), 1000)
    const t2 = setTimeout(() => setSplashStage('gone'), 1300)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])
  // Make/model/serial seeded from EQUIPMENT here (its previous role, a
  // hardcoded mockup placeholder with no edit path at all) — the device
  // can't self-report any of this over the SD card, so these live only
  // as user-entered/edited fields from here on, same persistence as the
  // maintenance dates below.
  const [equipment, setEquipment] = useState({
    cushionSize: 'Medium',
    cushionChanged: '2026-08-05',
    lastCleaned: '2026-08-27',
    headgearWashed: '2026-08-14',
    filterChanged: '2026-07-02',
    machineBrand: EQUIPMENT.machine.brand,
    machineModel: EQUIPMENT.machine.model,
    machineSerial: EQUIPMENT.machine.serial,
    maskBrand: EQUIPMENT.mask.brand,
    maskModel: EQUIPMENT.mask.model,
  })
  // Patient identity + clinic contact — genuinely distinct from targets
  // (therapy goals) and equipment (hardware/maintenance), so its own
  // top-level state rather than folded into either. Nothing imported from
  // the SD card could ever know a patient's name, same reasoning as
  // equipment's own make/model/serial fields above.
  const [profile, setProfile] = useState({ patientName: '', patientNumber: '', clinicPhone: '' })
  // 'system' (default) | 'light' | 'dark'. Resolved against the OS
  // preference when 'system', applied by mutating T's own properties in
  // place (see theme.js) rather than threading a theme value through
  // every component — every screen already reads T.bg/T.surface/etc.
  // fresh on each render, so mutating the shared object and forcing one
  // re-render here is enough for the whole tree to pick it up. The
  // `key` on the root wrapper below is that forced re-render: React
  // remounts everything under it whenever resolvedTheme changes, so
  // components that only read T once during an early effect (rather
  // than on every render) still end up correct.
  const [themeMode, setThemeMode] = useState('system')
  const [systemPrefersDark, setSystemPrefersDark] = useState(
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches
  )
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!mq) return
    const onChange = (e) => setSystemPrefersDark(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  const resolvedTheme = themeMode === 'system' ? (systemPrefersDark ? 'dark' : 'light') : themeMode
  applyTheme(resolvedTheme)
  const updateThemeMode = (next) => { setThemeMode(next); setMeta('themeMode', next) }
  // targets/equipment/profile previously lived only in memory — any change
  // (a custom AHI target, a logged filter-change date) was silently lost
  // on every reload. All three persist via the same generic meta store
  // nights' own import bookkeeping already uses. Loaded once on mount; the
  // hardcoded values above stay as the seed shown until a real stored
  // value (if any) arrives, same brief-flash-then-settle pattern as the
  // rest of the app's IndexedDB-backed state.
  useEffect(() => {
    getMeta('targets').then((v) => v && setTargets(v))
    getMeta('equipment').then((v) => v && setEquipment(v))
    getMeta('profile').then((v) => v && setProfile(v))
    getMeta('themeMode').then((v) => v && setThemeMode(v))
  }, [])
  const updateTargets = (next) => { setTargets(next); setMeta('targets', next) }
  const updateEquipment = (next) => { setEquipment(next); setMeta('equipment', next) }
  const updateProfile = (next) => { setProfile(next); setMeta('profile', next) }
  // Merges the raw (imported, IndexedDB-backed) nights with the tag log by
  // date. Any night before tagStartDate is exempt from review-state
  // tracking entirely — first-import history can span a year or more, so
  // treating all of it as "unreviewed" would either nag uselessly for
  // hundreds of nights at once, or pretend accurate same-day recall is
  // possible for data that old. Exempt nights just carry whatever their
  // own data has (their device-recorded tags, if any) with no status
  // attached. No tagStartDate yet (nothing imported) means every night is
  // exempt — there's nothing to track review state against.
  const nights = useMemo(() => rawNights.map((n) => {
    const exempt = !tagStartDate || n.date < tagStartDate
    const entry = tagLog[n.date]
    const status = exempt ? 'exempt' : entry ? 'reviewed' : 'unreviewed'
    // An explicit edit always takes effect, even on an exempt night — the
    // user can still choose to retroactively tag older history via Night
    // View. Exemption only controls whether an *unedited* date counts
    // toward the nag/review tracking, not whether editing it works.
    // The tag array itself (manual tags + auto-detected 'lateStart') is
    // computeNightTags in nagLogic.js — the weekly-summary push needs the
    // exact same computation and can't run this component's own useMemo.
    // Takes targets.bedtime specifically (not the whole targets object) so
    // this memo doesn't recompute the entire history's tags whenever an
    // unrelated target changes in Settings.
    const tags = computeNightTags(n, tagLog, targets.bedtime)
    return { ...n, tags, tagStatus: status, alcoholLevel: entry ? entry.alcohol : null, note: entry?.note || null }
  }), [rawNights, tagLog, tagStartDate, targets.bedtime])
  // Every date from tagStartDate through yesterday with no tagLog entry —
  // computed independent of rawNights entirely, since the whole point is
  // catching up on a date even if that night hasn't been imported yet.
  // Extracted to nagLogic.js — the push notification service worker
  // needs this exact same logic to decide whether to nag, and needs it
  // dependency-free (no lucide-react/theme), so there's one shared
  // implementation rather than two that could drift.
  const untaggedDates = useMemo(() => getUntaggedDates(tagLog, tagStartDate), [tagLog, tagStartDate])
  const [tagEntryDate, setTagEntryDate] = useState(null)
  const saveTagEntry = (entry) => { persistTagEntry(tagEntryDate, entry); setTagEntryDate(null) }
  const [showImport, setShowImport] = useState(false)
  const closeImport = () => { setShowImport(false); refresh() }
  const [showSettings, setShowSettings] = useState(false)
  const [tab, setTab] = useState('today')
  // Deep-link handling for a tapped push notification — a service
  // worker can only navigate to a URL, not reach into React state
  // directly, so the notification's own click handler opens this same
  // origin with a query param and this reads it once on mount.
  // ?tag=yesterday opens the exact same quick-tag entry point Today's
  // own card already uses; ?nag=<target> reuses whichever target string
  // getPrimaryInsight already returns for that kind of nudge (e.g.
  // 'equipment'), so there's one shared vocabulary instead of a second
  // one invented just for notifications. Stripped from the URL once
  // handled so a later reload doesn't re-trigger it.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const tagParam = params.get('tag')
    const nagParam = params.get('nag')
    if (!tagParam && !nagParam) return
    if (tagParam === 'yesterday') {
      const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1)
      setTagEntryDate(toDateStr(yesterday))
    }
    // clinicianReport isn't a tab key — it's the Open in Browser link on
    // ClinicianReportScreen's own print button, breaking a standalone
    // PWA out into a real Safari tab (window.print() is a no-op in
    // standalone mode) and landing straight back on the report itself,
    // not just the app's home screen.
    if (nagParam === 'clinicianReport') setShowReport(true)
    else if (nagParam) setTab(nagParam)
    const url = new URL(window.location.href)
    url.search = ''
    window.history.replaceState({}, '', url)
  }, [])
  // Lives here (not inside DrillDownScreen) because its trigger button
  // moved into the shared header, next to Settings/Upload — see the
  // header's tab === 'night' branch below.
  const [showJumpToDate, setShowJumpToDate] = useState(false)
  const [nightIdx, setNightIdx] = useState(Math.max(0, nights.length - 1))
  useEffect(() => { setNightIdx(Math.max(0, nights.length - 1)) }, [nights.length])
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
  // real data is anchored to whatever the device actually recorded, so a
  // fixed string here would silently drift out of sync with it.
  const lastNight = nights[nights.length - 1]
  const todayTitle = lastNight
    ? new Date(`${lastNight.date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })
    : ''
  const titles = { today: todayTitle, trends: 'Trends', stats: 'Stats', night: 'Night detail', insights: 'Insights', equipment: 'Equipment' }

  if (splashStage !== 'gone' || status === 'loading') {
    return <SplashScreen fadingOut={splashStage === 'fading'} />
  }
  if (showReport) {
    return <ClinicianReportScreen nights={nights} onBack={() => setShowReport(false)} equipment={equipment} profile={profile} />
  }
  if (showImport) {
    return <ImportScreen key={resolvedTheme} onBack={closeImport} nights={nights} /* APPLE-HEALTH — see docs/apple-health-integration.md */ />
  }
  if (showSettings) {
    return <SettingsScreen key={resolvedTheme} onBack={() => setShowSettings(false)} targets={targets} onChange={updateTargets} profile={profile} onChangeProfile={updateProfile}
      themeMode={themeMode} onChangeThemeMode={updateThemeMode} />
  }
  if (status === 'empty') {
    return (
      <div key={resolvedTheme} style={{ minHeight: '100vh', width: '100%', background: T.bg, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 18px', boxSizing: 'border-box' }}>
        <div style={{ maxWidth: 448, margin: '0 auto', width: '100%' }}>
          <NavCard icon={Upload} dot={`linear-gradient(135deg,${C.blue},${C.purple})`}
            title="Import your CPAP data" subtitle="Plug in your SD card to get started"
            onClick={() => setShowImport(true)} />
        </div>
      </div>
    )
  }

  return (
    <div key={resolvedTheme} style={{ minHeight: '100vh', width: '100%', paddingBottom: 96, background: T.bg, fontFamily: "'Plus Jakarta Sans', ui-sans-serif, system-ui", color: T.ink }}>
      <header style={{ maxWidth: 448, margin: '0 auto', padding: 'max(20px, calc(env(safe-area-inset-top, 0px) + 24px)) max(18px, env(safe-area-inset-right, 0px)) 8px max(18px, env(safe-area-inset-left, 0px))', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowSettings(true)} style={{ width: 36, height: 36, borderRadius: '50%', background: T.surface, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Settings size={17} style={{ color: T.ink }} />
          </button>
          {/* Invisible spacer matching the calendar button's width+gap on
              the right (below) — without it, Night View's extra button
              makes the right side wider than the left, so space-between
              pushes the title off-center. Only added on the tab that
              actually has the extra button, so every other tab's header
              is untouched. */}
          {tab === 'night' && <div style={{ width: 36, height: 36 }} />}
        </div>
        <div className="font-display" style={{ fontSize: 22, fontWeight: 800, color: T.ink, letterSpacing: '-0.01em' }}>{titles[tab]}</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {tab === 'night' && (
            <button onClick={() => setShowJumpToDate(true)} style={{ width: 36, height: 36, borderRadius: '50%', background: T.surface, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CalendarDays size={17} style={{ color: T.ink }} />
            </button>
          )}
          <button onClick={() => setShowImport(true)} style={{ width: 36, height: 36, borderRadius: '50%', background: T.surface, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Upload size={17} style={{ color: T.ink }} />
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 448, margin: '0 auto', padding: '12px 18px 0' }}>
        {tab === 'today' && <TodayScreen nights={nights} onNavigate={setTab} onSelectNight={goToNight} targets={targets} equipment={equipment} untaggedDates={untaggedDates} onOpenTagEntry={setTagEntryDate} onOpenImport={() => setShowImport(true)} />}
        {tab === 'trends' && <TrendsScreen nights={nights} onSelectNight={goToNight} targets={targets} />}
        {tab === 'stats' && <StatsScreen nights={nights} targets={targets} />}
        {tab === 'night' && <DrillDownScreen nights={nights} idx={nightIdx} setIdx={setNightIdx} targets={targets} onOpenTagEntry={setTagEntryDate}
          showJump={showJumpToDate} onCloseJump={() => setShowJumpToDate(false)} />}
        {tab === 'insights' && <InsightsScreen nights={nights} onOpenReport={() => setShowReport(true)} onNavigate={setTab} onSelectNight={goToNight} targets={targets} equipment={equipment} />}
        {tab === 'equipment' && <EquipmentScreen equipment={equipment} onChange={updateEquipment} nights={nights} profile={profile} />}
      </main>

      {tagEntryDate && (
        <TagEntryScreen date={tagEntryDate} initialEntry={tagLog[tagEntryDate]} onSave={saveTagEntry} onClose={() => setTagEntryDate(null)} />
      )}

      <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, display: 'flex', justifyContent: 'center', background: T.surface, borderTop: `1px solid ${T.line}` }}>
        <div style={{ maxWidth: 448, width: '100%', display: 'flex', padding: '6px max(4px, env(safe-area-inset-right, 0px)) max(6px, env(safe-area-inset-bottom, 0px)) max(4px, env(safe-area-inset-left, 0px))' }}>
          {tabs.map((tb) => {
            const Icon = tb.icon; const active = tab === tb.key
            return (
              <button key={tb.key} onClick={() => setTab(tb.key)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '4px 0' }}>
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
