// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { useRef, useState } from 'react'
import { localDatasetFromSnapshot, parseLocalDataset, type LocalSnapshot } from './local-dataset'
import { exportLocalTimeline } from './local-timeline'
import { useLanguage } from './i18n'
import { decryptBackup, encryptBackup, isSecureBackup } from './secure-backup'
import { datasetToLsm0Sessions } from './lsm0-dataset'

export function LocalDataPanel({ snapshot, onImport, onClear, onRetractSignal, onRetractCapture, onRetractSymbolic }: { snapshot: LocalSnapshot; onImport: (snapshot: LocalSnapshot) => void; onClear: () => void; onRetractSignal?: (id: string) => void; onRetractCapture?: (captureId: string) => void; onRetractSymbolic?: (id: string) => void }) {
  const { t } = useLanguage()
  const input = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState('')
  const [confirmClear, setConfirmClear] = useState(false)

  const download = (contents: string, name: string) => {
    const blob = new Blob([contents], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = name
    link.click()
    URL.revokeObjectURL(url)
  }
  const exportAll = () => download(JSON.stringify(localDatasetFromSnapshot(snapshot), null, 2), 'tacitweave-local-dataset.json')
  const exportEncrypted = async () => {
    const passphrase = window.prompt(t('设置备份口令（至少 8 位）'))
    if (!passphrase) return
    if (passphrase.length < 8) { setStatus(t('备份口令至少 8 位')); return }
    if (window.prompt(t('再次输入备份口令')) !== passphrase) { setStatus(t('两次口令不一致')); return }
    try {
      download(JSON.stringify(await encryptBackup(localDatasetFromSnapshot(snapshot), passphrase), null, 2), 'tacitweave-encrypted-backup.json')
      setStatus(t('已生成加密备份；口令无法找回。'))
    } catch { setStatus(t('加密备份失败')) }
  }
  const exportTimeline = () => download(exportLocalTimeline(localDatasetFromSnapshot(snapshot)), 'tacitweave-local-timeline.json')
  const exportLsm0 = () => {
    const participantId = window.prompt(t('输入匿名参与者编号（例如 P01）'))
    if (!participantId) return
    const result = datasetToLsm0Sessions(localDatasetFromSnapshot(snapshot), participantId)
    download(JSON.stringify(result.records, null, 2), 'tacitweave-lsm0-sessions.json')
    setStatus(`${t('已导出 LSM-0 会话')} ${result.records.length} · ${t('警告')} ${result.warnings.length}`)
  }
  const importFile = async (file: File | undefined) => {
    if (!file) return
    try {
      const text = await file.text()
      const parsed: unknown = JSON.parse(text)
      let next
      if (isSecureBackup(parsed)) {
        const passphrase = window.prompt(t('输入加密备份口令'))
        if (!passphrase) throw new Error('backup_passphrase_cancelled')
        next = parseLocalDataset(JSON.stringify(await decryptBackup(parsed, passphrase)))
      } else {
        next = parseLocalDataset(text)
      }
      onImport(next)
      setStatus(`${t('已导入')} ${next.motifs.length} ${t('个片段')}、${next.relationships.length} ${t('条关系瞬间')}。`)
    } catch {
      setStatus(t('导入失败：需要 tacitweave 导出的 local-dataset-v1/v2 或加密备份 JSON。'))
    } finally {
      if (input.current) input.current.value = ''
    }
  }

  return <section className="local-data-panel" aria-labelledby="local-data-title">
    <h2 id="local-data-title">{t('本机数据')}</h2>
    <p className="note">{t('片段、关系瞬间与可选声音摘要都保存在本机；不会上传。可以整体导出、导入或删除。')}</p>
    <p className="note">{t('记录出处')}：{snapshot.captures?.length ?? 0} · {t('信号会话')}：{snapshot.signals?.length ?? 0}</p>
    {Boolean(snapshot.symbolicSessions?.length) && <div className="signal-session-list">
      <h3>{t('象征空间会话')}</h3>
      {snapshot.symbolicSessions!.slice(0, 5).map(session => <div className="signal-session-row" key={session.id}>
        <span>{new Date(session.createdAt).toLocaleString()} · {session.format} · {session.agency.length} {t('次选择')}{session.leftEarly ? ` · ${t('提前离开')}` : ''}</span>
        {onRetractSymbolic && <button type="button" className="quiet small" onClick={() => onRetractSymbolic(session.id)}>{t('撤回')}</button>}
      </div>)}
    </div>}
    {Boolean(snapshot.captures?.length) && <div className="capture-list">
      <h3>{t('记录出处')}</h3>
      {snapshot.captures!.slice(0, 5).map(capture => <div className="signal-session-row" key={capture.captureId}>
        <span>{new Date(capture.createdAt).toLocaleString()} · {capture.rendererKind} · {capture.sha256.slice(0, 12)}…</span>
        {onRetractCapture && <button type="button" className="quiet small" onClick={() => onRetractCapture(capture.captureId)}>{t('撤回')}</button>}
      </div>)}
    </div>}
    {Boolean(snapshot.signals?.length) && <div className="signal-session-list">
      <h3>{t('信号摘要')}</h3>
      {snapshot.signals!.slice(0, 5).map(session => <div className="signal-session-row" key={session.id}>
        <span>{new Date(session.createdAt).toLocaleString()} · {session.sourceIds.join(', ') || t('本机')} · {session.summary.sampleCount} {t('样本')}{session.summary.quality ? ` · ${t('最大间隔')} ${session.summary.quality.maxGapMs ?? '—'} ms` : ''}</span>
        {onRetractSignal && <button type="button" className="quiet small" onClick={() => onRetractSignal(session.id)}>{t('撤回')}</button>}
      </div>)}
    </div>}
    <div className="actions">
      <button type="button" className="quiet" onClick={exportAll}>{t('导出全部本机数据')}</button>
      <button type="button" className="quiet" onClick={() => void exportEncrypted()}>{t('导出加密备份')}</button>
      <button type="button" className="quiet" onClick={exportTimeline}>{t('导出本机时间轴')}</button>
      <button type="button" className="quiet" onClick={exportLsm0}>{t('导出 LSM-0 会话')}</button>
      <button type="button" className="quiet" onClick={() => input.current?.click()}>{t('导入本机数据')}</button>
      <button type="button" className="quiet" onClick={() => setConfirmClear(true)}>{t('删除全部本机数据')}</button>
      <input ref={input} type="file" accept="application/json,.json" hidden onChange={event => void importFile(event.target.files?.[0])} />
    </div>
    {confirmClear && <div className="confirm-clear" role="alertdialog" aria-labelledby="confirm-clear-title">
      <p id="confirm-clear-title">{t('删除本机全部数据？此操作不可撤销。')}</p>
      <button type="button" className="primary-button" onClick={() => { onClear(); setConfirmClear(false); setStatus(t('已删除全部本机数据')) }}>{t('确认删除')}</button>
      <button type="button" className="quiet" onClick={() => setConfirmClear(false)}>{t('取消')}</button>
    </div>}
    {status && <p className="note" role="status">{status}</p>}
  </section>
}
