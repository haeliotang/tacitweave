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

## 结果

80 replications，名义 95% 区间：

| 场景 | coverage | width | bias | tau2 | I2 |
| --- | ---: | ---: | ---: | ---: | ---: |
| AR=0 | 0.950 | 0.383 | 0.014 | 0.0321 | 0.155 |
| AR=0.5 | 0.950 | 0.396 | -0.017 | 0.0377 | 0.175 |
| AR=0.8 | 0.912 | 0.408 | -0.078 | 0.0388 | 0.184 |
| missing=0.4 | 0.938 | 0.501 | -0.010 | 0.1377 | 0.464 |
| heterogeneity SD=0.2 | 0.975 | 0.414 | -0.014 | 0.0537 | 0.238 |
| 12×8 sessions | 0.938 | 0.557 | -0.049 | 0.0994 | 0.252 |
| 24×12 participants | 0.950 | 0.276 | -0.018 | 0.0281 | 0.158 |

## 第二实现

`scripts/random_effects_verify.py` 用 Python 标准库重新实现 Fisher-z + DL，读取
`[{rho, pairs}]` JSON：

```bash
python3 scripts/random_effects_verify.py --in estimates.json
python3 scripts/test_random_effects_verify.py
```

对固定估计 `[0.2, 0.5, 0.35]`（各 12 sessions），Node 与 Python 的
`meanRho=0.3561713920`、`tau2=0`、`q=0.5411806999` 在 1e-12 内一致。

这证明**实现可重复**，不等于独立数据验证，也不等于方法已校准。

## 判断

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
