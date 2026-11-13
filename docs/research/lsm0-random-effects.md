<!--
SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
SPDX-License-Identifier: CC-BY-4.0
-->
# LSM-0 random-effects candidate

日期：2026-11-13。状态：候选方法；**尚未批准**，仍需独立校准与预注册。

## 方法

把每个参与者的 within-person Spearman 转成 Fisher z，使用 DerSimonian–Laird
随机效应模型：

- 研究内方差 `v_i = 1/(n_i - 3)`
- 估计 between-participant `tau^2`
- 加权均值与 95% 区间
- 反变换回 rho

实现：

- [`src/lsm0-random-effects.ts`](src/lsm0-random-effects.ts)
- [`src/lsm0-random-effects.test.ts`](src/lsm0-random-effects.test.ts)

```bash
pnpm lsm0:random-effects
```

## 结果（AR-adjusted effective sample size）

在原始版本上加入显式 `effectivePairs`：用每个参与者的 lag-1 AR 估计
`n_eff = max(4, n * (1 - |AR|) / (1 + |AR|))`，而不是把 session 数当作独立样本。
80 replications，名义 95% 区间：

| 场景 | coverage | width | bias |
| --- | ---: | ---: | ---: |
| AR=0 | 0.963 | 0.491 | 0.003 |
| AR=0.5 | 0.988 | 0.485 | -0.027 |
| AR=0.8 | 0.938 | 0.503 | -0.092 |
| missing=0.4 | 1.000 | 0.698 | -0.016 |
| heterogeneity SD=0.2 | 0.975 | 0.490 | -0.029 |
| 12×8 sessions | 0.988 | 0.715 | -0.058 |
| 24×12 participants | 0.975 | 0.344 | -0.030 |

与未调整版本相比，覆盖率改善，但区间更宽，部分场景出现 over-coverage；AR=0.8
仍有明显 bias。不能把“覆盖率达到 0.95”单独当作方法有效。

## 判断

这是目前最值得继续验证的候选，但仍不是批准方法：

- AR-adjusted 版本在模拟中接近/超过名义覆盖，但更保守、区间更宽；
- AR=0.8 的 bias 仍约 -0.09；
- `n_eff` 公式是近似，必须用真实数据评估；
- 仍需第二分析者复核与 Gate 2B 真实特征校准。

原未调整版本（覆盖不足）保留为负面基线。


这是目前表现最好的候选：

- AR≤0.5 时接近名义覆盖；
- 异质性与缺失没有明显破坏；
- 参与者数增加收窄宽度。

但它仍**不能无条件批准**：

- AR=0.8 时覆盖 0.912，bias -0.078；
- 80 replications 仍有蒙特卡洛误差；
- 方差公式没有显式建模自相关；
- 尚未做独立实现/第二环境复算；
- 尚未在 Gate 2B 的真实特征上检查。

## 暂定 AR 门槛

辅助实现：`src/lsm0-autocorrelation.ts`（lag-1 自相关与中位数摘要）。它只计算描述值，不自行执行门槛。


预注册草案暂定：median |lag-1 AR| > 0.5 时停止随机效应推断，只保留描述性
结果；≤0.5 仍需在实际 session 数下重跑校准模拟。该门槛尚未冻结，必须在
Gate 2B 后用真实特征重新评估，不能把本页模拟当作已批准阈值。

## 决策

1. 将 Fisher-z 随机效应列为候选主要方法。
2. 预注册必须同时规定：
   - 自相关估计与可接受阈值；
   - 若超过阈值，停止推断或改用其他方法；
   - coverage/bias 校准模拟；
   - 失败即降级为描述性。
3. 不因本表结果声称该方法已批准。
4. 仍需第二实现/独立分析者重算。

## 限制

- 模拟 AR(1) + 独立缺失，不是真实 CASE/QoL/WESAD 结果。
- `pairs` 使用 session 数，不是有效样本量；高自相关时可能高估信息量。
- 没有 p 值或临床声明。
