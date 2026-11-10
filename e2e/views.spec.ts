// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: Apache-2.0
import { expect, test } from '@playwright/test'

test('fragment, relationship, research and settings views lazy-load', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /Fragment$/ }).click()
  await expect(page.getByRole('heading', { name: 'Local fragment journal' })).toBeVisible()
  await page.getByRole('button', { name: /Relationship$/ }).click()
  await expect(page.getByRole('heading', { name: 'Relationship moments' })).toBeVisible()
  await page.getByRole('button', { name: /Settings$/ }).click()
  await expect(page.getByRole('heading', { name: 'Local data' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'View source' })).toHaveAttribute('href', /https:\/\/github\.com\/haeliotang\/tacitweave\/tree\/[A-Za-z0-9._-]+/)
  await page.getByRole('button', { name: 'Open research tools' }).click()
  await expect(page.getByRole('heading', { name: 'Optional signals (simulation & device)' })).toBeVisible()
})
