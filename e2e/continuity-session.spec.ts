// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { expect, test } from '@playwright/test'

test('continuity shows the user actions from a linked space session', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Load demo field' }).click()
  await page.locator('.recent-item').first().click()
  await page.getByRole('button', { name: 'Open fragment details' }).click()
  await page.getByRole('button', { name: 'Enter space' }).click()
  await page.getByRole('button', { name: 'Come closer' }).click()
  await page.locator('.symbolic-motif-change select').selectOption('water')
  await page.getByRole('button', { name: 'Leave', exact: true }).click()
  await expect(page.getByText('You left this space.')).toBeVisible()
  await page.getByRole('button', { name: 'Back to workspace', exact: true }).click()
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('tacitweave.symbolic-sessions.v1') ?? '[]').length > 0)
  await page.getByRole('button', { name: /Continuity$/ }).click()
  await page.locator('.continuity-view').getByRole('button', { name: /Demo · door in the chest/ }).first().click()
  await expect(page.getByText(/1 sessions/)).toBeVisible()
  await expect(page.getByText(/approach 1/)).toBeVisible()
  await expect(page.getByText(/leave 1/i)).toBeVisible()
  await expect(page.getByText(/1 changes/)).toBeVisible()
  await expect(page.locator('.continuity-sessions')).toBeVisible()
  await page.locator('.continuity-sessions summary').first().click()
  await expect(page.locator('.continuity-sessions li').first()).toBeVisible()
})
