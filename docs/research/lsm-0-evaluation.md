<!--
SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
SPDX-License-Identifier: CC-BY-4.0
-->
# LSM-0 evaluation protocol

日期：2026-11-01。状态：协议草案；未招募、未采集、未训练、未获伦理批准。

## 问题

在多模态、明确同意的小样本中，躯体自报、意象选择、关系触发与生理/声音信号之间，是否存在**稳定、可复现**的对应？

**不是**：情绪诊断、潜意识读取、疗效验证。

## 数据

- 目标：小样本、纵向、同一参与者多次会话；具体人数在伦理方案中确定。
- 采集：v0–v3 自报 + 可选的本地声音摘要 + 经同意的 BCI/生理摘要。
- 不默认保存原始音频/神经数据；只保存摘要与派生特征。
- 每个 session 都可单独删除；导出前再次确认。

## 假设

- H1：同一参与者的身体位置/感觉/意象组合在重复会话中具有一定稳定性。
- H2：部分信号摘要与自报强度/呼吸存在可复现的 session 内关联。
- H3：关系触发点的用户自述结构可与母题并列，但**不**用于推断他人。

## 分析

- 先做描述性统计与个体内相关，不把群体平均当成个体结论。
- 预注册主要指标、缺失处理与停止规则。
- 同时报告阴性结果与个体差异；不做事后挑选的“显著”故事。

## 失败条件

- 若信号与自报没有稳定对应，或效应仅由实验者引导产生，应公开否定 LSM 的当前叙事。
- 若无法保证同意、删除与数据最小化，不进入采集。

## 安全与伦理

- 机构审查、知情同意、退出机制、不良事件流程先于采集。
- 不承诺记忆再巩固、创伤改写或临床疗效。
- 不把任何结果用于诊断、保险、雇佣或对他人的判断。

## 已实现的离线基线（2026-11-06）

状态：**仅代码与合成夹具验证**；仍未招募参与者、未获伦理批准、未采集真实数据、未形成任何临床结论。本节固定 `src/lsm0-eval.ts` 中**实际实现**的指标定义，先于任何真实数据，避免事后挑选指标；`src/lsm0-eval.test.ts` 覆盖定义边界，`scripts/lsm0-baseline.ts` 提供无网络的离线 CLI。协议正文与伦理边界不变；若需改动下列指标，必须先修订本节并注明日期。

### 输入记录

支持四种本地形式（自动识别）：JSON 数组、`{"records": [...]}` 包装对象、单个记录对象、JSONL（每行一个非空 JSON 记录）。单行 JSON 解析错误记为 rejected row，不终止整批；`records` 不是数组属于 fixture 结构错误。

```jsonl
{"version":"lsm0-session-v1","participantId":"P01","sessionId":"S01","capturedAt":"2026-01-01T09:00:00Z","somatic":{"region":"chest","sensation":"pressure","intensity":3,"breath":"held","fragments":["wet-corridor"]},"signals":{"heartRateBpm":70,"edaMicroSiemens":2.1},"simulatedSignals":true}
```

- `version` 必须为 `lsm0-session-v1`；`participantId` / `sessionId` 为 1–200 字符、去首尾空白、不含控制字符；`capturedAt` 必须可解析并归一化为 UTC ISO 字符串。
- `somatic` 复用 `src/somatic.ts` 的 `SomaticCapture` 校验；`fragments` 为 1–3 个已知意象碎片。
- `signals` 全部可选，仅接受固定键：`heartRateBpm`、`edaMicroSiemens`、`breathRatePerMin`、`voiceRmsMean`、`voicePauseRatio`。
- 数值合理性边界只用于剔除明显损坏的值，**不是**临床阈值：`heartRateBpm` ∈ (0, 300]；`edaMicroSiemens` ≥ 0；`breathRatePerMin` ∈ (0, 120]；`voiceRmsMean` ≥ 0；`voicePauseRatio` ∈ [0, 1]。
- 缺失信号不插补：该 session 不参与相应指标。可选信号值非法（非数字、非有限、越界）时**丢弃该值并记 warning**，session 仍保留；未知信号键记 warning 并忽略。
- 重复的 `(participantId, sessionId)` 只保留一条：按 `capturedAt`、`sessionId`、输入行号排序后的第一条，其余记为 `duplicate_session` 并计数。
- `simulatedSignals: true` 表示信号为合成/模拟数据；报告中单列计数并标注非生理证据。`false`/缺失按非合成处理。
- `symbolic` 可选：`{"format":"encounter"|"space","motifs":["door","corridor"],"figure":"shadow"}`；`motifs` 1–3 个可打印字符串，`figure` 可打印字符串。缺失表示该 session 没有符号空间参数，不插补；格式非法只记 warning 并忽略该字段，不丢弃 session。

### 特征展平

每个 session 展平为：`participantId`、`sessionId`、`capturedAt`、`region`、`sensation`、`breath`、`intensity`（1–5）、`primaryFragment`（`fragments[0]`，保留用户选择顺序）、`fragmentSet`（去重后按 UTF-16 码元排序）、固定键的 `signals`、`simulatedSignals`。

### 个体内稳定性（每参与者）

- **分类众数占比**：对 `region`、`sensation`、`breath`、`primaryFragment` 分别计算 `modeShare = 众数出现次数 / session 数`，并报告 `distinctValues` 与众数值 `modalValue`。众数并列时取字符串码元序最小者；占比不受影响。有效 session 数 < 2 时为 `null`（不猜测）。
- **强度稳定性**：`intensityStability = 1 - (max(intensity) - min(intensity)) / 4`；1–5 量程的极差上限为 4，故取值在 [0, 1]。有效 session 数 < 2 时为 `null`。
- **意象集合稳定性**：同参与者所有 session 两两的 Jaccard 相似度 `|A ∩ B| / |A ∪ B|` 的算术平均（只对非空并集计数）；有效 session 数 < 2 时为 `null`。
- **信号描述量**：对每个信号分别报告有效值数 `n`、均值、样本标准差（分母 `n - 1`，`n < 2` 时 `null`）、变异系数 `cv = sd / mean`（`mean = 0` 时 `null`）、最小值、最大值。**不**把 CV 命名为稳定性，也不做阈值判定。
- **覆盖率**：`coverage = 有效信号值数 / 该参与者 session 数`。同时报告缺少该信号的 session 数，以及完全没有任何信号的 session 数。

### 个体内关联（预注册、仅两个固定配对）

- 固定配对只有两个：`intensity ~ heartRateBpm` 与 `intensity ~ edaMicroSiemens`。其他配对、亚组、阈值或滞后分析不在本基线内；新增即协议修订。
- 方法：Spearman 秩相关。并列值取平均秩，在秩上计算 Pearson 相关，结果保留 6 位小数。
- 仅使用同一 session 同时具有自报强度与该信号值的配对；最少 `4` 对，否则状态为 `insufficient_pairs`、`rho = null`。
- 任一序列秩方差为 0 时状态为 `zero_variance`、`rho = null`（例如强度始终相同）。
- 不计算 p 值、不报告显著性、不做事后指标/配对/阈值挑选。缺失值不插补，也不因结果剔除参与者。

### 符号空间参数（可选）

- 只统计带有 `symbolic` 的 session；缺失不插补。
- **primary motif**：`symbolic.motifs[0]` 的众数占比；与 region/sensation 使用相同的 `categoricalStability` 定义，少于 2 个符号 session 时为 `null`。
- **motif-set stability**：每个 session 去重后的 motif 集合的平均两两 Jaccard；少于 2 个符号 session 时为 `null`。
- **figure stability**：`symbolic.figure` 的众数占比；少于 2 个符号 session 时为 `null`。
- **somatic~symbolic paired counts**：对 `(region, sensation, primaryMotif)` 做描述性计数，按 count、region、sensation、motif 排序；不做卡方、p 值、因果或临床推断。
- 汇总只取有定义值的参与者中位数，并同时报告 `sessionsWithSymbolic` 计数。
- 本机导出器从母题的 `symbolic` 字段读取符号空间参数；旧母题没有该字段时保持缺失，不合成。

### 汇总（跨参与者）

- 每个参与者指标单独报告，包括 session 不足者（对应指标为 `null`），不做按结果筛选。
- 跨参与者只取已定义值的**中位数**（偶数个取中间两个均值，保留 6 位小数），并同时给出有值参与者数；关联汇总额外给出正/负/零符号计数。
- 中位数是描述性汇总，**不是**群体推断，也不能替代个体结论；不做组间显著性检验。

### 确定性与缺失处理约束

- 参与者按 `participantId` 码元序排序；session 按 `capturedAt`、`sessionId` 排序；issues 按行号、代码、detail 以及参与者/信号上下文排序。
- 指标在内部保留 6 位小数；文本报告显示时四舍五入到 3 位小数。JSON 报告包含 6 位小数。
- 报告不含当前时间、随机数或环境信息；同一输入总是产生相同 JSON。
- 所有缺失都显式暴露为 `null` / `insufficient_pairs` / `zero_variance` / warning / rejected row，不做静默填补。

### CLI 用法

```bash
# 打印文本报告
pnpm tsx scripts/lsm0-baseline.ts --in /tmp/lsm0-fixture.jsonl

# 同时写出确定性 JSON 报告
pnpm tsx scripts/lsm0-baseline.ts --in /tmp/lsm0-fixture.json --out /tmp/lsm0-report.json

# 查看帮助
pnpm tsx scripts/lsm0-baseline.ts --help
```

- `--in <path>` 必填；`--out <path>` 可选。不新增依赖，只读本地文件，无网络。
- 退出码：`0` 成功；`1` 读取/评估失败；`2` 用法错误。
- CLI 文本与 JSON 字段使用英文；基线不产生任何诊断或风险分值。
- 仓库内不提交真实或可识别的参与者数据；测试与演示只用合成夹具（见测试文件），CLI 演示夹具放在仓库外。

### 不确定性与阴性对照（2026-11-06）

- 每个 session 可选 `agency`：approach/stay/resume/leave/reenter 次数、leftEarly 与 durationSec；只做描述性汇总。
- 每个 session 的 `somatic.certainty` 可选为 `clear` / `mixed` / `unsure`；报告只做描述性计数与 mode share，缺失不插补。
- CLI 可加入确定性阴性对照：

```bash
pnpm lsm0:baseline --in fixture.jsonl --negative-control --seed 7
```

- 阴性对照在**同一参与者内**打乱每个信号的实际值，保留缺失模式，再重算固定两个 Spearman 配对。
- 报告同时列出真实关联与阴性对照；不计算 p 值，也不做显著性检验。
- 阴性对照用于检查“结果是否可能只是配对结构的产物”，不是证明或否定 LSM。

### 与“已验证临床结果”的区别

本基线的通过项只说明代码可运行、指标定义可复现、缺失与排序行为确定；它**不**说明 LSM 假设成立，也不构成信度、效度、疗效或临床有效性证据。只有在伦理批准、预注册、足够样本与独立复现之后，且仍按本节的阴性结果与个体差异报告规则执行时，才可能讨论研究结论；任何结果都不得用于诊断、保险、雇佣或对他人的判断。


### 本地数据导出器（2026-11-06）

`scripts/lsm0-export.ts` 把 `local-dataset-v2` 中的母题转换为 LSM-0 输入，避免手工拼接 fixture：

```bash
pnpm lsm0:export --dataset tacitweave-local-dataset.json --participant P01 --out /tmp/lsm0-fixture.json
pnpm lsm0:baseline --in /tmp/lsm0-fixture.json
```

- 一个母题对应一个 session；`sessionId` 使用母题 id，`capturedAt` 使用母题创建时间。
- 只映射母题中已有的语音摘要（`voiceRmsMean`、`voicePauseRatio`）；不伪造心率/EDA。
- 独立 signal sessions、关系触发点和捕获出处没有可靠的母题 join key，导出器会明确警告并跳过。
- 导出器只做格式转换，不推断参与者身份、同意或临床有效性；`participantId` 由调用者显式提供。


## 研究前先读

- [Gate 2A/2B checklist](gate-2-checklist.md)
- [LSM-0 protocol v1](lsm-0-protocol-v1.md)
- [Preregistration skeleton](preregistration-skeleton.md)
- [Research capture schema](research-capture-schema.md)

LSM-0 的人类数据采集必须等 Gate 2B、伦理批准和预注册，不得用产品摘要直接替代研究原始数据。

## 理论定位（2026-11-06）

LSM-0 不是“潜意识读取”实验，也不是意识理论的判决实验。它是一个**理论中立的描述性基线**，用于检验：

- 前语言的身体—意象—关系模式是否有可复现的个体内结构；
- 可选信号摘要与躯体自报是否存在个体内关联；
- 符号空间参数是否与身体—意象模式存在描述性对应；
- 不确定性与主动选择是否让这些关系更可解释。

本基线不把 Friston 的自由能原理、Levin 的多尺度 agency 或 Yamanaka 的细胞重编程当作疗效或意识证据。详细边界见 [theory positioning](theory-positioning.md) 与 [consciousness brief](consciousness-and-plasticity-brief.md)。
