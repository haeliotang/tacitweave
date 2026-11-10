// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryState {
  failed: boolean
  message: string
}

export class AppErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { failed: false, message: '' }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { failed: true, message: error instanceof Error ? error.message : String(error) }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Tacitweave UI error', error, info.componentStack)
  }

  render() {
    if (!this.state.failed) return this.props.children
    const chinese = typeof navigator !== 'undefined' && navigator.language.startsWith('zh')
    return <div className="error-fallback" role="alert">
      <div>
        <p className="eyebrow">Tacitweave</p>
        <h1>{chinese ? '界面遇到了问题' : 'The interface hit a problem'}</h1>
        <p>{chinese ? '本机数据没有被上传。你可以重新加载；如果问题持续，导出诊断前先确认不含私人内容。' : 'Local data was not uploaded. Reload the app; if this persists, inspect the console before exporting anything private.'}</p>
        <code>{this.state.message}</code>
        <button className="primary-button" onClick={() => window.location.reload()}>{chinese ? '重新加载' : 'Reload'}</button>
      </div>
    </div>
  }
}
