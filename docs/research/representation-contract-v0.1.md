<!--
SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
SPDX-License-Identifier: CC-BY-4.0
-->
# Representation Contract v0.1

日期：2026-11-13。状态：研究契约；不是心理结构发现，不是临床量表。

## 目的

Tacitweave 的身体位置、意象碎片、关系瞬间和主动行为，到底记录了什么？
本契约回答的是一个更窄的问题：

> 每条记录的信息来源、修订关系和可用范围，是否可以被审计？

没有这个契约，后续的“稳定性”“个体内关联”“增量预测价值”都可能是把
系统生成、提示诱导和用户输入混在一起后得到的虚假结构。

## 不主张什么

- 不主张某个身体位置对应某种情绪。
- 不主张某个意象碎片对应某段记忆。
- 不主张系统推断等于用户确认。
- 不主张字段稳定就等于构念有效。

它只建立表示层的最低可审计条件。

## 来源分类

| Source | 含义 | 能不能当作独立观测？ |
| --- | --- | --- |
| `user_input` | 用户直接选择/填写/操作 | 可以，但仍需测量可靠性 |
| `user_confirmed` | 用户明确确认了系统提出的一条记录 | 只能作为确认，不可伪装成首次输入 |
| `system_generated` | 系统根据规则/模板生成 | 不可以 |
| `system_inferred` | 系统推断，需要 generator 与 basis | 不可以 |

`system_inferred` 不能因为“看起来合理”就升级为 `user_input`。
`user_confirmed` 必须指向一条真实存在、kind 和 value 相同的目标记录。

## 记录字段

```text
version        representation-contract-v0.1
id             稳定记录 id
sessionId      同一 session
participantCode 可选匿名代码
kind           body_region / sensation / intensity / breath /
               image_fragment / relationship_moment /
               symbolic_choice / agency_action / self_report
value          有限数值、字符串、布尔或字符串数组
source         user_input / user_confirmed / system_generated / system_inferred
recordedAt     ISO 时间
revision       正整数
replaces       被替换的旧记录 id（若有）
generator      系统生成/推断来源（系统记录必填）
basis          推断所依据的记录 id（推断必填）
confirms       用户确认目标 id（user_confirmed 必填）
observedAt     主动行为发生时间（独立 agency 观测必填）
```

## 不变量

1. 每个记录必须带 source；没有来源的记录不能进入研究数据。
2. `system_generated` / `system_inferred` 必须有 generator。
3. `system_inferred` 必须有非空 basis。
4. `user_confirmed` 必须有 confirms，且目标 kind/value 一致。
5. revision 必须是正整数；`replaces` 必须指向同一 session、同一 kind 的前一版。
6. 修订链不能成环；id 不能重复。
7. 只有 `agency_action` + `user_input` + 有效 `observedAt` + 无 basis 才算独立主动行为观测。
8. 推断产生的行为不能当作独立观测。

## 反例集合

| 反例 | 为什么失败 | 期望 |
| --- | --- | --- |
| C1：系统把用户没选过的“压抑”标签写成 `user_input` | 把推断伪装成输入 | 拒绝 |
| C2：用户确认了“紧”，系统确认记录 value 却是“松” | 确认目标不一致 | 拒绝 |
| C3：修订直接覆盖原记录、revision 跳号 | 无法审计变化 | 拒绝 |
| C4：用 UI 停留时间推断“靠近”，并当作独立行为 | 推断不是新观测 | 不授予 independent |
| C5：系统生成的 symbolic_choice 被加入增量模型，声称是新信息 | 确定性转换没有新增观测 | 研究分析不得视为独立观测 |
| C6：同一 id 在不同 session 复用 | 无法追踪 | 拒绝 |

## 稳定性、可修订性与来源测试

对应实现与测试：

- `src/representation-contract.ts`
- `src/representation-contract.test.ts`

```bash
pnpm test src/representation-contract.test.ts
```

测试覆盖：

- 直接用户输入通过
- 无 generator/basis 的推断被拒绝
- 有 generator/basis 的推断通过但不会被当作独立观测
- 确认目标不一致被拒绝
- 修订顺序/同 session/同 kind 被强制
- 推断行为不获得 independent 资格

## 稳定性怎么测（研究设计）

表示契约本身只保证“来源可审计”。后续稳定性研究需要单独测量：

- **重复测量稳定性**：同一状态、同一提示下的记录是否一致？
- **用户修订率**：用户多常修改系统生成/推断的记录？
- **来源一致性**：同一字段在不同 session 是否被错误升级为 user_input？
- **反事实稳定性**：改变 UI 排列/提示措辞，记录是否变化？
- **缺失机制**：用户不选、跳过、退出是否与结果相关？

这些结果才可能支持“表示稳定”的描述；仍不等于构念有效。

## 待定

- 是否允许 `user_confirmed` 作为独立观测：当前只允许其作为确认，不作为独立输入。
- 关系瞬间的“场景/反应/身体反应”是否应拆成多条记录；当前建议拆分。
- 跨 session 的同一记录身份：当前要求 `id` 全局唯一，不允许复用。
- 研究对象退出后如何标记删除：由独立研究存储生命周期处理，不在本契约内发明软删除语义。

## Executable stability metrics

`src/representation-stability.ts` adds descriptive metrics for repeated probes:

- exact kind/value agreement
- mean Jaccard agreement per kind
- revision rate
- source mix (`user_input`, `user_confirmed`, `system_generated`, `system_inferred`)

```bash
pnpm test src/representation-stability.test.ts
```

These metrics do not estimate test-retest reliability by themselves. Probe order,
prompt/layout and missingness must be reported. A stable record can still be a
prompt artifact; a changing record can still be meaningful. No p-values or
psychological-structure claim is produced.
