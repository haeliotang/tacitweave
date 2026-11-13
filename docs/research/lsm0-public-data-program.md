<!--
SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
SPDX-License-Identifier: CC-BY-4.0
-->
# LSM-0 Public Data & Construct Validation Program

日期：2026-11-13。状态：项目建议 + 第一轮工作定义；未产生实证结论。

## 为什么先做这个

真实设备、人体伦理和独立复现都还没有就绪。但以下工作不依赖自有硬件：

1. 前语言表示的来源与修订契约
2. 使用公开生理数据验证分析工具
3. 明确构念效度与竞争解释
4. 建立未来 LSM-1 的无泄漏评估契约
5. 研究数据生命周期（合成数据）

它们不会证明 Tacitweave 的前语言假设，但能提前发现方法学缺陷。

## 三个核心问题

1. 我们的分析程序能否处理真实世界的多模态时间序列，并保持时间结构？
2. 我们要研究的前语言构念，能否被定义为区别于一般唤醒/习惯/提示的可证伪假设？
3. 象征空间中的哪些用户行为可能构成新的独立观测，而不是既有输入的另一种编码？

## 工作流与交付物

| # | 工作流 | 交付物 | 状态 |
| --- | --- | --- | --- |
| 1 | 表示契约 | [Representation Contract v0.1](representation-contract-v0.1.md) + 反例 + 不变量测试 | v0.1 完成 |
| 2 | 公开数据复分析 | [Public data protocol](public-data-reanalysis.md) + canonical feature-level harness + 合成 fixture/测试 | harness 完成；raw adapter 与实际数据未接入 |
| 3 | 构念效度 | [Construct Validity Matrix](construct-validity-matrix.md) | v0.1 完成 |
| 4 | LSM-1 评估 | [LSM-1 evaluation contract](lsm1-evaluation-contract.md) + 合成数据反例 | 契约 + 合成测试完成；无真实模型/数据 |
| 5 | 研究存储生命周期 | [Research storage lifecycle contract](research-storage-lifecycle.md)；撤回即停采、密钥删除、重启无残留、备份删除边界 | 设计契约完成；实现待落库 |

## 公开数据

优先顺序：

1. **CASE**：连续自报与 ECG/BVP/GSR/呼吸/温度/EMG 对齐，适合时间滞后和个体内分析；没有 Tacitweave 的意象/关系标签。
2. **WESAD**：多模态设备管线与活动状态混杂检查；实验条件标签不能当作内在体验。
3. **QoL_Stress**：体量小，适合导入/问卷关联快速检查；session 粒度需核实。

授权边界：

- 各数据集按原许可使用；WESAD 的科研/非商业限制需单独核对。
- 不把原始数据重新打包进 AGPL 发行版。
- 公开数据证据包只证明分析工具可复算，不证明 Tacitweave 假设。

## 四周顺序（建议）

### 第 1 周：表示与构念

- 冻结 Representation Contract v0.1 的字段与来源分类
- 为 A/B/C 各写至少一个失败条件
- 建立反例集合

### 第 2 周：公开数据复分析

- 选 CASE 建立 canonical feature/session 导入
- 用 WESAD 做跨来源方法检查
- 第二分析环境重算；缺失/时间结构不得静默修改

### 第 3 周：统计方法审查

- 自相关、缺失机制、异质性、session 数量敏感性
- 普通 bootstrap vs 块方法 vs 其他短时序方法
- 报告覆盖率、不确定性与失败场景

### 第 4 周：评估契约与生命周期

- LSM-1 基线、时间隔离、主动行为独立观测定义
- 合成数据：能检出植入关联，也能拒绝伪关联
- 研究存储生命周期最低要求：单独授权、留存、撤回、密钥删除、残留检查

## 不做

- 不训练或宣称 LSM-1/LSM-2
- 不增加更多意象类型来制造“更丰富”的印象
- 不用 LLM 解释象征选择
- 不在没有伦理审查时招募参与者

## 完成标准

本 program 的第一阶段完成，不是“证明 Tacitweave 有效”，而是：

- 每个核心主张都有可证伪条件；
- 分析程序能在公开/合成数据上被第二环境重算；
- 能明确列出当前没有测到什么；
- 研究数据生命周期可审计。

只有这些通过后，才讨论真实设备人体研究和 LSM-1。
