<!--
SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
SPDX-License-Identifier: CC-BY-4.0
-->
# Signing setup: Apple and Windows

日期：2026-11-04。本文是操作指南，不包含任何证书或私钥。

> **不要把 `.p12` / `.pfx` / 私钥 / 密码提交到仓库或粘贴到聊天。** 只通过 GitHub Actions Secrets 或受保护的 release environment 提供。本仓库的 `.gitignore` 已阻止常见证书扩展名，但这只是防误提交，不是加密。

官方参考：

- [Tauri macOS code signing](https://tauri.app/distribute/sign/macos/)
- [Tauri Windows code signing](https://tauri.app/distribute/sign/windows/)
- [GitHub encrypted secrets](https://docs.github.com/en/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions)

## 1. 先确认你有哪些东西

### macOS

需要：

- 付费 Apple Developer Program 账号
- **Developer ID Application** 证书（不是 Apple Development / iOS Distribution）
- 证书对应的私钥（导出为 `.p12`）
- Apple ID 的 app-specific password，或 App Store Connect API key
- Team ID（10 位）

免费账号不能公证，只能本机测试。

### Windows

需要：

- 代码签名证书（OV 或 EV；SSL 证书不能用）
- 证书私钥可导出的 `.pfx`，或证书厂商提供的云签名/HSM 流程
- 证书指纹（thumbprint）
- 时间戳服务 URL

2023 年 6 月后很多 OV/EV 证书默认使用硬件 token 或云签名，不再直接给 `.pfx`。如果你的证书属于这种情况，请使用证书厂商的签名工具；Tauri 的 `signCommand` 也可以接入。

## 2. 在 macOS 上创建并导出证书

1. 在“钥匙串访问 → 证书助理”生成 CSR。
2. 登录 [Apple Developer Certificates](https://developer.apple.com/account/resources/certificates/list)，创建 **Developer ID Application**，上传 CSR。
3. 下载 `.cer` 并双击安装到 **login** 钥匙串。
4. 在“钥匙串访问 → 我的证书”中展开证书，右键私钥 → **Export**，导出 `.p12`，设置一个强密码。
5. 确认 identity：

```sh
security find-identity -v -p codesigning
```

会显示类似：

```text
Developer ID Application: Your Name (TEAMID)
```

把它保存为 `APPLE_SIGNING_IDENTITY`。

## 3. 把 macOS 证书放入 GitHub Secrets

在仓库 **Settings → Secrets and variables → Actions → New repository secret** 添加：

| Secret | 内容 |
| --- | --- |
| `APPLE_CERTIFICATE` | `.p12` 的 base64 文本（单行） |
| `APPLE_CERTIFICATE_PASSWORD` | 导出 `.p12` 时设置的密码 |
| `APPLE_SIGNING_IDENTITY` | `Developer ID Application: ... (TEAMID)` |
| `APPLE_ID` | Apple ID 邮箱 |
| `APPLE_PASSWORD` | Apple ID 的 **app-specific password**，不是主密码 |
| `APPLE_TEAM_ID` | 10 位 Team ID |
| `KEYCHAIN_PASSWORD` | CI 临时 keychain 的随机密码，不是 Apple 密码 |

生成 base64：

```sh
openssl base64 -A -in certificate.p12 -out certificate-base64.txt
```

使用 GitHub CLI 设置（在本地安全终端执行）：

```sh
gh secret set APPLE_CERTIFICATE < certificate-base64.txt
gh secret set APPLE_CERTIFICATE_PASSWORD --body 'P12_EXPORT_PASSWORD'
gh secret set APPLE_SIGNING_IDENTITY --body 'Developer ID Application: Your Name (TEAMID)'
gh secret set APPLE_ID --body 'you@example.com'
gh secret set APPLE_PASSWORD --body 'APP_SPECIFIC_PASSWORD'
gh secret set APPLE_TEAM_ID --body 'TEAMID'
gh secret set KEYCHAIN_PASSWORD --body 'RANDOM_KEYCHAIN_PASSWORD'
```

删除本地 base64 临时文件；不要提交。

### App Store Connect API key 替代方案

如果不想用 Apple ID 密码，可以在 App Store Connect 创建 API key，然后使用：

- `APPLE_API_ISSUER`
- `APPLE_API_KEY`
- `APPLE_API_KEY_PATH`

把 `.p8` 作为 secret 内容在 CI 临时写入文件，再把路径赋给 `APPLE_API_KEY_PATH`。具体变量名以当前 Tauri 版本为准；参考官方 macOS 文档。

## 4. macOS CI 需要做什么

Tauri 只会在 keychain 中已有证书、且设置了身份/公证变量时签名。GitHub Actions 的 macOS runner 是干净环境，需要先导入证书：

```yaml
- name: Import Apple certificate
  env:
    APPLE_CERTIFICATE: ${{ secrets.APPLE_CERTIFICATE }}
    APPLE_CERTIFICATE_PASSWORD: ${{ secrets.APPLE_CERTIFICATE_PASSWORD }}
    KEYCHAIN_PASSWORD: ${{ secrets.KEYCHAIN_PASSWORD }}
  run: |
    echo "$APPLE_CERTIFICATE" | base64 --decode > certificate.p12
    security create-keychain -p "$KEYCHAIN_PASSWORD" build.keychain
    security default-keychain -s build.keychain
    security unlock-keychain -p "$KEYCHAIN_PASSWORD" build.keychain
    security set-keychain-settings -t 3600 -u build.keychain
    security import certificate.p12 -k build.keychain \
      -P "$APPLE_CERTIFICATE_PASSWORD" -T /usr/bin/codesign
    security set-key-partition-list -S apple-tool:,apple:,codesign: \
      -s -k "$KEYCHAIN_PASSWORD" build.keychain
    security find-identity -v -p codesigning build.keychain
    rm certificate.p12

- name: Build macOS
  env:
    APPLE_SIGNING_IDENTITY: ${{ secrets.APPLE_SIGNING_IDENTITY }}
    APPLE_ID: ${{ secrets.APPLE_ID }}
    APPLE_PASSWORD: ${{ secrets.APPLE_PASSWORD }}
    APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
  run: cd apps/desktop && ../../node_modules/.bin/tauri build --bundles app
```

当前仓库的 `Desktop builds` matrix 只有 Linux/Windows；要发布签名 macOS 包，需要再加一个 `macos-latest` job，并把签名后的 `.app`/zip 附加到 Release。

### 验证 macOS 产物

```sh
codesign --verify --deep --strict --verbose=2 Tacitweave.app
spctl --assess --type execute --verbose Tacitweave.app
xcrun notarytool log <submission-id> ...
xcrun stapler validate Tacitweave.app
```

Tauri 在检测到 Apple 公证变量时会提交公证；最终必须看到 `spctl` accepted，而不是 ad-hoc 的 rejected。

## 5. Windows 证书与 Secrets

如果是传统 `.pfx`：

1. 用 `openssl pkcs12 -export` 或证书厂商工具生成 `.pfx`。
2. 在 Windows 上导入到 `Cert:\CurrentUser\My`。
3. 从证书详情读取 **Thumbprint** 和签名算法（通常 `sha256`）。
4. 生成 base64：

```powershell
certutil -encode certificate.pfx base64cert.txt
```

GitHub Secrets：

| Secret | 内容 |
| --- | --- |
| `WINDOWS_CERTIFICATE` | `.pfx` 的 base64 单行文本 |
| `WINDOWS_CERTIFICATE_PASSWORD` | `.pfx` 密码 |
| `WINDOWS_CERTIFICATE_THUMBPRINT` | 证书指纹（可选，但便于配置） |

```sh
gh secret set WINDOWS_CERTIFICATE < base64cert.txt
gh secret set WINDOWS_CERTIFICATE_PASSWORD --body 'PFX_PASSWORD'
gh secret set WINDOWS_CERTIFICATE_THUMBPRINT --body 'A1B1...'
```

在 Windows runner 中导入：

```powershell
$pfx = [Convert]::FromBase64String($env:WINDOWS_CERTIFICATE)
[IO.File]::WriteAllBytes("$env:RUNNER_TEMP\certificate.pfx", $pfx)
Import-PfxCertificate -FilePath "$env:RUNNER_TEMP\certificate.pfx" `
  -CertStoreLocation Cert:\CurrentUser\My `
  -Password (ConvertTo-SecureString $env:WINDOWS_CERTIFICATE_PASSWORD -AsPlainText -Force)
```

Tauri 配置中启用（示例）：

```json
"bundle": {
  "windows": {
    "certificateThumbprint": "YOUR_CERT_THUMBPRINT",
    "digestAlgorithm": "sha256",
    "timestampUrl": "http://timestamp.digicert.com"
  }
}
```

如果不想把 thumbprint 写进仓库，可在 CI 用 `--config` 临时 JSON 覆盖，或使用证书厂商的 `signCommand`。

### 验证 Windows 产物

```powershell
signtool verify /pa /v Tacitweave_0.1.3_x64-setup.exe
```

## 6. 不要在聊天或仓库里发这些内容

- `.p12` / `.pfx` 文件
- 私钥、证书密码、app-specific password
- App Store Connect `.p8`
- 临时 keychain 密码

如果不小心泄露：

1. 立即在 Apple Developer / 证书厂商处吊销证书。
2. 重新生成证书和 secrets。
3. 重新签名并发布；旧产物视为不可信。

## 7. 自动更新是另一套密钥

Tauri updater 使用独立的 updater 签名密钥（通常 minisign），与 Apple/Windows 代码签名不同：

- Apple/Windows 证书用于“这个安装包来自谁、是否被篡改”。
- updater 密钥用于“这个更新包是否由项目发布者签名”。

不要复用同一份私钥。自动更新还需要一个稳定的更新 endpoint、版本清单和回滚策略。当前项目尚未启用 updater；在配置前应先确定更新托管位置和密钥保管方式。

## 8. 本仓库当前状态

- v0.1.2 签名流程已准备；本机 Developer ID 签名可用，公证凭据尚未配置。
- v0.1.1 的 macOS 包是 ad-hoc、未公证。
- Windows/Linux 包未签名。
- 没有任何证书或 secrets 被提交。
- 配置好上述 secrets 后：macOS 使用 `macos-signed.yml`；Windows 使用 `desktop-build.yml` 的可选签名步骤。未配置时不会生成签名资产。
