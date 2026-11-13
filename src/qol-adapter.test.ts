// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { buildQolSessions } from './qol-adapter'

const dirs: string[] = []
afterEach(async () => { await Promise.all(dirs.splice(0).map(dir => rm(dir, { recursive: true, force: true }))) })

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'qol-adapter-'))
  dirs.push(root)
  await writeFile(join(root, 'participants.csv'), 'username,sex,age\nuser-a,F,30\nuser-b,M,31\n')
  await writeFile(join(root, 'ecg.csv'), [
    '_id,heart_rate,username,phase,waveform_samples',
    '1,60,user-a,relax,x',
    '2,80,user-a,stress,x',
    '3,70,user-b,relax,x',
  ].join('\n'))
  await writeFile(join(root, 'eda.csv'), [
    'username,phase,time_sec,valid_data,activation,scl_avg',
    'user-a,relax,0,True,0,10',
    'user-a,relax,5,True,0,20',
    'user-a,relax,10,False,0,999',
    'user-a,stress,0,True,0,30',
    'user-b,relax,0,True,0,40',
  ].join('\n'))
  await writeFile(join(root, 'stai.csv'), [
    'username,time,phase,score',
    'user-a,t1,relax,25',
    'user-a,t2,stress,45',
    'user-b,t1,relax,30',
  ].join('\n'))
  await writeFile(join(root, 'pss_14.csv'), 'username,time,score\nuser-a,t,12\nuser-b,t,20\n')
  return root
}

describe('QoL_Stress canonical adapter', () => {
  it('links participant-phase ECG, valid EDA and STAI/PSS without raw usernames', async () => {
    const sessions = await buildQolSessions({ root: await fixture() })
    expect(sessions).toHaveLength(3)
    const relax = sessions.find(session => session.sessionId === 'p001-relax')
    expect(relax?.signals.ecgHeartRateBpm).toBe(60)
    expect(relax?.signals.edaMeanSclMicroSiemens).toBe(15)
    expect(relax?.signals.edaValidSamples).toBe(2)
    expect(relax?.signals.edaInvalidSamples).toBe(1)
    expect(relax?.selfReport).toEqual({ stateAnxietyScore: 25, pss14Score: 12 })
    expect(JSON.stringify(sessions)).not.toContain('user-a')
  })

  it('leaves missing EDA absent instead of imputing it', async () => {
    const sessions = await buildQolSessions({ root: await fixture() })
    const stressB = sessions.find(session => session.sessionId === 'p002-stress')
    expect(stressB).toBeUndefined()
    const relaxB = sessions.find(session => session.sessionId === 'p002-relax')
    expect(relaxB?.signals.edaMeanSclMicroSiemens).toBe(40)
    expect(relaxB?.signals.ecgHeartRateBpm).toBe(70)
  })
})
