import { Clock, Activity, Gauge, LockKeyhole, PowerOff, Moon, ChevronRight, Sparkles, Flame, Pencil } from 'lucide-react'
import { T, C } from '../constants/theme'
import { EQUIPMENT } from '../constants/equipment'
import { computeStreak, getPrimaryInsight, isConcern } from '../utils/scoring'
import { NavCard } from '../components/NavCard'
import { ScoreRing } from '../components/ScoreRing'
import { EventRing } from '../components/EventRing'
import { StatRow } from '../components/StatRow'
import { MiniDots } from '../components/MiniDots'
import { CardTitle } from '../components/CardTitle'
import { LeakIcon } from '../components/icons/LeakIcon'

export function TodayScreen({ nights, onNavigate, onSelectNight, targets, equipment, untaggedDates, onOpenTagEntry }) {
  const last = nights[nights.length - 1]
  const prev = nights[nights.length - 2]
  const week = nights.slice(-7)
  const streak = computeStreak(nights, targets)
  const insight = getPrimaryInsight(nights, targets, equipment)
  const pctDelta = (curr, prevVal) => (prevVal ? Math.round(((curr - prevVal) / prevVal) * 100) : undefined)
  const goToInsight = () => (insight.target === 'night' ? onSelectNight(nights.length - 1) : onNavigate(insight.target))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <NavCard icon={insight.icon} dot={insight.dot} title={insight.title} subtitle={insight.subtitle} onClick={goToInsight} />

      <div style={{ background: T.surface, borderRadius: 22, padding: '28px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <ScoreRing night={last} targets={targets} size={140} />
          </div>
          <div style={{ flex: 1 }}>
            <EventRing night={last} size={140} />
          </div>
        </div>
        <div style={{ marginTop: 24 }}>
          {prev && <div className="font-display" style={{ fontSize: 11, fontWeight: 600, color: T.muted, marginBottom: 4, textAlign: 'right' }}>Change vs. last night</div>}
          <StatRow icon={Clock} iconColor={C.blue} label="Usage" value={`${last.usage}h`} warn={isConcern('usage', last, targets)} delta={prev ? pctDelta(last.usage, prev.usage) : undefined} />
          <StatRow icon={Activity} iconColor={C.pink} label="Events/hr" value={last.ahi} warn={isConcern('ahi', last, targets)} delta={prev ? pctDelta(last.ahi, prev.ahi) : undefined} />
          <StatRow icon={LeakIcon} iconColor={C.purple} label="Leak" value={`${last.leak} L/min`} warn={isConcern('leak', last, targets)} delta={prev ? pctDelta(last.leak, prev.leak) : undefined}
            description="Air escaping around the mask edge rather than through it. Under ~24 L/min is generally considered an acceptable seal." />
          <StatRow icon={Gauge} iconColor={C.orange} label="Pressure" value={`${EQUIPMENT.fixedPressure} cmH₂O`}
            description={`Your machine is set to a fixed pressure of ${EQUIPMENT.fixedPressure} cmH₂O rather than auto-adjusting. This confirms it held steady overnight.`} />
          <StatRow icon={LockKeyhole} iconColor={C.pink} label="Mask seal" value={last.seal} warn={isConcern('seal', last, targets)}
            description="A rating of how consistently your mask held its seal overnight. Poor seals usually show up as a rising leak rate — check the Leak stat above alongside this." />
          <StatRow icon={PowerOff} iconColor={T.muted} label="Mask off events" value={last.maskOff} warn={isConcern('maskOff', last, targets)} last />
        </div>
        <button onClick={() => onSelectNight(nights.length - 1)} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%',
          marginTop: 16, height: 44, borderRadius: 14, background: T.bg,
        }}>
          <Moon size={15} style={{ color: T.ink }} />
          <span className="font-display" style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>View full night detail</span>
          <ChevronRight size={14} style={{ color: T.muted }} />
        </button>
      </div>

      {untaggedDates.length > 0 && (
        <NavCard icon={Pencil} dot={untaggedDates.length > 1 ? `linear-gradient(135deg,${C.orange},${C.red})` : `linear-gradient(135deg,${C.blue},${C.purple})`}
          title={untaggedDates.length === 1 ? 'Tag last night' : `${untaggedDates.length} nights untagged`}
          subtitle={untaggedDates.length === 1 ? 'What happened? Takes a few seconds' : 'Catch up before you forget what happened'}
          onClick={() => onOpenTagEntry(untaggedDates[0])} />
      )}

      <div style={{ background: T.surface, borderRadius: 22, padding: 20 }}>
        <CardTitle sub="Tap a night for detail">This week</CardTitle>
        <MiniDots nights={week} allNights={nights} targets={targets} onSelect={onSelectNight} />
      </div>

      <NavCard icon={Sparkles} dot={`linear-gradient(135deg,${C.blue},${C.purple})`} title="Tag correlation" subtitle="See what's actually driving your AHI" onClick={() => onNavigate('stats')} />
      <NavCard icon={Flame} dot={`linear-gradient(135deg,${C.orange},${C.red})`} title={streak > 0 ? `${streak}-night streak` : 'No active streak'}
        subtitle={streak > 0 ? 'Consistency is the biggest lever you have' : `${targets.usage}+ hours is what builds a streak — tonight's a good night to start one`} onClick={() => onNavigate('trends')} />
    </div>
  )
}
