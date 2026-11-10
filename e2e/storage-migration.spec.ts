// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { expect, test } from '@playwright/test'

test('migrates former localStorage namespace into Tacitweave keys', async ({ page }) => {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('familiweave.theme', 'dark')
      localStorage.setItem('familiweave.lang', 'en')
    } catch {}
  })
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  const migrated = await page.evaluate(() => ({
    theme: localStorage.getItem('tacitweave.theme'),
    lang: localStorage.getItem('tacitweave.lang'),
    marker: localStorage.getItem('tacitweave.storage-migration.v1'),
  }))
  expect(migrated).toEqual({ theme: 'dark', lang: 'en', marker: '1' })
})
