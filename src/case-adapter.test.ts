// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { buildCaseSessions } from './case-adapter'

const dirs: string[] = []
afterEach(async () => { await Promise.all(dirs.splice(0).map(dir => rm(dir, { recursive: true, force: true }))) })

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'case-adapter-'))
  dirs.push(root)
  const annotation = join(root, 'annotation.csv')
  const physiological = join(root, 'physiological.csv')
  await writeFile(annotation, [
    'jstime,valence,arousal,video',
    '0,2,3,10',
    '50,4,5,10',
    '100,6,7,11',
  ].join('\n'))
  await writeFile(physiological, [
    'daqtime,ecg,bvp,gsr,rsp,skt,emg_zygo,emg_coru,emg_trap,video',
    '0,1,10,2,20,30,1,2,3,10',
    '1,3,30,4,40,50,3,4,5,10',
    '2,5,50,6,60,70,5,6,7,11',
  ].join('\n'))
  return { root, annotation, physiological }
}

describe('CASE canonical adapter', () => {
  it('aggregates each video and maps arousal to selfReport.intensity', async () => {
    const files = await fixture()
    const sessions = await buildCaseSessions([{ participantCode: 'P1', annotationPath: files.annotation, physiologicalPath: files.physiological }])
    expect(sessions).toHaveLength(2)
    expect(sessions[0].signals.gsrMeanMicroSiemens).toBe(3)
    expect(sessions[0].selfReport.intensity).toBe(4)
    expect(sessions[1].signals.ecgMeanMv).toBe(5)
    expect(sessions[0].source?.dataset).toBe('CASE')
  })

  it('does not fabricate a video missing from either file', async () => {
    const files = await fixture()
    await writeFile(files.annotation, 'jstime,valence,arousal,video\n0,1,2,10\n')
    const sessions = await buildCaseSessions([{ participantCode: 'P1', annotationPath: files.annotation, physiologicalPath: files.physiological }])
    expect(sessions).toHaveLength(1)
    expect(sessions[0].sessionId).toBe('p1-v10')
  })
})
