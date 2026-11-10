<!--
SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
SPDX-License-Identifier: CC-BY-4.0
-->
# Tacitweave

[English](README.md) | **中文**

> 为前语言的内在经验，构建一个可进入、可退出、可自己解释的象征空间。
>
> A local-first symbolic interface for the pre-verbal layer.

![Tacitweave 内在场域（浅色，英文界面）](docs/assets/desktop-shell-en.png)

![Tacitweave 内在场域（深色，英文界面）](docs/assets/desktop-shell-dark-en.png)

## 界面术语

- **片段 / Fragment**：用户界面对母题记录的称呼；数据层仍使用 `motif`。
- **关系瞬间 / Relationship moment**：用户界面对关系触发点的称呼。
- **并置 / Juxtaposition**：原“星座”场域视角；只表示片段与关系瞬间的并列，不暗示解释或命运。
- **研究工具 / Research tools**：可选信号与设备桥接，已移出主导航。

## 下载

最新公开 tag 为 [v0.1.4](https://github.com/haeliotang/tacitweave/releases/tag/v0.1.4)，是 Tacitweave 首个按 AGPL-3.0-or-later 分层许可发布的版本。提供未签名的 Linux/Windows 构建；macOS 签名仍待完成。已归档的 [v0.1.1 Release](https://github.com/haeliotang/tacitweave/releases/tag/v0.1.1) 仍是下载资产最完整的版本。

已归档 v0.1.1 资产（旧名）：

- macOS 12+ Apple Silicon：`Familiweave-v0.1.1-macos-arm64.zip`
- Windows 10/11 x64：`Familiweave_0.1.1_x64-setup.exe`
- Linux x86_64：`Familiweave_0.1.1_amd64.AppImage` / `.deb`
- `SHA256SUMS.txt` 校验所有产物

> v0.1.4 是仅 Linux/Windows 的 **未签名** AGPL-3.0-or-later tag 构建，本版本尚无 macOS 资产。v0.1.1 归档早于 storage v2、BCI 容错、关系拓扑与 LSM-0 工作。研究原型，不用于临床。

macOS 为 ad-hoc 签名、未公证；Windows/Linux 未签名。研究原型，不用于临床。

Tacitweave 由 **Inceptless** 发起，是一个关于**前语言经验与可选本地 BCI 信号**的公开研究项目。

它不试图造一个“更懂心理学的聊天机器人”，也不声称能读取深层潜意识。它从一个更窄、更可验证的问题开始：

> 当语言还没形成时，身体、意象与关系模式能不能先被接住，并变成一段可以由本人完成的象征经验？

## 研究定位

Tacitweave 研究的是一个比“读取深层潜意识”更窄、更可检验的问题：

> 语言之前的身体、意象与关系经验，能否被一个可进入、可退出的象征空间承载；并且，在明确同意与本地保存的前提下，能否用可复现的个体内测量描述它？

项目使用三个理论锚点，但不把它们当作证明：

- **Friston / 主动推断 / 内感受**：感受与情绪是预测性构建，不是直接生理读数；不确定性与精度很重要。
- **Levin / TAME / 生物电**：身体与自我边界可以放在多尺度 agency 视角下理解；这是框架，不是人类潜意识证据。
- **Yamanaka / iPS**：细胞身份具有可塑性；细胞重编程不是心理重编程，也不是治疗承诺。

完整定位与文献简报：

- [理论定位](docs/research/theory-positioning.md)
- [意识、潜意识与可塑性文献简报](docs/research/consciousness-and-plasticity-brief.md)
- [下一阶段研究里程碑（Gate 1–4）](docs/research/next-milestones.md)
- [Gate 2A/2B 检查清单](docs/research/gate-2-checklist.md)
- [Gate 2 pre-hardware 加固](docs/research/gate-2-prehardware.md)
- [Gate 2 pre-hardware 验收报告](docs/research/gate-2-prehardware-report.md)
- [Gate 2A Cyton 台架计划](docs/research/gate-2a-cyton-bench-plan.md)
- [LSM-0 精度模拟](docs/research/lsm-0-precision.md)
- [设备信号身份契约](docs/research/device-identity-contract.md)
- [LSM-0 protocol v1](docs/research/lsm-0-protocol-v1.md)
- [预注册骨架](docs/research/preregistration-skeleton.md)
- [研究采集 schema](docs/research/research-capture-schema.md)

## 1. 为什么是脑机接口，而不是又一个聊天框

当 AI 接管了显性知识、逻辑推演、语言表达与外部执行，**“理性与语言”会通货膨胀**。人仍然会感到空虚、躯体紧绷，并在同一种关系泥潭里反复踏空；但这些经验往往先于语言：

- 胸口说不清的坠胀
- 反复出现的潮湿走廊
- 某个关系瞬间的身体冻结
- 事后才被命名的情绪

大语言模型建立在 Token 上；而内隐记忆、依恋反应与躯体感觉，更多是**前语言、联想性、情绪性**的。要求用户先“把感觉说清楚”，常常会把它压缩成“我很焦虑”这样的标签。

Tacitweave 的方向不是替代语言，而是补上语言之前的入口：**身体定位、意象选择、关系触发、生理/声音信号，再到象征空间。**

### 1.1 术语约定

- **前语言层**：语言形成之前的身体、情绪、意象与关系反应。
- **内隐记忆**：自动化的躯体与关系模式；这里不是临床诊断。
- **躯体捕获**：身体地图、感觉、强度、呼吸与意象选择。
- **象征空间**：可以被进入、停留、离开的 75 秒相遇 / 180 秒空间。
- **片段**（内部仍为 `motif`）：用户自己命名、反复出现的身体—意象—关系单元。
- **关系拓扑**：用户自述的关系瞬间地图；不是系统对他人或依恋类型的推断。
- **BCI**：脑机接口。当前指本机信号层与设备桥接，不是植入体。
- **LSM（Large Somatic & Symbolic Model）**：躯体—意象—关系的跨模态研究模型；当前不是已训练模型。

## 2. 我们做什么

### 2.1 前语言捕获

- 身体地图：头、下颌、喉咙、肩、胸口、胃/腹、后背、手、腿
- 感觉、强度、呼吸
- 8 块抽象意象碎片，选择 1–3 块
- 可选 8 秒本机声音摘要（音量/停顿；不保存原始音频）
- 不做自由文本解释，不要求用户先命名

### 2.2 象征空间

把捕获变成 `InnerPlan`，再渲染成 75 秒相遇或 180 秒空间：

- 有门、走廊、水、房子、森林、车站、镜子或田野
- 有一个影子般的存在，或没有
- 可以靠近、停留、离开
- 不解释、不评分、不诊断

### 2.3 深层片段与关系

- **片段日记**：用户自己命名、自己保存、自己删除
- **关系瞬间**：用户自己写下场景、瞬间、身体反应与身体的第一反应
- 只做描述性计数，不推断对方、不做匹配、不做依恋分类
- 所有记录默认只在本机

### 2.4 BCI 信号层

- **BCI-1**：设备无关的 `SignalSource` 接口、LSL 风格模拟器、事件时间轴
- **BCI-2**：仅允许本机 WebSocket 桥接，接收 `hello/sample/samples` JSON
- 没有真实植入体、没有神经解码、没有临床声明
- 参考的是开放生态：OpenBCI、BrainFlow、LSL、MNE 等；Neuralink 目前公开的相关仓库主要是数据平台 `datarepo`，不是 N1 SDK

详见 [BCI 开源生态调研](docs/vision/bci-open-source-landscape.md)、[BCI-1](docs/vision/bci-1-signal-layer.md)、[BCI-2](docs/vision/bci-2-device-bridge.md)。

### 2.5 本机加密、应用锁与可携带备份

- 可选应用锁：PBKDF2 PIN 校验 + AES-GCM 加密本机快照。
- 锁定后明文片段/关系/场域/信号 key 会被删除；只有 PIN 成功后才解密。
- 加密备份使用独立口令和 AES-GCM；口令不保存、无法找回。
- 这保护本机与导出数据，但不保护已被攻破的系统账号；忘记 PIN 只能删除本机数据。

## 3. 当前原型

| 层 | 已实现 |
| --- | --- |
| v0 躯体捕获 | 身体地图 + 感觉/强度/呼吸 + 意象碎片 |
| v1 片段日记 | 本机命名、保存、删除、导出 |
| v2 关系瞬间 | 自述场景/反应、地图、描述性计数 |
| v3 声音摘要 | 8 秒音量/停顿；显式同意；不保存原始音频；session 摘要写入 SQLite |
| 场域 | 片段并置、关系节点、视角切换、时间轴、拖拽/缩放、用户连线、时间过滤、示例场域 |
| BCI-1 | 信号源接口、模拟器、本机事件时间轴 |
| BCI-2 | 本机 WebSocket 设备桥接契约 + token 鉴权 |
| 桌面外壳 | Tauri 2 + Rust；SQLite 持久化；app data 文件 API 边界（不是 OS 沙箱） |
| 主题 | 明 / 暗主题切换 |
| 应用锁 | 本机 PIN + AES-GCM 加密快照；可配置无操作自动锁定（默认 5 分钟）、5 次错误 PIN 锁定 30 秒；不是系统锁屏 |
| 跨平台 | Windows NSIS / Linux AppImage+DEB 构建；当前 main CI 启动 smoke 通过 |
| 双语 | 中文 / English 界面切换 |
| 数据 | 本机 SQLite 或浏览器 localStorage；明文/加密备份导出、导入、删除；记录出处与信号摘要。删除包含旧 key、local-files 与旧 app data 目录；SQLite 使用 secure_delete + VACUUM（不是整盘取证级擦除保证） |
| 更新检查 | 点击后检查 GitHub Releases；不自动下载 |
| 可访问性 | 明暗主题 WCAG A/AA（结构 + 对比度）E2E |
| 关系拓扑 | 30/90 天纵向对比用户自述触发点；不推断对方 |
| 信号容错 | 本机 bridge 重连/退避、抖动/间隔健康、确定性回放与显式撤回 |
| LSM-0 基线 | 离线确定性评估 CLI 与本机数据导出；不作临床结论 |

当前**没有**：

- 真实 BCI 硬件验收
- LSM 模型
- 自动关系推断
- 任何诊断、治疗或记忆恢复能力
- 临床或真人有效性证据

### 3.1 工程状态

当前 `main`：

- 141 项 Vitest 单元/集成测试
- 21 项 Playwright 浏览器 E2E
- 6 项 Rust 宿主测试
- 明暗主题 WCAG A/AA（结构 + 对比度）
- 主 JS 约 302 KB，重组件 lazy load
- macOS app 原始约 10.45 MiB；`pnpm package:macos` 可 strip 到约 8.4 MiB / 3.4 MB zip，ad-hoc 签名
- Linux/Windows Release 构建 + 启动 smoke
- CI：Symbolic space / Rust operational / Browser E2E

项目仍是研究原型，不声称临床或真实 BCI 硬件能力。

## 4. 架构

```text
身体 / 意象 / 关系 / 可选信号
        │
        ▼
SomaticCapture + SignalTrace
        │
        ▼
InnerPlan
片段 · 节拍 · 影子 · 空间/声音/光/镜头提示词 · 安全边界
        │
        ▼
EpisodePlan (kind: inner)
        │
        ▼
WorldRenderer（当前 symbolic；未来 Genie 4 等）
        │
        ▼
75s 相遇 / 180s 空间 + 本地记录
```

- `InnerPlan`：象征导演层。
- `EpisodePlan`：可追溯的计划信封。
- `WorldRenderer`：渲染器接缝；当前是本地 symbolic。
- `SomaticSignalSource` / `SignalTrace`：设备无关信号接缝。
- `CaptureProvenance`：非确定性成片的出处与指纹。
- Tauri Rust 宿主：应用级 app data 文件 API、SQLite、打包；前端通过 `invoke` 访问。这不是 OS 沙箱。

## 5. BCI 与 LSM：激进路线

Tacitweave 不是“给聊天机器人加几个生理传感器”。我们的长期主张更激进：

> **未来的精神基础设施不会是更会说话的 LLM，而是 BCI 原生的前语言接口。**

因此，BCI 不是可选配件，而是长期核心研究主线。当前没有植入体、没有神经解码，也不把任何实验性信号包装成“读懂潜意识”；但路线图会主动向那个方向推进，而不是停在自我报告。

### 5.1 北向目标

**从 BCI 到 LSM**：

1. 先建立设备无关的躯体/信号捕获；
2. 在明确同意的纵向数据上，学习“信号—意象—关系”的跨模态映射；
3. 用映射驱动象征空间的参数，而不是用语言解释用户；
4. 让关系拓扑成为一等产品，而不是侧栏功能；
5. 最终形成一个**可退出、可删除、可自己解释**的 BCI 原生象征接口。

### 5.2 阶段

| 阶段 | 目标 | 状态 |
| --- | --- | --- |
| BCI-0 | 本机声音摘要 + 自报 + 意象 | 已实现 |
| BCI-1 | 设备无关 `SignalSource` + LSL 模拟器 + 时间轴 | 已实现 |
| BCI-2 | 本机 WebSocket 设备桥接 | 契约/UI 已实现；真实硬件未验收 |
| BCI-3 | 本机 bridge 协议与 token 鉴权已实现；真实 OpenBCI/BrainFlow/LSL 采集未验收 | 协议完成，硬件未验收 |
| LSM-0 | 跨模态对齐：从躯体/信号预测象征参数，不做情绪诊断 | 未开始；下一研究目标 |
| LSM-1 | 纵向片段 + 关系拓扑的个人模型 | 未开始 |
| LSM-2 | 闭环自适应象征空间，用户始终可退出/覆盖 | 未开始 |

### 5.3 我们不接受“永远停在原型”

- 不等待 Neuralink 开放 N1 SDK；直接使用 OpenBCI、BrainFlow、LSL 等开放生态。
- 不把“用户自己说”当成终点；要在同意数据上验证信号与自报是否稳定对应。
- 不把关系拓扑做成静态列表；要让它成为可回看、可对照、可删除的纵向结构。
- 不用 LLM 假装 LSM；LSM 的核心是躯体—意象—关系的映射，而不是词语概率。
- 如果未来无法证明信号与自报存在可复现对应，就必须公开承认这条路线不成立，而不是继续营销“深层潜意识读取”。

**LSM 仍然是研究议程，不是已训练模型；但它是本项目的主动目标，不是装饰性的未来愿景。**

## 6. 深层潜意识怎么处理

我们不把“深层潜意识”当作可以被系统占有的对象，而当作**用户自己的、前语言的意义层**。

因此：

- 不解释：不提供梦的字典，不说“你其实是……”
- 不诊断：不是心理测试、治疗或医疗设备
- 不恢复记忆：不暗示压抑记忆，不制造虚假记忆
- 不评分：没有深层潜意识健康分、关系匹配分
- 不推断他人：关系瞬间只画用户自己写下的部分
- 不制造依赖：没有 streak、没有“对方在等你”
- 意义归用户：系统只提供形式与开放问题

## 7. 隐私与边界

- 默认本地：没有服务端、没有账号、没有同步
- Tauri 下片段/关系瞬间写入 SQLite；Web 预览回退 localStorage
- 应用锁会加密本机快照；加密备份使用独立口令
- 声音只保存摘要，不保存可还原音频
- 数据可整体导出、导入、删除
- 强烈痛苦、自伤/他伤风险时，应停止体验并寻求现实支持
- 真实设备信号接入前必须完成同意、删除、断开与安全审查

## 8. 本地运行

环境：Node.js 22+、pnpm 10、Rust 工具链；macOS 上 Tauri 需要 Xcode Command Line Tools。

```sh
pnpm install
pnpm dev          # Web 预览
pnpm tauri:dev    # Tauri 2 桌面外壳
```

检查：

```sh
pnpm test
pnpm build
pnpm e2e:install            # 首次安装 Chromium
pnpm e2e                    # Playwright browser E2E
pnpm bci:bridge              # 本机 BCI-3 WebSocket bridge
pnpm bci:replay --in sample.jsonl  # 回放样本并注入抖动/丢包
pnpm check:symbolic-path
pnpm rust:test
cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml
```

可选工具：

```sh
pnpm inner:storyboard --fragment "一条走廊尽头有一扇门" --format encounter
pnpm measure:browser
pnpm measure:browser:full
```

桌面构建：

```sh
pnpm tauri:build --bundles app
# 或构建 + strip + ad-hoc 签名 + zip：
pnpm package:macos
```

跨平台构建（需要对应系统原生环境）：

```sh
pnpm tauri:build --bundles appimage,deb   # Linux
pnpm tauri:build --bundles nsis           # Windows
```

GitHub Actions 的 `Desktop builds` workflow 会构建 Windows NSIS 与 Linux AppImage/DEB，并把产物附加到对应 tag 的 Release。macOS 包需要 Developer ID 才能正式分发；Windows/Linux 当前也是未签名构建。

当前产物是 ad-hoc 签名的本机验证包；正式签名与公证需要 Apple 证书。

## 数据与研究文档

- [Local data schema v2](docs/research/data-schema-v2.md)
- [Consent and withdrawal](docs/research/consent-and-withdrawal.md)
- [LSM-0 evaluation protocol](docs/research/lsm-0-evaluation.md)
- [意识、潜意识与可塑性文献简报](docs/research/consciousness-and-plasticity-brief.md)
- [下一阶段研究里程碑（Gate 1–4）](docs/research/next-milestones.md)
- LSM-0 离线基线：`pnpm lsm0:baseline --in <fixture.jsonl>`；本机导出 `pnpm lsm0:export`
- [自动更新方案](docs/updater-plan.md)：updater key/endpoint 方案与清单生成器
- [Release signing](docs/release-signing.md)
- [发布流程](docs/release-process.md)：tag 构建、校验和与 GitHub 构建出处证明
- [签名配置](docs/signing-setup.md)：Apple / Windows secrets 的逐步配置
- [Desktop platform QA](docs/platform-qa.md)
- [BCI-3 local bridge](docs/vision/bci-3-local-bridge.md)

## 9. 项目地图

- [`src/somatic.ts`](src/somatic.ts)：身体部位、感觉、呼吸、意象碎片。
- [`src/somatic-entry.tsx`](src/somatic-entry.tsx)：v0 身体地图入口。
- [`src/inner.ts`](src/inner.ts)：`InnerPlan`、相遇/空间/捕获计划。
- [`src/symbolic-renderer.tsx`](src/symbolic-renderer.tsx)：75 秒相遇 / 180 秒空间。
- [`src/motif-journal.ts`](src/motif-journal.ts)：本机片段存储。
- [`src/relationship.ts`](src/relationship.ts)：用户自述关系瞬间。
- [`src/field.ts`](src/field.ts)：场域位置、用户连线与校验。
- [`src/signal-session.ts`](src/signal-session.ts)：只含摘要的信号 session。
- [`src/signal-source.ts`](src/signal-source.ts)：BCI 信号层与 LSL 模拟器。
- [`src/device-signal-source.ts`](src/device-signal-source.ts)：本机设备桥接。
- [`src/local-store.ts`](src/local-store.ts)：SQLite / localStorage 快照。
- [`src/desktop-shell.tsx`](src/desktop-shell.tsx)：三栏工作台。
- [`src/i18n.tsx`](src/i18n.tsx)：中文/English。
- [`apps/desktop/src-tauri/`](apps/desktop/src-tauri/)：Tauri 2 Rust 宿主。
- [`docs/inner/`](docs/inner/)：形式、v0–v3、v0 捕获边界。
- [`docs/vision/`](docs/vision/)：BCI 生态、BCI-1/2/3、LSM/关系拓扑路线。
- [`scripts/bci3-bridge.ts`](scripts/bci3-bridge.ts)：本机 token 鉴权 WebSocket bridge。
- [`docs/desktop-shell.md`](docs/desktop-shell.md)：桌面外壳、SQLite、签名边界。

## 10. 路线图：从 BCI 接缝到 LSM

- **现在**：v0–v3 本机原型、BCI-1/2 接缝、Tauri 外壳、SQLite、双语与明暗主题。
- **下一步（主攻）**：真实 OpenBCI/BrainFlow/LSL 采集；真实设备声音验收；把信号摘要并入 SQLite；Tauri 窗口目视验收。
- **研究阶段**：在明确同意、可删除的小样本上训练 LSM-0 跨模态对齐；先证明“信号—意象—关系”存在可复现结构，再谈产品化。
- **产品阶段**：关系拓扑成为一等入口；闭环象征空间根据信号调整，但用户始终拥有解释权与退出权。
- **长期**：BCI 原生的前语言接口；临床工作只在伦理与临床机构合作下进行。

**激进不等于吹牛。** 这条路线只有在真实、同意、可删除的数据上成立；没有证据，就不把 LSM 写成既成能力。

## 11. 研究问题

1. 象征空间能否让前语言经验获得形式，而不被解释？
2. 当用户不用文字、只用身体与意象选择时，是否更接近“说不清”的东西？
3. 75 秒 / 180 秒的边界，会让人更安全，还是更疏离？
4. 多模态信号与自报之间，是否存在稳定、可复现的对应？
5. 谁适合、谁不适合？急性哀伤、创伤、焦虑或只是想玩的人，反应可能完全不同。

## 12. 许可证

Tacitweave 采用分层许可：应用与运行时为 AGPL-3.0-or-later，契约层为 Apache-2.0，文档为 CC-BY-4.0，品牌资产除外。Copyright 2026 Inceptless。见 [LICENSING.md](LICENSING.md)。

历史大文件与音频审计见 [docs/privacy/history-audit-2026-11-01.md](docs/privacy/history-audit-2026-11-01.md)。

## 13. 发起方

Tacitweave 由 **Inceptless** 发起。
