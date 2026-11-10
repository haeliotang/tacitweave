// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import type { RelationshipResponse, RelationshipTrigger } from './relationship'
import type { SomaticRegion, SomaticSensation } from './somatic'

/**
 * Pure, descriptive grouping and longitudinal comparison helpers for
 * user-authored relationship triggers.
 *
 * Boundary (deliberate, mirrors the rest of the relationship journal):
 * - Every value used here was typed by the user. This module only counts and
 *   regroups those values.
 * - It does not infer anything about the other person, does not assign an
 *   attachment type, does not score the user or anyone else, and does not
 *   claim that one window caused another. "Change" means a difference between
 *   counts of the user's own records.
 * - Grouping labels are compared literally (after trimming / Unicode NFKC
 *   normalisation). Case and wording differences stay distinct so the user's
 *   own naming is never merged or reinterpreted.
 * - Invalid input is handled explicitly instead of guessed at: a blank label
 *   becomes an explicit unlabeled group, unparseable timestamps are reported
 *   by the window selection, and invalid window bounds throw a descriptive
 *   error instead of silently selecting everything.
 */

export type TriggerGrouping = 'role' | 'situation'

export interface TriggerFacetCount<T extends string> {
  value: T
  count: number
}

export interface TriggerFacets {
  responses: TriggerFacetCount<RelationshipResponse>[]
  regions: TriggerFacetCount<SomaticRegion>[]
  sensations: TriggerFacetCount<SomaticSensation>[]
}

/** One bucket of user-authored records, e.g. all entries whose `role` is "同事". */
export interface TriggerGroup {
  /** Normalised user-authored label ('' when the field was left blank). */
  key: string
  /** Same value as `key`; displayed with an i18n fallback when empty. */
  label: string
  /** True when the user left the grouped field blank. */
  unlabeled: boolean
  total: number
  /** Deterministic chronological order (oldest first), ties broken by id. */
  entries: RelationshipTrigger[]
  facets: TriggerFacets
  /** Earliest / latest parseable record in this group, as ISO strings. */
  firstAt: string | null
  lastAt: string | null
}

/**
 * Half-open time interval: `from` is inclusive, `to` is exclusive.
 * `null` means unbounded. ISO 8601 strings are expected.
 */
export interface TriggerWindow {
  from: string | null
  to: string | null
}

export interface TriggerWindowSelection {
  window: TriggerWindow
  /** Chronological entries that fall inside the window. */
  entries: RelationshipTrigger[]
  total: number
  /** Entries whose `createdAt` could not be parsed; never silently ignored. */
  invalidDates: number
  firstAt: string | null
  lastAt: string | null
}

/**
 * Direction is about counts of records only, never about people:
 * 'only-earlier' = the label appears just in the earlier window, etc.
 */
export type TriggerChangeDirection = 'only-earlier' | 'only-later' | 'more-earlier' | 'more-later' | 'equal'

export interface TriggerGroupComparison {
  key: string
  label: string
  unlabeled: boolean
  earlier: TriggerGroup | null
  later: TriggerGroup | null
  earlierCount: number
  laterCount: number
  /** laterCount - earlierCount. */
  delta: number
  direction: TriggerChangeDirection
}

export interface TriggerSetComparison {
  grouping: TriggerGrouping
  earlierGroups: TriggerGroup[]
  laterGroups: TriggerGroup[]
  groups: TriggerGroupComparison[]
  totalEarlier: number
  totalLater: number
  /** True when neither side has any record. */
  empty: boolean
}

export interface TriggerWindowComparison {
  grouping: TriggerGrouping
  earlierWindow: TriggerWindow
  laterWindow: TriggerWindow
  earlier: TriggerWindowSelection
  later: TriggerWindowSelection
  groups: TriggerGroupComparison[]
  totalEarlier: number
  totalLater: number
  empty: boolean
}

const DAY_MS = 86_400_000

/** Locale-independent ordering, so results do not depend on the host locale. */
function compareStrings(left: string, right: string): number {
  if (left === right) return 0
  return left < right ? -1 : 1
}

function parseTimestamp(value: string): number | null {
  const time = Date.parse(value)
  return Number.isNaN(time) ? null : time
}

function toIso(time: number | null): string | null {
  return time === null ? null : new Date(time).toISOString()
}

function minMax(times: number[]): { first: number | null; last: number | null } {
  if (times.length === 0) return { first: null, last: null }
  let first = times[0]
  let last = times[0]
  for (const time of times.slice(1)) {
    if (time < first) first = time
    if (time > last) last = time
  }
  return { first, last }
}

/**
 * Normalise a user-authored label for grouping without merging meaning:
 * Unicode NFKC, trim, and collapse internal whitespace. Case is preserved.
 */
export function normalizeTriggerLabel(value: string | null | undefined): string {
  if (typeof value !== 'string') return ''
  return value.normalize('NFKC').trim().replace(/\s+/g, ' ')
}

function groupingValue(entry: RelationshipTrigger, grouping: TriggerGrouping): string {
  return grouping === 'role' ? entry.role : entry.situation
}

/**
 * Chronological order with a stable tie-break. Entries with unparseable dates
 * are kept (and sorted last by id) so a selection can count them explicitly.
 */
function sortTriggerEntries(entries: readonly RelationshipTrigger[]): RelationshipTrigger[] {
  return [...entries].sort((left, right) => {
    const leftTime = parseTimestamp(left.createdAt)
    const rightTime = parseTimestamp(right.createdAt)
    if (leftTime === null && rightTime === null) return compareStrings(left.id, right.id)
    if (leftTime === null) return 1
    if (rightTime === null) return -1
    if (leftTime !== rightTime) return leftTime - rightTime
    return compareStrings(left.id, right.id)
  })
}

function countValues<T extends string>(values: readonly T[]): TriggerFacetCount<T>[] {
  const counts = new Map<T, number>()
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1)
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((left, right) => (right.count - left.count) || compareStrings(left.value, right.value))
}

function buildFacets(entries: readonly RelationshipTrigger[]): TriggerFacets {
  return {
    responses: countValues(entries.map(entry => entry.response)),
    regions: countValues(entries.map(entry => entry.region)),
    sensations: countValues(entries.map(entry => entry.sensation)),
  }
}

/**
 * Group records by one of the two user-authored free-text fields:
 * `role` (how the user labelled the other person) or `situation` (the context
 * the user wrote down). Blank values form one explicit unlabeled group.
 * Deterministic output order: larger groups first, then label code points,
 * with the unlabeled group last.
 */
export function groupRelationshipTriggers(
  entries: readonly RelationshipTrigger[],
  grouping: TriggerGrouping = 'role',
): TriggerGroup[] {
  const buckets = new Map<string, RelationshipTrigger[]>()
  for (const entry of entries) {
    const label = normalizeTriggerLabel(groupingValue(entry, grouping))
    const bucket = buckets.get(label)
    if (bucket) bucket.push(entry)
    else buckets.set(label, [entry])
  }

  const groups: TriggerGroup[] = [...buckets.entries()].map(([label, bucket]) => {
    const ordered = sortTriggerEntries(bucket)
    const times = ordered
      .map(entry => parseTimestamp(entry.createdAt))
      .filter((time): time is number => time !== null)
    const { first, last } = minMax(times)
    return {
      key: label,
      label,
      unlabeled: label.length === 0,
      total: ordered.length,
      entries: ordered,
      facets: buildFacets(ordered),
      firstAt: toIso(first),
      lastAt: toIso(last),
    }
  })

  groups.sort((left, right) => {
    if (left.unlabeled !== right.unlabeled) return left.unlabeled ? 1 : -1
    if (left.total !== right.total) return right.total - left.total
    return compareStrings(left.key, right.key)
  })
  return groups
}

function parseBoundary(value: string | null, name: 'from' | 'to'): number | null {
  if (value === null) return null
  const time = parseTimestamp(value)
  if (time === null) {
    throw new Error(`relationship topology: invalid "${name}" timestamp for a comparison window`)
  }
  return time
}

/**
 * Select valid records inside a half-open window (`from` inclusive,
 * `to` exclusive; `null` is unbounded). Unparseable dates are excluded from
 * `entries` but reported through `invalidDates`.
 */
export function selectTriggerWindow(
  entries: readonly RelationshipTrigger[],
  window: TriggerWindow,
): TriggerWindowSelection {
  const from = parseBoundary(window.from, 'from')
  const to = parseBoundary(window.to, 'to')
  if (from !== null && to !== null && from > to) {
    throw new Error('relationship topology: window "from" must not be after window "to"')
  }

  const selected: RelationshipTrigger[] = []
  let invalidDates = 0
  for (const entry of entries) {
    const time = parseTimestamp(entry.createdAt)
    if (time === null) {
      invalidDates += 1
      continue
    }
    if (from !== null && time < from) continue
    if (to !== null && time >= to) continue
    selected.push(entry)
  }

  const ordered = sortTriggerEntries(selected)
  const { first, last } = minMax(ordered.map(entry => parseTimestamp(entry.createdAt)).filter((time): time is number => time !== null))
  return {
    window: { from: window.from, to: window.to },
    entries: ordered,
    total: ordered.length,
    invalidDates,
    firstAt: toIso(first),
    lastAt: toIso(last),
  }
}

function directionFor(earlierCount: number, laterCount: number): TriggerChangeDirection {
  if (earlierCount === 0 && laterCount > 0) return 'only-later'
  if (laterCount === 0 && earlierCount > 0) return 'only-earlier'
  if (laterCount > earlierCount) return 'more-later'
  if (earlierCount > laterCount) return 'more-earlier'
  return 'equal'
}

/**
 * Compare two explicit sets of records (usable for two arbitrary windows or
 * for two record selections). Only counts of user-authored labels are
 * compared; nothing about people is inferred.
 */
export function compareTriggerSets(
  earlierEntries: readonly RelationshipTrigger[],
  laterEntries: readonly RelationshipTrigger[],
  grouping: TriggerGrouping = 'role',
): TriggerSetComparison {
  const earlierGroups = groupRelationshipTriggers(earlierEntries, grouping)
  const laterGroups = groupRelationshipTriggers(laterEntries, grouping)

  const comparisons = new Map<string, TriggerGroupComparison>()
  const ensure = (group: TriggerGroup): TriggerGroupComparison => {
    const existing = comparisons.get(group.key)
    if (existing) return existing
    const created: TriggerGroupComparison = {
      key: group.key,
      label: group.label,
      unlabeled: group.unlabeled,
      earlier: null,
      later: null,
      earlierCount: 0,
      laterCount: 0,
      delta: 0,
      direction: 'equal',
    }
    comparisons.set(group.key, created)
    return created
  }

  for (const group of earlierGroups) {
    const comparison = ensure(group)
    comparison.earlier = group
    comparison.earlierCount = group.total
  }
  for (const group of laterGroups) {
    const comparison = ensure(group)
    comparison.later = group
    comparison.laterCount = group.total
  }

  const groups = [...comparisons.values()]
  for (const group of groups) {
    group.delta = group.laterCount - group.earlierCount
    group.direction = directionFor(group.earlierCount, group.laterCount)
  }
  groups.sort((left, right) => {
    if (left.unlabeled !== right.unlabeled) return left.unlabeled ? 1 : -1
    if (left.laterCount !== right.laterCount) return right.laterCount - left.laterCount
    if (left.earlierCount !== right.earlierCount) return right.earlierCount - left.earlierCount
    return compareStrings(left.key, right.key)
  })

  const totalEarlier = earlierGroups.reduce((sum, group) => sum + group.total, 0)
  const totalLater = laterGroups.reduce((sum, group) => sum + group.total, 0)
  return {
    grouping,
    earlierGroups,
    laterGroups,
    groups,
    totalEarlier,
    totalLater,
    empty: earlierGroups.length === 0 && laterGroups.length === 0,
  }
}

/**
 * Compare two adjacent (or arbitrary) windows over the same trigger list.
 * Invalid dates are reported per selection and excluded from the comparison.
 */
export function compareTriggerWindows(
  entries: readonly RelationshipTrigger[],
  earlierWindow: TriggerWindow,
  laterWindow: TriggerWindow,
  grouping: TriggerGrouping = 'role',
): TriggerWindowComparison {
  const earlier = selectTriggerWindow(entries, earlierWindow)
  const later = selectTriggerWindow(entries, laterWindow)
  const comparison = compareTriggerSets(earlier.entries, later.entries, grouping)
  return {
    grouping,
    earlierWindow: { from: earlierWindow.from, to: earlierWindow.to },
    laterWindow: { from: laterWindow.from, to: laterWindow.to },
    earlier,
    later,
    groups: comparison.groups,
    totalEarlier: comparison.totalEarlier,
    totalLater: comparison.totalLater,
    empty: comparison.empty,
  }
}

/**
 * Window of `days` length that ends `offsetDays` before `anchor`.
 * `to` is exclusive; pass an anchor later than the newest record you want
 * included. Deterministic: only depends on the supplied anchor.
 */
export function rollingWindow(anchor: string, days: number, offsetDays = 0): TriggerWindow {
  const anchorTime = parseTimestamp(anchor)
  if (anchorTime === null) {
    throw new Error('relationship topology: rollingWindow requires a parseable ISO timestamp anchor')
  }
  if (!Number.isFinite(days) || days <= 0) {
    throw new Error('relationship topology: rollingWindow "days" must be a positive number')
  }
  if (!Number.isFinite(offsetDays) || offsetDays < 0) {
    throw new Error('relationship topology: rollingWindow "offsetDays" must not be negative')
  }
  const span = days * DAY_MS
  const shift = offsetDays * DAY_MS
  return {
    from: new Date(anchorTime - shift - span).toISOString(),
    to: new Date(anchorTime - shift).toISOString(),
  }
}

/** Latest parseable record timestamp, or null when nothing is parseable. */
export function latestTriggerTime(entries: readonly RelationshipTrigger[]): number | null {
  let latest: number | null = null
  for (const entry of entries) {
    const time = parseTimestamp(entry.createdAt)
    if (time === null) continue
    if (latest === null || time > latest) latest = time
  }
  return latest
}
