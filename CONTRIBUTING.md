<!--
SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
SPDX-License-Identifier: CC-BY-4.0
-->

# Contributing to Tacitweave

Tacitweave is currently maintained by Inceptless. External contributions are
welcome only after the contributor has signed the Inceptless Contributor
License Agreement (CLA).

## Contributor licence agreement

Every contribution must be made under the [Inceptless CLA](CLA.md). Signing
once covers every open-source project initiated by Inceptless that refers to
the same agreement.

- Sign the CLA at https://cla-assistant.io/haeliotang/tacitweave.
- Pull requests are merged only after the CLA check (`license/cla`) passes.
- Do not add `Signed-off-by` lines as a substitute for the CLA.
- If you are contributing on behalf of an employer or another legal entity,
  follow the entity-signing process in the CLA.

## Before opening a pull request

1. Sign the CLA through the link above before opening a pull request.
2. Keep the change focused and describe the user-visible effect.
3. Run the relevant local checks.
4. Update documentation when behaviour or licensing changes.
5. Disclose third-party material and its licence in the pull request.

## Licensing of contributions

Unless a file or path says otherwise:

- application, runtime, build and operations code is `AGPL-3.0-or-later`;
- the example data fixture `docs/evaluation/experiment-log.example.json` is
  `Apache-2.0` (the only Apache-2.0 file currently);
- documentation is `CC-BY-4.0`;
- brand assets are `LicenseRef-Inceptless-Brand`.

See [LICENSING.md](LICENSING.md) and [CLA.md](CLA.md).

## Local checks

```bash
pnpm install --frozen-lockfile
pnpm test
pnpm build
pnpm sil:test
pnpm lsm0:precision --replicates 50 --bootstrap 50
PLAYWRIGHT_BROWSERS_PATH=/tmp/playwright-browsers pnpm e2e
cargo test --manifest-path rust/Cargo.toml --locked
cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml --locked
```

Use the task-specific temporary directory from the maintainer instructions for
local experiments; do not commit generated artifacts.
