// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { expect, test } from '@playwright/test'

test('app lock encrypts and restores local data', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Load demo field' }).click()
  await page.getByRole('button', { name: /Settings$/ }).click()
  await page.getByLabel('PIN (at least 4 digits)').fill('2468')
  await page.getByLabel('Repeat PIN').fill('2468')
  await page.getByRole('button', { name: 'Enable app lock' }).click()
  await expect(page.locator('.lock-overlay')).toBeVisible()
  const encrypted = await page.evaluate(() => ({ encrypted: Boolean(localStorage.getItem('tacitweave.encrypted-state.v1')), plain: Boolean(localStorage.getItem('tacitweave.motifs.v1')) }))
  expect(encrypted).toEqual({ encrypted: true, plain: false })

  await page.reload()
  await expect(page.locator('.lock-overlay')).toBeVisible()
  await page.locator('.lock-card input').fill('0000')
  await page.locator('.lock-card form').getByRole('button', { name: 'Unlock' }).click()
  await expect(page.getByText('Incorrect PIN')).toBeVisible()
  await page.locator('.lock-card input').fill('2468')
  await page.locator('.lock-card form').getByRole('button', { name: 'Unlock' }).click()
  await expect(page.locator('.lock-overlay')).toBeHidden()
  await expect(page.locator('.field-node')).toHaveCount(2)
  const stillEncrypted = await page.evaluate(() => ({ encrypted: Boolean(localStorage.getItem('tacitweave.encrypted-state.v1')), plain: Boolean(localStorage.getItem('tacitweave.motifs.v1')) }))
  expect(stillEncrypted).toEqual({ encrypted: true, plain: false })

  await page.getByRole('button', { name: /Settings$/ }).click()
  await page.getByLabel('Enter PIN to disable app lock').fill('2468')
  await page.getByRole('button', { name: 'Disable app lock' }).click()
  await expect(page.locator('.lock-overlay')).toBeHidden()
  await expect.poll(async () => page.evaluate(() => ({ encrypted: Boolean(localStorage.getItem('tacitweave.encrypted-state.v1')), plain: Boolean(localStorage.getItem('tacitweave.motifs.v1')) }))).toEqual({ encrypted: false, plain: true })
})

test('app lock preserves exploration spaces across lock and unlock', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /Explore$/ }).click()
  await page.getByRole('button', { name: 'Start blank' }).click()
  await page.locator('.object-palette').getByRole('button', { name: 'Door' }).click()
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await page.getByRole('button', { name: /Settings$/ }).click()
  await page.getByLabel('PIN (at least 4 digits)').fill('2468')
  await page.getByLabel('Repeat PIN').fill('2468')
  await page.getByRole('button', { name: 'Enable app lock' }).click()
  await expect(page.locator('.lock-overlay')).toBeVisible()
  const locked = await page.evaluate(() => ({
    encrypted: Boolean(localStorage.getItem('tacitweave.encrypted-state.v1')),
    plainSpaces: Boolean(localStorage.getItem('tacitweave.experience-spaces.v2')),
  }))
  expect(locked).toEqual({ encrypted: true, plainSpaces: false })

  await page.reload()
  await page.locator('.lock-card input').fill('2468')
  await page.locator('.lock-card form').getByRole('button', { name: 'Unlock' }).click()
  await expect(page.locator('.lock-overlay')).toBeHidden()
  await page.getByRole('button', { name: /Explore$/ }).click()
  await expect(page.locator('.saved-trail')).toHaveCount(1)

  await page.getByRole('button', { name: 'Start blank' }).click()
  await page.locator('.object-palette').getByRole('button', { name: 'Water' }).click()
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  const afterSave = await page.evaluate(() => Boolean(localStorage.getItem('tacitweave.experience-spaces.v2')))
  expect(afterSave).toBe(false)
  await page.reload()
  await page.locator('.lock-card input').fill('2468')
  await page.locator('.lock-card form').getByRole('button', { name: 'Unlock' }).click()
  await expect(page.locator('.lock-overlay')).toBeHidden()
  await page.getByRole('button', { name: /Explore$/ }).click()
  await expect(page.locator('.saved-trail')).toHaveCount(2)
})
