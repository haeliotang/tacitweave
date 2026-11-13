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
  await page.getByRole('button', { name: 'Leave', exact: true }).click()
  await page.getByRole('button', { name: 'Back to workspace', exact: true }).click()
  await page.getByRole('button', { name: /Continuity$/ }).click()
  await expect(page.getByText(/1 sessions/)).toBeVisible()
  await expect(page.getByText(/approach 1/)).toBeVisible()
  await expect(page.getByText(/leave 1/i)).toBeVisible()
})
