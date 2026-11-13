// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { expect, test } from '@playwright/test'

test('a relationship moment can be revisited without overwriting the original', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Load demo field' }).click()
  await page.getByRole('button', { name: /Relationship$/ }).click()
  const first = page.locator('.motif-item').first()
  await first.getByRole('button', { name: 'Re-enter' }).click()
  const form = page.locator('.relationship-form')
  await expect(form).toBeVisible()
  await form.getByPlaceholder(/Only write/).fill('A different response this time.')
  await form.getByRole('button', { name: 'Approach', exact: true }).click()
  await page.getByRole('button', { name: 'Save as a new visit' }).click()
  await expect(page.locator('.motif-item')).toHaveCount(2)
  await expect(page.locator('.relationship-continuity-panel')).toBeVisible()
  await expect(page.locator('.relationship-continuity-panel .compare-row.changed').first()).toBeVisible()
  const count = await page.evaluate(() => JSON.parse(localStorage.getItem('tacitweave.relationship-triggers.v1') ?? '[]').length)
  expect(count).toBe(2)
})
