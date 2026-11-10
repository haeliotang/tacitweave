<!--
SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
SPDX-License-Identifier: CC-BY-4.0
-->
# Gate 2 pre-hardware acceptance report

日期：2026-11-07。状态：**PARTIAL — CORRECTIONS APPLIED; RE-REVIEW REQUIRED**。

本报告对应审查基线 `7b145d2` 之后的修正；来源标记实际由 `37e5edb` 引入，`8f8bdeb` 仅修复密文篡改测试的随机性。
它不把 SIL 通过等同于 Gate 2A，也不把 schema 单测等同于研究采集已实现。

## 验收域

### A. Bridge SIL — 部分通过

已完成证据：

- `src/bci3-bridge.test.ts` → `rejects a bad token and accepts a valid hello`
- `src/bci3-bridge.test.ts` → `forwards a stdin sample to authenticated clients`
- `src/bci3-bridge.test.ts` → `dedupes a sample repeated after reconnect and keeps an explicit retraction boundary`
- `src/device-signal-source.test.ts` → `auto-reconnects, keeps source identity and deduplicates replay samples`
- `src/device-signal-source.test.ts` → `marks a bridge that does not declare hardware origin as simulated`
- `SignalTrace` / `SignalTimeline` / `SignalSession` carry optional `origin`, `devicePseudonym`, `adapterVersion`
- `origin: hardware` 是适配器自声明，不是硬件真实性证明；HIL 需绑定固件、适配器版本和实测日志
- `src/signal-session.test.ts` → `leaves no session after save, retract, save and reload`
- `src/signal-source.test.ts` → `traceToTimeline()` blocks a conflicting identity; different channels at one frame are independent
- `src/signal-source.test.ts` → exact content dedupe fallback
- `src/sil-harness.test.ts` → 6 deterministic scenarios

已修正：

- 建链测试保留 bridge 原始 `sourceId`，不再人工统一来源
- `traceToTimeline()` / `mergeSignalTraces()` 已接入冲突门禁；冲突时抛 `signal_identity_conflict`
- `SignalSample` 支持 `streamId` / `seq`，并纳入去重身份
- 自动重连客户端路径由 fake WebSocket 覆盖
- SIL session 明确 `simulated: true`；bridge 必须显式 `--origin hardware` 才标记硬件

仍未完成：

- 应用整体重启
- 持久化删除后重新加载的端到端验证
- 真实设备时钟漂移
- 真实适配器 origin/pseudonym/adapterVersion 的 HIL 验证

> SignalSession 存储适配层的保存—撤回—重载已验证；Tauri 应用重启、其他存储副本清理及研究数据库的端到端删除尚未验证。

### B. Capture schema — 部分通过

已完成证据：

- `src/research-capture.test.ts`（5 tests；含撤回/采集顺序）
- 物理通道 `physicalKind` 与派生特征 `derivedFrom` 分离
- 物理通道名称唯一性
- `features_only` 不得携带 raw format/bytes/sha256
- `raw_signal` 必须携带 raw provenance
- 设备 pseudonym 的 scheme/编码/长度约束
- 同意/采集/留存/撤回/删除的时间顺序
- `not_requested` / `requested` / `completed` 状态字段组合约束
- `completed` 必须有 `requestedAt`、`completedAt`、`method`

仍未完成：

- 研究数据存储、加密访问、撤回联动
- 真实设备采集 UI
- 伦理批准后的字段冻结

### C. Precision simulation — 修正后待方法学复核

已完成证据：

- `src/lsm0-precision.test.ts`（5 tests；含异质性与块长度边界）
- `pnpm lsm0:precision`
- `src/lsm0-precision.ts` 的解析 `analyticPopulationSpearman()` 与 participant-specific targets
- coverage 使用每位参与者自身的解析 population target；Monte Carlo 独立交叉验证；homogeneous 场景退化为单一 target
- 普通 bootstrap 与 non-circular moving-block bootstrap 并列
- 缺失 session 保留原始位置（null mask）
- 报告 observed SD 与 generator true effect SD 分开；moving-block 使用 `movingBlockIndices()` 严格取 n 个位置
- 6 个 SIL 场景与 precision 检查已接入 CI

仍未完成：

- 方法学复核
- 缺失机制敏感性模拟
- 块长度/区间方法的选择依据
- 基于 precision report 的样本量冻结

### D. 产品/研究边界 — 契约成立，执行未验证

- 产品摘要与 research capture schema 分离
- 研究采集存储未实现
- 不声称已具备真实研究采集能力

## 仍为未通过

- Gate 2A HIL：无真实设备
- Gate 2B：无真实测量可靠性证据
- Gate 3A/3B：无伦理批准数据/独立复现
- v0.1.3：未发布

## 结论

`7b145d2` 的实现基线保留；修正后的状态是：

> **PARTIAL — CORRECTIONS APPLIED; RE-REVIEW REQUIRED**

不得签署为“Gate 2 pre-hardware 无条件通过”。
