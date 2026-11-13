// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { expect, test } from '@playwright/test'

test('a past fragment can be re-entered without overwriting the original', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Load demo field' }).click()
  await page.getByRole('button', { name: /Continuity/ }).click()
  await expect(page.getByRole('heading', { name: 'Past fragments can be re-entered' })).toBeVisible()

  await page.locator('.continuity-trail').first().click()
  await page.getByRole('button', { name: 'Re-enter', exact: true }).click()
  const editor = page.locator('.revisit-editor')
  await expect(editor).toBeVisible()
  await editor.locator('input').first().fill('Demo · returned to the door')
  await editor.locator('textarea').fill('Came back to the same door; it felt lower.')
  await page.getByRole('button', { name: 'Save as a new visit' }).click()

  await expect(page.locator('.continuity-visit')).toHaveCount(2)
  await expect(page.locator('.continuity-detail-head').getByText(/2 visits/)).toBeVisible()
  const motifCount = await page.evaluate(() => JSON.parse(localStorage.getItem('tacitweave.motifs.v1') ?? '[]').length)
  expect(motifCount).toBe(3)

  await page.reload()
  await page.getByRole('button', { name: /Continuity$/ }).click()
  await expect(page.locator('.continuity-visit')).toHaveCount(2)
  const linkCount = await page.evaluate(() => JSON.parse(localStorage.getItem('tacitweave.field-layout.v1') ?? '{"links":[]}').links.length)
  expect(linkCount).toBeGreaterThanOrEqual(1)
})
