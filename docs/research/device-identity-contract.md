<!--
SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
SPDX-License-Identifier: CC-BY-4.0
-->
# Device signal identity contract (v1)

日期：2026-11-07。状态：SIL 契约；HIL 尚未验证。

## 目标

重连、重复包和多设备同时接入时，系统必须区分：

1. 同一设备/同一 stream/同一 sequence 的合法重放；
2. 同一身份但载荷不同的冲突；
3. 不同设备或不同 stream 的独立样本。

## 身份优先级

1. `sourceId`：稳定的 bridge/设备来源标识；不能由接收时间重新生成。
2. `streamId`：设备或 bridge 的稳定 stream epoch；设备重启后应变化，不能复用。
3. `seq`：stream 内的单调 sequence；默认是 **sample-level**（每个通道样本一个 seq），重连重放保留原 seq。
4. 内容相等：只有在没有 `streamId + seq` 时才作为降级的精确内容去重。

## 规则

- `sourceId + streamId + seq + channel/kind` 相同且内容相同 → 去重。
- 同一身份、内容不同 → **冲突**，不得静默当作新样本。
- 同一帧 seq、不同 channel/kind → 独立样本，不是冲突。
- 如果设备提供的是 frame-level seq，适配器必须把它映射为 channel-specific identity，不能让多通道共享同一个 sample identity。
- 不同 `sourceId` 或不同 `streamId` → 独立样本。
- 设备重启后 seq 重置：必须换新 `streamId`，否则会被视为冲突。
- 没有 sequence 的设备：只能精确内容去重，并在质量报告中声明限制。

## 实现

`src/signal-source.ts`：

- `dedupeSignalSamples()`：精确重复去重。
- `reconcileSignalSamples()`：返回 `{ samples, conflicts }`；同身份不同载荷标记 `same_identity_different_payload`。

当前实现不会自动解决冲突，只显式标记；`traceToTimeline()` / `mergeSignalTraces()` 已把冲突作为强制门禁，抛 `signal_identity_conflict`，采集路径不会生成含有冲突的摘要。

## 未验证

- 真实设备 firmware 是否提供稳定 `streamId`/`seq`
- 设备重启后的 epoch 行为
- 多设备同刻样本
- Tauri 应用整体重启

这些属于 HIL/Gate 2A，不应在 SIL 阶段声称已验证。
