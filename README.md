<!--
SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
SPDX-License-Identifier: CC-BY-4.0
-->
# Tacitweave

[中文](README.zh-CN.md) | **English**

> A local-first symbolic interface for the pre-verbal layer.
>
> An enterable, exit-able, self-interpreted space for pre-verbal experience.

![Tacitweave inner field — light](docs/assets/desktop-shell-en.png)

![Tacitweave inner field — dark](docs/assets/desktop-shell-dark-en.png)

## UI terminology

- **片段 / Fragment** — the user-facing name for a motif record. The data layer still uses `motif`.
- **关系瞬间 / Relationship moment** — the user-facing name for a relationship trigger.
- **并置 / Juxtaposition** — the old “constellation” field view; it merely places fragments and moments side by side.
- **研究工具 / Research tools** — optional signals and device bridge, kept out of the primary navigation.

## Download

The latest public tag is [v0.1.4](https://github.com/haeliotang/tacitweave/releases/tag/v0.1.4), the first Tacitweave release under the layered AGPL-3.0-or-later license. It provides unsigned Linux and Windows builds; macOS signing is still pending. The archived [v0.1.1 release](https://github.com/haeliotang/tacitweave/releases/tag/v0.1.1) remains the most complete downloadable archive.

Archived v0.1.1 assets (former name):

- macOS 12+ Apple Silicon: `Familiweave-v0.1.1-macos-arm64.zip`
- Windows 10/11 x64: `Familiweave_0.1.1_x64-setup.exe`
- Linux x86_64: `Familiweave_0.1.1_amd64.AppImage` / `.deb`
- `SHA256SUMS.txt` for every artifact

> v0.1.4 is a Linux/Windows **unsigned** AGPL-3.0-or-later tag build. There is no macOS asset in this release yet. The v0.1.1 archive predates the storage-v2, BCI resilience, topology and LSM-0 work. Research prototype, not for clinical use.

Tacitweave is a public research project initiated by **Inceptless** about pre-verbal experience and optional local BCI signals.

It is not trying to build a “therapist chatbot”. It does not claim to read the deep subconscious. It starts from a narrower, testable question:

> Before language is formed, can the body, imagery and relational patterns be held first — and turned into a symbolic experience that only the person can complete?

## Research framing

Tacitweave studies a narrower, testable question than "reading the deep subconscious":

> Can pre-verbal bodily, imaginal and relational experience be held in an enterable, exit-able symbolic space, and can it be described with reproducible within-person measurements under explicit consent?

The project uses three theory anchors without treating them as proof:

- **Friston / active inference / interoception** — feelings and emotions are predictive constructions, not direct physiological readouts; uncertainty and precision matter.
- **Levin / TAME / bioelectricity** — bodies and self-boundaries can be viewed as multi-scale agency; this is a framework, not evidence of a human subconscious.
- **Yamanaka / iPS** — cell identity is plastic; cell reprogramming is not psychological reprogramming and is not a therapy claim.

Read the full positioning and literature brief:

- [Theory positioning](docs/research/theory-positioning.md)
- [Consciousness, subconscious and plasticity brief](docs/research/consciousness-and-plasticity-brief.md)
- [Next research milestones (Gate 1–4)](docs/research/next-milestones.md)
- [Gate 2A/2B checklist](docs/research/gate-2-checklist.md)
- [Gate 2 pre-hardware hardening](docs/research/gate-2-prehardware.md)
- [Gate 2 pre-hardware acceptance report](docs/research/gate-2-prehardware-report.md)
- [Gate 2A Cyton bench plan](docs/research/gate-2a-cyton-bench-plan.md)
- [LSM-0 precision simulation](docs/research/lsm-0-precision.md)
- [Device signal identity contract](docs/research/device-identity-contract.md)
- [LSM-0 protocol v1](docs/research/lsm-0-protocol-v1.md)
- [Preregistration skeleton](docs/research/preregistration-skeleton.md)
- [Research capture schema](docs/research/research-capture-schema.md)

## 1. Why BCI, not another chat box

As AI takes over explicit knowledge, logical reasoning, language and external execution, **reason and language inflate**. People still feel empty, tense in the body, and stuck in the same relational loop. But these experiences are often pre-verbal:

- an unclear heaviness in the chest
- a recurring wet corridor
- a freeze in the body at a relational moment
- a feeling named only afterwards

LLMs are built on tokens. Implicit memory, attachment reactions and somatic states are more **pre-verbal, associative and affective**. Asking someone to “put it into words” often compresses it into a label like “I am anxious”.

Tacitweave does not replace language. It adds an entrance before language: **somatic location, image choice, relationship moments, optional physiological/audio signals, then a symbolic space.**

### 1.1 Terminology

We use these terms consistently:

- **pre-verbal layer** — body, affect, imagery and relational reactions before language.
- **deep subconscious** — the project’s name for this pre-verbal layer; not a clinical object or something the system can read.
- **implicit memory** — automatic somatic and relational patterns; not a diagnosis.
- **somatic capture** — body map, sensation, intensity, breath and image choice.
- **symbolic space** — an enterable, exit-able 75s encounter or 180s space.
- **fragment** (internally `motif`) — a recurring body–imagery–relationship unit named by the user.
- **relationship topology** — the user-authored map of relationship moments; not inference about others or attachment typing.
- **BCI** — brain-computer interface. Today it means the local signal layer and device bridge, not an implant.
- **LSM (Large Somatic & Symbolic Model)** — a cross-modal research model of somatic state, imagery and relationship context; not a trained model yet.

## 2. What we build

### 2.1 Somatic capture

- Body map: head, jaw, throat, shoulders, chest, stomach/belly, back, hands, legs
- Sensation, intensity, breath
- Eight abstract image fragments; choose 1–3
- Optional 8-second local voice summary (volume/pause; no raw audio)
- No free-text interpretation; no need to name it first

### 2.2 Symbolic space

The capture becomes an `InnerPlan`, then a 75-second encounter or 180-second space:

- doors, corridors, water, houses, forest, stations, mirrors or fields
- an optional shadow-like presence, or none
- approach, stay, leave
- no interpretation, no score, no diagnosis

### 2.3 Fragments and relationship topology

- **Fragment journal**: the user names it, saves it, deletes it
- **Relationship moments**: user-written situations, moments, body reactions and first body responses
- Descriptive counts only; no partner inference, matching or attachment typing
- Everything stays local by default

### 2.4 BCI signal layer

- **BCI-1**: device-agnostic `SignalSource`, LSL-style simulator, event timeline
- **BCI-2**: localhost-only WebSocket bridge for `hello/sample/samples` JSON
- No implant, no neural decoding, no clinical claims
- References open ecosystems: OpenBCI, BrainFlow, LSL, MNE. Neuralink’s public repo is mainly the data platform `datarepo`, not an N1 SDK

See [BCI open-source landscape](docs/vision/bci-open-source-landscape.md), [BCI-1](docs/vision/bci-1-signal-layer.md) and [BCI-2](docs/vision/bci-2-device-bridge.md).

### 2.5 Local encryption, app lock and portable backups

- Optional app lock: PBKDF2 PIN verifier + AES-GCM encrypted local snapshot.
- When locked, plaintext fragment/relationship/field/signal keys are removed from local storage; the lock screen decrypts only after a successful PIN.
- Encrypted portable backups use a separate passphrase and AES-GCM; passphrases are never stored and cannot be recovered.
- These protect local/exported data, not a compromised OS account or a forgotten PIN. Forgotten PIN means deleting local data.

## 3. Current prototype

| Layer | Implemented |
| --- | --- |
| v0 somatic capture | Body map + sensation/intensity/breath + image fragments |
| v1 fragment journal | Local naming, save, delete, export |
| v2 relationship moments | Self-authored moments/reactions, map, descriptive counts |
| v3 voice summary | 8s volume/pause; explicit consent; no raw audio; session summary in SQLite |
| Field | Fragment juxtaposition, relationship nodes, perspective switch, timeline, drag/zoom, user links, time filter, demo field |
| BCI-1 | Signal source contract, simulator, local event timeline |
| BCI-2 | Local WebSocket device bridge contract + token auth |
| Desktop shell | Tauri 2 + Rust; SQLite; app-data-only file API (not an OS sandbox) |
| Theme | Light / dark theme |
| App lock | Local PIN + AES-GCM encrypted snapshot; configurable idle auto-lock (5 min default), 5-attempt/30s PIN lockout; not system lock |
| Cross-platform | Windows NSIS / Linux AppImage+DEB builds; current-main CI startup smoke passing |
| Bilingual | Chinese / English UI switch |
| Data | Local SQLite or browser localStorage; plaintext/encrypted backup export, import, delete; record provenance and signal-session summaries. Deletion includes legacy keys, local-files and old app-data dirs; SQLite uses secure_delete + VACUUM (not a forensic full-disk guarantee) |
| Update check | Explicit GitHub Releases check; no auto-download |
| Accessibility | WCAG A/AA in light/dark themes (structure + contrast) via E2E |
| Relationship topology | 30/90-day longitudinal comparison of user-authored triggers; no partner inference |
| Signal resilience | Local bridge reconnect/backoff, jitter/gap health, deterministic replay and explicit session retraction |
| LSM-0 baseline | Offline deterministic evaluation CLI plus local-dataset export; no clinical claims |

Currently **not** implemented:

- real BCI hardware validation
- an LSM model
- automatic relationship inference
- diagnosis, therapy or memory recovery
- clinical or human-efficacy evidence

### 3.1 Engineering status

As of the latest `main`:

- 141 Vitest unit/integration tests
- 21 Playwright browser E2E scenarios
- 6 Rust host tests
- WCAG A/AA structural and contrast checks in light/dark themes
- main JS bundle about 312 KB, with heavy views lazy-loaded
- macOS app bundle about 10.45 MiB before packaging; `pnpm package:macos` strips to about 8.4 MiB / ~3.4 MB zip, ad-hoc signed
- Linux/Windows release builds plus startup smoke in CI
- GitHub Actions checks: Symbolic space, Rust operational and Browser E2E

The project remains a research prototype; no clinical or real-BCI-hardware claim is made.

## 4. Architecture

```text
body / imagery / relationship / optional signals
        │
        ▼
SomaticCapture + SignalTrace
        │
        ▼
InnerPlan
fragments · pacing · figure · space/sound/light prompts · safety
        │
        ▼
EpisodePlan (kind: inner)
        │
        ▼
WorldRenderer (symbolic today; Genie 4 later)
        │
        ▼
75s encounter / 180s space + local record
```

- `InnerPlan`: symbolic director layer.
- `EpisodePlan`: persisted plan envelope.
- `WorldRenderer`: renderer seam; local symbolic today.
- `SomaticSignalSource` / `SignalTrace`: device-agnostic signal seam.
- `CaptureProvenance`: provenance for non-deterministic captures.
- Tauri Rust host: application-level app-data file API, SQLite, packaging; the frontend uses `invoke`. This is not an OS sandbox.

## 5. BCI and LSM: the aggressive path

Tacitweave is not “a chatbot with a few physiological sensors”. Our long-term claim is more aggressive:

> **The next mental-health infrastructure will not be a better-speaking LLM. It will be a BCI-native interface to the pre-verbal layer.**

BCI is therefore not an optional accessory. It is the long-term core research spine. We have no implant, no neural decoding, and we do not dress experimental signals up as “reading the deep subconscious”. But the roadmap actively moves toward that direction instead of stopping at self-report.

### 5.1 North Star

**From BCI to LSM:**

1. build device-agnostic somatic/signal capture;
2. on consented longitudinal data, learn a cross-modal mapping between signal, imagery and relationship;
3. drive symbolic-space parameters from that mapping, not from language interpretation;
4. make relationship topology a first-class product, not a side panel;
5. end with a **exit-able, deletable, self-interpreted** BCI-native symbolic interface.

### 5.2 Stages

| Stage | Goal | Status |
| --- | --- | --- |
| BCI-0 | Local voice summary + self-report + imagery | Implemented |
| BCI-1 | Device-agnostic `SignalSource` + LSL simulator + timeline | Implemented |
| BCI-2 | Local WebSocket device bridge | Contract/UI; no hardware validation |
| BCI-3 | Local bridge protocol + token auth implemented; real OpenBCI/BrainFlow/LSL capture not validated |
| LSM-0 | Cross-modal alignment: predict symbolic parameters from somatic/signal data, without emotion diagnosis | Not started; next research target |
| LSM-1 | Longitudinal fragment + relationship-topology personal model | Not started |
| LSM-2 | Closed-loop adaptive symbolic space, always overridable and exit-able | Not started |

### 5.3 We refuse to stop at prototype

- We will not wait for a Neuralink N1 SDK; we build on OpenBCI, BrainFlow, LSL and the open ecosystem.
- We will not treat self-report as the endpoint; consented data must test whether signal and self-report correspond stably.
- We will not leave relationship topology as a static list; it must become a longitudinal structure that can be reviewed, compared and deleted.
- We will not fake LSM with an LLM; LSM is a somatic–imagery–relationship mapping, not next-token probability.
- If we cannot show a reproducible signal–self-report correspondence, we must say the path failed instead of marketing “deep-subconscious reading”.

**LSM is still a research agenda, not a trained model — but it is the active target of this project, not decorative futurism.**

## 6. How we handle the deep subconscious

We do not treat the “deep subconscious” as an object the system can own. It is the user’s own **pre-verbal layer of meaning**.

Therefore:

- no interpretation: no dream dictionary, no “you actually mean…”
- no diagnosis: not a test, therapy or medical device
- no memory recovery: no repressed-memory suggestions, no false memories
- no scoring: no deep-subconscious health score, no relationship match score
- no inference about others: relationship moments only map what the user wrote
- no dependency loops: no streaks, no “someone is waiting for you”
- meaning stays with the user: the system offers form and open questions only

## 7. Privacy and boundaries

- Local by default: no server, no account, no sync
- Tauri stores fragments/relationship moments in SQLite; web preview falls back to localStorage
- App lock encrypts the local snapshot; encrypted portable backups use a separate passphrase
- Voice stores summaries only, not recoverable audio
- All data can be exported, imported and deleted
- In acute distress, self-harm or harm-to-others risk, stop and seek real support
- Real device signals require consent, deletion, disconnect and safety review first

## 8. Run locally

Requirements: Node.js 22+, pnpm 10, Rust toolchain; on macOS, Tauri needs Xcode Command Line Tools.

```sh
pnpm install
pnpm dev          # web preview
pnpm tauri:dev    # Tauri 2 desktop shell
```

Checks:

```sh
pnpm test
pnpm build
pnpm e2e:install            # first-time Chromium install
pnpm e2e                    # Playwright browser E2E
pnpm bci:bridge --origin simulated  # local BCI-3 WebSocket bridge; real adapters use --origin hardware
pnpm bci:replay --in sample.jsonl  # replay samples with jitter/drop for testing
pnpm check:symbolic-path
pnpm rust:test
cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml
```

Optional tools:

```sh
pnpm inner:storyboard --fragment "a corridor ending in a door" --format encounter
pnpm measure:browser
pnpm measure:browser:full
```

Desktop build:

```sh
pnpm tauri:build --bundles app
# or build + strip + ad-hoc sign + zip:
pnpm package:macos
```

Cross-platform builds (run natively on the target OS):

```sh
pnpm tauri:build --bundles appimage,deb   # Linux
pnpm tauri:build --bundles nsis           # Windows
```

The GitHub Actions `Desktop builds` workflow produces Windows NSIS and Linux AppImage/DEB assets and attaches them to the matching tag release. macOS distribution still needs Developer ID signing; Windows/Linux artifacts are unsigned.

The current artifact is ad-hoc signed for local validation; Developer ID signing and notarization need an Apple certificate.

## Data and research documentation

- [Local data schema v2](docs/research/data-schema-v2.md)
- [Consent and withdrawal](docs/research/consent-and-withdrawal.md)
- [LSM-0 evaluation protocol](docs/research/lsm-0-evaluation.md)
- [Consciousness, subconscious and plasticity brief](docs/research/consciousness-and-plasticity-brief.md)
- [Next research milestones (Gate 1–4)](docs/research/next-milestones.md)
- [LSM-0 offline baseline](docs/research/lsm-0-evaluation.md): `pnpm lsm0:baseline --in <fixture.jsonl>`; local export via `pnpm lsm0:export`
- [Auto-update plan](docs/updater-plan.md): updater key/endpoint plan and manifest generator
- [Release signing](docs/release-signing.md)
- [Release process](docs/release-process.md): tag builds, checksums and GitHub build provenance
- [Signing setup](docs/signing-setup.md): step-by-step Apple / Windows secrets
- [Desktop platform QA](docs/platform-qa.md)
- [BCI-3 local bridge](docs/vision/bci-3-local-bridge.md)

## 9. Project map

- [`src/somatic.ts`](src/somatic.ts) — body regions, sensations, breath, image fragments.
- [`src/somatic-entry.tsx`](src/somatic-entry.tsx) — v0 body-map entry.
- [`src/inner.ts`](src/inner.ts) — `InnerPlan`, encounter/space/capture plans.
- [`src/symbolic-renderer.tsx`](src/symbolic-renderer.tsx) — 75s encounter / 180s space.
- [`src/motif-journal.ts`](src/motif-journal.ts) — local motif storage.
- [`src/relationship.ts`](src/relationship.ts) — user-authored relationship moments.
- [`src/field.ts`](src/field.ts) — field positions, user links and validation.
- [`src/signal-session.ts`](src/signal-session.ts) — signal sessions with summaries only.
- [`src/signal-source.ts`](src/signal-source.ts) — BCI signal layer and LSL simulator.
- [`src/device-signal-source.ts`](src/device-signal-source.ts) — local device bridge.
- [`src/local-store.ts`](src/local-store.ts) — SQLite/localStorage snapshot.
- [`src/desktop-shell.tsx`](src/desktop-shell.tsx) — three-pane workspace.
- [`src/i18n.tsx`](src/i18n.tsx) — Chinese/English UI.
- [`apps/desktop/src-tauri/`](apps/desktop/src-tauri/) — Tauri 2 Rust host.
- [`docs/inner/`](docs/inner/) — formats, v0–v3 and capture boundaries.
- [`docs/vision/`](docs/vision/) — BCI landscape, BCI-1/2/3, LSM/relationship path.
- [`scripts/bci3-bridge.ts`](scripts/bci3-bridge.ts) — local token-authenticated WebSocket bridge.
- [`docs/desktop-shell.md`](docs/desktop-shell.md) — desktop shell, SQLite and signing.

## 10. Roadmap: from BCI seam to LSM

- **Now**: v0–v3 local prototype, BCI-1/2 seams, Tauri shell, SQLite, bilingual UI.
- **Next main push**: real OpenBCI/BrainFlow/LSL capture; real-device voice validation; move signal summaries into SQLite; visual QA of the Tauri window.
- **Research stage**: train LSM-0 cross-modal alignment on small, consented, deletable samples; first prove a reproducible signal–imagery–relationship structure, then discuss productisation.
- **Product stage**: relationship topology becomes a first-class entrance; closed-loop symbolic space adapts from signals, but the user always keeps interpretation and exit.
- **Long term**: a BCI-native interface to the pre-verbal layer; clinical work only with ethics and clinical partners.

**Aggressive is not the same as overclaiming.** This path only holds on real, consented, deletable data; without evidence, LSM is not written up as an existing capability.

## 11. Research questions

1. Can a symbolic space give form to pre-verbal experience without interpreting it?
2. When people use the body and image choice instead of words, do they get closer to “what cannot be said”?
3. Does a 75s / 180s boundary make people safer, or more distant?
4. Is there a stable, reproducible correspondence between multimodal signals and self-report?
5. Who is this for — and who should not use it?

## 12. License

Tacitweave uses layered licensing: AGPL-3.0-or-later for the application and runtime, CC-BY-4.0 for documentation, and separate terms for brand assets. The only Apache-2.0 file currently is `docs/evaluation/experiment-log.example.json`. Copyright 2026 Inceptless. See [LICENSING.md](LICENSING.md).

Historical large-file and audio audit: [docs/privacy/history-audit-2026-11-01.md](docs/privacy/history-audit-2026-11-01.md).

## 13. Initiator

Tacitweave is initiated by **Inceptless**.
