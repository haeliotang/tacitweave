<!--
SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
SPDX-License-Identifier: CC-BY-4.0
-->
# R0 构建基线

日期：2026-11-06。命令：`pnpm build && pnpm measure:build`。

## 本次测量

| 文件 | 字节 | 说明 |
| --- | ---: | --- |
| `index-DvJE8-yt.js` | 312,022 | 主入口（storage + BCI + topology lazy split） |
| `index-BUiWci60.css` | 55,036 | 主样式（场域 + 应用锁 + 可访问性 + 明暗主题） |
| `relationship-map-BZEf897-.js` | 17,416 | 关系触发点 + 纵向比较组件 |
| `relationship-map-CJmGmEzr.css` | 7,423 | 纵向比较组件样式 |
| `field-view-dsPGIi24.js` | 8,431 | 懒加载场域组件 |
| `device-signal-panel-6NncVyWz.js` | 8,843 | 可选设备桥接面板 |
| `somatic-entry-D0MefBZ-.js` | 7,922 | 身体捕获 |
| `local-data-panel-BGZI6W2g.js` | 9,590 | 本机数据与加密备份 |
| `app-lock-view-DzWRpzQR.js` | 4,416 | 应用锁 |
| `signal-simulator-CKG7v4BB.js` | 2,647 | LSL 模拟器 |
| `motif-journal-view-LFsczKul.js` | 2,072 | 片段日记 |
| `update-panel-oMHE4Ye0.js` | 1,988 | 更新检查 |
| `inner-entry-B-xzdWQP.js` | 1,709 | 文字捕获 |
| 合计 | 439,527 | 多个懒加载产物；无 scene 分包 |

- `sceneChunk = null`：symbolic 构建不再产生 Three.js 场景分包。
- 文件名带 hash，会随构建变化；以本次字节数为基线，不把文件名当稳定契约。程序渲染器已移除，旧 scene 模块不再进入构建。
- 尚未测量首屏时间、75/180 秒内帧间隔或交互延迟；这些需要浏览器 Performance 面板实测，当前不作数值声明。

## R0 检查

- [x] 记录构建体积
- [x] 确认 symbolic 构建不再产生 scene 分包
- [ ] symbolic 路径的浏览器首屏/交互实测
- [x] 75 秒相遇与 180 秒空间的完整帧采样（本地 headless）

## 性能预算（暂定，待实测）

- 主入口不因新增 symbolic 功能无上限增长；超出 5% 时在 PR/commit 说明原因。
- symbolic 路径不加载 `scene-*.js`，不加载模型，不初始化音频。
- 场景分包保持 lazy；旧三维路径按需加载。
- 捕获 hash 使用 Rust 流式读取大文件，避免 Node 重复读入内存。

测量脚本：[`scripts/measure-baseline.ts`](../../scripts/measure-baseline.ts)。

路径守卫：`pnpm check:symbolic-path` 检查 scene 分包未预加载、主入口不超过 320,000 字节；当前通过。

## 浏览器基线（本地 headless，2026-11-01）

环境：Chrome 156 headless，`pnpm dev`，本地 Vite 开发服务，CDP 禁用缓存。命令：`pnpm measure:browser`（需 Chrome 以 `--remote-debugging-port=9222` 启动）。

| 指标 | 结果 |
| --- | ---: |
| DOMContentLoaded | 88 ms |
| load | 89 ms |
| first paint | 92 ms |
| first contentful paint | 164 ms |
| symbolic 空间挂载 | true |
| 2 秒帧采样 | 121 帧，平均 16.61 ms，P95 16.80 ms |

限制：这是本地 headless 开发服务，不是手机、真实网络或生产构建；2 秒采样是快速检查，完整 75/180 秒结果见下节，仍不替代真实设备验收。

## 完整会话帧采样（本地 headless，2026-11-01）

命令：`pnpm measure:browser:full`。Chrome 156 headless，本地 dev server，禁用缓存，页面可见。

| 形式 | 采样帧 | 平均 | P95 | P99 | 最大间隔 |
| --- | ---: | ---: | ---: | ---: | ---: |
| 相遇 75 秒 | 4,501 | 16.66 ms | 16.70 ms | 16.80 ms | 16.80 ms |
| 空间 180 秒 | 10,802 | 16.66 ms | 16.70 ms | 16.80 ms | 16.80 ms |

限制：headless 本地环境、无真实输入/退出压力、无真实 GPU 与手机；本次空间无超过 16.8 ms 的间隔，但不能据此宣称所有设备稳定。真实设备、生产构建与交互压力仍未验证。
