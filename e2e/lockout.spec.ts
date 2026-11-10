// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { expect, test } from '@playwright/test'

test('five wrong PINs trigger a temporary lockout', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Load demo field' }).click()
  await page.getByRole('button', { name: /Settings$/ }).click()
  await page.getByLabel('PIN (at least 4 digits)').fill('2468')
  await page.getByLabel('Repeat PIN').fill('2468')
  await page.getByRole('button', { name: 'Enable app lock' }).click()
  await expect(page.locator('.lock-overlay')).toBeVisible()
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await page.locator('.lock-card input').fill('0000')
    await page.locator('.lock-card form').getByRole('button', { name: 'Unlock' }).click()
    await page.waitForTimeout(150)
  }
  await expect(page.getByText(/Too many attempts/)).toBeVisible()
  await expect(page.locator('.lock-card form').getByRole('button', { name: 'Unlock' })).toBeDisabled()
})
