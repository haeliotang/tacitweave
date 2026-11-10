<!--
SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
SPDX-License-Identifier: CC-BY-4.0
-->
# BCI 开源生态调研（Neuralink 与可参考项目）

日期：2026-11-01。范围：公开网络与 GitHub 检索；不包含未公开的 Neuralink 内部代码、临床数据或 N1 固件。本文是技术方向调研，不是医疗、监管或投资建议。

## 1. 结论先行

- **Neuralink 没有公开 N1 植入体的固件、解码模型、开发者 SDK 或第三方 BCI API。**
- 目前可确认的、与 Neuralink 直接相关的开源工程是 [`neuralinkcorp/datarepo`](https://github.com/neuralinkcorp/datarepo)：一个 Apache-2.0 的**多模态数据目录/查询平台**，不是脑机接口。
- 另有 [`neuralinkcorp/tsui`](https://github.com/neuralinkcorp/tsui)（Tailscale 的 TUI）与 `electron` fork，属于工具/基础设施，与 BCI 解码无关。
- 因此，Tacitweave 不该等待 Neuralink 开源 BCI SDK；更现实的是：**保持设备无关的信号层，先接 OpenBCI / BrainFlow / LSL 一类开放生态**，并把 BCI 当作未来可选输入，而不是核心依赖。

## 2. Neuralink 的开源仓库

### datarepo

- 仓库：[neuralinkcorp/datarepo](https://github.com/neuralinkcorp/datarepo)
- 文档：[data-repo.io](https://data-repo.io/)
- PyPI：`data-repository`
- 许可证：Apache-2.0
- 语言/栈：Python；Polars、PyArrow、Delta Lake、ClickHouse、boto3
- 定位：用 Python 声明 catalog/database/table，查询 Parquet、Delta Lake、关系数据库或自定义函数；生成静态 catalog 站点或只读 API；强调本地开发、无需常驻服务。
- README 明确写的是“Neuralink 对开源社区的承诺，加速数据工程与生物技术”，不是 BCI 运行时。

**对 Tacitweave 的可借鉴点：**

- 本地优先、静态可浏览的数据目录；
- 表/字段 schema 与来源说明（data input、latency、example）写进 catalog；
- 多模态数据统一查询，而不是先建大平台；
- 但不建议现在引入其依赖：我们的数据量小，当前 `localStorage + JSON export` 足够；未来做研究数据管理时再看。

### tsui / electron

- [`neuralinkcorp/tsui`](https://github.com/neuralinkcorp/tsui)：Tailscale 的终端 UI，Go；与 BCI 无关。
- `neuralinkcorp/electron`：Electron fork；与 BCI 无关。

### 未发现的东西

截至本次检索，没有找到：

- N1 植入体固件或实时神经信号解码代码；
- Neuralink 官方 BCI SDK / 开发者 API / 第三方应用平台；
- 公开的 PRIME 临床试验原始神经数据；
- 官方维护的 Neuralink Compression Challenge 代码仓库（挑战本身有社区实现，例如 `efwoods/Neuralink-Compression-Challenge`、`mikaelhaji/n1-codec`，但不是官方 SDK）。

这不代表 Neuralink 内部没有这些能力，只代表**公开可参考的代码不存在**。

## 3. 更值得参考的开放 BCI 生态

| 项目 | 作用 | 对 Tacitweave 的相关性 |
| --- | --- | --- |
| [OpenBCI](https://openbci.com/) / [OpenBCI_GUI](https://github.com/OpenBCI/OpenBCI_GUI) | 开放硬件与采集 GUI | 未来低成本 EEG/生理采集的入口 |
| [BrainFlow](https://github.com/brainflow-dev/brainflow) | 跨设备生物信号采集库 | 设备抽象层，适合做适配器 |
| [Lab Streaming Layer / liblsl](https://github.com/sccn/liblsl) | 多模态时间序列流同步 | 把 EEG、呼吸、皮肤电、事件统一成时间流 |
| [MNE-Python](https://github.com/mne-tools/mne-python) | EEG/MEG 分析 | 离线研究分析，不是实时产品依赖 |
| [BCI2000](https://www.bci2000.org/) | 开源 BCI 研究平台 | 研究协议与实验范式参考 |
| [MOABB](https://github.com/NeuroTechX/moabb) | BCI 基准/复现 | 评估方法论参考 |
| [NeuroKit2](https://github.com/neuropsychology/NeuroKit) | 生理信号处理 | HRV/EDA/呼吸等特征提取 |

注意：这些项目的许可证、硬件兼容性与数据质量差异很大；接入前要逐个核对，不要假设“开源 = 可直接临床使用”。

## 4. 对 Tacitweave 的技术启示

### 4.1 现在不要做

- 不要做“读取潜意识/解码记忆”的 BCI 叙事；
- 不要把 N1 或任何植入体当成近期可接入的 API；
- 不要在没有临床/伦理审查前做神经刺激或治疗声明；
- 不要为了“跟上未来”而把核心体验绑死在某个硬件上。

### 4.2 应该先做

1. **设备无关的信号源接口**：`SomaticSignalSource`（start/stop/events/consent），当前先包住麦克风音量摘要；未来可接 BrainFlow/LSL。
2. **统一时间轴**：信号样本、自报事件、身体地图选择、关系触发点都带 `timestamp` 与 `source`，导出为可分析数据。
3. **同意的粒度**：每种信号单独授权、可撤回、可删除；原始信号默认不保存。
4. **本地优先**：先做本地研究数据管理，再谈云端/跨用户数据集。
5. **安全分层**：非临床自我探索 / 受监督研究 / 临床干预，三层产品边界不能混。

### 4.3 分阶段

- **BCI-0（当前）**：本地声音摘要 + 自报 + 意象；无硬件。
- **BCI-1（已实现）**：设备无关信号源接口 + LSL 时间轴模拟器；无真实采集。见 [BCI-1](bci-1-signal-layer.md)。
- **BCI-2**：在明确同意下接 OpenBCI/BrainFlow，做小样本研究；不宣称疗效。
- **BCI-3**：与临床/伦理机构合作，才讨论干预与监管路径。

## 5. 参考链接

- [Neuralink datarepo](https://github.com/neuralinkcorp/datarepo)
- [datarepo 文档](https://data-repo.io/)
- [neuralinkcorp/tsui](https://github.com/neuralinkcorp/tsui)
- [OpenBCI GUI](https://github.com/OpenBCI/OpenBCI_GUI)
- [BrainFlow](https://github.com/brainflow-dev/brainflow)
- [liblsl](https://github.com/sccn/liblsl)
- [MNE-Python](https://github.com/mne-tools/mne-python)
- [BCI2000](https://www.bci2000.org/)
- [MOABB](https://github.com/NeuroTechX/moabb)
- [NeuroKit2](https://github.com/neuropsychology/NeuroKit)

检索限制：GitHub 组织页与 API 可能受速率限制；仓库状态、星数、许可证与活跃度会变化。本文只记录本次检索能确认的内容。
