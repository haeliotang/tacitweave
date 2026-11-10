<!--
SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
SPDX-License-Identifier: CC-BY-4.0
-->
# LSM-0 precision simulation

日期：2026-11-07。状态：可执行审计工具；不是功效计算，也不是研究结果。

## 目的

在冻结 LSM-0 protocol 之前，用显式模拟检查：

- 12 × 8 等候选设计是否能给出可解释的个体内相关精度
- 普通 bootstrap 与 moving-block bootstrap 在时间依赖下的差异
- 缺失、效应量、自相关和噪声假设的敏感性
- 可评估参与者比例

## 命令

```bash
pnpm lsm0:precision --replicates 200 --bootstrap 100 --block 3 --out artifacts/lsm0-precision.json
```

报告包含：

- 每个场景的参与者数 × session 数
- **population Spearman**（Gaussian 生成器的解析真值；Monte Carlo 仅作交叉验证）
- 异质性场景下每位参与者的**自身真实参数**；coverage 按参与者自己的 target 计算
- 平均观测 rho
- 观测估计 SD（不等于真实参与者效应异质性）
- 异质性场景使用每位参与者 coupling 的解析 target；homogeneous 场景自然退化为单一 target
- 解析式：`rho_P = c / sqrt((1+sx²)(1+sy²))`，`rho_S = (6/pi) asin(rho_P/2)`
- 真实参与者效应 SD（生成器参数）
- 普通 bootstrap 平均 CI 宽度与覆盖率（对 population Spearman）
- non-circular moving-block bootstrap 平均 CI 宽度与覆盖率
- 可评估参与者比例

## 重要限制

- 模拟假设不是实证估计。
- 生成模型是简化 AR(1)，不代表真实生理或自报结构。
- 普通 bootstrap 按构造忽略时间依赖，只作为对照；正式协议必须优先考虑保留时间结构的方法。
- moving-block 使用原始 session 位置与缺失掩码，非循环回绕；`movingBlockIndices()` 保证恰好 n 个位置，并可由单元测试直接检查；缺失机制仍需敏感性模拟。
- 报告不提供 p 值、临床结论或模型选择。
- 不能根据一次模拟“证明”样本量足够；必须做敏感性分析并在预注册中固定。

## 与 protocol 的关系

`lsm-0-protocol-v1.md` 中的 12 × 8 只是模拟起点。
在 precision report 审查、方法选择、样本量/精度依据固定之前，protocol 不能冻结，Gate 3A 不能开始。
