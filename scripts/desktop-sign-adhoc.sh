#!/bin/sh
# SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
# SPDX-License-Identifier: AGPL-3.0-or-later
# Local ad-hoc signing only; this does NOT notarize the app and is not suitable
# for distribution. Use a Developer ID identity + notarytool for real releases.
set -eu
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP="$ROOT/apps/desktop/src-tauri/target/release/bundle/macos/Tacitweave.app"
ENTITLEMENTS="$ROOT/apps/desktop/src-tauri/Entitlements.plist"
[ -d "$APP" ] || { echo "Build the app first: pnpm tauri:build --bundles app" >&2; exit 1; }
codesign --force --deep --sign - --entitlements "$ENTITLEMENTS" "$APP"
codesign -d --entitlements :- "$APP" 2>&1 | tail -n +2
echo "Ad-hoc signature applied. This app is still not notarized."
