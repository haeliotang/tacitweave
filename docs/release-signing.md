<!--
SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
SPDX-License-Identifier: CC-BY-4.0
-->
# Release signing and notarization

日期：2026-11-06，更新 2026-11-07。状态：本机可用 Developer ID 签名，但公证凭据尚未配置；Windows 证书尚未配置；v0.1.2 已以未签名 Linux/Windows 资产发布（资产名仍为 Familiweave）；v0.1.3（Tacitweave 改名版）暂不发布，等 macOS 公证与 Windows 签名就绪后再发签名版。逐步操作见 [signing-setup.md](signing-setup.md) 和 [macOS signed workflow](../.github/workflows/macos-signed.yml)。

## 当前产物

- v0.1.2 Release：Linux AppImage/DEB + Windows NSIS，均未签名；没有 macOS 资产
- v0.1.3：已通过完整本地验证，但按 2026-11-07 的决定暂不打 tag / 发布
- 本机 macOS 构建仍为 ad-hoc 签名，**未公证**

Gatekeeper / SmartScreen 会警告。v0.1.1 Release 是未签名归档；v0.1.3 应在 macOS 公证和 Windows 签名都通过后再发布。

## macOS Developer ID

需要：

- Apple Developer Program
- Developer ID Application 证书
- 公证账号或 App Store Connect API key

Tauri 构建所需环境变量（按 CI secret 注入）：

```sh
APPLE_CERTIFICATE
APPLE_CERTIFICATE_PASSWORD
APPLE_SIGNING_IDENTITY
APPLE_ID
APPLE_PASSWORD
APPLE_TEAM_ID
# 或 APPLE_API_ISSUER / APPLE_API_KEY / APPLE_API_KEY_PATH
```

之后：

```sh
APPLE_SIGNING_IDENTITY="Developer ID Application: ..." sh scripts/package-macos.sh
codesign --verify --deep --strict --verbose=2 Tacitweave.app
spctl --assess --type execute --verbose Tacitweave.app
```

`.github/workflows/macos-signed.yml` 可在配置 secrets 后手动跑签名/公证并上传 artifact；默认不发布 Release。

公证与装订使用 `notarytool` / `stapler`；发布前在干净 macOS 用户环境复验。

## Windows

- 需要代码签名证书（EV 或普通 Authenticode）
- `Desktop builds` 已加入可选的 Windows PFX 导入 + NSIS `signtool` 签名步骤；没有 `WINDOWS_CERTIFICATE` 时保持未签名
- 未签名前，Release 必须保留 SmartScreen 警告说明

## Linux

- AppImage/DEB 目前未签名
- 可增加 minisign/GPG 校验与仓库签名；在完成前依赖 SHA256SUMS 与 GitHub Release 的传输安全

## 自动化边界

`Desktop builds` workflow 会生成 `SHA256SUMS.txt` 并附加到 tag Release；`macos-signed.yml` 负责 Developer ID 签名/公证 artifact；Windows 签名步骤由 `desktop-build.yml` 的可选 secret 驱动。没有凭据时不会伪造签名。
