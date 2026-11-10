// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest'
import type { RelationshipTrigger } from './relationship'
import type { SomaticRegion, SomaticSensation } from './somatic'
import {
  compareTriggerSets,
  compareTriggerWindows,
  groupRelationshipTriggers,
  latestTriggerTime,
  normalizeTriggerLabel,
  rollingWindow,
  selectTriggerWindow,
} from './relationship-topology'
import type { RelationshipResponse } from './relationship'

interface TriggerOverrides {
  role?: string
  situation?: string
  cue?: string
  response?: RelationshipResponse
  region?: SomaticRegion
  sensation?: SomaticSensation
}

function trigger(id: string, createdAt: string, overrides: TriggerOverrides = {}): RelationshipTrigger {
  return {
    version: 'relationship-trigger-v1',
    id,
    createdAt,
    role: overrides.role ?? '一个总在忙的人',
    situation: overrides.situation ?? '对方很久没有回复',
    cue: overrides.cue ?? '看到屏幕暗下去',
    region: overrides.region ?? 'chest',
    sensation: overrides.sensation ?? 'tightness',
    intensity: 3,
    breath: 'shallow',
    response: overrides.response ?? 'freeze',
  }
}

const inferencePattern = /attachment|diagnos|score|matching|cause|causal|infer/i

describe('groupRelationshipTriggers', () => {
  it('groups by the user-authored role and keeps blank roles as an explicit unlabeled group', () => {
    const entries = [
      trigger('b', '2026-01-02T00:00:00.000Z', { role: ' 一个总在忙的人 ' }),
      trigger('a', '2026-01-01T00:00:00.000Z', { role: '朋友' }),
      trigger('c', '2026-01-03T00:00:00.000Z', { role: '   ' }),
    ]

    const groups = groupRelationshipTriggers(entries)

    expect(groups.map(group => group.key)).toEqual(['一个总在忙的人', '朋友', ''])
    expect(groups[0].label).toBe('一个总在忙的人')
    expect(groups[2]).toMatchObject({ label: '', unlabeled: true, total: 1 })
    expect(groups[2].entries.map(entry => entry.id)).toEqual(['c'])
    expect(JSON.stringify(groups)).not.toMatch(inferencePattern)
  })

  it('groups by the user-authored situation when asked, ignoring roles', () => {
    const entries = [
      trigger('a', '2026-01-01T00:00:00.000Z', { role: 'X', situation: '开会' }),
      trigger('b', '2026-01-02T00:00:00.000Z', { role: 'Y', situation: '  ' }),
      trigger('c', '2026-01-03T00:00:00.000Z', { role: 'X', situation: '开会 ' }),
    ]

    const groups = groupRelationshipTriggers(entries, 'situation')

    expect(groups.map(group => group.key)).toEqual(['开会', ''])
    expect(groups[0].total).toBe(2)
    expect(groups[0].entries.map(entry => entry.id)).toEqual(['a', 'c'])
    expect(groups[1].unlabeled).toBe(true)
  })

  it('keeps distinct user spellings and case variants apart instead of merging them', () => {
    const entries = [
      trigger('a', '2026-01-01T00:00:00.000Z', { role: 'Mom' }),
      trigger('b', '2026-01-02T00:00:00.000Z', { role: 'mom' }),
    ]

    expect(groupRelationshipTriggers(entries).map(group => group.key)).toEqual(['Mom', 'mom'])
  })

  it('orders entries chronologically and facet counts deterministically', () => {
    const entries = [
      trigger('e4', '2026-02-04T00:00:00.000Z', { response: 'approach' }),
      trigger('e1', '2026-02-01T00:00:00.000Z', { response: 'freeze' }),
      trigger('e3', '2026-02-03T00:00:00.000Z', { response: 'flee', region: 'stomach' }),
      trigger('e2', '2026-02-02T00:00:00.000Z', { response: 'freeze' }),
      trigger('e5', '2026-02-05T00:00:00.000Z', { response: 'flee' }),
    ]

    const [group] = groupRelationshipTriggers(entries)

    expect(group.total).toBe(5)
    expect(group.entries.map(entry => entry.id)).toEqual(['e1', 'e2', 'e3', 'e4', 'e5'])
    expect(group.firstAt).toBe('2026-02-01T00:00:00.000Z')
    expect(group.lastAt).toBe('2026-02-05T00:00:00.000Z')
    // Equal counts fall back to code-point order, never host-locale order.
    expect(group.facets.responses).toEqual([
      { value: 'flee', count: 2 },
      { value: 'freeze', count: 2 },
      { value: 'approach', count: 1 },
    ])
    expect(group.facets.regions).toEqual([
      { value: 'chest', count: 4 },
      { value: 'stomach', count: 1 },
    ])
    expect(group.facets.sensations).toEqual([{ value: 'tightness', count: 5 }])
  })

  it('is deterministic regardless of input order', () => {
    const entries = [
      trigger('a', '2026-01-01T00:00:00.000Z', { role: 'A' }),
      trigger('b', '2026-01-02T00:00:00.000Z', { role: 'B' }),
      trigger('c', '2026-01-03T00:00:00.000Z', { role: 'A', response: 'flee' }),
      trigger('d', '2026-01-04T00:00:00.000Z', { role: '  ' }),
    ]

    expect(groupRelationshipTriggers([...entries].reverse())).toEqual(groupRelationshipTriggers(entries))
  })

  it('returns only descriptive fields, never inference or person-scoring fields', () => {
    const [group] = groupRelationshipTriggers([trigger('a', '2026-01-01T00:00:00.000Z')])

    expect(Object.keys(group).sort()).toEqual([
      'entries', 'facets', 'firstAt', 'key', 'label', 'lastAt', 'total', 'unlabeled',
    ])
    expect(Object.keys(group.facets).sort()).toEqual(['regions', 'responses', 'sensations'])
    expect(JSON.stringify(group)).not.toMatch(inferencePattern)
  })

  it('handles an empty record list without inventing a group', () => {
    expect(groupRelationshipTriggers([])).toEqual([])
  })
})

describe('normalizeTriggerLabel', () => {
  it('trims, collapses whitespace and applies NFKC, but preserves case and wording', () => {
    expect(normalizeTriggerLabel('  Mom\u3000 work  ')).toBe('Mom work')
    expect(normalizeTriggerLabel('Mom')).toBe('Mom')
    expect(normalizeTriggerLabel('mom')).toBe('mom')
    expect(normalizeTriggerLabel('')).toBe('')
    expect(normalizeTriggerLabel(undefined)).toBe('')
    expect(normalizeTriggerLabel(null)).toBe('')
  })
})

describe('selectTriggerWindow', () => {
  const entries = [
    trigger('t10', '2026-01-01T10:00:00.000Z'),
    trigger('t11', '2026-01-01T11:00:00.000Z'),
    trigger('t12', '2026-01-01T12:00:00.000Z'),
  ]

  it('uses an inclusive start and an exclusive end', () => {
    const selection = selectTriggerWindow(entries, {
      from: '2026-01-01T10:00:00.000Z',
      to: '2026-01-01T12:00:00.000Z',
    })

    expect(selection.entries.map(entry => entry.id)).toEqual(['t10', 't11'])
    expect(selection.total).toBe(2)
    expect(selection.invalidDates).toBe(0)
    expect(selection.firstAt).toBe('2026-01-01T10:00:00.000Z')
    expect(selection.lastAt).toBe('2026-01-01T11:00:00.000Z')
  })

  it('treats null bounds as unbounded', () => {
    expect(selectTriggerWindow(entries, { from: null, to: null }).total).toBe(3)
    expect(selectTriggerWindow(entries, { from: null, to: '2026-01-01T11:00:00.000Z' }).total).toBe(1)
    expect(selectTriggerWindow(entries, { from: '2026-01-01T11:00:00.000Z', to: null }).total).toBe(2)
  })

  it('reports unparseable dates instead of silently dropping them', () => {
    const withBadDate = [...entries, trigger('bad', 'not-a-date')]
    const selection = selectTriggerWindow(withBadDate, { from: null, to: null })

    expect(selection.total).toBe(3)
    expect(selection.invalidDates).toBe(1)
    expect(selection.entries.map(entry => entry.id)).not.toContain('bad')
  })

  it('accepts an empty window but rejects invalid or reversed bounds', () => {
    const empty = selectTriggerWindow(entries, {
      from: '2026-01-01T12:00:00.000Z',
      to: '2026-01-01T12:00:00.000Z',
    })
    expect(empty.total).toBe(0)

    expect(() => selectTriggerWindow(entries, { from: 'nope', to: null })).toThrow(/invalid "from"/)
    expect(() => selectTriggerWindow(entries, { from: null, to: 'nope' })).toThrow(/invalid "to"/)
    expect(() => selectTriggerWindow(entries, {
      from: '2026-01-02T00:00:00.000Z',
      to: '2026-01-01T00:00:00.000Z',
    })).toThrow(/must not be after/)
  })
})

describe('compareTriggerSets', () => {
  it('compares counts of user-authored labels without scoring people', () => {
    const earlier = [
      trigger('a1', '2026-01-01T00:00:00.000Z', { role: 'A' }),
      trigger('a2', '2026-01-02T00:00:00.000Z', { role: 'A' }),
      trigger('b1', '2026-01-03T00:00:00.000Z', { role: 'B' }),
    ]
    const later = [
      trigger('a3', '2026-01-04T00:00:00.000Z', { role: 'A' }),
      trigger('c1', '2026-01-05T00:00:00.000Z', { role: 'C' }),
    ]

    const comparison = compareTriggerSets(earlier, later)

    expect(comparison.totalEarlier).toBe(3)
    expect(comparison.totalLater).toBe(2)
    expect(comparison.empty).toBe(false)
    expect(comparison.groups.map(group => group.key)).toEqual(['A', 'C', 'B'])
    expect(comparison.groups.find(group => group.key === 'A')).toMatchObject({
      earlierCount: 2,
      laterCount: 1,
      delta: -1,
      direction: 'more-earlier',
    })
    expect(comparison.groups.find(group => group.key === 'B')).toMatchObject({
      earlierCount: 1,
      laterCount: 0,
      delta: -1,
      direction: 'only-earlier',
    })
    expect(comparison.groups.find(group => group.key === 'C')).toMatchObject({
      earlierCount: 0,
      laterCount: 1,
      delta: 1,
      direction: 'only-later',
    })
    expect(JSON.stringify(comparison)).not.toMatch(inferencePattern)
  })

  it('reports equal counts as equal and handles empty sides explicitly', () => {
    const one = [trigger('a', '2026-01-01T00:00:00.000Z', { role: 'A' })]
    const comparison = compareTriggerSets(one, one)

    expect(comparison.groups[0]).toMatchObject({
      earlierCount: 1,
      laterCount: 1,
      delta: 0,
      direction: 'equal',
    })
    expect(comparison.empty).toBe(false)

    const empty = compareTriggerSets([], [])
    expect(empty).toMatchObject({ groups: [], totalEarlier: 0, totalLater: 0, empty: true })
  })

  it('keeps group comparisons to descriptive count fields only', () => {
    const comparison = compareTriggerSets(
      [trigger('a', '2026-01-01T00:00:00.000Z', { role: 'A' })],
      [trigger('b', '2026-01-02T00:00:00.000Z', { role: 'B' })],
    )

    expect(Object.keys(comparison.groups[0]).sort()).toEqual([
      'delta', 'direction', 'earlier', 'earlierCount', 'key', 'label', 'later', 'laterCount', 'unlabeled',
    ])
    expect(Object.keys(comparison).sort()).toEqual([
      'earlierGroups', 'empty', 'grouping', 'groups', 'laterGroups', 'totalEarlier', 'totalLater',
    ])
  })
})

describe('compareTriggerWindows', () => {
  const entries = [
    trigger('e1', '2026-01-05T00:00:00.000Z', { role: 'A' }),
    trigger('e2', '2026-01-12T00:00:00.000Z', { role: 'A' }),
    trigger('e3', '2026-01-20T00:00:00.000Z', { role: 'B' }),
    trigger('e4', '2026-01-25T00:00:00.000Z', { role: 'B' }),
  ]
  const earlierWindow = { from: '2026-01-01T00:00:00.000Z', to: '2026-01-15T00:00:00.000Z' }
  const laterWindow = { from: '2026-01-15T00:00:00.000Z', to: '2026-02-01T00:00:00.000Z' }

  it('compares two adjacent windows and exposes both selections', () => {
    const comparison = compareTriggerWindows(entries, earlierWindow, laterWindow)

    expect(comparison.earlier.entries.map(entry => entry.id)).toEqual(['e1', 'e2'])
    expect(comparison.later.entries.map(entry => entry.id)).toEqual(['e3', 'e4'])
    expect(comparison.totalEarlier).toBe(2)
    expect(comparison.totalLater).toBe(2)
    expect(comparison.empty).toBe(false)
    expect(comparison.earlierWindow).toEqual(earlierWindow)
    expect(comparison.laterWindow).toEqual(laterWindow)
    // Groups with more records in the later window come first.
    expect(comparison.groups.map(group => group.key)).toEqual(['B', 'A'])
    expect(comparison.groups[0]).toMatchObject({ earlierCount: 0, laterCount: 2, direction: 'only-later' })
    expect(comparison.groups[1]).toMatchObject({ earlierCount: 2, laterCount: 0, direction: 'only-earlier' })
    expect(JSON.stringify(comparison)).not.toMatch(inferencePattern)
  })

  it('reports invalid dates per window and still compares valid records', () => {
    const comparison = compareTriggerWindows(
      [...entries, trigger('bad', 'not-a-date')],
      earlierWindow,
      laterWindow,
    )

    expect(comparison.earlier.invalidDates).toBe(1)
    expect(comparison.later.invalidDates).toBe(1)
    expect(comparison.totalEarlier).toBe(2)
    expect(comparison.totalLater).toBe(2)
  })

  it('handles empty windows without inventing labels', () => {
    const comparison = compareTriggerWindows([], earlierWindow, laterWindow)

    expect(comparison).toMatchObject({ groups: [], totalEarlier: 0, totalLater: 0, empty: true })
  })
})

describe('rollingWindow and latestTriggerTime', () => {
  it('builds deterministic adjacent half-open windows', () => {
    expect(rollingWindow('2026-03-01T00:00:00.000Z', 10)).toEqual({
      from: '2026-02-19T00:00:00.000Z',
      to: '2026-03-01T00:00:00.000Z',
    })
    expect(rollingWindow('2026-03-01T00:00:00.000Z', 10, 10)).toEqual({
      from: '2026-02-09T00:00:00.000Z',
      to: '2026-02-19T00:00:00.000Z',
    })
  })

  it('keeps the newest record inside the default later window', () => {
    const entries = [trigger('old', '2025-01-01T00:00:00.000Z'), trigger('new', '2026-01-01T00:00:00.000Z')]
    const latest = latestTriggerTime(entries)
    expect(latest).toBe(Date.parse('2026-01-01T00:00:00.000Z'))

    const anchor = new Date(latest! + 1).toISOString()
    const selection = selectTriggerWindow(entries, rollingWindow(anchor, 7))
    expect(selection.entries.map(entry => entry.id)).toEqual(['new'])
  })

  it('rejects invalid anchors and window sizes', () => {
    expect(() => rollingWindow('nope', 30)).toThrow(/parseable ISO timestamp/)
    expect(() => rollingWindow('2026-01-01T00:00:00.000Z', 0)).toThrow(/positive number/)
    expect(() => rollingWindow('2026-01-01T00:00:00.000Z', 30, -1)).toThrow(/must not be negative/)
  })

  it('returns the latest parseable timestamp or null', () => {
    expect(latestTriggerTime([])).toBeNull()
    expect(latestTriggerTime([trigger('bad', 'not-a-date')])).toBeNull()
    expect(latestTriggerTime([
      trigger('a', '2026-01-01T00:00:00.000Z'),
      trigger('b', '2026-02-01T00:00:00.000Z'),
      trigger('c', 'not-a-date'),
    ])).toBe(Date.parse('2026-02-01T00:00:00.000Z'))
  })
})
