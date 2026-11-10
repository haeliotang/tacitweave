#!/bin/sh
# SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
# SPDX-License-Identifier: AGPL-3.0-or-later
# Build, strip, ad-hoc sign and zip the macOS app for local distribution.
# This is still NOT a Developer ID signature or notarization.
set -eu
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/apps/desktop"
CARGO_PROFILE_RELEASE_STRIP=none ../../node_modules/.bin/tauri build --bundles app
APP="$ROOT/apps/desktop/src-tauri/target/release/bundle/macos/Tacitweave.app"
[ -d "$APP" ] || { echo "app bundle missing" >&2; exit 1; }
EXEC="$APP/Contents/MacOS/tacitweave-desktop"
strip -x "$EXEC"
if [ -n "${APPLE_SIGNING_IDENTITY:-}" ]; then
  sh "$ROOT/scripts/sign-macos-app.sh" "$APP"
  exit $?
fi
codesign --force --deep --sign - --entitlements "$ROOT/apps/desktop/src-tauri/Entitlements.plist" "$APP"
VERSION=$(node -p "require('$ROOT/apps/desktop/src-tauri/tauri.conf.json').version")
ARCH=$(uname -m)
OUT="$ROOT/dist/release"
mkdir -p "$OUT"
ZIP="$OUT/Tacitweave-v${VERSION}-macos-${ARCH}.zip"
ditto -c -k --sequesterRsrc --keepParent "$APP" "$ZIP"
(cd "$OUT" && shasum -a 256 "$(basename "$ZIP")" > "Tacitweave-v${VERSION}-macos-${ARCH}.sha256")
echo "Built $ZIP"
ls -lh "$APP" "$ZIP"
