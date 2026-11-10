// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: Apache-2.0
import { expect, test } from '@playwright/test'

test('app lock locks again after the inactivity timeout', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('tacitweave.autolock-ms', '1200'))
  await page.goto('/')
  await page.getByRole('button', { name: 'Load demo field' }).click()
  await page.getByRole('button', { name: /Settings$/ }).click()
  await page.getByLabel('PIN (at least 4 digits)').fill('2468')
  await page.getByLabel('Repeat PIN').fill('2468')
  await page.getByRole('button', { name: 'Enable app lock' }).click()
  await expect(page.locator('.lock-overlay')).toBeVisible()
  await page.locator('.lock-card input').fill('2468')
  await page.locator('.lock-card form').getByRole('button', { name: 'Unlock' }).click()
  await expect(page.locator('.lock-overlay')).toBeHidden()
  await expect(page.locator('.lock-overlay')).toBeVisible({ timeout: 5000 })
})
