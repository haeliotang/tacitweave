<!--
SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
SPDX-License-Identifier: CC-BY-4.0
-->
# Desktop platform QA

日期：2026-11-03。状态：macOS 已本机启动并截图；Windows/Linux 已在 CI 中完成当前 main 的构建与启动 smoke test。

## 共同

- [ ] 安装/首次启动
- [ ] 新建片段、保存、重启后恢复
- [ ] 场域节点拖拽、缩放、重置、连接/删除连线
- [ ] 导入 v1/v2、导出、删除全部
- [ ] 中英文切换与明暗主题持久化
- [x] 应用锁设置/错误 PIN/解锁/加密快照/重载恢复（浏览器验证）
- [x] 应用锁开启后明文 key 删除、关闭后恢复（浏览器验证）
- [ ] 本机 BCI bridge token 连接与断开
- [x] 打包应用在收紧 CSP 后正常渲染

macOS 本机截图：[desktop-tauri-dark.png](assets/desktop-tauri-dark.png)

Playwright E2E：场域拖拽/缩放/连线/持久化、主题与语言、应用锁错误 PIN/加密/恢复、懒加载视图与资源加载、键盘选择、v2 导出/导入、v1 兼容导入、加密备份导出/导入、显式更新检查成功/失败、明暗主题 WCAG A/AA 可访问性，共 21 项（含最小桌面窗口布局、全视图 WCAG A/AA、拓扑暗色审计、捕获出处导出/撤回、信号摘要撤回、LSM-0 导出、英语完整性、自动锁定、PIN 锁定、键盘、懒加载资源与加密备份）；CI `Browser E2E` 已通过。

当前 main（加密应用锁 + lazy split + error boundary）的 Desktop builds run `41700820961`：Linux AppImage 在 xvfb 中启动成功，Windows NSIS 安装与进程启动成功；release 上传在该次校验中按设计跳过。E2E 4 项也已在 CI 通过。

场域拖拽、连线、时间过滤与示例场域的浏览器验证已通过；Tauri 窗口内的交互尚未逐项手测。

## macOS

- [x] 交通灯位置与侧栏拖拽区（本机截图）
- [ ] Gatekeeper 首次打开提示
- [x] app data 从旧拼写目录迁移（启动验证）
- [x] `icon.icns` 与 Dock 图标

## Windows

- [x] NSIS 安装（CI smoke）
- [x] WebView2 启动与进程存活（CI smoke）
- [ ] 原生标题栏与自定义顶栏不重叠（需人工）
- [ ] 文件路径、app data、SQLite（需人工）
- [ ] SmartScreen 警告与未签名说明

## Linux

- [x] AppImage 启动（xvfb smoke）
- [ ] DEB 依赖安装（需人工）
- [x] WebKitGTK 4.1 环境（CI）
- [ ] 窗口装饰/拖拽区（需人工）
- [ ] AppImage 在不同发行版的最小验证

运行时验收前，不应宣称 Windows/Linux 已达到与 macOS 相同的可用性。
