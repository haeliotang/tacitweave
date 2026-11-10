// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: Apache-2.0
import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test('field and settings have no WCAG A/AA violations in light and dark themes', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Load demo field' }).click()
  const field = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()

  await page.getByRole('button', { name: /Settings$/ }).click()
  const settings = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
  expect([...field.violations, ...settings.violations]).toEqual([])

  await page.locator('.ui-toggle').first().click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  const dark = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
  expect(dark.violations).toEqual([])
})
