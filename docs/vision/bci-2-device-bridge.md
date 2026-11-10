<!--
SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
SPDX-License-Identifier: CC-BY-4.0
-->
# BCI-2：本机设备桥接

日期：2026-11-01。状态：桥接契约与 UI 已实现；真实硬件/LSL 桥接尚未验收。

## 1. 目标

BCI-2 只做一件事：让浏览器通过**本机 WebSocket 桥接**接收外部设备的信号样本，而不是让浏览器直接读 LSL。

这样可以：

- 保持浏览器端设备无关；
- 让 LSL / OpenBCI / BrainFlow 的桥接进程留在本机；
- 明确同意、默认不保存原始信号；
- 在没有硬件时也能验证协议与错误路径。

## 2. 协议

桥接地址必须是本机 `ws://127.0.0.1:<port>` 或 `ws://localhost:<port>`；远程/非 ws 地址会被拒绝。

### hello（可选）

```json
{ "type": "hello", "sourceId": "openbci-cyton", "kinds": ["heart_rate", "eda"], "sampleRateHz": 250 }
```

### 单个样本

```json
{ "type": "sample", "kind": "heart_rate", "value": 68, "unit": "bpm", "tMs": 1200 }
```

### 批量

```json
{ "type": "samples", "samples": [
  { "kind": "eda", "value": 2.1, "unit": "uS", "tMs": 1200 },
  { "kind": "breath_phase", "value": 0.4, "label": "inhale", "tMs": 1230 }
] }
```

### 错误

```json
{ "type": "error", "message": "sensor_disconnected" }
```

- `tMs` 是相对桥接开始的毫秒；缺省时用接收时间。
- 未知 kind 会被忽略。
- 样本只进入内存时间轴；不写入 `localStorage`，除非用户显式导出。

## 3. 桥接进程

浏览器不内置 LSL。推荐本机桥接进程：

```
LSL stream / OpenBCI / BrainFlow
        │  (pylsl / BrainFlow)
        ▼
Python WebSocket bridge
        │  JSON hello/sample/samples
        ▼
浏览器 BCI-2 面板
```

仓库提供了一个未对真实硬件验收的参考脚本 `scripts/lsl_bridge.example.py`（pylsl + websockets）。本次没有在真实设备上运行它；目前验证的是：

- 本机 URL 校验；
- 同意门控；
- 非法包/连接失败/断开错误；
- 样本解析与时间轴导出。

## 4. UI

首页「BCI-2 设备桥接（实验）」：

- 本机 WebSocket 地址输入
- 必须勾选同意
- 连接/断开/导出设备时间轴
- 状态、样本数、错误信息

## 5. 不声称什么

- 不是临床设备、不是诊断、不是神经解码。
- 没有 LSL 库、没有 OpenBCI/BrainFlow 适配器、没有真实信号验证。
- 不保存原始信号；没有上传。
- 不解释心率/EDA/呼吸与情绪的关系。

## 6. 下一步

1. 写一个可运行的本地桥接脚本（pylsl → WebSocket）。
2. 在 OpenBCI 或 LSL 模拟源上验证采样率、丢包、时间漂移、断开与重连。
3. 加入显式“保存原始信号”选项前，先完成安全与隐私审查。
4. 任何临床声明都留到 BCI-3 之后，与伦理/临床机构合作。
