<!--
SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
SPDX-License-Identifier: CC-BY-4.0
-->
# BCI-1：设备无关的信号层与 LSL 模拟器

日期：2026-11-01。状态：本地原型。无真实硬件、无 LSL 依赖、无神经数据。

## 1. 目标

BCI-1 只做三件事：

1. 定义设备无关的 `SignalSource` 接口；
2. 用确定性的 LSL 风格模拟器验证采样、时间轴、对齐与导出；
3. 把已有本地记录（躯体、意象、声音摘要、关系触发点）转成结构化事件时间轴。

它不采真实 EEG/HRV/EDA，也不做任何解码。

## 2. 接口

```ts
interface SignalSource {
  id: string
  label: string
  capabilities: {
    kinds: SignalKind[]
    sampleRateHz?: number
    requiresPermission: boolean
    rawSignal: boolean
    localOnly: true
    simulated: boolean
  }
  start(consent: SignalConsent): void
  stop(): SignalTrace
  subscribe(listener: (sample: SignalSample) => void): () => void
}
```

- `SignalKind`：heart_rate / eda / breath_phase / voice_energy / body_event / imagery_event / relationship_event。
- `SignalSample`：相对时间 `tMs`、kind、value/unit/label、sourceId。
- `SignalTrace` / `SignalTimeline`：带 startedAt/endedAt、sources、simulated 标记。
- 任何源启动前必须持有 `SignalConsent`（localOnly、local_research）。

## 3. LSL 模拟器

`SimulatedSignalSource`：

- id：`lsl-simulator`
- 10 Hz，生成 heart_rate / eda / breath_phase
- 明确 `simulated: true`，不使用真实传感器
- 15 秒自动停止
- 时间轴按相对毫秒排序；多 trace 合并时校正起始偏移

UI 在首页「BCI-1 信号实验台」：

- 必须勾选「我理解这是模拟信号」
- 运行 15 秒 / 停止 / 导出时间轴 JSON
- 显示模拟心率、EDA、样本数
- 不会写入母题日记，也不会进入本机数据集

## 4. 本机事件时间轴

`buildLocalTimeline(dataset)` 把已有数据转成事件：

- 母题 → `body_event`、`imagery_event`、可选 `voice_energy`
- 关系触发点 → `relationship_event`
- 只用结构化字段；不写入角色、场景、瞬间等自由文本
- 从本机数据面板导出 `tacitweave-local-timeline.json`

## 5. 不声称什么

- 不是 EEG、不是 HRV、不是神经解码
- 模拟值不代表用户状态
- 不做情绪识别、诊断或治疗
- 没有 LSL 库、没有 OpenBCI/BrainFlow 适配器
- 没有把任何数据上传

## 6. 下一步

- BCI-2：本机 WebSocket 桥接契约与 UI 已实现；真实 LSL/OpenBCI/BrainFlow 桥接尚未验收。见 [BCI-2](bci-2-device-bridge.md)。
- 真实硬件前先验证：时间同步、丢包、采样率漂移、设备断开、数据删除。
- 见 [BCI 开源生态调研](bci-open-source-landscape.md) 与 [从 v0 到 LSM / 关系拓扑](from-v0-to-lsm.md)。
