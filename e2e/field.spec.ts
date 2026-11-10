// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { expect, test } from '@playwright/test'

test('demo field supports drag, links and persistence', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Load demo field' }).click()
  await expect(page.locator('.field-node')).toHaveCount(2)
  await expect(page.locator('.field-relation-node')).toHaveCount(1)
  await expect(page.locator('.field-user-link')).toHaveCount(2)

  const node = page.locator('.field-node').first()
  const box = await node.boundingBox()
  expect(box).not.toBeNull()
  const before = await page.evaluate(() => JSON.parse(localStorage.getItem('tacitweave.field-layout.v1') ?? '{}').positions)
  await page.mouse.move(box!.x + box!.width / 2, box!.y + 18)
  await page.mouse.down()
  await page.mouse.move(box!.x + box!.width / 2 + 55, box!.y + 48)
  await page.mouse.up()
  const after = await page.evaluate(() => JSON.parse(localStorage.getItem('tacitweave.field-layout.v1') ?? '{}').positions)
  expect(after).not.toEqual(before)

  await page.getByLabel('Time range').selectOption('30d')
  await expect(page.locator('.field-node')).toHaveCount(2)

  await page.getByRole('button', { name: 'Reset layout' }).click()
  await expect(page.locator('.field-node')).toHaveCount(2)

  await page.getByRole('button', { name: 'Zoom in' }).click()
  await expect(page.locator('.field-zoom')).toHaveText('110%')
  await page.getByRole('button', { name: 'Zoom out' }).click()
  await expect(page.locator('.field-zoom')).toHaveText('100%')

  await page.locator('.field-user-link').first().dispatchEvent('click')
  await expect(page.locator('.field-user-link')).toHaveCount(1)
})

test('theme and language controls persist', async ({ page }) => {
  await page.goto('/')
  const themeButton = page.locator('.ui-toggle').last()
  await themeButton.click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await page.getByRole('button', { name: '中文' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN')
})
