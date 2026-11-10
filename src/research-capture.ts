// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { z } from 'zod'

/**
 * Research-only capture provenance. This is deliberately separate from the
 * product's SignalSession summary: research reproducibility requires device,
 * clock, consent and either raw or recomputable feature data.
 */
export const researchCaptureSessionSchema = z.object({
  version: z.literal('research-capture-v1'),
  participantCode: z.string().min(2).max(64).regex(/^[A-Za-z0-9_-]+$/),
  sessionId: z.string().min(1).max(128),
  collectedAt: z.string().datetime(),
  device: z.object({
    manufacturer: z.string().min(1),
    model: z.string().min(1),
    hardwareRevision: z.string().min(1).optional(),
    firmware: z.string().min(1),
    sdkVersion: z.string().min(1),
    devicePseudonym: z.object({
      value: z.string().min(1),
      scheme: z.enum(['hmac-sha256', 'random-research-id']),
      keyVersion: z.string().min(1),
    }),
    channels: z.array(z.object({
      name: z.string().min(1),
      physicalKind: z.enum(['eeg', 'ecg', 'ppg', 'eda', 'respiration', 'audio', 'other']),
      sampleRateHz: z.number().positive().optional(),
      unit: z.string().optional(),
    })).min(1),
  }),
  clock: z.object({
    source: z.enum(['device', 'host_arrival', 'both']),
    deviceEpochMs: z.number().int().nonnegative().optional(),
    hostEpochMs: z.number().int().nonnegative(),
    offsetMs: z.number().int(),
  }),
  consent: z.object({
    scope: z.enum(['raw_signal', 'features_only']),
    version: z.string().min(1),
    grantedAt: z.string().datetime(),
    withdrawalAt: z.string().datetime().optional(),
  }),
  capture: z.object({
    rawFormat: z.enum(['none', 'jsonl', 'edf', 'bdf', 'csv', 'other']),
    rawSha256: z.string().regex(/^[a-f0-9]{64}$/).optional(),
    rawBytes: z.number().int().nonnegative().optional(),
    sampleCount: z.number().int().nonnegative(),
    featureVersion: z.string().min(1),
    features: z.array(z.object({
      name: z.string().min(1),
      value: z.number().finite(),
      unit: z.string().optional(),
      derivedFrom: z.array(z.string().min(1)).min(1),
      quality: z.enum(['good', 'suspect', 'rejected']),
    })).default([]),
    quality: z.object({
      maxGapMs: z.number().finite().nullable(),
      gapsOverOneSecond: z.number().int().nonnegative(),
      droppedSamples: z.number().int().nonnegative(),
      reconnects: z.number().int().nonnegative(),
    }),
  }),
  retention: z.object({
    until: z.string().datetime(),
    access: z.enum(['local_encrypted', 'controlled_research_store']),
    policy: z.string().min(1),
  }),
  deletion: z.object({
    status: z.enum(['not_requested', 'requested', 'completed']),
    requestedAt: z.string().datetime().optional(),
    completedAt: z.string().datetime().optional(),
    method: z.string().optional(),
  }),
}).superRefine((value, ctx) => {
  if (value.consent.scope === 'raw_signal') {
    if (!value.capture.rawSha256 || !value.capture.rawBytes || value.capture.rawFormat === 'none') {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['capture'], message: 'raw_signal consent requires raw format, bytes and sha256' })
    }
  } else if (value.capture.rawFormat !== 'none' || value.capture.rawSha256 !== undefined || value.capture.rawBytes !== undefined) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['capture'], message: 'features_only consent cannot carry raw format, bytes or sha256' })
  }
  const channelNames = value.device.channels.map(channel => channel.name)
  if (new Set(channelNames).size !== channelNames.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['device', 'channels'], message: 'physical channel names must be unique' })
  }
  if (value.device.devicePseudonym.scheme === 'hmac-sha256' && !/^[a-f0-9]{64}$/.test(value.device.devicePseudonym.value)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['device', 'devicePseudonym', 'value'], message: 'hmac-sha256 pseudonym must be 64 lowercase hex characters' })
  }
  if (value.device.devicePseudonym.scheme === 'random-research-id' && !/^[A-Za-z0-9_-]{8,128}$/.test(value.device.devicePseudonym.value)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['device', 'devicePseudonym', 'value'], message: 'random research id must be 8-128 safe characters' })
  }
  const collected = Date.parse(value.collectedAt)
  const granted = Date.parse(value.consent.grantedAt)
  if (granted > collected) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['consent', 'grantedAt'], message: 'consent cannot be granted after collection' })
  if (Date.parse(value.retention.until) <= collected) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['retention', 'until'], message: 'retention must extend beyond collection' })
  if (value.clock.source === 'device' && value.clock.deviceEpochMs === undefined) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['clock', 'deviceEpochMs'], message: 'device clock source requires deviceEpochMs' })
  }
  for (const feature of value.capture.features) {
    for (const source of feature.derivedFrom) {
      if (!value.device.channels.some(channel => channel.name === source)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['capture', 'features'], message: `derivedFrom references unknown channel: ${source}` })
      }
    }
  }
  const withdrawal = value.consent.withdrawalAt ? Date.parse(value.consent.withdrawalAt) : null
  if (withdrawal !== null && withdrawal < granted) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['consent', 'withdrawalAt'], message: 'withdrawal cannot precede consent' })
  if (withdrawal !== null && withdrawal < collected) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['consent', 'withdrawalAt'], message: 'collection cannot occur after withdrawal' })
  if (withdrawal !== null && value.deletion.status === 'not_requested') {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['deletion', 'status'], message: 'withdrawn consent requires a deletion request or completion' })
  }
  const requested = value.deletion.requestedAt ? Date.parse(value.deletion.requestedAt) : null
  const completed = value.deletion.completedAt ? Date.parse(value.deletion.completedAt) : null
  if (value.deletion.status === 'requested' && requested === null) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['deletion', 'requestedAt'], message: 'requested deletion requires requestedAt' })
  if (value.deletion.status === 'requested' && (completed !== null || value.deletion.method !== undefined)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['deletion'], message: 'requested deletion cannot carry completion fields' })
  }
  if (value.deletion.status === 'not_requested' && (requested !== null || completed !== null || value.deletion.method !== undefined)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['deletion'], message: 'not_requested deletion cannot carry request/completion fields' })
  }
  if (value.deletion.status === 'completed') {
    if (requested === null) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['deletion', 'requestedAt'], message: 'completed deletion requires requestedAt' })
    if (completed === null) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['deletion', 'completedAt'], message: 'completed deletion requires completedAt' })
    if (!value.deletion.method) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['deletion', 'method'], message: 'completed deletion requires method' })
  }
  if (requested !== null && requested < collected) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['deletion', 'requestedAt'], message: 'deletion cannot precede collection' })
  if (requested !== null && withdrawal !== null && requested < withdrawal) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['deletion', 'requestedAt'], message: 'deletion request cannot precede withdrawal' })
  if (completed !== null && requested !== null && completed < requested) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['deletion', 'completedAt'], message: 'deletion completion cannot precede request' })
})

export type ResearchCaptureSession = z.infer<typeof researchCaptureSessionSchema>
