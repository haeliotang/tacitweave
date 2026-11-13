<!--
SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
SPDX-License-Identifier: CC-BY-4.0
-->
# LSM-0 group-mean inference audit

日期：2026-11-13。状态：模拟方法审查；不是实证结果，也没有批准任何区间方法。

## 问题

前一轮发现 participant-level bootstrap 区间在短序列、自相关下覆盖不足。一个可能
的补救是把 estimand 改为 **组内相关系数的组均值**，并用 participant-cluster
bootstrap 重采样参与者。

本审计比较：

- participant-cluster bootstrap 区间
- participant-level 正态近似区间（naive normal）

目标都是 group mean of within-person Spearman。

## 运行

```bash
pnpm lsm0:mean-audit
```

80 replications，100 cluster-bootstrap replicates，名义 95% 区间。

## 结果

| 场景 | target mean | observed mean | cluster coverage (width) | naive coverage (width) |
| --- | ---: | ---: | ---: | ---: |
| AR=0 | 0.257 | 0.233 | 0.900 (0.306) | 0.925 (0.334) |
| AR=0.5 | 0.257 | 0.195 | 0.825 (0.312) | 0.850 (0.338) |
| AR=0.8 | 0.257 | 0.141 | 0.688 (0.310) | 0.738 (0.338) |
| missing=0.4 | 0.257 | 0.187 | 0.863 (0.406) | 0.863 (0.451) |
| heterogeneity SD=0.2 | 0.255 | 0.194 | 0.838 (0.326) | 0.912 (0.354) |
| 12×8 sessions | 0.257 | 0.207 | 0.875 (0.396) | 0.925 (0.433) |
| 24×12 participants | 0.257 | 0.208 | 0.863 (0.230) | 0.912 (0.244) |

## 解释

- 组均值并没有解决自相关问题；AR=0.8 时 observed mean 明显偏低。
- participant-cluster bootstrap 在所有列出的场景中都**没有达到**名义 95% 覆盖，
  且通常比 naive normal 更差。
- 24 位参与者降低了宽度，但没有修复覆盖。
- 这再次说明：不能因为“用了 cluster bootstrap”就宣称区间可靠。

## 决策

1. 不批准 participant-cluster bootstrap 作为主推断区间。
2. 不批准 naive normal 作为默认；它只是比较基线。
3. 如果继续做组均值，必须报告 **bias**（observed vs target）与 **coverage**，不能只报 CI。
4. 在协议冻结前应评估明确的层级/贝叶斯模型或其他校准方法；若仍失败，研究转为
   描述性/预注册估计。
5. 不报告 p 值，不把区间跨零当作结论。

## 限制

- 模拟生成器仍是简化 AR(1) + 独立缺失，不是 CASE/QoL/WESAD 的实证结果。
- 没有模型选择或临床声明。
- 组均值目标在 participants 可评估集合上计算，真实缺失机制更复杂。
