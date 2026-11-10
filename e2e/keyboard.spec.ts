// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { expect, test } from '@playwright/test'

test('field nodes are keyboard-selectable and controls expose focus styles', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Load demo field' }).click()
  const second = page.locator('.field-node').nth(1)
  await second.focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('.context-panel')).toContainText('Stomach / belly')

  await page.getByRole('button', { name: /Settings$/ }).focus()
  await expect(page.getByRole('button', { name: /Settings$/ })).toBeFocused()
})
