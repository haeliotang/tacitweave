<!--
SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
SPDX-License-Identifier: CC-BY-4.0
-->
# 核心重构与性能计划

日期：2026-11-01。状态：完成（本地验证范围）。目标：后续开发只基于当前内在景观核心，并让性能可测量、可回归。

## 1. 当前核心

- `InnerPlan`：母题、影子、75/180 秒节拍、空间/声音/光/镜头提示词、安全字段。
- `EpisodePlan`：`kind: inner` 的统一计划信封。
- `WorldRenderer`：可插拔渲染器；`symbolic` 是当前默认。
- `CaptureProvenance`：非确定性成片的出处、hash、模型与时间。
- `SomaticCapture`：v0 躯体地图 + 感觉/强度/呼吸 + 意象碎片；无文字输入。
- consent：用途绑定的云端同意；默认不上传。
- Rust `tacitweave-ops`：捕获 hash/verify、实验日志校验、Genie 配置检查。

## 2. 已移除

- 旧三维程序渲染器、`src/scene.tsx` 与 610 KB 场景分包。
- 旧资料准备流程、服务端、数据库/API、登录与历史/反馈 UI。
- 旧 3D 前端模块与测试（character / pickup / scene helper / voice / spatial）。
- 147 MB `public/assets/quaternius` 旧模型资产。
- 旧 storyboard CLI、历史验收产物与旧方向文档。

## 3. 重构原则

1. **核心优先**：新功能只落到 `InnerPlan` / `EpisodePlan` / `WorldRenderer` / capture / consent / Rust ops。
2. **不并行扩展旧路径**：旧模块已删除；未来兼容只在读取层做最小适配。
3. **删除优先**：每完成一次迁移，删除对应代码、文案、测试和资源。
4. **性能可测**：记录主包、首屏、75/180 秒帧间隔；没有测量就不写“更快”。

## 4. 阶段

### R0：构建与浏览器基线（完成）

- 主包 312,022 B，主 CSS 55,036 B；lazy chunks（含关系拓扑 CSS）合计 72,469 B；合计 439,527 B，无 scene 分包。v0–v3 增加了躯体地图、意象库、本机母题日记、关系触发点/计数、本机声音摘要与整体数据导出；BCI-1/2 增加了信号源接口、LSL 模拟器、本机事件时间轴与本机设备桥接契约；桌面壳层增加了 Tauri 2 三栏工作台与 Rust 宿主。
- `pnpm measure:build` 记录体积；`pnpm check:symbolic-path` 守卫 320,000 B 预算。
- 本地 headless：DOMContentLoaded 51 ms、load 51 ms、first paint/FCP 72 ms。
- 完整 75 秒相遇与 180 秒空间帧采样完成；结果见 [R0 构建基线](baseline.md)。

### R1：计划信封（完成）

- `EpisodePlan` 只保留 `kind: 'inner'`。
- 前端在本机生成 `InnerPlan` / `EpisodePlan`，不做网络往返，也不持久化。
- 测试覆盖 `InnerPlan`、`EpisodePlan` 与 symbolic 渲染。

### R2：渲染器与 UI 收口（完成）

- 首页默认是内在景观输入：画面/感觉 → 75 秒相遇或 180 秒空间。
- 旧三维输入、资料准备 UI、旧视图 footer/反馈/纠正/历史分支已删除。
- 统一为「返回 / 重新进入」。

### R3：性能（完成首轮本地验证）

- `symbolic` 路径不加载 Three.js、不下载模型、不初始化音频。
- 完整会话帧采样（本地 headless）：相遇 4,501 帧、空间 10,802 帧；平均 16.66 ms，最大间隔 16.8 ms。
- 真实设备、生产构建与交互压力仍未验证；不能据此宣称所有设备稳定。

### R4：清理（主体完成）

- `src/` 93 个文件、35 个测试文件、176 个测试；`server/`、`public/assets` 与旧文档已删除。
- 前端现在是纯本地 symbolic-only 应用。
- 未使用依赖已清理：保留 React/Vite/Zod 与测试工具，移除 Fastify、pg、sharp、sherpa、Three.js 与 PGlite。

## 5. 性能测量项

| 项 | 方法 | 约束 |
| --- | --- | --- |
| 主包大小 | `pnpm measure:build` | 不超过 320,000 B；超出需说明 |
| symbolic 首屏 | `pnpm measure:browser` | 不加载 Three.js / 模型 |
| 75/180 秒稳定 | `pnpm measure:browser:full` | 本地 headless 已测；真实设备待测 |
| 捕获 hash | Rust `capture-hash` | 大文件流式读取，不一次性进内存 |

## 6. 验证

```sh
pnpm test
pnpm build
pnpm check:symbolic-path
pnpm rust:test
pnpm eval:validate docs/evaluation/experiment-log.example.json
```

当前测试 176 项；无 HEIC / PostgreSQL / 模型下载依赖。R3 的真实设备、生产构建与交互压力仍未验证。
