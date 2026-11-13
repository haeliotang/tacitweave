<!--
SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
SPDX-License-Identifier: CC-BY-4.0
-->
# Construct Validity Matrix

日期：2026-11-13。状态：研究设计工具；当前没有支持 B/C 的实证证据。

## 三个命题

- **A｜表示命题**：前语言经验可以获得可操作的象征形式。
- **B｜对应命题**：部分经验与生理信号存在可复现的对应。
- **C｜增量命题**：新的跨模态表示/主动行为具有超出既有基线的增量预测价值。

三者不能互相替代。A 不证明 B；B 的相关不证明 C；C 的预测提升也不自动证明
构念有效。

## 矩阵

| 命题 | 操作化变量 | 主要竞争解释 | 判别性检验 | 失败条件 | 当前状态 |
| --- | --- | --- | --- | --- | --- |
| A | 身体位置、感觉、强度、呼吸、意象、关系瞬间、主动选择 | 提示诱导、UI 布局、重复习惯、需求特征、社会赞许 | 改变提示/布局后的稳定性；用户修订率；来源审计；退出/跳过机制 | 记录主要随提示变化，或来源无法区分 | 契约 v0.1；无实证稳定性数据 |
| B | ECG/EDA/PPG/呼吸特征 与 自报强度/确定度 | 一般唤醒、运动/姿态、设备差异、时间趋势、自报偏差 | 保留时间结构的阴性对照；设备/活动状态分层；重测可靠性；阳性对照 | 关联不超过阴性对照，或依赖单一排除规则 | 只有离线工具与公开数据计划；无 Tacitweave 实证 |
| C | 未来独立结果 Y；输入 X；历史 H；主动行为 A | 信息泄漏、基线不足、过拟合、时间穿越、行动只是自报的另一编码 | 固定时间切分；X+H 基线；非交互基线；合成数据植入检验；独立复现 | 加入 A 后样本外无稳定提升，或只在泄漏条件下提升 | 评估契约设计中；无模型结论 |

## 横切要求

### 测量效度不等于构念效度

即使信号特征可靠，也只说明仪器重复性；不说明它测到了“前语言结构”。

### 构念区分

必须预先指定：

- 与一般生理唤醒的区分
- 与运动/姿态/接触质量的区分
- 与自报习惯、时间趋势、重复提示的区分
- 与需求特征/实验者期待的区分
- 与简单历史基线（上一次自报、session 序号）的区分

### 失败必须可发表

每个核心主张至少有一个明确的失败条件；失败不得改写成“个体差异”或
“亚组效应”而不预先注册。

## 当前判断

- A：可作为产品/表示研究问题；尚无稳定性实证。
- B：没有真实设备或公开数据复分析证据；不能声称。
- C：没有评估结果；不能声称。
- 临床价值：不在当前范围。

## Executable registry

`src/construct-validity.ts` makes the matrix machine-checkable:

- each claim has an operationalization, at least one competitor, and at least one test;
- each test must have an explicit failure condition;
- a claim cannot be `supported` without listed evidence;
- current statuses are `tooling_only` (A/C) and `not_tested` (B), not supported.

```bash
pnpm test src/construct-validity.test.ts
```

This prevents the README or a future analysis from silently upgrading a tooling
artifact into an empirical finding.
