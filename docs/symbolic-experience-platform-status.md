<!--
SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
SPDX-License-Identifier: CC-BY-4.0
-->
# Symbolic Experience Platform 状态

日期：2026-11-14。产品层状态；不是科学有效性报告。

## 三条线

| 方向 | 状态 | 说明 |
| --- | --- | --- |
| LSM Research | BLOCKED | 等待真实设备、可靠参考标注与伦理条件；保留失败证据，不增加检测器/模拟器 |
| Symbolic Exploration v0.2 | FROZEN | 已合并 `main`（`c412613`）；产品候选基线，不再追加功能 |
| Symbolic Experience Platform | ACTIVE | v0.2 之后的工作需单独评估与立项 |
| 实证准备 | 按需 | 设备、研究合作、伦理作为独立工作流 |

## 已实现的产品能力

### 动态空间

- 75 秒相遇；
- 180 秒空间；
- 用户 explicit 延长 30 秒；
- 开放空间：不自动结束，用户主动离开；
- 空间内改变意象、形象与光线；
- 所有改变记录 `atSec` 与来源。

### 纵向经验结构

- 片段再次进入，生成新的不可覆盖修订；
- 原记录与所有修订保留；
- 连续修订按 root/visit 分组；
- 原片段 symbolic 配置在修订中保留；
- 修订节点进入场域，并生成显式 link；
- 刷新、导出后仍保留。

### 关系瞬间

- 关系瞬间再次进入；
- 预填用户字段；
- 原记录保留；
- 按 root 分组，比较任意两次进入的用户字段；
- 不推断对方、依恋类型或关系意义。

### 用户主导的象征生成

- Space Composer 选择 1–3 块意象；
- 选择形象与 75/180/开放形式；
- 系统只组合参数，不解释选择。

### 主动交互

- approach / stay / resume / leave / reenter / extend / change；
- 每个事件有 `atSec`；
- 会话按 `motifId` 关联到片段；
- 连续性视图显示计数与可展开事件明细。

## 验证证据

```text
Vitest: 213 passed
Playwright E2E: 38 passed
pnpm build: exit 0, main JS ~346 KB
reuse lint: 270/270 compliant
Rust: 8 desktop + 10 ops tests passed
Tauri release build: pnpm tauri:build --no-bundle passed
Retention: 1000 motifs + 1000 symbolic sessions (explicit, tested)
light + dark WCAG A/AA on main views
English UI untranslated-token audit covers continuity/composer
```

## Tauri 运行验收状态

- 真实 release 二进制已构建成功；
- 浏览器 E2E 已验证保存、刷新与恢复；
- Tauri release 二进制已手工验证：建立 demo 数据 → Composer 调整 → 保存为新修订 → 退出进程 → 重启 → 修订链、symbolic 配置、session 与 field link 均恢复；
- 本地导出 JSON 已检查：3 motifs、1 session、3 field links，修订 symbolic 为 `encounter · water / house / door · animal`；
- 删除全部本机数据：实际点击 UI → 二次确认 → 数据库 local_state 清空 → 退出/重启 → 空状态确认。
- 因此 Tauri 7/7 手工验收完成。

## Symbolic Exploration v0.2（已冻结）

状态：`ACCEPTED / MERGED / FROZEN`

- 功能验收、数据生命周期验收、代码复审、CI/CLA 均通过；
- PR #2 以 Squash and merge 进入 `main`，merge commit `c412613`；
- PR #1 已先合并到 `main`，merge commit `9a56ffe`；
- 未创建 Release，未打 Tag。

已实现范围：

- 无标签进入：身体、意象、空白、关系空间；
- 直接放置、拖动、远近、大小、显隐、边界、视角；
- 撤销、保存、重启后重访、删除；
- 空间版本、分支、配置对照、半透明叠加；
- 关系空间：抽象存在、距离、边界、显式连接/断开、区域包含；
- `ExperienceSpaceV2` 独立契约，不改变旧 `motif-v1` / LSM-0；
- 探索空间进入统一 `LocalSnapshot`、SQLite、导出与加密路径；
- 已保存版本不可覆盖；容量 500 拒绝静默截断；删除父空间阻止悬空引用；
- Tauri 应用锁、加密恢复、删除全部数据后重启无残留已手工验收。

文档：[`symbolic-exploration-v0.2.md`](symbolic-exploration-v0.2.md)。

这是工程里程碑，不是“前语言表达有效性”的用户研究结论。v0.2 之后不再向该基线追加功能；下一阶段若评估空间表达能力、交互质量或用户需求，应单独立项。

## 明确不是

- 不是临床工具；
- 不是诊断；
- 不是潜意识测量；
- 不是“帮助表达前语言经验”的有效性证据；
- 不是对 LSM 科学假设的支持。

要声称这些，需要适当的人类参与者研究、伦理审查与独立证据。

## v0.2 之后（不在本次冻结范围）

- 空间体验的表达能力与交互质量评估；
- 真实用户需求与可用性研究；
- 更长时程的本地性能与数据规模验证；
- 这些工作需要单独的范围、伦理与验收标准，不应回填到已冻结的 v0.2 合并条件。

## 明确不做

- 不继续 LSM 检测器/模拟器；
- 不把产品交互包装成科学结论；
- 不在没有证据时解除 Gate 2A / 2B / 3A。
