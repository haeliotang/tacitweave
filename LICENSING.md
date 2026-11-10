<!--
SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
SPDX-License-Identifier: CC-BY-4.0
-->

# Licensing

Tacitweave uses a layered license model. The application, runtime and
operations code are copyleft; the contract surface remains permissive so that
other implementations can interoperate without adopting this codebase.

## Layers

| Path / component | SPDX license | Reason |
| --- | --- | --- |
| `src/` (except contract-only fixtures), `apps/desktop/`, `rust/`, `deploy/`, `scripts/`, `index.html`, frontend build configuration | `AGPL-3.0-or-later` | Application and runtime code; default for anything not clearly contract-only. |
| `e2e/`, `playwright.config.ts` | `AGPL-3.0-or-later` | Application-specific UI tests, not an independent contract/conformance suite. |
| `docs/evaluation/experiment-log.example.json` | `Apache-2.0` | Example data fixture intended for independent implementation and tooling. |
| `docs/`, `README.md`, `README.zh-CN.md`, `LICENSING.md` | `CC-BY-4.0` | Prose documentation and design material. |
| `LICENSES/` | license texts; not separately licensed | Required verbatim legal texts. |
| `CLA.md` | `CC-BY-4.0` (verbatim legal text; see note) | Must remain byte-for-byte the supplied CLA. |
| `apps/desktop/src-tauri/icons/`, project name/logo, Inceptless marks | `LicenseRef-Inceptless-Brand` | Brand assets are not granted with the code license. |
| Third-party vendored code/assets | their own licenses | Keep upstream terms and notices. |

If a file is ambiguous, it is treated as `AGPL-3.0-or-later` until reviewed.

## License history

| Version / tag | Commit or build basis | License |
| --- | --- | --- |
| `v0.1.0` | tag `v0.1.0` | Apache-2.0 |
| `v0.1.1` | tag `v0.1.1` | Apache-2.0 |
| `v0.1.2` | tag `v0.1.2` | Apache-2.0 |
| `0.1.3` | packaged but untagged/unreleased; bundle mtime 2026-11-07 17:18:27; inferred from `2fec794` or an uncommitted worktree above it | Apache-2.0 |
| Future releases from this branch | `license/agpl-split` licensing change commit | layered AGPL-3.0-or-later / Apache-2.0 / CC-BY-4.0 / brand |

`0.1.3` is intentionally not assigned a new license here. Inceptless will
decide whether to publish the existing Apache-2.0 package or rebuild an AGPL
package from the new branch.

## Dual licensing

Inceptless may offer the application under other terms, including a commercial
license. For terms other than AGPL-3.0-or-later, contact
[support@inceptless.com](mailto:support@inceptless.com).

## Brand assets

The Tacitweave name, project logo, project icon and Inceptless marks are
excluded from the open-source licenses. They may be used to refer to this
project, but not to imply official status, sponsorship or endorsement.
Questions: support@inceptless.com.

## Contributor terms

Contributions require the Inceptless Contributor License Agreement (CLA 1.0).
Sign at https://cla-assistant.io/haeliotang/tacitweave. Pull requests are merged
only after the CLA check (`license/cla`) passes. See [CLA.md](CLA.md) and
[CONTRIBUTING.md](CONTRIBUTING.md).
