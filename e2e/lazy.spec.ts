// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { expect, test } from '@playwright/test'

async function resources(page: import('@playwright/test').Page) {
  return page.evaluate(() => performance.getEntriesByType('resource').map(entry => entry.name))
}

test('optional-signal chunks load only after entering research tools', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Load demo field' }).click()
  await page.waitForTimeout(500)
  const initial = await resources(page)
  expect(initial.some(name => name.includes('signal-simulator'))).toBe(false)
  expect(initial.some(name => name.includes('device-signal-panel'))).toBe(false)

  await page.getByRole('button', { name: /Settings$/ }).click()
  await page.getByRole('button', { name: 'Open research tools' }).click()
  await expect(page.getByRole('heading', { name: 'Optional signals (simulation & device)' })).toBeVisible()
  const research = await resources(page)
  expect(research.some(name => name.includes('signal-simulator'))).toBe(true)
  expect(research.some(name => name.includes('device-signal-panel'))).toBe(true)
})
