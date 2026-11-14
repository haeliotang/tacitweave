// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { expect, test } from '@playwright/test'

test('delete all local data uses an in-app confirmation and stays deleted after reload', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Load demo field' }).click()
  await page.getByRole('button', { name: /Settings$/ }).click()
  await page.getByRole('button', { name: 'Delete all local data' }).click()
  await expect(page.getByRole('alertdialog')).toBeVisible()
  await page.getByRole('button', { name: 'Confirm delete' }).click()
  await expect(page.getByText('All local data deleted')).toBeVisible()
  await page.reload()
  await expect(page.locator('.field-empty')).toBeVisible()
  const counts = await page.evaluate(() => ({
    motifs: JSON.parse(localStorage.getItem('tacitweave.motifs.v1') ?? '[]').length,
    relationships: JSON.parse(localStorage.getItem('tacitweave.relationship-triggers.v1') ?? '[]').length,
    sessions: JSON.parse(localStorage.getItem('tacitweave.symbolic-sessions.v1') ?? '[]').length,
  }))
  expect(counts).toEqual({ motifs: 0, relationships: 0, sessions: 0 })
})
