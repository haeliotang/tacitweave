// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { expect, test } from '@playwright/test'

function chineseTokens(text: string) {
  return [...new Set(text.match(/[\u4e00-\u9fff]+/g) ?? [])].filter(token => token !== '中文')
}

test('English UI has no untranslated shell/capture/research strings', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('tacitweave.lang', 'en'))
  await page.goto('/')

  await page.getByRole('button', { name: 'New inner fragment' }).click()
  await expect(page.locator('.somatic-entry h2').first()).toContainText('Where is it most noticeable right now?')
  expect(chineseTokens(await page.locator('.workspace-scroll').innerText())).toEqual([])

  await page.getByRole('tab', { name: 'Use words' }).click()
  await expect(page.getByRole('button', { name: 'Enter' })).toBeVisible()
  expect(chineseTokens(await page.locator('.workspace-scroll').innerText())).toEqual([])

  for (const [label, heading] of [
    ['Fragment', 'Local fragment journal'],
    ['Relationship', 'Relationship moments'],
    ['Settings', 'Local data'],
  ] as const) {
    await page.getByRole('button', { name: new RegExp(`${label}$`) }).click()
    await expect(page.getByRole('heading', { name: heading })).toBeVisible()
    expect(chineseTokens(await page.locator('.workspace-scroll').innerText()), label).toEqual([])
  }
  await page.getByRole('button', { name: 'Open research tools' }).click()
  await expect(page.getByRole('heading', { name: 'Optional signals (simulation & device)' })).toBeVisible()
  expect(chineseTokens(await page.locator('.workspace-scroll').innerText())).toEqual([])
})

test('English scene toolbar has no untranslated fallback', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('tacitweave.lang', 'en'))
  await page.goto('/')
  await page.getByRole('button', { name: 'Load demo field' }).click()
  await page.locator('.field-node').first().focus()
  await page.keyboard.press('Enter')
  await page.getByRole('button', { name: /Enter 75s space/ }).click()
  expect(chineseTokens(await page.locator('.scene-toolbar').innerText())).toEqual([])
  expect(chineseTokens(await page.locator('.scene-footer').innerText())).toEqual([])
})
