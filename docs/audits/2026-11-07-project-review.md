<!--
SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
SPDX-License-Identifier: CC-BY-4.0
-->
# Project review — 2026-11-07

Scope: Tacitweave at `5265b28` + handoff commit `43a70c0`; remediation applied 2026-11-07, workspace `/Users/hao/Documents/tacitweave`.
This is an engineering/security/release review, not a clinical or legal audit. The original review made no code changes; remediation status is recorded below.

## Health baseline

- Vitest: 176 passed (after remediation)
- Playwright: 24 passed (after remediation)
- Rust ops: 10 passed
- Rust desktop: 8 passed (after remediation)
- Production build after remediation: passes; main bundle 312,022 B (budget 320,000 B)
- `pnpm audit`: no known vulnerabilities after remediation
- `v0.1.3`: no tag, no release (intentional)
- Git working tree: clean at review start

The happy-path suite is healthy. The findings below are mostly in **trust boundaries, release automation, migration/cleanup and error paths** — exactly the places ordinary UI tests do not cover.

## Remediation status (2026-11-07)

The first three requested fixes are now implemented:

- **Dependency advisories**: `vite` 7.3.7, `vitest` 4.1.12, `source-map-js` 1.2.2; `tinypool` critical path removed. `pnpm audit --audit-level high` reports no known vulnerabilities. CI and `release:check` now run the audit.
- **macOS release workflow**: version check, `codesign`/`stapler`/`spctl` publication gate, and post-upload `SHA256SUMS.txt` regeneration/verification added.
- **Sandbox wording**: the claim is now “app-data-only file API (not an OS sandbox)”; UI/docs updated. Local file commands reject symlinks and have a Rust regression test. This is still not an OS sandbox.
- **Data lifecycle**: secure_delete + VACUUM on clear/encryption purge; clear removes legacy keys, local-files and old app-data dirs; encrypted payloads without a lock record get a recovery lock screen.
- **Release gate**: tag/signed workflows now call the CI workflow via `workflow_call`; tag builds require verify (unit, audit, E2E, desktop Rust).
- **English errors**: scene/back/empty/capture error paths now use translation keys; E2E covers the English scene toolbar.

Remaining findings below are not fixed by this pass.

## Findings

### P1 — Critical dev-toolchain advisories are unpatched (fixed)

Evidence:

- `pnpm list`: `vite@7.3.6`, `source-map-js@1.2.1`, `tinypool@1.1.1`, `vitest@3.2.7`
- `pnpm audit` reports:
  - **critical** `tinypool` prototype-pollution → RCE advisories
  - **high** `vite` 7.0.0–7.3.6 advisories
  - **high** `source-map-js` <1.2.2 event-loop DoS
  - moderate `vitest` / `@vitest/mocker` advisories

Impact: not shipped in the production bundle, but the dev server, tests and CI run this toolchain. A malicious test/PR or a compromised dev dependency can execute code in the developer/CI environment and reach repository tokens.

Fix: patch `vite` to >=7.3.7, override/patch `source-map-js` >=1.2.2 and `tinypool` >=2.1.2 (or upgrade Vitest to a patched major), then run `pnpm audit` in CI. Do not just update the lockfile without running tests.

### P1 — macOS signed workflow can publish a release with stale checksums and no version check (fixed)

Evidence:

- `.github/workflows/macos-signed.yml:102-109` uploads `dist/release/*.zip` directly to an existing release.
- It never runs `scripts/check-release-version.mjs`, and never regenerates `SHA256SUMS.txt`.
- `.github/workflows/desktop-build.yml:195-219` generates checksums only for Linux/Windows artifacts before upload.

Impact: a signed macOS zip can be attached to `v0.1.2` while `SHA256SUMS.txt` does not cover it; or a build from `main` can be attached to an unrelated tag. This defeats the release-integrity promise.

Fix: require tag/version match, upload the signed zip, regenerate `SHA256SUMS` from all release assets, upload the new sums, verify with `sha256sum -c`, and run `spctl --assess`/`stapler validate` in the workflow.

### P1 — The “app-data file sandbox” claim is stronger than the implementation (fixed)

Evidence:

- At review time, `apps/desktop/src-tauri/src/lib.rs:148-169` was a filename filter; `host_info` reported `sandbox: "app-data-only"`. It now reports `app-data-api-only` and rejects symlinks.
- `README.md:129,191` describes an “app-data file sandbox”.
- The macOS bundle has no App Sandbox entitlement; `Entitlements.plist` only grants JIT/unsigned-executable-memory.

Impact: the renderer's registered file commands are app-data-only by application logic, but the process is not OS-sandboxed. Users and reviewers may interpret “sandboxed” as an OS guarantee that does not exist.

Fix: rename to “app-data-only file API” or “application-level path restriction” in UI/docs; add App Sandbox only if the product is ready to accept its consequences; review whether both entitlements are needed.

### P1 — Enabling the app lock does not securely erase plaintext SQLite pages (fixed; residual risk documented)

Evidence:

- `write_encrypted_state` deletes plaintext rows and stores `encrypted` (`lib.rs`, around the `write_encrypted_state` function).
- `clear_local_state` only executes `DELETE FROM local_state` (`lib.rs:208-213`).
- No `PRAGMA secure_delete`, no `VACUUM`, no WAL checkpoint.
- The SQLite database is plaintext while the lock is off; enabling the lock changes rows but can leave old content in freelist/WAL pages.

Impact: “AES-GCM encrypted snapshot; plaintext keys removed” is logically true at the row level, but not a forensic-erasure guarantee. A local attacker with the file may recover residual plaintext.

Fix: set `PRAGMA secure_delete=ON` for sensitive DBs; `VACUUM` after enabling encryption/clearing; checkpoint/replace WAL; document that this is not forensic secure erase; consider SQLCipher if the threat model requires at-rest encryption of the whole DB.

### P1 — Old encrypted app data can become inaccessible after the bundle-ID rename (fixed with recovery lock)

Evidence:

- `migrate_legacy_app_data` copies the old `familiweave.db`/WAL and `local-files` (`lib.rs:350-390`).
- The app-lock verifier lives in WebView localStorage (`tacitweave.app-lock.v1`), not in that DB.
- `storage-migration.ts` migrates `familiweave.*` only in the **current** WebView localStorage; the old app's WebView storage lives under the old app-data directory and is not copied.
- On the new app, if the copied DB contains only an `encrypted` row and no lock record, `loadLocalSnapshot` returns an empty snapshot and `saveLocalSnapshot` refuses plaintext writes.

Impact: a user who had app lock enabled in the old Familiweave app may launch Tacitweave and see empty data, with no lock screen, while the encrypted payload is still present. This is a data-loss/lockout UX failure.

Fix: migrate the lock verifier metadata into SQLite (or a sidecar file) before/with the DB, or detect an `encrypted` payload without a local lock record and show a “restore old lock” flow. Add a test with an encrypted old DB + no WebView storage.

### P1 — “Delete all local data” is not a clean-slate deletion (fixed)

Evidence:

- `clearAll` clears new `tacitweave.*` keys and calls `clearLocalSnapshot`.
- `clearLocalSnapshot` removes new keys and calls `clear_local_state` (`src/local-store.ts:219-227`).
- `clear_local_state` deletes rows only; it does not delete `local-files` (`lib.rs:208-213`).
- `storage-migration.ts:29-38` copies legacy `familiweave.*` keys but never removes them.
- Old app-data directories are copied but not removed by migration.
- The app-lock record is not removed by `clearAll`; only “forgot PIN”/disable lock removes it.

Impact: users can delete all data and still leave legacy plaintext keys, exported local files, old DB copies and possibly an enabled app lock. This contradicts the UI text “删除本机全部数据”.

Fix: define deletion scope; add a host command to remove `local-files` and legacy local data (or document it), remove legacy keys after verified migration, clean old app-data directories after a successful copy, and decide whether “delete all” should also disable app lock.

### P1 — Release/CI is not a gate (fixed)

Evidence:

- At review time, `.github/workflows/ci.yml` ran unit/build and Chromium E2E; it now runs audit and includes a desktop Rust job, and tag workflows call it.
- `.github/workflows/rust.yml` runs only `rust/Cargo.toml`; the **desktop** Rust tests are not in CI.
- Tag-triggered `Desktop builds` builds bundles without running the test/audit workflow.
- `macos-signed.yml` has no version check and no checksum regeneration.

Impact: a tag can publish artifacts even when tests, dependency audit or desktop Rust checks fail. `release:check` exists but is manual and does not run audit.

Fix: make tag workflows depend on a shared verify job; run `pnpm audit`, desktop Rust tests, `check:symbolic-path`, E2E and version guard before build/publish. Add `workflow_run`/reusable workflow or a single release workflow.

### P2 — English-first is not enforced on error and fallback paths (fixed for scene/back/capture/empty paths)

Evidence (examples):

- `src/desktop-shell.tsx:506`: hardcoded `← 返回工作台` in the scene toolbar.
- `src/desktop-shell.tsx:518`: hardcoded empty-state text.
- `src/scene-loader.tsx:10-23`: hardcoded Chinese scene errors.
- `src/symbolic-renderer.tsx:9-11,56`: hardcoded Chinese validation errors.
- `src/capture.ts:38-40`, `src/world-renderers.tsx:10,18`, `src/motif-journal.ts:108`, `src/relationship.ts:85`, `src/device-signal-panel.tsx:59`.
- `e2e/i18n.spec.ts` only checks normal shell/capture/lab views; it does not open a scene or trigger errors.

Impact: English users see Chinese in failure paths and in the scene back button; the “English-first” claim is only true on the happy path.

Fix: return stable error codes from validators and map them through `t`; add keys for scene/error/empty states; extend i18n E2E to scene entry/leave, empty data, invalid renderer and validation errors.

### P2 — App lock is a UI lock with a weak offline PIN

- Minimum PIN is 4 digits, PBKDF2-HMAC-SHA256 120k (`src/app-lock.ts`).
- Lockout is stored in localStorage and can be cleared by the same local user; it is not a system boundary.
- Docs correctly say “not system lock”, but “encrypted snapshot” can be over-read as strong at-rest protection.

Impact: a 4-digit PIN is brute-forceable offline by an attacker who copies the encrypted DB; app lock is best treated as casual privacy, not data protection.

Fix: require a longer PIN/passphrase or an OS keychain/biometric unlock; raise PBKDF2/Argon2 parameters; state the threat model next to the feature.

### P2 — Local file API still follows symlinks (fixed)

- `sandbox_file_name` blocks `..`, slashes and hidden names, but `read_local_text`/`write_local_text` use `fs::read_to_string`/`fs::write` on a joined path.
- A symlink inside `local-files` can escape the directory.

Impact: local-only, requires a symlink already placed by the same user; still breaks the “app-data-only” claim and is a useful hardening target.

Fix: use `symlink_metadata`, reject symlinks, canonicalize and verify the resolved path remains under `local-files`.

### P2 — Entitlements are broader than necessary

- `Entitlements.plist` grants `com.apple.security.cs.allow-jit` and `com.apple.security.cs.allow-unsigned-executable-memory`.
- The first is commonly needed by WebKit; the second should be justified and, if not required, removed.

Impact: weaker hardened-runtime posture for a local mental-health-adjacent app.

Fix: verify which entitlements WebKit/Tauri requires on the supported macOS versions; remove the rest; document why each remains.

### P2 — Safety/consent gaps for a vulnerable-user prototype

- README/docs mention seeking real support in acute distress.
- There is no in-app crisis card, local emergency resource, or “stop and seek support” flow beyond the safety copy.
- Formal research consent is explicitly not started (`docs/research/consent-and-withdrawal.md`).

Impact: not necessarily a blocker for a local prototype, but it is a serious gap before any public/participant release.

Fix: add an in-app safety/exit card with region-neutral guidance and user-configured emergency contact; do not hardcode clinical claims; complete consent/ethics before research collection.

### P3 — Documentation drift after the rename

- `docs/desktop-shell.md` still says 51 tests/4 Rust tests and omits newer data keys.
- `docs/research/data-schema-v2.md` SQLite table omits `symbolic_sessions`.
- `docs/SESSION_HANDOFF.md` still contains the old local path in its instructions (historical, but potentially confusing).
- `docs/research/naming-decision.md` line “GitHub repo tacitweave → tacitweave” is a rename typo.
- `README` intentionally keeps old release asset names and “former Familiweave” history.

Impact: low individually, but docs are the project's external memory; drift becomes trust debt.

Fix: add a docs consistency pass and a release checklist item that updates test counts/schema keys/names; keep historical references explicitly marked.

### P3 — Repository/security hygiene

- No `SECURITY.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, issue templates, `CODEOWNERS`, or Dependabot config.
- GitHub Actions are referenced by tags (`@v4`, `@v2`), not commit SHAs.
- No `rust-toolchain.toml` / Node `engines` pin; CI Node 22 vs local Node 24.
- No linter/formatter script; no coverage threshold.

Impact: supply-chain and maintainability risk; not a product bug.

Fix: add security policy and Dependabot; pin actions; add `rust-toolchain.toml`, `engines`, lint/format check; consider `cargo audit`/`cargo deny`.

## Unknown unknowns: the categories, not just the bugs

1. **“Sandbox” was a policy claim, not an OS boundary.**  
   The filename filter is not a sandbox; any future file command or symlink can break the assumption.

2. **Deletion was treated as a logical operation, not a data-lifecycle operation.**  
   SQLite pages, WAL, legacy keys, old app-data directories and exported files form a multi-store lifecycle. The UI treats deletion as one operation.

3. **Release automation was treated as a build script, not as a controlled pipeline.**  
   Signing is separate from checksums/version validation; a signed asset can bypass the release integrity story.

4. **Migration is not transactional across SQLite, WebView localStorage, files and encryption metadata.**  
   The rename exposed this: DB copy works, but lock verifier/legacy keys/old files are separate stores.

5. **English-first was tested on normal paths, not failure paths.**  
   Error strings are often written at the point of failure, bypassing i18n.

6. **The dev toolchain is part of the attack surface.**  
   Vite/Vitest/tinypool advisories do not ship in the app bundle, but they run in the developer/CI environment with repository credentials.

7. **Docs drift because tests do not assert docs.**  
   Test counts and schema keys are manually maintained; rename touched 90+ files and still left stale docs.

8. **Research claims and engineering claims are not linked by a release gate.**  
   LSM-0 is descriptive, BCI is not hardware-validated, and signing is incomplete; the release process should make those statements impossible to accidentally overstate.

## Recommended order

### Before any v0.1.3 tag

1. Patch/override vulnerable build/test dependencies and add `pnpm audit` to CI.
2. Make tag builds depend on a full verify job (unit, E2E, desktop Rust, audit, version guard).
3. Fix macOS signed workflow: version guard, checksum regeneration, `spctl`/notary verification.
4. Define deletion scope and implement cleanup of legacy keys, old dirs, `local-files`, and app-lock metadata.
5. Add encrypted-old-data migration test and a recovery path.
6. Fix i18n error/fallback paths.
7. Correct the “sandbox” wording and review entitlements/symlink handling.
8. Update stale docs and add SECURITY/Dependabot/action pinning.

### After the tag

- Windows/Linux manual QA.
- Real BCI hardware validation.
- Capture-media producer.
- Ethics/consent and real LSM-0 data.
- Signed/notarized distribution when credentials are available.

## Do not claim

- Do not call the app “sandboxed” until there is an OS sandbox.
- Do not call v0.1.3 “signed” until both platforms are actually signed/verified.
- Do not call deletion “secure erase” without `secure_delete`/vacuum/whole-disk encryption evidence.
- Do not treat `pnpm audit` clean as proof the app is secure; it only covers known advisories in resolved dependencies.
