// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { readFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'

test('exports a v2 dataset and imports it back', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Load demo field' }).click()
  await page.getByRole('button', { name: /Settings$/ }).click()

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export all local data' }).click()
  const download = await downloadPromise
  const filePath = await download.path()
  expect(filePath).not.toBeNull()
  const dataset = JSON.parse(await readFile(filePath!, 'utf8')) as { version: string; motifs: unknown[]; relationships: unknown[]; field?: { positions: Record<string, unknown> }; signals?: unknown[] }
  expect(dataset.version).toBe('local-dataset-v2')
  expect(dataset.motifs.length).toBe(2)
  expect(dataset.relationships.length).toBe(1)
  expect(Object.keys(dataset.field?.positions ?? {}).length).toBeGreaterThan(0)
  expect(Array.isArray(dataset.signals)).toBe(true)

  await page.locator('input[type="file"]').setInputFiles({
    name: 'tacitweave-local-dataset.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(dataset)),
  })
  await expect(page.getByText(/Imported/)).toBeVisible()

  await page.locator('input[type="file"]').setInputFiles({
    name: 'broken.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ version: 'local-dataset-v2', motifs: 'nope', relationships: [] })),
  })
  await expect(page.getByText(/Import failed/)).toBeVisible()
})


test('imports a legacy v1 dataset', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /Settings$/ }).click()
  await page.locator('input[type="file"]').setInputFiles({
    name: 'legacy-v1.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({
      version: 'local-dataset-v1',
      motifs: [{
        version: 'motif-v1',
        id: 'legacy-motif',
        createdAt: '2026-01-01T00:00:00.000Z',
        name: 'Legacy motif',
        capture: { region: 'chest', sensation: 'pressure', intensity: 3, breath: 'held', fragments: ['wet-corridor'] },
      }],
      relationships: [],
    })),
  })
  await expect(page.getByText(/Imported 1/)).toBeVisible()
  await page.getByRole('button', { name: /Field$/ }).click()
  await expect(page.locator('.field-node')).toHaveCount(1)
})

test('exports and imports an encrypted backup', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Load demo field' }).click()
  await page.getByRole('button', { name: /Settings$/ }).click()
  page.on('dialog', dialog => dialog.accept('correct horse battery'))

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export encrypted backup' }).click()
  const download = await downloadPromise
  const filePath = await download.path()
  expect(filePath).not.toBeNull()
  const backupText = await readFile(filePath!, 'utf8')
  const backup = JSON.parse(backupText) as { format: string; ciphertext: string }
  expect(backup.format).toBe('tacitweave-encrypted-backup-v1')
  expect(backup.ciphertext).not.toContain('Demo')
  expect(backup.ciphertext).not.toContain('motif')

  await page.locator('input[type="file"]').setInputFiles({
    name: 'backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(backupText),
  })
  await expect(page.getByText(/Imported 2/)).toBeVisible()
})

test('exports persisted capture provenance from the web fallback', async ({ page }) => {
  const capture = {
    version: 'capture-v1', captureId: 'capture-e2e', rendererKind: 'captured', mimeType: 'video/mp4',
    durationSec: 75, sha256: 'b'.repeat(64), synthId: false, createdAt: '2026-11-01T00:00:00.000Z',
  }
  await page.addInitScript(value => localStorage.setItem('tacitweave.captures.v1', JSON.stringify([value])), capture)
  await page.goto('/')
  await page.getByRole('button', { name: /Settings$/ }).click()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export all local data' }).click()
  const download = await downloadPromise
  const text = await readFile((await download.path())!, 'utf8')
  expect(JSON.parse(text).captures).toEqual([capture])
  await page.locator('.capture-list').getByRole('button', { name: 'Retract' }).click()
  await expect(page.locator('.capture-list')).toHaveCount(0)
})

test('exports an LSM-0 fixture from local motifs', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Load demo field' }).click()
  await page.getByRole('button', { name: /Settings$/ }).click()
  page.once('dialog', dialog => dialog.accept('P01'))
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export LSM-0 sessions' }).click()
  const download = await downloadPromise
  const text = await readFile((await download.path())!, 'utf8')
  const records = JSON.parse(text) as Array<{ version: string; participantId: string; somatic: unknown }>
  expect(records).toHaveLength(2)
  expect(records[0]).toMatchObject({ version: 'lsm0-session-v1', participantId: 'P01' })
})
