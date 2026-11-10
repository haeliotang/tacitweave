// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { useEffect, useRef, useState } from 'react'
import { grantLocalSignalConsent } from './somatic-signal'
import { SimulatedSignalSource, summarizeTimeline, traceToTimeline, type SignalSample, type SignalTimeline } from './signal-source'
import { useLanguage } from './i18n'
import { createSignalSession, type SignalSession } from './signal-session'

export function SignalSimulator({ onSession, onRetract }: { onSession?: (session: SignalSession) => void; onRetract?: (sessionId: string) => void }) {
  const { t } = useLanguage()
  const [consent, setConsent] = useState(false)
  const [running, setRunning] = useState(false)
  const [samples, setSamples] = useState<SignalSample[]>([])
  const [timeline, setTimeline] = useState<SignalTimeline | null>(null)
  const [lastSession, setLastSession] = useState<SignalSession | null>(null)
  const source = useRef<SimulatedSignalSource | null>(null)
  const timeout = useRef<number | null>(null)
  const unsubscribe = useRef<(() => void) | null>(null)

  const stop = () => {
    if (timeout.current !== null) { window.clearTimeout(timeout.current); timeout.current = null }
    unsubscribe.current?.()
    unsubscribe.current = null
    if (!source.current) return
    try {
      const trace = source.current.stop()
      const nextTimeline = traceToTimeline(trace)
      setTimeline(nextTimeline)
      const session = createSignalSession(nextTimeline)
      setLastSession(session)
      onSession?.(session)
    } catch { /* already stopped */ }
    source.current = null
    setRunning(false)
  }

  useEffect(() => () => stop(), [])

  const start = () => {
    if (!consent || running) return
    const next = new SimulatedSignalSource()
    source.current = next
    setSamples([])
    setTimeline(null)
    setLastSession(null)
    unsubscribe.current = next.subscribe(sample => setSamples(current => [...current, sample]))
    next.start(grantLocalSignalConsent())
    setRunning(true)
    timeout.current = window.setTimeout(stop, 15000)
  }

  const latest = (kind: SignalSample['kind']) => [...samples].reverse().find(sample => sample.kind === kind)
  const heart = latest('heart_rate')
  const eda = latest('eda')
  const summary = timeline ? summarizeTimeline(timeline) : null
  const retract = () => {
    if (!lastSession) return
    onRetract?.(lastSession.id)
    setLastSession(null)
    setTimeline(null)
    setSamples([])
  }

  const exportTimeline = () => {
    if (!timeline) return
    const blob = new Blob([JSON.stringify(timeline, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'tacitweave-simulated-timeline.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  return <section className="signal-lab" aria-labelledby="signal-lab-title">
    <h2 id="signal-lab-title">{t('可选信号（模拟与设备）')}</h2>
    <p className="note">{t('这里产生的是')}<strong>{t('模拟数据')}</strong>{t('，不是你的身体信号，也不是医疗数据。用于验证时间轴、采样与导出管线。')}</p>
    <label className="remember-line"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} /> {t('我理解这是模拟信号，不是真实采集')}</label>
    <div className="actions">
      <button type="button" disabled={!consent || running} onClick={start}>{t('运行 15 秒模拟')}</button>
      <button type="button" className="quiet" disabled={!running} onClick={stop}>{t('停止')}</button>
      {timeline && <button type="button" className="quiet" onClick={exportTimeline}>{t('导出时间轴 JSON')}</button>}
      {lastSession && <button type="button" className="quiet" onClick={retract}>{t('撤回本次信号摘要')}</button>}
    </div>
    <div className="signal-readout">
      <span>{t('心率模拟')} {heart?.value ?? '—'} bpm</span>
      <span>{t('EDA 模拟')} {eda?.value ?? '—'} uS</span>
      <span>{running ? `${t('采样中')} · ${samples.length}` : timeline ? `${t('已停止')} · ${summary?.sampleCount ?? 0} ${t('个样本')}` : t('未开始')}</span>
    </div>
    {summary && <p className="note">{t('时长')} {summary.durationSec}s · {t('来源')} {timeline?.sources.join(', ')} · {summary.simulated ? t('模拟') : t('真实')} · {t('仅本地')}</p>}
  </section>
}
