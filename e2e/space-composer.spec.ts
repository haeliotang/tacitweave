// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { expect, test } from '@playwright/test'

test('a user can shape a space before entering it', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Load demo field' }).click()
  await page.locator('.recent-item').first().click()
  await page.getByRole('button', { name: 'Open fragment details' }).click()
  await page.getByRole('button', { name: 'Customize space' }).click()
  const composer = page.locator('.space-composer')
  await expect(composer).toBeVisible()
  await composer.getByRole('button', { name: 'Corridor' }).click()
  await composer.getByRole('button', { name: 'Door' }).click()
  await composer.locator('select').last().selectOption('180')
  await composer.getByRole('button', { name: 'Enter this space' }).click()
  await expect(page.locator('.symbolic-episode')).toBeVisible()
  await expect(page.getByText('This space')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Stay 30 more seconds' })).toBeVisible()
})


test('an open-ended space has no automatic end or extension button', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Load demo field' }).click()
  await page.locator('.recent-item').first().click()
  await page.getByRole('button', { name: 'Open fragment details' }).click()
  await page.getByRole('button', { name: 'Customize space' }).click()
  const composer = page.locator('.space-composer')
  await composer.locator('select').last().selectOption('open')
  await composer.getByRole('button', { name: 'Enter this space' }).click()
  await expect(page.locator('.symbolic-episode')).toBeVisible()
  await expect(page.locator('.symbolic-progress')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Stay 30 more seconds' })).toHaveCount(0)
})
