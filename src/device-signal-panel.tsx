// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { useEffect, useRef, useState } from 'react'
import { grantLocalSignalConsent } from './somatic-signal'
import { WebSocketSignalSource, type DeviceSourceState } from './device-signal-source'
import { summarizeTimeline, traceToTimeline, type SignalSample, type SignalTimeline } from './signal-source'
import { useLanguage } from './i18n'
import { createSignalSession, type SignalSession } from './signal-session'

export function DeviceSignalPanel({ onSession, onRetract }: { onSession?: (session: SignalSession) => void; onRetract?: (sessionId: string) => void }) {
  const { t } = useLanguage()
  const [url, setUrl] = useState('ws://127.0.0.1:8765')
  const [token, setToken] = useState('')
  const [consent, setConsent] = useState(false)
  const [state, setState] = useState<DeviceSourceState>('idle')
  const [message, setMessage] = useState('')
  const [samples, setSamples] = useState<SignalSample[]>([])
  const [timeline, setTimeline] = useState<SignalTimeline | null>(null)
  const [lastSession, setLastSession] = useState<SignalSession | null>(null)
  const [health, setHealth] = useState<ReturnType<WebSocketSignalSource['health']> | null>(null)
  const source = useRef<WebSocketSignalSource | null>(null)
  const unsubscribe = useRef<(() => void) | null>(null)

  const stop = () => {
    unsubscribe.current?.()
    unsubscribe.current = null
    if (!source.current) return
    try {
      const trace = source.current.stop()
      const nextTimeline = traceToTimeline(trace)
      setTimeline(nextTimeline)
      const session = createSignalSession(nextTimeline)
      setLastSession(session)
      setHealth(source.current?.health() ?? null)
      onSession?.(session)
    } catch (error) {
      if (error instanceof Error && error.message === 'signal_identity_conflict') setMessage(t('信号身份冲突，未生成摘要。'))
    }
    source.current = null
    setState('stopped')
  }

  useEffect(() => () => stop(), [])

  const start = () => {
    if (!consent) return
    stop()
    setSamples([])
    setTimeline(null)
    setLastSession(null)
    setHealth(null)
    setMessage('')
    try {
      const next = new WebSocketSignalSource(url, token, (nextState, nextMessage) => {
        setState(nextState)
        if (nextMessage) setMessage(nextMessage)
      })
      source.current = next
      unsubscribe.current = next.subscribe(sample => setSamples(current => [...current, sample]))
      next.start(grantLocalSignalConsent())
    } catch (error) {
      setState('error')
      setMessage(error instanceof Error ? error.message : t('无法连接本机桥接'))
    }
  }

  const exportTimeline = () => {
    if (!timeline) return
    const blob = new Blob([JSON.stringify(timeline, null, 2)], { type: 'application/json' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'tacitweave-device-timeline.json'
    link.click()
    URL.revokeObjectURL(link.href)
  }

  const summary = timeline ? summarizeTimeline(timeline) : null
  const originLabel = timeline?.origin === 'hardware' ? t('硬件') : timeline?.origin === 'simulated' ? t('模拟') : t('未验证')
  const retract = () => {
    if (!lastSession) return
    onRetract?.(lastSession.id)
    setLastSession(null)
    setTimeline(null)
    setSamples([])
    setMessage(t('已撤回本次信号摘要'))
  }
  const stateLabel = state === 'reconnecting' ? t('重连中…') : state
  return <section className="device-lab" aria-labelledby="device-lab-title">
    <h2 id="device-lab-title">{t('设备桥接（可选，实验）')}</h2>
    <p className="note">{t('连接')}<strong>{t('本机')}</strong>{t(' WebSocket 桥接，接收 JSON 样本。浏览器不直接读 LSL，也不上传数据；原始信号默认不保存。')}</p>
    <label className="device-url">{t('本机桥接地址')}
      <input value={url} onChange={event => setUrl(event.target.value)} placeholder="ws://127.0.0.1:8765" />
    </label>
    <label className="device-url">{t('桥接 token（可选）')}
      <input value={token} onChange={event => setToken(event.target.value)} placeholder={t('由本机 bridge 启动时打印')} autoComplete="off" />
    </label>
    <label className="remember-line"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} /> {t('我同意连接本机设备桥接，并理解这不是临床数据')}</label>
    <div className="actions">
      <button type="button" disabled={!consent || state === 'connecting' || state === 'connected'} onClick={start}>{state === 'connecting' ? t('连接中…') : t('连接桥接')}</button>
      <button type="button" className="quiet" disabled={!source.current} onClick={stop}>{t('断开')}</button>
      {timeline && <button type="button" className="quiet" onClick={exportTimeline}>{t('导出设备时间轴')}</button>}
      {lastSession && <button type="button" className="quiet" onClick={retract}>{t('撤回本次信号摘要')}</button>}
    </div>
    <div className="signal-readout">
      <span>{t('状态')}：{stateLabel}</span>
      <span>{t('样本')}：{timeline ? summary?.sampleCount ?? 0 : samples.length}</span>
      {timeline && <span>{t('来源标记')}：{originLabel}</span>}
      {message && <span role="status">{t('错误')}：{message}</span>}
    </div>
    {health && <p className="note">{t('重连')} {health.reconnects} · {t('拒绝')} {health.rejected} · {t('最大间隔')} {health.maxGapMs ?? '—'} ms · {t('抖动')} {health.jitterPercent ?? '—'}%</p>}
    {source.current && <p className="note">{t('等待本机桥接发送 hello / sample / samples JSON 包；断线会自动重连，不会保存原始信号。')}</p>}
  </section>
}
