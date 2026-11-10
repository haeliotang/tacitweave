// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { useEffect, useState } from 'react'
import { useLanguage } from './i18n'

export function LockScreen({ onUnlock, onForgot, blockedUntil }: { onUnlock: (pin: string) => Promise<boolean>; onForgot: () => void; blockedUntil: number }) {
  const { t } = useLanguage()
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [remaining, setRemaining] = useState(() => Math.max(0, blockedUntil - Date.now()))

  useEffect(() => {
    if (blockedUntil <= Date.now()) { setRemaining(0); return }
    setRemaining(blockedUntil - Date.now())
    const timer = window.setInterval(() => setRemaining(Math.max(0, blockedUntil - Date.now())), 1000)
    return () => window.clearInterval(timer)
  }, [blockedUntil])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!pin || busy || remaining > 0) return
    setBusy(true)
    setError('')
    const ok = await onUnlock(pin)
    setBusy(false)
    if (!ok) setError(t('PIN 不正确'))
  }
  return <div className="lock-overlay" role="dialog" aria-modal="true" aria-label={t('应用锁')}>
    <div className="lock-card">
      <p className="eyebrow">{t('本机隐私')}</p>
      <h1>{t('应用已锁定')}</h1>
      <p className="muted">{t('输入 PIN 继续。PIN 用于解密本机快照；应用锁不是系统锁屏。')}</p>
      <form onSubmit={submit}>
        <label htmlFor="app-lock-pin">{t('PIN')}</label>
        <input id="app-lock-pin" type="password" inputMode="numeric" autoComplete="current-password" value={pin} onChange={event => setPin(event.target.value)} autoFocus />
        {remaining > 0 && <p className="error-inline" role="alert">{t('尝试次数过多，请稍后再试')} · {Math.ceil(remaining / 1000)}s</p>}
        {error && <p className="error-inline" role="alert">{error}</p>}
        <button className="primary-button wide" disabled={busy || !pin || remaining > 0} type="submit">{busy ? t('解锁中…') : t('解锁')}</button>
      </form>
      <button className="quiet-button wide" type="button" onClick={onForgot}>{t('忘记 PIN：删除本机数据并重置锁')}</button>
      <p className="context-privacy">{t('PIN 只在本机校验；没有找回服务。')}</p>
    </div>
  </div>
}

export function AppLockSettings({ enabled, autoLockMs, onAutoLockChange, onEnable, onDisable, onLock }: { enabled: boolean; autoLockMs: number; onAutoLockChange: (value: number) => void; onEnable: (pin: string) => Promise<void>; onDisable: (pin: string) => Promise<boolean>; onLock: () => void }) {
  const { t } = useLanguage()
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const enable = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    if (pin.length < 4) { setError(t('PIN 至少 4 位')); return }
    if (pin !== confirmPin) { setError(t('两次 PIN 不一致')); return }
    setBusy(true)
    try { await onEnable(pin); setPin(''); setConfirmPin('') } catch (cause) { setError(cause instanceof Error ? cause.message : t('无法开启应用锁')) } finally { setBusy(false) }
  }
  const disable = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (!await onDisable(pin)) setError(t('PIN 不正确'))
      else setPin('')
    } finally { setBusy(false) }
  }
  if (enabled) return <section className="paper-card app-lock-panel">
    <p className="card-label">{t('应用锁')}</p>
    <p>{t('已开启。本机快照以 AES-GCM 加密保存；PIN 只在本机校验。')}</p>
    <label className="app-lock-auto">{t('无操作自动锁定')}
      <select value={autoLockMs} onChange={event => onAutoLockChange(Number(event.target.value))}>
        <option value={60_000}>{t('1 分钟')}</option>
        <option value={300_000}>{t('5 分钟')}</option>
        <option value={900_000}>{t('15 分钟')}</option>
        <option value={0}>{t('不自动锁定')}</option>
      </select>
    </label>
    <div className="actions"><button type="button" className="quiet" onClick={onLock}>{t('立即锁定')}</button></div>
    <form onSubmit={disable} className="app-lock-form">
      <label htmlFor="disable-lock-pin">{t('输入 PIN 关闭应用锁')}</label>
      <input id="disable-lock-pin" type="password" inputMode="numeric" value={pin} onChange={event => setPin(event.target.value)} autoComplete="off" />
      <button type="submit" className="quiet" disabled={busy || !pin}>{t('关闭应用锁')}</button>
    </form>
    {error && <p className="error-inline" role="alert">{error}</p>}
  </section>
  return <section className="paper-card app-lock-panel">
    <p className="card-label">{t('应用锁')}</p>
    <p>{t('设置一个本机 PIN。快照会加密保存；它不是系统锁屏，忘记 PIN 只能删除数据重置。')}</p>
    <form onSubmit={enable} className="app-lock-form">
      <label htmlFor="enable-lock-pin">{t('PIN（至少 4 位）')}</label>
      <input id="enable-lock-pin" type="password" inputMode="numeric" value={pin} onChange={event => setPin(event.target.value)} autoComplete="new-password" />
      <label htmlFor="confirm-lock-pin">{t('再次输入 PIN')}</label>
      <input id="confirm-lock-pin" type="password" inputMode="numeric" value={confirmPin} onChange={event => setConfirmPin(event.target.value)} autoComplete="new-password" />
      <button type="submit" className="quiet" disabled={busy || !pin || !confirmPin}>{t('开启应用锁')}</button>
    </form>
    {error && <p className="error-inline" role="alert">{error}</p>}
  </section>
}
