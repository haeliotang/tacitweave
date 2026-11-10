#!/bin/sh
# SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
# SPDX-License-Identifier: AGPL-3.0-or-later
# Sign (and optionally notarize) the built macOS app.
#
# Required:
#   APPLE_SIGNING_IDENTITY="Developer ID Application: ... (TEAMID)"
# Optional notarization (Apple ID flow):
#   APPLE_ID, APPLE_PASSWORD (app-specific password), APPLE_TEAM_ID
# The identity must already exist in the current keychain.
set -eu
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP="${1:-$ROOT/apps/desktop/src-tauri/target/release/bundle/macos/Tacitweave.app}"
ENTITLEMENTS="$ROOT/apps/desktop/src-tauri/Entitlements.plist"
IDENTITY="${APPLE_SIGNING_IDENTITY:?APPLE_SIGNING_IDENTITY is required}"
[ -d "$APP" ] || { echo "app bundle missing: $APP" >&2; exit 1; }

codesign --force --deep --options runtime --entitlements "$ENTITLEMENTS" --sign "$IDENTITY" "$APP"
codesign --verify --deep --strict --verbose=2 "$APP"

if [ -n "${APPLE_ID:-}" ] && [ -n "${APPLE_PASSWORD:-}" ] && [ -n "${APPLE_TEAM_ID:-}" ]; then
  TMP_ZIP="$(mktemp -t tacitweave-notarize).zip"
  trap 'rm -f "$TMP_ZIP"' EXIT
  ditto -c -k --sequesterRsrc --keepParent "$APP" "$TMP_ZIP"
  xcrun notarytool submit "$TMP_ZIP" --apple-id "$APPLE_ID" --password "$APPLE_PASSWORD" --team-id "$APPLE_TEAM_ID" --wait
  xcrun stapler staple "$APP"
  xcrun stapler validate "$APP"
  echo "notarized and stapled: $APP"
else
  echo "signed without notarization (APPLE_ID/APPLE_PASSWORD/APPLE_TEAM_ID not all set)"
fi

VERSION=$(node -p "require('$ROOT/apps/desktop/src-tauri/tauri.conf.json').version")
ARCH=$(uname -m)
OUT="$ROOT/dist/release"
mkdir -p "$OUT"
ZIP="$OUT/Tacitweave-v${VERSION}-macos-${ARCH}.zip"
ditto -c -k --sequesterRsrc --keepParent "$APP" "$ZIP"
(cd "$OUT" && shasum -a 256 "$(basename "$ZIP")" > "Tacitweave-v${VERSION}-macos-${ARCH}.sha256")
echo "wrote $ZIP"
