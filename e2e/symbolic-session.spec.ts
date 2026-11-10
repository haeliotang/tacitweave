// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { expect, test } from '@playwright/test'

test('records symbolic agency choices and allows explicit retraction', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Load demo field' }).click()
  await page.locator('.field-node').first().focus()
  await page.keyboard.press('Enter')
  await page.getByRole('button', { name: /Enter 75s space/ }).click()
  await page.getByRole('button', { name: 'Come closer' }).click()
  await page.getByRole('button', { name: 'Stay' }).click()
  await page.getByRole('button', { name: 'Leave' }).click()
  await page.locator('.context-panel').getByRole('button', { name: /Back to workspace|返回工作台/ }).click()
  await page.getByRole('button', { name: /Settings$/ }).click()
  await expect(page.getByText('Symbolic space sessions')).toBeVisible()
  await expect(page.locator('.signal-session-list').getByText(/choices/)).toBeVisible()
  await page.locator('.signal-session-list').getByRole('button', { name: 'Retract' }).last().click()
  await expect(page.getByText('Symbolic space sessions')).toHaveCount(0)
})
