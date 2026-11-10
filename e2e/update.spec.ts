// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { expect, test } from '@playwright/test'

test('explicit update check shows a newer release without downloading it', async ({ page }) => {
  await page.route('https://api.github.com/repos/haeliotang/tacitweave/releases/latest', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ tag_name: 'v0.2.0', name: 'Tacitweave v0.2.0', html_url: 'https://example.test/release', published_at: '2026-11-04T00:00:00Z' }),
  }))
  await page.goto('/')
  await page.getByRole('button', { name: /Settings$/ }).click()
  await page.getByRole('button', { name: 'Check for updates' }).click()
  await expect(page.getByText('A new version is available')).toBeVisible()
  await expect(page.getByRole('link', { name: /v0\.2\.0/ })).toHaveAttribute('href', 'https://example.test/release')
})


test('update check failure is non-destructive', async ({ page }) => {
  await page.route('https://api.github.com/repos/haeliotang/tacitweave/releases/latest', route => route.fulfill({ status: 503, body: 'unavailable' }))
  await page.goto('/')
  await page.getByRole('button', { name: /Settings$/ }).click()
  await page.getByRole('button', { name: 'Check for updates' }).click()
  await expect(page.getByText(/Update check failed/)).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Local data' })).toBeVisible()
})
