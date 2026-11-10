<!--
SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
SPDX-License-Identifier: CC-BY-4.0
-->
# Rust operational tools

Rust is used for local operational tooling that is deterministic, file-based and
independent from the web UI:

- `capture-hash`: compute a `CaptureProvenance` record (SHA-256, duration, model
  and SynthID fields) for a video/audio capture.
- `eval-validate`: validate the nine-metric experiment log and print a summary.
- `genie-status`: check whether Genie adapter environment variables are present;
  this command never calls a network service.

TypeScript remains the stack for the React/Three.js web app, the director plan,
the Fastify API and the existing browser-facing domain types. Rust owns the new
file/CLI operations so they can later move into a capture/gateway service without
being rewritten.

## Commands

```sh
cargo test --manifest-path rust/Cargo.toml
cargo run -q --manifest-path rust/Cargo.toml -p tacitweave-ops -- eval-validate docs/evaluation/experiment-log.example.json
cargo run -q --manifest-path rust/Cargo.toml -p tacitweave-ops -- capture-hash path/to/capture.mp4 --id capture-1 --renderer captured --mime video/mp4 --duration 75 --synth-id
cargo run -q --manifest-path rust/Cargo.toml -p tacitweave-ops -- capture-verify capture.json path/to/capture.mp4
cargo run -q --manifest-path rust/Cargo.toml -p tacitweave-ops -- genie-status
```

The root `pnpm eval:validate`, `pnpm capture:hash` and `pnpm genie:status`
scripts call the same binary.

## Boundaries

- No network calls.
- No secrets are printed by `genie-status`; only presence and validation of
  configuration.
- The Rust tool does not render worlds or store personal media.
