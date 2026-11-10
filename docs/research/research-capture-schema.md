<!--
SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
SPDX-License-Identifier: CC-BY-4.0
-->
# Research capture schema (v1)

日期：2026-11-07。状态：schema + 文档；尚未接入采集 UI。

执行类型：`src/research-capture.ts`（zod）。

## 目的

把**研究采集**与产品 `SignalSession` 摘要彻底分开：

- 产品摘要：用于用户回看、删除、产品反馈；不声称可复现。
- 研究采集：设备/固件、时钟、原始或可重算数据、特征版本、质量、同意、留存、删除。

## 必填出处

- `participantCode`：匿名代码，不是姓名
- `sessionId`
- `collectedAt`
- 设备：厂商、型号、硬件 revision（可选）、固件、SDK、**密钥化/随机 research device pseudonym**（不直接存序列号哈希）、**物理采集通道**（EEG/ECG/PPG/EDA/respiration/audio/other）
- 时钟：来源、设备时间戳、主机时间戳、offset
- 派生特征：名称、值、单位、**derivedFrom 物理通道名**、质量
- 同意：范围（raw_signal / features_only）、版本、时间、撤回时间
- 采集：raw 格式/哈希/字节数（仅在 raw_signal 同意下）、样本数、特征版本、特征、质量
- 留存：截止时间、访问方式、政策
- 删除：状态、请求/完成时间、方法

## 约束

- `raw_signal` 同意必须有 raw 格式、字节数、SHA-256。
- `features_only` 同意不得存 raw。
- 派生特征必须引用存在的物理通道；不能把 `heart_rate` 当物理通道；物理通道名必须唯一。
- 设备标识必须使用 `hmac-sha256`（64 hex）或 `random-research-id`（8–128 safe chars）+ key version；不直接哈希可枚举序列号。
- 同意时间必须早于采集；留存必须晚于采集；撤回不得早于同意。
- 撤回后必须有删除请求或完成；删除请求不得早于采集/撤回；完成不得早于请求。
- `features_only` 连 raw 格式、raw bytes、raw sha256 元信息都不得携带。
- `completed` 状态必须同时有 `requestedAt`、`completedAt` 和 `method`。
- 删除完成必须有 completedAt 和方法。
- 不存明文设备序列号；只存 SHA-256。
- 不能为了复现而默认永久保存原始信号；也不能把不可复算摘要当作研究可复现数据。
- 原始数据必须加密访问、明确留存期限、支持撤回/删除。

## 与产品数据的关系

研究采集是独立文件/库，不能混入 `local-dataset-v2` 的产品导出。产品删除与研究删除分别记录。

## 尚未实现

- 采集 UI/存储
- 加密研究库
- 撤回联动
- 伦理批准后的字段冻结

这些属于 Gate 2B/3 实现，不应在未批准时开始真实采集。
