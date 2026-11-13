<!--
SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
SPDX-License-Identifier: CC-BY-4.0
-->
# Public physiological data reanalysis protocol

日期：2026-11-13。状态：分析协议；尚未下载或分析实际数据集。

## 目的

在自有硬件和伦理批准之前，用公开采集的多模态数据检查 Tacitweave 的分析工具：

> 能否复算特征、保持时间结构、处理缺失，并避免把一般唤醒、运动或时间趋势
> 误当成“前语言结构”？

这不是 Tacitweave 前语言假设的验证；它只验证分析程序。

## 数据来源与边界

| 数据集 | 适用检查 | 边界 |
| --- | --- | --- |
| CASE | 连续自报 + ECG/BVP/GSR/呼吸/温度/EMG 的时间对齐、个体内、滞后 | 没有意象/关系标签；不能证明 Tacitweave 构念 |
| WESAD | 多模态设备管线、ECG/EDA/EMG/呼吸/腕部 BVP、活动状态混杂 | 条件标签不是参与者的真实内在体验；原始站点许可需核对 |
| QoL_Stress | 小体量导入、ECG/EDA/HR 与问卷关联 | 参与者标识和时间粒度需核实；未必适合 session 级分析 |

约束：

- 遵守各数据集原始许可，尤其科研/非商业限制。
- 不把原始或可重建数据重新打包进 AGPL 应用发行版。
- 报告只发布聚合结果、代码和数据字典，不发布受限原始记录。
- 公开数据复分析不能回答“Tacitweave 的象征空间是否有效”。

## 分析单位

第一版使用 **canonical session feature**，不直接耦合 CASE/WESAD 原始格式：

```text
participantCode
sessionId
capturedAt
signals:
  heartRateBpm
  edaMicroSiemens
  respirationRatePerMin
  ppgAmplitude
  ...
selfReport:
  intensity
  certainty
  ...
quality:
  usable
  maxGapMs
  gapsOverOneSecond
  source
```

原始信号必须先经过独立 adapter 转成该格式；adapter 记录：

- 原始文件/版本/哈希
- 通道、采样率、设备
- 时间基准和时区
- 特征提取版本
- 缺失和排除规则

没有 adapter 的字段不得猜测。

## 预注册式分析顺序

1. **质量检查**：采样率、最大间隔、缺失比例、通道饱和；先冻结排除规则。
2. **特征提取**：固定窗口/滤波/版本；第二环境重算。
3. **个体内关联**：每个参与者单独估计；不把组间相关当作个体结论。
4. **时间结构对照**：circular block / phase / block permutation，至少一种保留时间结构的对照；不能只用简单打乱。
5. **缺失机制**：完整案例 vs 预注册排除；报告敏感性。
6. **设备/活动状态分层**：WESAD 的活动条件作为混杂分层，不作为“情绪真值”。
7. **不确定性**：bootstrap/块 bootstrap 或预注册区间方法；报告失败场景。
8. **独立复算**：第二个环境/分析者重跑同一 canonical 数据，确认数值和排除规则一致。

## 阴性对照与阳性对照

- 阴性：保留时间结构的信号置换；设备关闭/无信号条件（如数据支持）。
- 阳性：已知可影响生理信号的操作（如呼吸节律、姿势/活动变化）；用于验证管线敏感性，不用于证明构念。
- 不允许事后选择对照来制造显著结果。

## 输出证据包

```text
public-data-<dataset>-<date>/
  manifest.json
  source-dataset.txt
  license-notes.md
  adapter-config.json
  feature-version.txt
  canonical/
  quality/
  per-participant.json
  controls/
  sensitivity/
  hashes.sha256
  failures.md
  report.md
```

`manifest.json` 至少包含数据集版本、文件哈希、adapter commit、特征版本、排除规则、分析代码 commit 和已知限制。

## 验收标准

- 第二环境能够从同一输入重算特征和主要估计。
- 缺失/时间空白没有被静默删除或压缩。
- 阴性对照和敏感性分析完整报告，包括失败。
- 结果明确写出“这验证了什么、没有验证什么”。
- 不把公开数据结果写成 Tacitweave 前语言假设的证据。

## 当前状态

- 协议完成。
- Canonical feature-level harness 实现：`pnpm lsm0:public --in <jsonl>`。
- 合成 fixture/测试覆盖解析、缺失、quality 排除、个体内估计、circular-shift/shuffled 对照。
- CASE `interpolated` adapter 已实现；CASE snippet 已产生聚合结果（见 [CASE snippet evidence](case-snippet-reanalysis.md)）。
- WESAD/QoL_Stress adapter 尚未实现；CASE 结果只是管线检查。
- Harness 只验证分析路径；不验证 Tacitweave 前语言假设。

下一步：选择 CASE 的一个可访问子集，建立 canonical adapter 和固定 fixture，再接入 harness。
