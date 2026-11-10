// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test('relationship topology is WCAG A/AA in the dark theme', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Load demo field' }).click()
  await page.getByRole('button', { name: /Relationship$/ }).click()
  await page.locator('.ui-toggle').first().click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
  expect(results.violations).toEqual([])
})
