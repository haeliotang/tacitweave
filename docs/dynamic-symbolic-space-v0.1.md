<!--
SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
SPDX-License-Identifier: CC-BY-4.0
-->
# Dynamic symbolic space v0.1

日期：2026-11-14。状态：产品候选；不是科学有效性声明。

## 目标

把固定的 75 秒相遇和 180 秒空间，扩展为用户可以主动继续停留的空间，而不是在计时结束后强制退出。

## 行为

- 75 秒结束后显示：
  - 「继续停留 30 秒」
  - 「再进入一次」
- 180 秒空间在控制栏中直接提供「继续停留 30 秒」；每次延长 30 秒
- 每次继续停留都会记录：
  - `action: 'extend'`
  - `atSec`
  - `durationSec`（新的总时长）
- 原 `InnerPlan.durationSec` 不被改写；
- 当前 session 的 `durationSec` 使用用户实际选择的总时长；
- 重新进入会清空本次延长，回到原计划时长；
- 不自动延长，不根据停留时间推断心理状态。

## 开放空间

Space Composer 还提供：

> **开放空间（不自动结束）**

- `format: 'open'`
- 计时只向上累计，不触发自动结束；
- 不显示固定进度条；
- 不显示 30 秒延长按钮；
- 用户通过「离开」结束；
- `durationSec` 在 session 中只作 nominal（180 秒）记录，不表示结束边界；
- `SymbolicSession.openEnded = true`。

## 空间内部形象改变

空间运行期间，用户可以通过控制栏的「意象」与「形象」选择：

意象：走廊、门、水、房屋、森林、车站、镜子、田野。

形象：

- 不需要形象
- 影子
- 陌生人
- 孩子
- 动物

改变会立即反映在空间里，并记录：

```ts
{ atSec, action: 'change', change: { field: 'motif', value: 'water' } }
{ atSec, action: 'change', change: { field: 'figure', value: 'animal' } }
```

这不是系统自动生成或心理推断，只是用户在空间内的显式选择。

## 用户体验

- 进度条和时间显示实际选择的时长；
- 用户可以在结束后选择继续或重新进入；
- 关闭/离开仍随时可用；
- 延长只改变产品时长，不改变空间内容或解释。

## 边界

- 不把停留时间称为“投入”“疗愈”或“进展”；
- 不把延长次数作为心理学测量；
- 不根据延长行为推断潜意识；
- 不声称产品帮助人表达前语言经验；
- 不改变 LSM 研究的 blocked 状态。

## 验证

- `symbolic-session` 单元测试验证 `extend` 事件和 session duration；
- 原有 E2E 与连续性 E2E 继续通过；
- 构建通过。
