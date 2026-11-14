// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { expect, test } from '@playwright/test'

test('a blank space can be built and directly manipulated without text labels', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /Explore$/ }).click()
  await expect(page.getByRole('heading', { name: 'No need to name it first; enter a space.' })).toBeVisible()
  expect(await page.locator('.workspace-scroll textarea, .workspace-scroll input[type="text"]').count()).toBe(0)

  await page.getByRole('button', { name: 'Start blank' }).click()
  await expect(page.locator('.symbolic-canvas')).toBeVisible()
  await page.locator('.object-palette').getByRole('button', { name: 'Door' }).click()
  const object = page.locator('.spatial-object.kind-door')
  await expect(object).toHaveCount(1)
  const before = await object.evaluate(element => ({ left: (element as HTMLElement).style.left, top: (element as HTMLElement).style.top }))

  const box = await object.boundingBox()
  expect(box).not.toBeNull()
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2)
  await page.mouse.down()
  await page.mouse.move(box!.x + box!.width / 2 + 100, box!.y + box!.height / 2 + 60, { steps: 5 })
  await page.mouse.up()
  await expect(object).not.toHaveCSS('left', before.left)
  await expect(page.locator('.action-list')).toContainText('move')

  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Saved locally.')).toBeVisible()
  await page.reload()
  await page.getByRole('button', { name: /Explore$/ }).click()
  await page.getByRole('button', { name: /objects$/ }).first().click()
  await expect(page.locator('.spatial-object.kind-door')).toHaveCount(1)
})

test('a body point starts a space without a form', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /Explore$/ }).click()
  await page.getByRole('button', { name: 'Start with the body' }).click()
  const outline = page.getByRole('button', { name: 'Body outline', exact: true })
  await outline.click({ position: { x: 90, y: 100 } })
  await expect(page.locator('.spatial-object.kind-body')).toHaveCount(1)
  await expect(page.locator('.workspace-scroll form')).toHaveCount(0)
})
