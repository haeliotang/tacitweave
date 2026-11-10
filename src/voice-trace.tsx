// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { useEffect, useRef, useState } from 'react'
import { grantLocalSignalConsent, voiceTraceFromSamples, type MotifSignals, type VoiceTrace } from './somatic-signal'
import { useLanguage } from './i18n'

type Status = 'idle' | 'requesting' | 'recording' | 'done' | 'error'

export function VoiceTraceRecorder({ onTrace }: { onTrace: (signals: MotifSignals | null) => void }) {
  const { t } = useLanguage()
  const [consent, setConsent] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const [trace, setTrace] = useState<VoiceTrace | null>(null)
  const [error, setError] = useState('')
  const stream = useRef<MediaStream | null>(null)
  const context = useRef<AudioContext | null>(null)
  const timer = useRef<number | null>(null)
  const samples = useRef<number[]>([])

  const stop = () => {
    if (timer.current !== null) { window.clearInterval(timer.current); timer.current = null }
    stream.current?.getTracks().forEach(track => track.stop())
    stream.current = null
    void context.current?.close()
    context.current = null
  }

  useEffect(() => () => stop(), [])

  const start = async () => {
    if (!consent) return
    setStatus('requesting'); setError(''); setTrace(null); onTrace(null)
    try {
      const media = await Promise.race([
        navigator.mediaDevices.getUserMedia({ audio: true }),
        new Promise<MediaStream>((_, reject) => window.setTimeout(() => reject(new Error('microphone_timeout')), 5000)),
      ])
      stream.current = media
      const audio = new AudioContext()
      context.current = audio
      const source = audio.createMediaStreamSource(media)
      const analyser = audio.createAnalyser()
      analyser.fftSize = 1024
      source.connect(analyser)
      const buffer = new Float32Array(analyser.fftSize)
      samples.current = []
      setStatus('recording')
      const startedAt = performance.now()
      timer.current = window.setInterval(() => {
        analyser.getFloatTimeDomainData(buffer)
        let sum = 0
        for (let index = 0; index < buffer.length; index++) sum += buffer[index] * buffer[index]
        samples.current.push(Math.sqrt(sum / buffer.length))
        if (performance.now() - startedAt >= 8000) {
          if (timer.current !== null) { window.clearInterval(timer.current); timer.current = null }
          const duration = (performance.now() - startedAt) / 1000
          const sampleRate = samples.current.length / duration
          try {
            const next = voiceTraceFromSamples(samples.current, Number(duration.toFixed(2)), Number(sampleRate.toFixed(1)))
            setTrace(next)
            setStatus('done')
            onTrace({ consent: grantLocalSignalConsent(), voice: next })
          } catch {
            setError(t('没有采到足够的声音样本。'))
            setStatus('error')
          } finally {
            stream.current?.getTracks().forEach(track => track.stop())
            stream.current = null
            void context.current?.close()
            context.current = null
          }
        }
      }, 100)
    } catch {
      stop()
      setError(t('无法启用麦克风。你仍然可以只记录身体与意象。'))
      setStatus('error')
    }
  }

  return <div className="voice-trace">
    <h3>{t('可选：本机声音测量')}</h3>
    <p className="step-note">{t('测量 8 秒内的音量与停顿；不保存原始音频，不上传。麦克风只在按下按钮后开启。')}</p>
    <label className="remember-line"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} /> {t('允许本机麦克风测量，并只把摘要存进片段')}</label>
    <div className="actions">
      <button type="button" disabled={!consent || status === 'requesting' || status === 'recording'} onClick={() => void start()}>{status === 'recording' ? t('测量中…') : t('测量 8 秒')}</button>
      {trace && <span className="selection-summary">{t('音量均值')} {trace.rmsMean.toFixed(3)} · {t('停顿比例')} {trace.pauseRatio.toFixed(2)}</span>}
      {error && <span className="error-inline" role="status">{error}</span>}
    </div>
  </div>
}
