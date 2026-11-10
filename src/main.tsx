// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { createRoot } from 'react-dom/client'
import { DesktopShell } from './desktop-shell'
import { LanguageProvider } from './i18n'
import { ThemeProvider } from './theme'
import { AppErrorBoundary } from './error-boundary'
import { migrateLegacyLocalStorage } from './storage-migration'
import './style.css'
import './shell.css'

if (typeof window !== 'undefined') migrateLegacyLocalStorage(window.localStorage)

createRoot(document.getElementById('root')!).render(<AppErrorBoundary><ThemeProvider><LanguageProvider><DesktopShell /></LanguageProvider></ThemeProvider></AppErrorBoundary>)
