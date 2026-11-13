<!--
SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
SPDX-License-Identifier: CC-BY-4.0
-->
# LSM-0 interval-method audit

日期：2026-11-13。状态：模拟方法审查；不是实证结果。

## 问题

在短 session 序列、自相关和缺失条件下，普通 bootstrap 与 moving-block bootstrap
是否给出可靠的区间？如果不可靠，必须在协议冻结前淘汰或降级为描述性诊断。

## 运行

```bash
pnpm lsm0:method-audit
```

设置：

- 80 replications，80 bootstrap replicates
- 12 participants × 12 sessions（除敏感性场景）
- 名义 95% 区间
- 目标：解析 population Spearman，而非 latent coupling

## 结果

| 场景 | ordinary coverage | block coverage | ordinary width | block width |
| --- | ---: | ---: | ---: | ---: |
| AR=0 | 0.939 | 0.879 | 1.162 | 1.064 |
| AR=0.5 | 0.927 | 0.871 | 1.163 | 1.073 |
| AR=0.8 | 0.919 | 0.853 | 1.180 | 1.097 |
| missing=0 | 0.951 | 0.892 | 1.092 | 1.001 |
| missing=0.2 | 0.943 | 0.905 | 1.249 | 1.196 |
| missing=0.4 | 0.921 | 0.867 | 1.464 | 1.398 |
| heterogeneity SD=0.2 | 0.925 | 0.875 | 1.155 | 1.068 |
| 12×8 sessions | 0.912 | 0.830 | 1.441 | 1.274 |
| 24×12 participants | 0.929 | 0.878 | 1.157 | 1.082 |

## 解释

- 两种方法在这些短序列假设下都低于名义 95% 覆盖率。
- **moving-block bootstrap 没有自动修复问题**；在本模拟中它反而更窄、覆盖率更低。
- 缺失率升高会扩大区间并降低覆盖率；8 sessions 比 12 sessions 更差。
- 参与者数增加到 24 主要改善稳定性，并不修复区间标定。
- 这使得“用 block bootstrap 作为主区间”不可接受。

## 决策

1. 不把普通或 moving-block bootstrap 作为已批准的推断区间。
2. 只把它们作为敏感性/描述性诊断，并明确名义覆盖失败。
3. 在协议冻结前比较其他区间方法（如 participant-level 聚类、贝叶斯层级模型或明确的校准模拟），并保留失败场景。
4. 不报告 p 值，不把区间跨零当作支持/不支持。
5. 如果无法得到可校准区间，研究设计应改为描述性/预注册估计，而不是假装有推断。

## 随机效应候选

Fisher-z random-effects 候选见 [lsm0-random-effects.md](lsm0-random-effects.md)。AR-adjusted effectivePairs 版本在模拟中接近/超过名义覆盖，但更保守、AR=0.8 仍有 bias；不能无条件批准。

## 组均值后续

组均值 + participant-cluster bootstrap 的后续审计见 [LSM-0 group-mean inference audit](lsm0-mean-inference.md)。它同样未通过覆盖审查；不能把 cluster bootstrap 当作默认补救。

## 限制

- 这些是生成模型假设下的模拟，不是 CASE/QoL/WESAD 的实证结果。
- AR(1) 与独立缺失是简化；真实数据可能有非平稳、设备漂移和活动混杂。
- 没有进行模型选择或临床声明。
