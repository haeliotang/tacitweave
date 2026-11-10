<!--
SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
SPDX-License-Identifier: CC-BY-4.0
-->
# Local data schema v2

日期：2026-11-01。状态：已实现；无服务端。

## 导出格式

`local-dataset-v2`：

```json
{
  "version": "local-dataset-v2",
  "exportedAt": "2026-11-01T00:00:00.000Z",
  "motifs": [],
  "relationships": [],
  "field": {
    "version": "field-layout-v1",
    "positions": { "motif:<uuid>": { "x": 0.34, "y": 0.38 } },
    "links": [{ "id": "motif:a->motif:b", "from": "motif:a", "to": "motif:b", "createdAt": "..." }]
  },
  "signals": [],
  "captures": []
}
```

- `v1` 数据集仍可导入；缺失的 `field` / `signals` 按空处理。
- `capture.certainty` 可选：`clear` / `mixed` / `unsure`；缺失表示旧 capture 格式，不插补。
- `field.positions` 使用 0–1 归一化坐标，节点 key 为 `motif:<id>` 或 `relationship:<id>`。
- `field.links` **只由用户主动连接**，不是系统推断。
- `signals` 只保存 session 摘要（时长、样本数、按 kind 计数），不保存原始信号。
  - 新会话为 `signal-session-v2`：`summary.bySource` 保存每个来源的首/末时间与最大间隔，`summary.quality` 保存总首/末时间、最大间隔、超过 1 秒的间隔数和平均样本/秒。旧的 `signal-session-v1` 仍可导入。
- 母题可选保存 `symbolic`（`format` / `motifs` / `figure`），来自创建母题时生成的符号空间参数；用于本机 LSM-0 导出，不表示临床解释。
- `symbolicSessions` 保存象征空间会话摘要：format、duration、completed/leftEarly 与 agency 事件；不保存帧、视频或原始体验数据。
- `captures` 只保存 `CaptureProvenance`（captureId、rendererKind、mimeType、时长、sha256、模型/提示哈希、SynthID、createdAt 和可选播放 URL），不保存媒体字节。
- 不保存原始音频、原始神经数据、服务端账号或云同步。

## SQLite

Tauri 宿主在 app data 的 `tacitweave.db` 中写入 `local_state`：

| key | value |
| --- | --- |
| `motifs` | 母题数组 |
| `relationships` | 关系触发点数组 |
| `field` | 场域布局（位置与用户连接） |
| `signals` | 信号 session 摘要数组（v1/v2） |
| `captures` | 捕获出处数组；不含媒体字节 |
| `symbolic_sessions` | 象征空间会话摘要（agency、duration、completed/leftEarly） |
| `encrypted` | 启用应用锁后的 AES-GCM 密文；此时明文 key 被删除 |

- 应用锁开启时，整个 snapshot 加密为一个 `encrypted-local-state-v1` 负载；PIN 经 PBKDF2 派生 AES-GCM key。没有 PIN 时应用只显示锁屏，不读取明文。
- 如果锁记录丢失但 encrypted payload 仍存在，普通明文保存会被拒绝，避免用空/旧 Web 数据覆盖加密快照。
- 关闭应用锁会解密并恢复 plaintext key；忘记 PIN 只能删除全部数据重置。
- 桌面端 SQLite 是 canonical：若 SQLite 为空且 Web 回退有数据，执行一次性迁移；若 SQLite 有数据，则把同一 snapshot 镜像回 Web 回退，避免两边继续分叉。
- `local_meta.schema_version` 当前写入 `2`；新数据库启动时补齐。
- 读取时缺失 key 返回空数组/空布局。
- 清除本机数据会清空 `local_state`、Web 回退 localStorage、旧 `familiweave.*` key、`local-files` 和旧 app data 目录；SQLite 使用 `secure_delete` + `VACUUM` 清理删除页。
- 旧的拼写标识 app data 目录仍会在启动时迁移，不覆盖新目录数据；明确清理时也会删除旧目录。
- 若 encrypted payload 存在但旧 WebView 的 app-lock record 丢失，启动时会进入恢复锁屏；输入旧 PIN 后会重新建立 lock record。

## 导出与删除

- 设置页可导出完整 v2、导出时间轴、导入 v1/v2、删除全部。
- 可生成加密备份（`tacitweave-encrypted-backup-v1`）：PBKDF2 + AES-GCM，至少 8 位口令；口令不保存，无法找回。加密备份导入时会要求口令。
- 删除是显式覆盖，不是隐藏；浏览器 localStorage 与 Tauri SQLite 都会清除，包括 `captures`。
- 后续 schema 变更必须保留旧版本导入路径，并写迁移说明。

## 边界

字段是用户自述与摘要，不是诊断、风险评分或对第三方的推断。`signals` 不含原始数据，因此不能从导出中重建神经/音频信号。
