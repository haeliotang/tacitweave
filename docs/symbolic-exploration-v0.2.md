<!--
SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
SPDX-License-Identifier: CC-BY-4.0
-->
# Symbolic Exploration v0.2

日期：2026-11-14。状态：P0/P1 纵向切片；产品层，不是科学有效性声明。

## 核心变化

旧流程要求用户先把经验翻译成部位、感觉、强度和预设意象，再进入系统生成的空间。

v0.2 的第一条路径改为：

```text
进入空间 → 通过放置、移动、远近、显隐和边界操作 → 形成用户自己的象征配置
```

用户不需要先命名身体感受，也不需要选择心理类别。

## 已实现：P0 无标签进入

新增「探索」工作区，提供三个入口：

- 从身体开始：在身体轮廓上直接点一个位置；不要求命名部位或感受。
- 从一个画面开始：选择门、水、森林、形状、光、存在等抽象对象；不解释它代表什么。
- 从空白开始：空间可以没有对象；可以只待着，也可以离开。

技术上使用新的 `ExperienceSpaceV2`，不改变旧 `SomaticCapture` / `motif-v1` / LSM-0 契约。

## 已实现：P1 直接空间操作

- 放置对象；
- 拖动对象改变位置；
- 改变远近、大小、显隐；
- 显示/隐藏对象；
- 放置边界对象；
- 改变视角距离；
- 撤销上一步；
- 保存与重新进入已保存空间。

所有动作都记录为显式 `UserSpatialAction`：

```ts
interface UserSpatialAction {
  id: string
  type: 'place' | 'move' | 'adjust' | 'visibility' | 'remove' | 'viewpoint'
  targetId?: string
  before?: SpatialObject | Viewpoint | null
  after?: SpatialObject | Viewpoint | null
  source: 'user_input'
}
```

对象的 `source` 区分 `user_input` 与 `system_generated`；当前初始对象也由用户选择，未自动生成心理内容。

## 数据模型

```ts
interface ExperienceSpaceV2 {
  version: 'experience-space-v2'
  id: string
  rootId: string
  parentId?: string
  start: 'body' | 'imagery' | 'blank'
  objects: SpatialObject[]
  viewpoint: Viewpoint
  actions: UserSpatialAction[]
  createdAt: string
  updatedAt: string
}
```

- 对象坐标、远近、大小、显隐均为受限数值；
- 动作 `before` / `after` 支持撤销；
- 存储上限 500 个空间；
- 目前保存于本地 WebView 存储；Tauri SQLite / 导出接入属于后续 P2。

## 界面约束

- 主画面是空间，不是 Dashboard；
- 不显示预设心理类别；
- 不使用「疗愈」「面对恐惧」「获得洞察」；
- 不根据对象或操作推断心理意义；
- 位置、距离、大小和显隐的变化就是操作结果本身；
- 始终可以离开、撤销、删除对象；
- 鼠标、触控和键盘方向键均可移动对象。

## 验证

```text
Vitest: 203 passed
Playwright E2E: 32 passed
pnpm build: passed
light/dark WCAG A/AA audit: passed
English untranslated-token audit: passed
```

E2E 覆盖：

- 空白入口不需要任何文本输入；
- 放置门对象并直接拖动；
- 操作历史出现 `move`；
- 保存 → 刷新 → 重访，对象仍在；
- 身体入口点击轮廓直接创建空间，不出现表单。

## P2 已开始：快照、分支与对照

- 保存的空间按 `rootId` 组成轨迹；
- 「另存为新分支」创建带 `parentId` 的新快照，原快照不变；
- 已保存空间可按版本重新进入；
- 两个已保存空间可比较显式配置差异：添加/移除、位置、远近、大小、透明度、可见性、视角距离；
- 比较只显示场景字段，不推断心理意义；
- 快照已进入 Tauri SQLite 的 `experience_spaces` key，并进入 local dataset 导出/导入。

## P2 浏览器验证

E2E 已覆盖：

- 保存原始空间；
- 拖动后「另存为新分支」并保存；
- 刷新后同一 root 显示 2 个版本；
- 选择两个空间进行显式配置对照。

Tauri 内的分支闭环已手工完成：原始空间保存 → 另存为新分支 → 保存 → 退出/重启 → 探索页显示 2 个版本；SQLite `experience_spaces` 保留 parent/root 关系。

## Tauri 验收（P2）

实际 release 二进制已验证：

- 打开「探索」；
- 从空白开始；
- 放置一个门对象；
- 拖动改变位置，操作历史出现 `move`；
- 保存；
- 退出进程、重启；
- 重新打开探索，看到已保存空间；
- 重访后对象与操作历史恢复。

## P3 已开始：关系空间

- 从「关系空间」进入，默认放置两个抽象存在；
- 位置决定距离；
- 可加边界对象；
- 可显式建立连接，并显式断开；
- 可放置「区域」对象，让区域显式包含一个存在；
- 无需填写角色、场景或人物信息；
- 关系空间与普通空间一样保存、重启后重访。

当前 P3 是纵向切片：显式连接、距离和边界已可操作；包含关系、更多关系类型和关系历史对照尚未完成。

## 明确不做

- 不把空间对象映射为依恋类型、创伤、恐惧或诊断；
- 不把停留时长或操作次数当作心理测量；
- 不声称帮助表达前语言经验；
- 不改变 LSM Research 的 `BLOCKED` 状态；
- P2 已实现空间版本分组、分支和显式配置对照；Tauri SQLite/local dataset 接入尚未实现。
- P3 的包含关系、更多关系类型和关系历史对照尚未实现。
