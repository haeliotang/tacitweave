// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: Apache-2.0
import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test('all main views pass WCAG A/AA in the light theme', async ({ page }) => {
  await page.goto('/')
  const audit = async () => {
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
    expect(results.violations).toEqual([])
  }

  await page.getByRole('button', { name: 'New inner fragment' }).click()
  await expect(page.locator('.somatic-entry')).toBeVisible()
  await audit()

  await page.getByRole('tab', { name: 'Use words' }).click()
  await expect(page.getByRole('button', { name: 'Enter' })).toBeVisible()
  await audit()

  for (const [button, heading] of [
    ['Fragment', 'Local fragment journal'],
    ['Relationship', 'Relationship moments'],
    ['Settings', 'Local data'],
  ] as const) {
    await page.getByRole('button', { name: new RegExp(`${button}$`) }).click()
    await expect(page.getByRole('heading', { name: heading })).toBeVisible()
    await audit()
  }
  await page.getByRole('button', { name: 'Open research tools' }).click()
  await expect(page.getByRole('heading', { name: 'Optional signals (simulation & device)' })).toBeVisible()
  await audit()
})
