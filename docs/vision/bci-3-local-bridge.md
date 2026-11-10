<!--
SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
SPDX-License-Identifier: CC-BY-4.0
-->
# BCI-3 本机桥接

日期：2026-11-01。状态：协议实现与鉴权已落地；真实设备未验收。

## 它是什么

`scripts/bci3-bridge.ts` 是一个只监听 `127.0.0.1` 的 WebSocket 桥接进程：

- 客户端（Tacitweave）连接 `ws://127.0.0.1:8765/bci`
- 先发送 `hello`，包含 `client: "tacitweave"` 和启动时打印的 token
- 桥接验证 token 后返回能力列表
- 真实设备/采集程序通过 **stdin JSONL** 送入 `sample` 或 `samples`
- 桥接只转发样本，不持久化原始信号

## 启动

```sh
pnpm bci:bridge --port 8765
# 或固定 token：
pnpm bci:bridge --port 8765 --token local-dev-token --rate 1 --origin simulated
```

然后在应用「信号实验台 → BCI-2 设备桥接」中填写地址与 token。

## 协议

客户端连接：

```json
{"type":"hello","client":"tacitweave","token":"local-dev-token"}
```

桥接成功：

```json
{"type":"hello","sourceId":"bci-3-bridge","kinds":["heart_rate","eda"],"sampleRateHz":1}
```

送入样本：

```json
{"type":"sample","kind":"heart_rate","value":68,"tMs":1200}
{"type":"samples","samples":[{"kind":"eda","value":2.1},{"kind":"breath_phase","value":0.4}]}
```

`tMs` 缺省时由客户端按接收时间填充；`sourceId` 缺省为 `bci-3-bridge`；所有输入必须来自本机。桥接会拒绝未知 `kind`、非有限数值和负 `tMs`，并在 `--rate` 声明采样率用于客户端抖动计算。

`/health` 返回 `clients`、`received`、`forwarded`、`rejected`、`lastSampleAt`，可用于真实 daemon 的断线与丢包排查。

## 无硬件的故障回放

`scripts/bci3-replay.ts` 可将本地 JSONL 样本录制按原时间轴回放到 bridge，并注入确定性抖动/丢包：

```sh
pnpm bci:replay --in recording.jsonl --jitter-ms 20 --drop-every 50 \
  | pnpm bci:bridge --port 8765 --token local-dev-token --rate 1 --origin simulated
```

- 录制行格式：`{"tMs":100,"kind":"heart_rate","value":66}`
- `--jitter-ms`、`--drop-every`、`--speed`、`--seed` 都是确定性的
- 这是回放/容错测试工具，**不是真实硬件采集**；真实设备仍需要 LSL/OpenBCI/BrainFlow 验收

## 真实设备参考适配器

- `scripts/lsl_bridge.example.py`：pylsl → WebSocket 的参考实现。
- `scripts/brainflow_bridge.example.py`：BrainFlow / OpenBCI → JSONL stdin 的参考实现，需 `pip install brainflow`，通过 `| pnpm bci:bridge --origin simulated` 管道送入。

真实设备适配器必须显式声明：

```bash
pnpm bci:bridge --origin hardware --device-pseudonym <pseudonym> --adapter-version <version> --stream-id <epoch>
```

`--origin` 默认 `unknown`；未知来源在应用内按模拟/未验证处理，不能因为 WebSocket 已连接就当作硬件。

两者都**未在真实硬件上验收**；适配器只发送派生样本，不能代替设备 SDK 的错误处理、采样率核对、同意与撤回流程。真实采集前必须记录设备型号、固件、通道映射和失败处理。

## 安全边界

- 仅监听 `127.0.0.1`
- 必须携带 token
- 拒绝非本机与陌生 `Origin`
- 256 KB 单包上限
- 不保存原始神经数据；应用只把摘要写入本地 SQLite
- 没有真实 OpenBCI/BrainFlow/LSL 硬件验收；此 bridge 是设备 daemon 的协议接缝

客户端 `WebSocketSignalSource` 会在断线后按指数退避重连，保留同一时间轴起点；停止后可显式撤回本次信号摘要。真实 LSL/OpenBCI/BrainFlow 适配仍由本机 daemon 负责，仓库中的 `scripts/lsl_bridge.example.py` 是参考，不等于硬件验收。下一步是把 daemon 适配器与真实设备记录补齐；在此之前，不要声称 BCI-3 已完成。
