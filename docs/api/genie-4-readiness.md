<!--
SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
SPDX-License-Identifier: CC-BY-4.0
-->
# Genie 4 API 开放检查清单

日期：2026-11-01。范围：在等待 Genie 4 API / Project Genie 访问期间，记录真正接入前必须确认的事项。当前项目不调用任何 Genie 服务；`genie4` 渲染器保持 `requires_api_access`。

## 1. 访问与账户

| 项目 | 当前状态 | 接入前动作 |
| --- | --- | --- |
| Project Genie 等待名单 | 免费申请表；无日期保证 | 保持申请；记录申请时间与邮箱 |
| Google AI Ultra | 尼泊尔订阅页显示 $99.99/$199.99 每月；Project Genie 含在 Ultra | 需要实验时再决定是否订阅；不默认开通 |
| Gemini API / AI Studio 早期访问 | 官方仅说“early access partners”，无申请入口、无模型 ID | 关注模型页/changelog；准备 API 项目与账单账户 |
| 区域与支付 | Gemini API 支持尼泊尔；Ultra 内购地区可能不同 | 以结账页/控制台实际可用为准 |
| 年龄/账户 | Project Genie 18+ | 使用合规账户 |

## 2. 模型与输出

| 项目 | 状态/待确认 | 项目需要 |
| --- | --- | --- |
| 模型 ID / 端点 | 未公布 | 写入 `GENIE_MODEL_ID` / `GENIE_BASE_URL`，不硬编码 |
| 传输方式 | 未公布（可能流式/WebSocket） | 在 `GenieClient` 后适配；不把流式细节泄进 UI |
| 分辨率/帧率/延迟 | 未公布；媒体约 24fps、约 2 分钟 | 实测 75 秒稳定性与实时性 |
| 会话长度 | 官方称“几分钟连续交互” | 以 75 秒为产品上限；超时/漂移回退 |
| 原生音频 | 环境声/音乐/对话 | 确认音频格式、是否可分离、是否可替换 |
| 参考图 | 可作为世界首帧 | 确认是否只用于环境/布局，是否保留人物特征 |
| 人物一致性 | 无公开身份锁定保证 | 以行为/节奏为主；不做写实克隆 |
| 对话控制 | 即兴对话 | 测“逐字台词”“近义台词”“只保留开放对话”三条路线 |
| 水印 | SynthID 覆盖视频与音频 | 在 UI 与 manifest 记录 `synthId: true` |

## 3. 数据、隐私与合规

| 项目 | 待确认 | 项目要求 |
| --- | --- | --- |
| 输入保留 | 官方未公布 Genie API 条款 | 取得书面/条款依据；默认不上传真实照片/录音 |
| 训练使用 | Labs 隐私说明含训练用途 | 真实资料必须显式同意；优先完全不上传 |
| 人物照片/肖像 | 无 Genie 专门规则；通用禁止政策含冒充/隐私 | 不做写实逝者克隆；活人必须同意 |
| 生成内容标识 | SynthID + 产品内“AI 生成/虚构” | 双重标识；不得暗示真实沟通 |
| 删除/撤回 | 未公布 API 删除语义 | 本地删除 + 上游删除路径都要可用 |
| 未成年人与第三方 | 通用政策 | 不做未同意第三方资料；年龄门槛 |
| 商业使用 | 未公布 | 未确认前只做研究/合成资料实验 |

## 4. 捕获、回放与出处

- 非确定性输出不能靠 seed 重放；每次实验保存视频/音频捕获、时长、模型、提示词 hash、SynthID、时间和操作者。
- 捕获媒体放在私有存储，不进入 `public/`；manifest 只存 `CaptureProvenance`。
- 回放使用 `captured` 渲染器，显示模型、时长、水印与“AI 生成/虚构”标识。
- 失败/漂移的捕获也保留，作为评估证据，不删除失败记录。

## 5. 开放当天的接入顺序

1. 确认账户、区域、价格、条款与配额；记录到本文件。
2. 配置 `GENIE_API_KEY` / `GENIE_BASE_URL` / `GENIE_MODEL_ID`，不提交密钥。
3. 实现 `GenieClient.createSession`，返回 `WorldRenderSession`；先接一条最小链路。
4. 用 `pnpm inner:storyboard` 导出的提示词跑 X1–X6，记录实验日志。
5. 通过 `pnpm eval:validate` 汇总；达到门槛后才把 `genie4` 渲染器改为 `available`。
6. 未通过时保持 `requires_api_access`，不把实验性输出放进默认体验。

## 6. 当前明确未完成

- 没有公开 Genie 4 API、模型 ID、价格、配额或开发者申请入口。
- 没有 Genie 4 的独立实测或量化基准；所有对比均为定性。
- 没有验证身份一致性、逐字台词、音频分轨、捕获导出或商业使用条款。
