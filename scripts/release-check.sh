#!/bin/sh
# SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
# SPDX-License-Identifier: AGPL-3.0-or-later
set -eu
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "1/8 dependency audit"
pnpm audit --audit-level high
echo "2/8 unit tests"
pnpm test
echo "3/8 SIL harness"
pnpm sil:test
echo "4/8 precision simulation"
pnpm lsm0:precision --replicates 50 --bootstrap 50
echo "5/8 production build"
pnpm build
echo "6/8 bundle guard"
pnpm check:symbolic-path
echo "7/8 browser E2E (requires pnpm e2e:install once)"
pnpm e2e
echo "8/8 Rust host tests"
cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml

echo "Release checks passed. Next: inspect the diff, tag vX.Y.Z, push the tag, then verify the Desktop builds release assets."
