<!--
SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
SPDX-License-Identifier: CC-BY-4.0
-->
# Release process

日期：2026-11-04。适用于 `vX.Y.Z` 标签。

## 1. 版本与内容

1. 确认 `apps/desktop/src-tauri/tauri.conf.json` 的 `version` 与目标版本一致（当前 `0.1.3`）。
2. 确认 README 的已知限制/签名状态与产物一致。
3. 确认没有把证书、私钥、`.env`、`.local-assets` 或本机路径提交。

## 2. 本地发布检查

```sh
pnpm e2e:install   # 首次
pnpm release:check
sh scripts/desktop-sign-adhoc.sh   # 仅本机 ad-hoc，不是正式签名
sh scripts/package-macos.sh        # macOS 构建 + strip + ad-hoc + zip
```

`release:check` 会运行：

- Vitest 单元/集成测试
- 生产构建
- 主包 budget / scene 分包检查
- Playwright E2E
- Rust 宿主测试

## 3. 版本标签

```sh
git status --short          # 必须为空
git log -1
git tag -a v0.1.3 -m "Tacitweave v0.1.3"
git push origin v0.1.3
```

标签会触发 `Desktop builds`。workflow 会先检查 tag 与 `tauri.conf.json` 的版本是否一致，然后：

- Linux AppImage/DEB
- Windows NSIS
- macOS `.app` zip（若自动 macOS runner 不可用，按桌面文档本机构建）
- 每个平台启动 smoke（xvfb / Windows process）
- 自动生成 `SHA256SUMS.txt` 并附加到 Release

Release 若不存在会创建并使用 `docs/release-notes/<tag>.md` 作为说明；若已存在会更新资产。

## 4. 发布前人工验收

- macOS：Dock 图标、交通灯、拖拽区、app lock、加密快照重载
- Windows：NSIS 安装/卸载、标题栏、WebView2、SmartScreen 说明
- Linux：AppImage FUSE/执行权限、DEB 依赖、窗口装饰
- 无签名包不得在文案中写成“已签名/已公证”

## 5. 正式签名（需要外部证书）

见 [signing-setup.md](signing-setup.md)。

签名完成后必须重新生成资产并替换 Release 中未签名文件；不要只在本地签名后继续使用旧资产。

## 6. 发布后

- 检查 Release 是 Latest 还是 Pre-release，与稳定性一致。
- 下载并校验 `SHA256SUMS.txt`。
- 使用 `gh attestation verify <artifact> --repo haeliotang/tacitweave` 验证构建出处。
- 记录已知问题与回滚版本。
- 如果发现凭据泄露：吊销证书、轮换 secrets、重新构建并撤销旧 Release。

## 7. 自动更新

当前未启用 updater。启用前需要单独的 updater key 和 HTTPS endpoint；见 [updater-plan.md](updater-plan.md)。
