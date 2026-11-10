// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { useState } from 'react'
import { useLanguage } from './i18n'
import { compareReleaseVersion, fetchLatestRelease, type ReleaseInfo } from './update-check'

export function UpdatePanel({ currentVersion }: { currentVersion: string }) {
  const { t } = useLanguage()
  const [checking, setChecking] = useState(false)
  const [latest, setLatest] = useState<ReleaseInfo | null>(null)
  const [message, setMessage] = useState('')

  const check = async () => {
    setChecking(true)
    setMessage('')
    try {
      const release = await fetchLatestRelease()
      setLatest(release)
      const status = compareReleaseVersion(currentVersion, release.tagName)
      setMessage(status === 'available' ? t('发现新版本') : status === 'current' ? t('已是最新版本') : t('无法比较版本'))
    } catch {
      setMessage(t('检查更新失败；应用离线可用，不会自动下载。'))
    } finally {
      setChecking(false)
    }
  }

  return <section className="paper-card update-panel">
    <p className="card-label">{t('更新')}</p>
    <p>{t('当前版本')} {currentVersion}。{t('只在你点击时访问 GitHub Releases 检查版本，不上传本机数据。')}</p>
    <div className="actions"><button type="button" className="quiet" disabled={checking} onClick={check}>{checking ? t('检查中…') : t('检查更新')}</button></div>
    {message && <p className="note" role="status">{message}</p>}
    {latest && <p className="note"><a href={latest.url} target="_blank" rel="noreferrer">{latest.tagName} · {latest.name}</a></p>}
    <p className="context-privacy">{t('自动下载/安装尚未启用；需要 updater key 与更新 endpoint。')}</p>
  </section>
}
