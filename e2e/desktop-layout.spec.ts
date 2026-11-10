// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: Apache-2.0
import { expect, test } from '@playwright/test'

test('three-pane shell and symbolic space fit the minimum desktop window', async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 720 })
  await page.goto('/')
  await page.getByRole('button', { name: 'Load demo field' }).click()
  await expect(page.locator('.desktop-shell')).toBeVisible()
  await expect(page.locator('.field-view')).toBeVisible()
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(0)

  await page.getByRole('button', { name: /Relationship$/ }).click()
  await expect(page.locator('.relationship-topology')).toBeVisible()
  const topologyOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(topologyOverflow).toBeLessThanOrEqual(0)

  await page.getByRole('button', { name: /Settings$/ }).click()
  await page.getByRole('button', { name: 'Open research tools' }).click()
  await expect(page.getByRole('heading', { name: 'Optional signals (simulation & device)' })).toBeVisible()
  const researchOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(researchOverflow).toBeLessThanOrEqual(0)

  await page.getByRole('button', { name: /Field$/ }).click()

  const node = page.locator('.field-node').first()
  await node.focus()
  await page.keyboard.press('Enter')
  await page.getByRole('button', { name: /Enter 75s space/ }).click()
  await expect(page.locator('.symbolic-episode')).toBeVisible()
  const symbolicOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(symbolicOverflow).toBeLessThanOrEqual(0)
})
