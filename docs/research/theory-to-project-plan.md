<!--
SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
SPDX-License-Identifier: CC-BY-4.0
-->
# 从意识/潜意识文献到项目改动：开发方案

日期：2026-11-06。状态：方案先行，分批落地。

## 0. 原则

这份方案把 [意识、潜意识与可塑性文献简报](consciousness-and-plasticity-brief.md) 的六条建议转成项目改动。原则：

- 不把 FEP 当成已经证明的意识理论；
- 不把 Levin 的 TAME/生物电直接外推为人类潜意识；
- 不把 Yamanaka 的细胞重编程外推为心理“重置”；
- 所有新增界面都保留用户解释权、退出权、撤回权；
- 所有研究指标先写入协议，再采集；不做 p 值挑选；
- 先做可逆、可测试的最小改动，不做大规模重写。

## 1. 六条建议与落地拆解

### 1.1 重写项目叙事

目标：把“读取深层潜意识”改成“研究前语言的身体—意象—关系预测模型”。

改动：

- README 增加 Research framing；
- LSM-0 protocol 增加理论定位；
- 新增/更新 `docs/research/theory-positioning.md`；
- 保留“深层潜意识”作为项目命名，但明确不是临床对象。

验收：

- 中英文 README 与 LSM 文档中不再出现“系统读取/解码潜意识”的肯定表述；
- 明确写出“不证明意识理论、不做临床诊断”。

### 1.2 身体捕获加入不确定性

目标：允许“说不清/矛盾/不确定”，而不是强迫用户把体验压成确定标签。

改动：

- `SomaticCapture` 增加可选 `certainty: 'clear' | 'mixed' | 'unsure'`；
- 兼容旧 capture（无 certainty）；
- SomaticEntry 增加“确定程度”选择；
- Motif 详情与本地导出展示；
- LSM session 读取 certainty，并输出描述性分布/覆盖率；
- 测试覆盖旧数据、合法/非法 certainty。

验收：

- 旧数据仍可导入/显示；
- 新 capture 可保存/导出/加密备份；
- LSM 报告显示 certainty 但不据此诊断。

### 1.3 象征空间定位为受控想象

目标：把 symbol space 明确为“受控想象/生成模拟”，不是潜意识解码器。

改动：

- Symbolic renderer 文案与入口说明改为“进入一段可退出的想象空间”；
- 记录用户主动选择（靠近/停留/离开）作为 agency 事件；
- LSM-0 支持可选 `agency` 摘要（approach/stay/leave 次数、exit 时间）；
- 不把停留时长当作疗效/沉浸分数。

验收：

- UI 明确“不是解释/不是读取”；
- agency 事件可导出；没有 agency 数据时不报错；
- 测试覆盖事件记录与缺失。

### 1.4 关系拓扑只显示用户自己的先验

目标：防止拓扑被误读为对他人/依恋类型的推断。

改动：

- 关系拓扑页面/README 增加边界说明；
- 组件测试固定“无他人推断词汇”；
- LSM/导出不把关系拓扑写成对方模型。

验收：

- 文案不出现“看透对方/依恋类型/人格判断”；
- 组件只统计用户自述字段。

### 1.5 LSM-0 增加不确定性与阴性对照

目标：让 LSM-0 更接近可证伪的测量，而不是只报告显著相关。

改动：

- 协议预注册 uncertainty/precision 与 agency/exit 的描述性指标；
- 增加 shuffled-signal 阴性对照：在同一参与者内确定性打乱信号值，重算固定 Spearman 配对；
- 报告真实值与阴性对照，不计算 p 值；
- 保持固定指标、缺失不插补、无事后挑选。

验收：

- `pnpm lsm0:baseline --in fixture --negative-control` 可用；
- 输出包含 negative-control 结果；
- 测试覆盖确定性、缺失与 insufficient pairs；
- 文档明确阴性对照不是统计显著性检验。

### 1.6 Yamanaka 边界写入文档

目标：防止把细胞可塑性偷换成心理治疗承诺。

改动：

- 理论简报、LSM 文档、README 的 research framing 写明：
  - iPS 研究不等于意识研究；
  - 细胞重编程不等于心理创伤重编程；
  - 不使用“reset/重编程”描述心理改变。

验收：

- 搜索 `reprogram` / `重编程` 时，项目文档有明确边界；
- 不出现疗效承诺。

## 2. 实施顺序

1. **P1 文档与叙事**：README、theory positioning、LSM protocol。
2. **P2 身体不确定性**：类型、UI、持久化、测试、LSM certainty。
3. **P3 象征空间 agency**：事件记录、导出、LSM agency。
4. **P4 LSM 阴性对照**：CLI、协议、测试。
5. **P5 边界审计**：关系拓扑与 Yamanaka 文案、全库检索。
6. **P6 验证**：`pnpm test`、`pnpm e2e`、`pnpm build`、`cargo test`、必要时 Tauri 包。

## 3. 不做的事

- 不引入“意识检测”指标；
- 不把 FEP、TAME、iPS 当作项目疗效证据；
- 不添加自动解释/诊断；
- 不把关系拓扑用于推断他人；
- 不把用户停留时长、信号强度包装成潜意识读数；
- 不在没有伦理批准时采集真实参与者数据。

## 4. 第一轮验收

P1/P2/P3/P4/P5 已完成。下一步：

- README 中英文 research framing；
- theory positioning 文档；
- LSM 协议理论定位；
- `SomaticCapture.certainty` 类型与兼容校验；
- 更新测试；不改动发布 tag。


## 5. 完成状态（2026-11-06）

- P1 叙事：README 中英文 research framing + theory positioning + LSM protocol 理论定位。
- P2 不确定性：`SomaticCapture.certainty`、UI、持久化、LSM 描述性报告。
- P3 象征空间：approach/stay/resume/leave/reenter agency 事件、会话持久化/导出/撤回；修复离开覆盖层溢出。
- P4 关系边界：关系拓扑文档复核；固定用户自述、不做对方推断。
- P5 LSM：certainty、agency/exit 摘要、`--negative-control --seed` 确定性阴性对照。
- P6 验证：150 Vitest、22 Playwright、6 Rust、Tauri 8.4 MiB；CI 通过。

保留的限制：LSM 的 `certainty` 是自报确定度，不是计算精度；阴性对照不是显著性检验；项目仍不提供临床或意识理论证明。
