// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import type { ComponentType } from 'react'
import type { CaptureProvenance } from './capture'
import type { RendererKind } from './encounter'
import type { Encounter, SymbolicAgencyEvent } from './encounter'

// Runtime seam for the symbolic-space direction. Symbolic and captured
// renderers are available; Genie 4 / Marble can be registered without changing
// SceneView or the episode manifest.

export type RendererStatus = 'available' | 'requires_api_access' | 'not_configured' | 'unavailable'

export interface WorldRendererProps {
  encounter: Encounter
  replay: number
  onAgency?: (event: SymbolicAgencyEvent) => void
}

export interface RendererCapabilities {
  interactive: boolean
  nativeAudio: boolean
  capture: boolean
}

export type WorldInputEvent =
  | { type: 'move'; forward: number; strafe: number }
  | { type: 'look'; yaw: number; pitch: number }
  | { type: 'prompt'; text: string }
  | { type: 'approach' }
  | { type: 'sit' }
  | { type: 'stand' }
  | { type: 'leave' }

export interface WorldRenderSessionRequest {
  encounter: Encounter
}

/** Streaming session contract reserved for API-backed renderers such as Genie 4. */
export interface WorldRenderSession {
  readonly kind: RendererKind
  start(): Promise<void>
  pause(): Promise<void>
  resume(): Promise<void>
  stop(): Promise<void>
  input(event: WorldInputEvent): void
  capture(): Promise<CaptureProvenance | null>
  dispose(): Promise<void>
}

export interface WorldRenderer {
  kind: RendererKind
  label: string
  status: RendererStatus
  capabilities: RendererCapabilities
  /** Shown in the UI when the renderer cannot be used yet. */
  reason?: string
  /** Returns a user-facing error when this episode cannot be rendered. */
  validate?: (encounter: Encounter) => string | undefined
  /** React entry point; only required when status is `available`. */
  Component?: ComponentType<WorldRendererProps>
  /** Optional streaming entry point for renderers that expose a live API. */
  createSession?: (request: WorldRenderSessionRequest) => Promise<WorldRenderSession>
}

export class WorldRendererRegistry {
  private readonly renderers = new Map<RendererKind, WorldRenderer>()

  register(renderer: WorldRenderer) {
    // Last registration wins so Vite HMR can re-run the descriptor module safely.
    this.renderers.set(renderer.kind, renderer)
    return this
  }

  get(kind: RendererKind) {
    return this.renderers.get(kind)
  }

  /** Episodes without a renderer field use the current symbolic renderer. */
  resolve(kind: RendererKind | undefined) {
    return this.renderers.get(kind ?? 'symbolic')
  }

  list() {
    return [...this.renderers.values()]
  }
}

export const worldRenderers = new WorldRendererRegistry()
