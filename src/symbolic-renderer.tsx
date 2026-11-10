// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { useEffect, useState } from 'react'
import type { InnerAction } from './inner'
import type { Encounter } from './encounter'
import type { WorldRendererProps } from './world-renderer'
import { useLanguage } from './i18n'

export function validateSymbolic(encounter: Encounter) {
  const plan = encounter.innerPlan
  if (!plan) return '这次相遇没有内在景观计划，暂时无法进入。'
  if (plan.format !== 'encounter' && plan.format !== 'space') return '这次内在景观的形式暂不支持。'
  if (!Number.isFinite(plan.durationSec) || plan.durationSec <= 0) return '这次内在景观的时长无效。'
  return undefined
}

function formatClock(totalSeconds: number) {
  const safe = Math.max(0, Math.floor(totalSeconds))
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`
}

export function symbolicPhase(seconds: number, duration = 75, format: 'encounter' | 'space' = 'encounter'): InnerAction {
  if (format === 'space') return 'pause'
  const t = Math.max(0, Math.min(duration, seconds))
  const at = (secondsAt75: number) => duration * secondsAt75 / 75
  if (t < at(12)) return 'arrive'
  if (t < at(28)) return 'notice'
  if (t < at(43)) return 'approach'
  if (t < at(55)) return 'pause'
  if (t < at(68)) return 'transform'
  return 'leave'
}

export function SymbolicRenderer({ encounter, replay, onAgency }: WorldRendererProps) {
  const { t } = useLanguage()
  const plan = encounter.innerPlan
  const [seconds, setSeconds] = useState(0)
  const [paused, setPaused] = useState(false)
  const [left, setLeft] = useState(false)

  useEffect(() => {
    setSeconds(0)
    setPaused(false)
    setLeft(false)
  }, [encounter.id, replay])

  useEffect(() => {
    if (!plan || paused || left) return
    const timer = window.setInterval(() => {
      setSeconds(value => {
        if (value >= plan.durationSec) return plan.durationSec
        return Math.min(plan.durationSec, value + 0.1)
      })
    }, 100)
    return () => window.clearInterval(timer)
  }, [plan, paused, left])

  if (!plan) return <div className="scene-placeholder" role="alert">{t('这次相遇没有内在景观计划，暂时无法进入。')}</div>

  if (left) {
    return (
      <div className="symbolic-episode symbolic-left">
        <div className="symbolic-left-copy">
          <p>{t('你离开了这个空间。')}</p>
          <button className="quiet" onClick={() => { onAgency?.({ atSec: Math.round(seconds), action: 'reenter' }); setLeft(false) }}>{t('重新进入')}</button>
        </div>
      </div>
    )
  }

  const isSpace = plan.format === 'space'
  const phase = symbolicPhase(seconds, plan.durationSec, plan.format)
  const done = !isSpace && seconds >= plan.durationSec
  return (
    <div className={`symbolic-episode motif-${plan.motifs[0]} phase-${phase} format-${plan.format}`} role="img" aria-label={t('象征空间')}>
      <div className="symbolic-sky" />
      <div className="symbolic-horizon" />
      <div className="symbolic-water" />
      <div className="symbolic-door" />
      <div className={`symbolic-figure figure-${plan.figure}`} />
      <div className="symbolic-fog" />
      {!isSpace && <div className="symbolic-progress" role="progressbar" aria-label={t('空间进度')} aria-valuemin={0} aria-valuemax={plan.durationSec} aria-valuenow={Math.floor(seconds)}><span style={{ width: `${Math.min(100, seconds / plan.durationSec * 100)}%` }} /></div>}
      {!isSpace && <span className="symbolic-time" aria-live="off">{formatClock(seconds)} / {formatClock(plan.durationSec)}</span>}
      <div className="symbolic-controls">
        <button className="quiet" onClick={() => { onAgency?.({ atSec: Math.round(seconds), action: 'approach' }); setSeconds(value => Math.min(plan.durationSec, value + 8)) }}>{t('靠近一点')}</button>
        <button className="quiet" onClick={() => { onAgency?.({ atSec: Math.round(seconds), action: paused ? 'resume' : 'stay' }); setPaused(value => !value) }}>{paused ? t('继续停留') : t('停留')}</button>
        <button className="quiet" onClick={() => { onAgency?.({ atSec: Math.round(seconds), action: 'leave' }); setLeft(true) }}>{t('离开')}</button>
      </div>
      {done && <div className="symbolic-end" role="status"><p>{t('这段空间结束了。')}</p><button className="quiet" onClick={() => { onAgency?.({ atSec: 0, action: 'reenter' }); setSeconds(0); setPaused(false) }}>{t('再进入一次')}</button></div>}
    </div>
  )
}
