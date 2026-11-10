// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: Apache-2.0
import { expect, test } from '@playwright/test'

test('a recorded signal summary can be explicitly retracted', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /Settings$/ }).click()
  await page.getByRole('button', { name: 'Open research tools' }).click()
  await page.getByRole('checkbox', { name: /I understand this is/ }).check()
  await page.getByRole('button', { name: 'Run 15s simulation' }).click()
  await page.waitForTimeout(500)
  await page.getByRole('button', { name: 'Stop' }).click()
  await page.getByRole('button', { name: /Settings$/ }).click()
  await expect(page.locator('.signal-session-list')).toBeVisible()
  await page.locator('.signal-session-list').getByRole('button', { name: 'Retract' }).first().click()
  await expect(page.locator('.signal-session-list')).toHaveCount(0)
})
