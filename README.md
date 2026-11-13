<!--
SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
SPDX-License-Identifier: CC-BY-4.0
-->
<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/assets/tacitweave-mono-dark.svg">
    <img src="docs/assets/tacitweave-mono.svg" alt="Tacitweave — Before words" width="120">
  </picture>
</p>

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

- **BCI-1**: device-agnostic `SignalSource`, LSL-style simulator, local event timeline.
- **BCI-3**: localhost-only WebSocket bridge with token auth, source provenance
  (`origin`, `devicePseudonym`, `adapterVersion`), reconnect handling and
  duplicate/identity checks.
- No implant, no neural decoding, no clinical claims.
- References open ecosystems: OpenBCI, BrainFlow, LSL and MNE. Neuralink's public
  repo is mainly the data platform `datarepo`, not an N1 SDK.

See [BCI open-source landscape](docs/vision/bci-open-source-landscape.md),
[BCI-1](docs/vision/bci-1-signal-layer.md),
[BCI-3](docs/vision/bci-3-local-bridge.md) and
[device identity contract](docs/research/device-identity-contract.md).

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
| BCI-3 | Local WebSocket bridge: token auth, provenance, reconnect and identity checks; no hardware validation |
| Desktop shell | Tauri 2 + Rust; SQLite; app-data-only file API (not an OS sandbox) |
| Theme | Light / dark theme |
| App lock | Local PIN + AES-GCM encrypted snapshot; configurable idle auto-lock, 5-attempt/30s PIN lockout; not system lock |
| Cross-platform | v0.1.4 Linux AppImage/DEB and Windows NSIS, unsigned; macOS signed build pending |
| Bilingual | Chinese / English UI switch |
| Data | Local SQLite or browser localStorage; plaintext/encrypted backup export, import, delete; record provenance and signal-session summaries. Deletion includes legacy keys, local-files and old app-data dirs; SQLite uses secure_delete + VACUUM (not a forensic full-disk guarantee) |
| Update check | Explicit GitHub Releases check; no auto-download |
| Accessibility | WCAG A/AA in light/dark themes (structure + contrast) via E2E |
| Relationship topology | 30/90-day longitudinal comparison of user-authored moments; no partner inference |
| Signal resilience | Local bridge reconnect/backoff, jitter/gap health, deterministic replay and explicit session retraction |
| LSM-0 baseline | Offline deterministic evaluation, dataset export and precision simulation; no empirical data and no clinical claims |
| Licensing / contribution | Layered AGPL/Apache/CC-BY/brand; CLA 1.0; PRs require the `license/cla` check |
| Continuity v0.1 | Re-enter a past fragment, edit user-authored fields, keep every revision and compare field changes without interpretation |
| Dynamic space v0.1 | Extend a 75s encounter by explicit 30s stays; every extension is recorded and the original plan stays unchanged |
| Relationship continuity v0.1 | Re-enter a relationship moment, prefill its user fields, preserve the original, record each visit and compare user-field changes |
| Space Composer v0.1 | Choose 1–3 motifs, figure and 75s/180s format before entering; the system composes, not interprets |

Currently **not** implemented:

- real BCI hardware validation and measurement reliability
- an empirical or trained LSM model
- automatic relationship inference
- diagnosis, therapy or memory recovery
- clinical or human-efficacy evidence

### 3.1 Engineering status

As of v0.1.4 on `main`:

- **185** Vitest unit/integration tests
- **27** Playwright browser E2E scenarios
- **8** Rust desktop tests; the ops crate also builds and tests
- WCAG A/AA structural and contrast checks in light/dark themes
- main JS bundle about **325 KB**, with heavy views lazy-loaded
- v0.1.4 release: **unsigned** Linux AppImage/DEB + Windows NSIS; no macOS asset yet
- CI: Symbolic space, Rust operational, Browser E2E and License checks

The project remains a research prototype; no clinical or real-BCI-hardware claim is made.

### 3.2 Symbolic Continuity v0.1

The local product now has an explicit continuity layer: a past fragment can be re-entered, edited and compared, while the original record and every revision remain intact. It records only user-authored fields and a user-written note; it does not infer improvement, diagnosis or psychological meaning. See [Symbolic Continuity v0.1](docs/symbolic-continuity-v0.1.md).

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
- `SignalSource` / `SignalTrace`: device-agnostic signal seam with source provenance.
- `CaptureProvenance`: provenance for non-deterministic captures.
- Tauri Rust host: application-level app-data file API, SQLite, packaging; the frontend uses `invoke`. This is not an OS sandbox.

## 5. Vision: from symbolic interface to a measurable pre-verbal layer

Tacitweave is not a decoder, a diagnostic tool or a therapist chatbot. It is an
instrument for holding pre-verbal experience in a form the person can enter,
leave and interpret for themselves. The long-term ambition is to connect that
instrument to a rigorous measurement program.

### 5.1 The thesis

Language is excellent at explicit knowledge and poor at carrying some bodily,
imaginal and relational experience. A model trained only on tokens can imitate
the vocabulary of feeling without access to the structure underneath it.

Tacitweave starts one step earlier:

> Can the body, image and relational moment be given a stable symbolic form —
> without the system telling the person what it means?

The second question is scientific, not rhetorical:

> Can signals recorded under consent be shown to carry reproducible,
> within-person information about that experience?

The interface and the measurement program are related, but they are not the
same claim. A moving symbolic experience is not evidence of a stable
pre-verbal psychological structure.

### 5.2 Three layers

1. **Experience layer** — somatic capture, image fragments, relationship
   moments, a 75s encounter or 180s space. The user remains the interpreter.
2. **Measurement layer** — local session records, optional signals, timestamps,
   provenance, quality flags, retraction and deletion. This layer exists to
   make claims checkable, not to make the experience more impressive.
3. **Evidence layer** — preregistered within-person analysis, negative and
   positive controls, measurement reliability, construct validity and
   independent replication. No layer is allowed to borrow authority from
   another.

### 5.3 What success would look like

- **As an instrument**: a person can enter, leave, retract and delete without
  needing to explain themselves; the interface does not diagnose or interpret.
- **As a measurement system**: signal features and self-report can be shown to
  be reliable, and their within-person association can be tested against
  controls that preserve time structure.
- **As a research program**: a preregistered pilot can be independently
  replicated, including negative results; construct validity is treated as a
  separate requirement.
- **As a product**: only after the evidence survives replication does an
  adaptive or signal-driven symbolic space become defensible.

### 5.4 Evidence ladder

| Gate | Question | Current status |
| --- | --- | --- |
| Gate 1 | Can the app be installed, used, exited and deleted credibly? | v0.1.4 released under AGPL; signing/platform QA still incomplete |
| Gate 2A | Does a real device pipeline preserve time, identity, gaps and recovery? | SIL and bridge tests exist; real-device HIL not done |
| Gate 2B | Are sensor features and extraction reliable? | No real measurement-reliability evidence |
| Gate 3A | Does a preregistered pilot show within-person association beyond controls? | Protocol, preregistration skeleton and tooling only; no ethics approval or participants |
| Gate 3B | Does an independent sample replicate the result? | Not started |
| Gate 4A | Does a longitudinal model predict out of sample? | Not started |
| Gate 4B | Can a closed-loop symbolic space be safe and exit-able? | Not started; requires a new ethics and safety gate |

The scientific boundary is deliberate:

> **Measurement validity is not construct validity.** A reproducible
> signal–self-report association would still be only an association between
> observable variables. It would not by itself prove a “pre-verbal
> psychological structure”.

### 5.5 Non-negotiable principles

- **No decoder claim**: no reading of the subconscious, no neural decoding, no
  diagnosis.
- **Local by default**: no account, no server-side personal data and no sync.
- **User sovereignty**: enter, leave, retract, export and delete are product
  primitives, not settings.
- **Measurement before personalization**: do not adapt the symbolic space from
  signals until the measurement chain is reliable.
- **Failure must be publishable**: if the association does not replicate, the
  project says so rather than renaming the failure as “individual differences”.

### 5.6 What we refuse

- We will not wait for an N1 SDK; we build on OpenBCI, BrainFlow, LSL and the
  open ecosystem.
- We will not treat self-report as the endpoint; consented data must test
  whether signal and self-report correspond stably.
- We will not leave relationship topology as a static list; it must become a
  reviewable, comparable, deletable longitudinal structure.
- We will not fake LSM with an LLM; LSM is a somatic–imagery–relationship
  measurement program, not next-token probability.
- We will not dress experimental signals up as “deep-subconscious reading”.

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

Requirements: Node.js 22+, pnpm 10 and a Rust toolchain (the desktop crate
declares Rust 1.90+). On macOS, Tauri needs Xcode Command Line Tools.

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
pnpm sil:test               # deterministic SIL failure scenarios
pnpm lsm0:precision --replicates 50 --bootstrap 50
reuse lint                  # REUSE/SPDX compliance
pnpm license:js             # JS dependency license check
pnpm bci:bridge --origin simulated  # local BCI-3 bridge; real adapters use --origin hardware
pnpm bci:replay --in sample.jsonl   # replay samples with jitter/drop for testing
pnpm check:symbolic-path
pnpm rust:test
cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml --locked
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
# or build + strip + ad-hoc sign + zip locally:
pnpm package:macos
```

Cross-platform builds (run natively on the target OS):

```sh
pnpm tauri:build --bundles appimage,deb   # Linux
pnpm tauri:build --bundles nsis           # Windows
```

The GitHub Actions `Desktop builds` workflow produces Windows NSIS and Linux
AppImage/DEB assets for a release tag. The v0.1.4 release is **unsigned** and
has no macOS asset; Developer ID signing/notarization remains pending. Do not
describe an unsigned local build as signed or notarized.

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
- [`src/signal-source.ts`](src/signal-source.ts) — BCI signal layer, provenance and LSL simulator.
- [`src/research-capture.ts`](src/research-capture.ts) — research-only device/clock/consent/retention schema.
- [`src/lsm0-precision.ts`](src/lsm0-precision.ts) — precision simulation and interval diagnostics.
- [`src/sil-harness.ts`](src/sil-harness.ts) — deterministic software-in-the-loop failure harness.
- [`src/source-link.ts`](src/source-link.ts) — AGPL source link with build-time commit.
- [`src/device-signal-source.ts`](src/device-signal-source.ts) — local device bridge.
- [`src/local-store.ts`](src/local-store.ts) — SQLite/localStorage snapshot.
- [`src/desktop-shell.tsx`](src/desktop-shell.tsx) — three-pane workspace.
- [`src/i18n.tsx`](src/i18n.tsx) — Chinese/English UI.
- [`apps/desktop/src-tauri/`](apps/desktop/src-tauri/) — Tauri 2 Rust host.
- [`docs/inner/`](docs/inner/) — formats, v0–v3 and capture boundaries.
- [`docs/vision/`](docs/vision/) — BCI landscape, BCI-1/2/3, LSM/relationship path.
- [`scripts/bci3-bridge.ts`](scripts/bci3-bridge.ts) — local token-authenticated WebSocket bridge.
- [`docs/desktop-shell.md`](docs/desktop-shell.md) — desktop shell, SQLite and signing.

## 10. Roadmap

- **Now**: v0.1.4 is the first AGPL-layered release. The local symbolic
  instrument, Tauri shell, SQLite lifecycle, BCI-3 local bridge, SIL/research
  tooling and licensing/CLA gates are in place.
- **Next engineering**: complete Gate 1 platform/signing work; run the
  non-human Gate 2A bench (Cyton/BrainFlow or equivalent), with clock,
  provenance, recovery and identity evidence. No human data.
- **Next research**: freeze the measurement protocol only after Gate 2B; obtain
  ethics approval and preregister Gate 3A. Test within-person associations
  against controls that preserve temporal structure.
- **Replication**: only after the pilot, run Gate 3B in an independent sample
  with a stated generalization boundary.
- **Long term**: LSM-1 longitudinal models and LSM-2 adaptive symbolic space
  only after replication. Clinical work only with ethics, clinical partners and
  regulatory review.

**Aggressive is not the same as overclaiming.** The path holds only on real,
consented, deletable data; without evidence, LSM is not written up as an
existing capability.

## 11. Research questions

1. Can a symbolic space give form to pre-verbal experience without interpreting it?
2. When people use the body and image choice instead of words, do they get closer to “what cannot be said”?
3. Does a 75s / 180s boundary make people safer, or more distant?
4. Are the signal and self-report measures reliable enough to support a within-person test?
5. Does a preregistered signal–self-report association exceed controls that preserve temporal structure?
6. Does any symbolic representation add reproducible predictive value beyond the full signal and self-report baseline?
7. Does the result independently replicate, with a clearly stated generalization boundary?
8. Who is this for — and who should not use it?

## 12. License

Tacitweave uses layered licensing: AGPL-3.0-or-later for the application and
runtime, CC-BY-4.0 for documentation, and separate terms for brand assets. The
only Apache-2.0 file currently is
`docs/evaluation/experiment-log.example.json`. Copyright 2026 Inceptless. See
[LICENSING.md](LICENSING.md).

Contributions require the Inceptless CLA 1.0; PRs merge only after the
`license/cla` check. See [CONTRIBUTING.md](CONTRIBUTING.md).

Historical large-file and audio audit: [docs/privacy/history-audit-2026-11-01.md](docs/privacy/history-audit-2026-11-01.md).

## 13. Initiator

Tacitweave is initiated by **Inceptless**.
