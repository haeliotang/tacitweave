<!--
SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
SPDX-License-Identifier: CC-BY-4.0
-->
<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/assets/tacitweave-mono-dark.svg">
    <img src="docs/assets/tacitweave-mono.svg" alt="Tacitweave — 在语言之前" width="120">
  </picture>
</p>

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

- **BCI-1**：设备无关的 `SignalSource`、LSL 风格模拟器、本机事件时间轴。
- **BCI-3**：仅本机 WebSocket 桥接，带 token 鉴权、来源标记
  （`origin`、`devicePseudonym`、`adapterVersion`）、重连处理与重复/身份检查。
- 没有真实植入体、没有神经解码、没有临床声明。
- 参考开放生态：OpenBCI、BrainFlow、LSL、MNE 等；Neuralink 目前公开的相关仓库
  主要是数据平台 `datarepo`，不是 N1 SDK。

详见 [BCI 开源生态调研](docs/vision/bci-open-source-landscape.md)、
[BCI-1](docs/vision/bci-1-signal-layer.md)、
[BCI-3](docs/vision/bci-3-local-bridge.md) 与
[设备信号身份契约](docs/research/device-identity-contract.md)。

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
| BCI-3 | 本机 WebSocket 桥接：token 鉴权、来源标记、重连与身份检查；真实硬件未验收 |
| 桌面外壳 | Tauri 2 + Rust；SQLite 持久化；app data 文件 API 边界（不是 OS 沙箱） |
| 主题 | 明 / 暗主题切换 |
| 应用锁 | 本机 PIN + AES-GCM 加密快照；可配置无操作自动锁定；5 次错误 PIN 锁定 30 秒；不是系统锁屏 |
| 跨平台 | v0.1.4 Linux AppImage/DEB 与 Windows NSIS，未签名；macOS 签名版待完成 |
| 双语 | 中文 / English 界面切换 |
| 数据 | 本机 SQLite 或浏览器 localStorage；明文/加密备份导出、导入、删除；记录出处与信号摘要。删除包含旧 key、local-files 与旧 app data 目录；SQLite 使用 secure_delete + VACUUM（不是整盘取证级擦除保证） |
| 更新检查 | 点击后检查 GitHub Releases；不自动下载 |
| 可访问性 | 明暗主题 WCAG A/AA（结构 + 对比度）E2E |
| 关系拓扑 | 30/90 天纵向对比用户自述关系瞬间；不推断对方 |
| 信号容错 | 本机 bridge 重连/退避、抖动/间隔健康、确定性回放与显式撤回 |
| LSM-0 基线 | 离线确定性评估、数据导出与精度模拟；无实证数据、不作临床结论 |
| 许可与贡献 | 分层 AGPL/Apache/CC-BY/品牌；CLA 1.0；PR 需通过 `license/cla` |
| 连续性 v0.1 | 可再次进入、修改用户字段、保留修订并比较变化；也可把空间内调整保存为新修订 |
| 动态空间 v0.1 | 75 秒相遇或 180 秒空间均可明确延长；开放空间无自动结束；空间内可改变意象、形象与光线 |
| 关系瞬间连续性 v0.1 | 可再次进入关系瞬间、预填用户字段、保留原记录、记录每次进入并比较用户字段变化 |
| 空间编辑器 v0.1 | 进入前选择 1–3 块意象、形象与 75/180 秒形式；系统只组合，不解释 |
| 象征探索 v0.2 | P0/P1：无标签进入，放置/拖动/改变对象，保存并重访用户自己搭建的空间 |

当前**没有**：

- 真实 BCI 硬件验收与测量可靠性
- 实证或已训练的 LSM 模型
- 自动关系推断
- 任何诊断、治疗或记忆恢复能力
- 临床或真人有效性证据

### 3.1 工程状态

截至 `main` 上的 v0.1.4：

- **205** 项 Vitest 单元/集成测试
- **33** 项 Playwright 浏览器 E2E
- **8** 项 Rust 桌面测试与 **10** 项 Rust ops 测试
- 明暗主题 WCAG A/AA（结构 + 对比度）
- 主 JS 约 **334 KB**，重组件 lazy load
- v0.1.4 Release：**未签名**的 Linux AppImage/DEB 与 Windows NSIS；尚无 macOS 资产
- CI：Symbolic space、Rust operational、Browser E2E 与 License checks

项目仍是研究原型，不声称临床或真实 BCI 硬件能力。

### 3.2 象征经验连续性 v0.1

本机产品现在有明确的连续性层：过去的片段可以再次进入、修改和比较，原记录与每次修订都保留。它只记录用户自己填写的字段和说明，不推断好转、诊断或心理意义。见 [象征经验连续性 v0.1](docs/symbolic-continuity-v0.1.md) 与 [Symbolic Experience Platform 状态](docs/symbolic-experience-platform-status.md)。

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
- `SignalSource` / `SignalTrace`：设备无关信号接缝，带来源标记。
- `CaptureProvenance`：非确定性成片的出处与指纹。
- Tauri Rust 宿主：应用级 app data 文件 API、SQLite、打包；前端通过 `invoke` 访问。这不是 OS 沙箱。

## 5. 愿景：从象征接口到可验证的前语言测量

Tacitweave 不是解码器、不是诊断工具，也不是“心理治疗聊天机器人”。它是一件
让前语言经验获得可进入、可退出、可由本人解释的形式的仪器。长期目标，是把这件
仪器接到一套严格的测量程序上。

### 5.1 核心论点

语言擅长显性知识，却不擅长承载某些身体、意象与关系经验。只训练 Token 的模型
可以模仿感受的词汇，却不一定接触到底下的结构。

Tacitweave 从更早一步开始：

> 身体、意象与关系瞬间，能否获得稳定的象征形式，而不由系统告诉用户“它意味着什么”？

第二个问题则是科学问题：

> 在明确同意下记录的本机信号，能否被证明携带可复现的、个体内的经验信息？

界面与测量程序相关，但不是同一个主张。**能产生符号体验，不等于已经证明存在稳定的前语言心理结构。**

### 5.2 三层结构

1. **体验层**：身体捕获、意象碎片、关系瞬间、75 秒相遇或 180 秒空间。解释权属于用户。
2. **测量层**：本机 session 记录、可选信号、时间戳、来源、质量标记、撤回与删除。它让主张可被检查，而不是让体验显得更厉害。
3. **证据层**：预注册的个体内分析、阴性/阳性对照、测量可靠性、构念效度与独立复现。任何一层都不能借用另一层的权威。

### 5.3 怎样才算成功

- **作为仪器**：用户可以进入、离开、撤回、删除，不需要先解释自己；界面不诊断、不解释。
- **作为测量系统**：信号特征与自报先被证明可靠，再检验其个体内关联是否超过保留时间结构的对照。
- **作为研究计划**：预注册先导研究可以被独立复现，包括阴性结果；构念效度被当作独立要求。
- **作为产品**：只有证据经过复现之后，自适应或信号驱动的象征空间才具备正当性。

### 5.4 证据阶梯

| Gate | 问题 | 当前状态 |
| --- | --- | --- |
| Gate 1 | 应用能否可信地安装、使用、退出、删除？ | v0.1.4 已按 AGPL 发布；签名/平台 QA 仍未完成 |
| Gate 2A | 真实设备管线能否保持时间、身份、缺口与恢复？ | SIL 与 bridge 测试已有；真实设备 HIL 未做 |
| Gate 2B | 传感器特征与提取是否可靠？ | 尚无真实测量可靠性证据 |
| Gate 3A | 预注册先导是否显示超过对照的个体内关联？ | 只有协议、预注册骨架与工具；尚无伦理批准或参与者 |
| Gate 3B | 独立样本能否复现？ | 未开始 |
| Gate 4A | 纵向模型能否做样本外预测？ | 未开始 |
| Gate 4B | 闭环象征空间能否安全、可退出？ | 未开始；需要新的伦理与安全门槛 |

科学边界是刻意的：

> **Measurement validity is not construct validity.**
> 测量有效不等于心理构念有效。即使观察到可复现的信号—自报关联，也只说明可观测变量之间存在关联，不能单独证明某种“前语言心理结构”。

### 5.5 不可让渡的原则

- **不声称解码**：不读取潜意识，不做神经解码，不做诊断。
- **默认本机**：没有账号、没有服务端个人数据、没有同步。
- **用户主权**：进入、离开、撤回、导出、删除是产品原语，不是设置项。
- **测量先于个性化**：测量链可靠之前，不让信号驱动象征空间。
- **失败必须可发表**：如果关联无法复现，就承认失败，而不是改写成“个体差异”。

### 5.6 我们拒绝什么

- 不等待 N1 SDK；直接使用 OpenBCI、BrainFlow、LSL 等开放生态。
- 不把“用户自己说”当成终点；要在同意数据上验证信号与自报是否稳定对应。
- 不把关系拓扑做成静态列表；要让它成为可回看、可对照、可删除的纵向结构。
- 不用 LLM 假装 LSM；LSM 是躯体—意象—关系的测量程序，不是词语概率。
- 不把实验性信号包装成“读懂深层潜意识”。

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

环境：Node.js 22+、pnpm 10、Rust 工具链（桌面 crate 声明 Rust 1.90+）；macOS 上
Tauri 需要 Xcode Command Line Tools。

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
pnpm sil:test               # 确定性 SIL 故障场景
pnpm lsm0:precision --replicates 50 --bootstrap 50
reuse lint                  # REUSE/SPDX 合规
pnpm license:js             # JS 依赖许可检查
pnpm bci:bridge --origin simulated  # 本机 BCI-3 bridge；真实适配器用 --origin hardware
pnpm bci:replay --in sample.jsonl   # 回放样本并注入抖动/丢包
pnpm check:symbolic-path
pnpm rust:test
cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml --locked
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
# 或构建 + strip + ad-hoc 签名 + zip（仅本机验证）：
pnpm package:macos
```

跨平台构建（需要对应系统原生环境）：

```sh
pnpm tauri:build --bundles appimage,deb   # Linux
pnpm tauri:build --bundles nsis           # Windows
```

GitHub Actions 的 `Desktop builds` workflow 会为 release tag 构建 Windows NSIS 与
Linux AppImage/DEB。v0.1.4 资产**未签名**，且没有 macOS 资产；Developer ID
签名/公证仍未完成。不要把未签名本地构建写成已签名或已公证。

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
- [`src/signal-source.ts`](src/signal-source.ts)：BCI 信号层、来源标记与 LSL 模拟器。
- [`src/research-capture.ts`](src/research-capture.ts)：研究专用设备/时钟/同意/留存 schema。
- [`src/lsm0-precision.ts`](src/lsm0-precision.ts)：精度模拟与区间诊断。
- [`src/sil-harness.ts`](src/sil-harness.ts)：确定性 SIL 故障测试框架。
- [`src/source-link.ts`](src/source-link.ts)：带构建 commit 的 AGPL 源码链接。
- [`src/device-signal-source.ts`](src/device-signal-source.ts)：本机设备桥接。
- [`src/local-store.ts`](src/local-store.ts)：SQLite / localStorage 快照。
- [`src/desktop-shell.tsx`](src/desktop-shell.tsx)：三栏工作台。
- [`src/i18n.tsx`](src/i18n.tsx)：中文/English。
- [`apps/desktop/src-tauri/`](apps/desktop/src-tauri/)：Tauri 2 Rust 宿主。
- [`docs/inner/`](docs/inner/)：形式、v0–v3、v0 捕获边界。
- [`docs/vision/`](docs/vision/)：BCI 生态、BCI-1/2/3、LSM/关系拓扑路线。
- [`scripts/bci3-bridge.ts`](scripts/bci3-bridge.ts)：本机 token 鉴权 WebSocket bridge。
- [`docs/desktop-shell.md`](docs/desktop-shell.md)：桌面外壳、SQLite、签名边界。

## 10. 路线图

- **现在**：v0.1.4 是首个按分层 AGPL 发布的版本。本机象征仪器、Tauri 外壳、SQLite 生命周期、BCI-3 本机桥接、SIL/研究工具以及许可/CLA 门禁已经就位。
- **下一步工程**：完成 Gate 1 的平台/签名工作；运行非人体 Gate 2A 台架（Cyton/BrainFlow 或等价设备），补齐时钟、来源、恢复与身份证据。不采集人体数据。
- **下一步研究**：Gate 2B 通过后才冻结测量协议；取得伦理批准并预注册 Gate 3A，用保留时间结构的对照检验个体内关联。
- **复现**：先导研究完成后，在独立样本中执行 Gate 3B，并明确泛化边界。
- **长期**：只有复现之后，才推进 LSM-1 纵向模型与 LSM-2 自适应象征空间。临床工作只在伦理、临床合作与监管审查下进行。

**激进不等于吹牛。** 这条路线只有建立在真实、同意、可删除的数据上；没有证据，就不把 LSM 写成既成能力。

## 11. 研究问题

1. 象征空间能否让前语言经验获得形式，而不被解释？
2. 当用户不用文字、只用身体与意象选择时，是否更接近“说不清”的东西？
3. 75 秒 / 180 秒的边界，会让人更安全，还是更疏离？
4. 信号与自报的测量是否足够可靠，能支持个体内检验？
5. 预注册的信号—自报关联，是否超过保留时间结构的对照？
6. 符号表示是否能在完整信号与自报基线之外，提供可复现的增量预测价值？
7. 结果能否独立复现，且泛化边界说明清楚？
8. 谁适合、谁不适合？急性哀伤、创伤、焦虑或只是想玩的人，反应可能完全不同。

## 12. 许可证

Tacitweave 采用分层许可：应用与运行时为 AGPL-3.0-or-later，文档为 CC-BY-4.0，
品牌资产除外。目前唯一 Apache-2.0 文件是
`docs/evaluation/experiment-log.example.json`。Copyright 2026 Inceptless。见
[LICENSING.md](LICENSING.md)。

贡献需要签署 Inceptless CLA 1.0；PR 只有在 `license/cla` 检查通过后才会合并。见
[CONTRIBUTING.md](CONTRIBUTING.md)。

历史大文件与音频审计见 [docs/privacy/history-audit-2026-11-01.md](docs/privacy/history-audit-2026-11-01.md)。

## 13. 发起方

Tacitweave 由 **Inceptless** 发起。
