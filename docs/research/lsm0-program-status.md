<!--
SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
SPDX-License-Identifier: CC-BY-4.0
-->
# LSM-0 Public Data & Construct Validation Program: status

日期：2026-11-13。
状态：工具/协议层阶段；**没有 A/B/C 的实证支持**，没有人数据，没有 LSM-1 模型。

## 1. 三个问题与当前回答

### Q1：分析程序能否处理真实多模态时间序列？

**部分可以，范围有限。**

已完成：

- CASE snippet（2 人，22 个视频片段）的 CSV → canonical → report；
- QoL_Stress（66 人，132 个 phase）的 CSV → canonical → import check；
- 两个 bundle 的 manifest 验签；
- 第二环境重算 CASE GSR 相关；
- 缺失不插值、质量排除可见；
- 时间结构对照（circular shift / shuffled）可见。

未完成：

- WESAD 真实运行；
- 多设备/活动状态分层；
- 真正的 raw-to-feature 复算链（CASE 仅片段均值）；
- 独立分析者重算完整 bundle。

### Q2：构念能否定义成与一般唤醒/习惯/引导不同的可证伪假设？

**已写成矩阵，但未检验。**

- `src/construct-validity.ts` 强制每个 claim 有竞争解释、判别测试和失败条件；
- A：tooling_only
- B：not_tested
- C：tooling_only
- 没有 claim 被标为 supported。

### Q3：主动行为是否可能是新的独立观测？

**评估框架已建立，但没有真实数据。**

- LSM-1 evaluator 用固定时间切分；
- 拒绝 `system_inferred` / `derived_from_inputs` 行为；
- 拒绝 action 在 outcome 之后的泄漏；
- constant / last-history / X+H / full 基线；
- 合成 planted 可检出，null 不误报。

没有真实 Y_future、没有 LSM-1 模型。

## 2. 证据阶梯

| Gate | 状态 |
| --- | --- |
| Gate 1 工程发布 | v0.1.4 已发布；签名/macOS 资产仍缺 |
| Gate 2A 真实管线 | SIL/bridge 测试；真实设备 HIL 未做 |
| Gate 2B 测量有效性 | 未开始；无真实设备 |
| Gate 3A 预注册先导 | 预注册草案；无伦理批准/参与者 |
| Gate 3B 独立复现 | 未开始 |
| Gate 4A/4B | 未开始 |

## 3. 方法学结论

### 已淘汰/未批准

- 普通 bootstrap 区间：覆盖不足；
- moving-block bootstrap：本模拟更差；
- participant-cluster bootstrap：未通过覆盖；
- Fisher-z random-effects：AR≤0.5 接近名义，但 AR=0.8 仍失败；
- 因此**没有批准的推断区间方法**。

### 已实现的防护

- AR helper 与暂定门槛（未冻结）；
- evidence manifest 验签；
- 研究存储合成生命周期；
- 表示来源/修订/稳定性指标。

## 4. 公开数据 bundle

| 数据集 | 角色 | 结论 |
| --- | --- | --- |
| CASE snippet | 连续自报 + 生理管线 | 22 sessions；2 人；仅管线检查 |
| QoL_Stress | 导入/缺失/联动 + phase 检查 | 132 sessions；STAI phase 差异；简单 HRV 增加但未验证；HR/EDA 均值无简单变化；harness 拒绝 rho |
| WESAD | 多设备/活动混杂 | adapter 契约 + 合成 fixture；未运行真实数据 |

两个正式 bundle 的 hash 和验证命令见：

- [CASE evidence bundle](case-evidence-bundle.md)
- [QoL evidence bundle](qol-evidence-bundle.md)

## 5. 不能说的话

- 不能说前语言假设已被证明；
- 不能说信号“读取”了潜意识；
- 不能说 CASE/QoL 支持 Tacitweave 构念；
- 不能说 LSM-1 已训练或有效；
- 不能说区间方法已校准；
- 不能说公开数据 bundle 是独立实证复现。

## 6. 下一步决策

1. 是否提供/获取 WESAD 数据；若否，保持 adapter 契约而非伪造结果。
2. 冻结 AR 阈值前，先完成随机效应的实际 session 数校准与第二分析者复核。
3. Gate 2A 设备选择；没有设备就不进入人体研究。
4. 预注册仍需伦理批准后才能注册。
5. CASE 若要更强证据，需要完整 30 人数据 + raw-to-feature 复算。
