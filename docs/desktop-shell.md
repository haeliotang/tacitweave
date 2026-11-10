<!--
SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
SPDX-License-Identifier: CC-BY-4.0
-->
# 桌面外壳：Tauri 2 + 三栏工作台

日期：2026-11-01。状态：外壳与前端已搭建；Tauri Rust 已通过 `cargo check`，并在完整宿主权限下成功启动窗口。打包与正式签名/公证尚未验收。

![桌面外壳](assets/desktop-shell.png)

## 1. 结构

```text
apps/desktop/
  package.json                # 只负责 Tauri 的 beforeDev/beforeBuild 委托
  src-tauri/
    Cargo.toml
    tauri.conf.json
    src/lib.rs                # Rust 宿主
    src/main.rs
    capabilities/default.json
    icons/
src/
  desktop-shell.tsx           # 三栏外壳
  shell.css                   # 参考 inceptless 的暖纸面美术
  host.ts                     # Tauri invoke 桥；Web 预览时降级
```

- 前端：React 19 + TypeScript + Vite。
- 桌面宿主：Tauri 2 + Rust。
- 前端通过 `src/local-store.ts` 读取/写入本地快照：Tauri 下走 SQLite，Web 预览回退到 `localStorage`；首次在 Tauri 打开时会把已有 Web 数据迁移到 SQLite。

## 2. Rust 宿主

`apps/desktop/src-tauri/src/lib.rs` 提供：

| command | 用途 |
| --- | --- |
| `host_info` | 平台、版本、app data 目录、数据库路径、文件 API 边界（不是 OS 沙箱） |
| `db_status` | SQLite 是否就绪、表数量 |
| `read_local_text` | 只读 app data/local-files 下的文本，限制 1 MB |
| `write_local_text` | 只写 app data/local-files，文件名禁止路径分隔符/`..`，限制 1 MB |
| `load_local_state` | 从 SQLite `local_state` 读取片段/关系瞬间快照 |
| `save_local_state` | 写入/更新片段与关系瞬间快照 |
| `clear_local_state` | 删除本机快照 |
| `export_local_state` | 把当前快照写到 app data/local-files/tacitweave-export-*.json |
| `import_local_state` | 从 app data/local-files 导入命名 JSON 快照 |

- SQLite 位于 app data：`tacitweave.db`；`local_state` 保存 `motifs`、`relationships`、`field`、`signals`；启用应用锁后保存 `encrypted` 密文并删除明文 key。
- bundle id 已修正为 `com.inceptless.tacitweave`；启动时会把旧拼写目录（由新标识将 `in` 替换成 `i` 推导）下的 `tacitweave.db` 与 `local-files/` 复制到新目录（不覆盖已有新数据，旧目录保留）。
- 已建 `local_meta` 与 `local_state` 表；界面中的片段、关系瞬间、场域节点位置/用户连线与信号 session 摘要通过 `local_state` 持久化。
- 没有暴露任意文件系统路径；没有网络权限；没有 shell 插件。

## 3. 主题与语言

- 顶栏提供「明 / 暗」主题切换；默认跟随系统，选择写入 `tacitweave.theme`。
- 顶栏提供「中文 / English」切换；默认跟随浏览器语言，选择写入 `tacitweave.lang`。
- `index.html` 在 React 启动前写入 `data-theme`，避免深色主题闪白。
- 深色主题覆盖侧栏、工作区、上下文面板、卡片、身体地图、日记、关系表单与实验台。

## 4. 三栏工作台

Tacitweave 自己的默认布局不是文档编辑器，而是 **场域（Field）**：

- 中间：片段并置 + 关系节点；顶部视角切换 Juxtaposition / Body / Imagery / Relationship；底部时间轴。
- 节点可拖拽、缩放、重置；用户可主动连接节点，连接与位置写入 SQLite。
- 支持全部/近 30 天/近 90 天过滤，以及可删除的示例场域。
- 右侧：所选片段将送入空间的内容、事件流、下一步。
- 左侧：模式导航、最近片段、宿主状态。

视觉参考 inceptless 的中性纸面/墨色：

- **左侧**：新建、搜索、导航、最近片段、宿主状态。
- **中间**：新建捕获（身体地图/文字）或片段详情（总览/身体/意象/关系）。
- **右侧**：空间将收到的内容、隐私边界、进入空间按钮、事件流占位。
- 进入空间后，中间变成 symbolic 场景；右侧显示“当前空间”。

美术：

- 背景 `#f3f0e7` / 纸面 `#fbfaf6`
- 细边框 `#ded9cc`、`#e1dbcf`
- 标题用 Georgia/宋体，正文用系统 sans
- 胶囊按钮、少量朱砂色 `#8b5e54`

## 5. 运行

Web 预览：

```sh
pnpm dev
```

桌面：

```sh
pnpm tauri:dev
```

首次会编译 Tauri Rust 依赖（数百个 crate）。`beforeDevCommand` 会启动根目录 Vite；`frontendDist` 指向根 `dist`。

## 6. 本会话验证

- `pnpm build`：通过
- `pnpm test`：51 项通过
- `cargo check --manifest-path apps/desktop/src-tauri/Cargo.toml`：通过
- `cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml`：8 个宿主测试通过（文件 API 边界/符号链接 + SQLite 快照）
- `pnpm tauri:dev`：Vite 启动、Rust 编译完成；普通工作区权限下 WebKit 写入被拒绝。使用完整宿主权限重试后窗口进程成功启动，无 setup 错误。
- `pnpm tauri:build --bundles app`：成功生成 `Tacitweave.app`（约 10.45 MiB；无 Developer ID 签名），并应用自定义 Tacitweave 图标。
- `pnpm package:macos` 会构建、`strip -x`、ad-hoc 重签名并生成 zip；本机验证 app 约 8.4 MiB、zip 约 3.4 MB。
- 本机 Homebrew Rust 1.94 下必须显式设置 `CARGO_PROFILE_RELEASE_STRIP=none`，否则 Tauri CLI 的 strip 会破坏 proc-macro dylib；根脚本和 CI 已设置。
- 启动打包后的 App：成功创建 `~/Library/Application Support/com.inceptless.tacitweave/tacitweave.db`，包含 `local_meta` 与 `local_state` 表。
- 导出/导入：Rust 命令写入/读取 app data/local-files；前端也支持 JSON 下载与文件导入。
- 签名、公证与正式安装包尚未验收。
- Web 预览截图：见上方图片。

## 7. 签名、公证与分发边界

当前产物是 **ad-hoc 签名**，只适合本机验证；`spctl --assess` 会拒绝它。

本机 ad-hoc 签名（不用于分发）：

```sh
sh scripts/desktop-sign-adhoc.sh
```

真实分发需要：

1. Apple Developer Program 的 **Developer ID Application** 证书；
2. `codesign` 使用该 identity（Tauri 可用 `APPLE_SIGNING_IDENTITY`）；
3. 用 `notarytool` 提交公证，并 `stapler` 装订；
4. 在干净 macOS 用户环境做 Gatekeeper 验证。

本会话没有 Apple 证书与公证账号，因此只验证了：
- 未签名 `.app` 可以本地构建并启动；
- ad-hoc `codesign` 可以带上 hardened runtime entitlements；
- `spctl` 仍然拒绝（符合未公证预期）。

## 8. 下一步

1. 在正常 macOS 用户会话运行 `pnpm tauri:dev`，目视检查交通灯、拖拽区与三栏布局。
2. 迁移已完成基础链路；继续把信号摘要/BCI 时间轴也纳入 SQLite。
3. 继续补导出/导入命令的端到端测试。
4. 打包已能生成未签名 `.app`；下一步是签名/公证与正式安装包。

## 9. 应用图标

- 用户提供的单色源文件：`apps/desktop/src-tauri/icons/tacitweave-mono.svg`
- 带纸面圆角底的生成源：`apps/desktop/src-tauri/icons/icon-source.svg`
- 重新生成：

```sh
node_modules/.bin/tauri icon apps/desktop/src-tauri/icons/icon-source.svg \
  -o apps/desktop/src-tauri/icons
```

- 打包后的 `Tacitweave.app` 已包含新的 `icon.icns` / `icon.ico` 与 Windows/Linux PNG。


## 10. 安全与 BCI-3

- Tauri CSP 已从 `null` 收紧；只允许本机 IPC、应用自身资源与本机 WebSocket。
- 应用锁：本机 PIN（PBKDF2-HMAC-SHA256 校验）+ AES-GCM 加密本地快照；可配置无操作自动锁定（默认 5 分钟）；连续 5 次错误 PIN 锁定 30 秒。不是系统锁屏，忘记 PIN 只能删除本机数据重置。
- BCI-3 bridge：`pnpm bci:bridge`，只监听 `127.0.0.1`，要求 token 与来源检查；协议见 [BCI-3](vision/bci-3-local-bridge.md)。
- 原始音频/原始神经数据不持久化；只保存摘要。

## 11. 跨平台构建

`.github/workflows/desktop-build.yml` 会在以下环境构建桌面产物：

| 平台 | Runner | 产物 |
| --- | --- | --- |
| Linux | ubuntu-22.04 | `.AppImage`、`.deb` |
| Windows | windows-latest | NSIS `.exe` |

- Linux 依赖：`libwebkit2gtk-4.1-dev`、`libayatana-appindicator3-dev`、`librsvg2-dev`、`patchelf` 等。
- 构建完成后，产物会以 workflow artifact 保留 7 天，并自动附加到对应 tag 的 GitHub Release。
- 当前产物未签名：macOS 为 ad-hoc，Windows/Linux 为未签名构建。
- 本地原机构建命令：

```sh
pnpm tauri:build --bundles appimage,deb   # Linux
pnpm tauri:build --bundles nsis           # Windows
```
