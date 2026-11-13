<!--
SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
SPDX-License-Identifier: CC-BY-4.0
-->
# Research storage lifecycle contract

日期：2026-11-13。状态：设计契约；研究存储尚未实现。

## 目的

`ResearchCaptureSession` 目前只是 schema。研究可复现性要求实际存储做到：

- 与研究产品摘要分离；
- 单独同意；
- 留存到期；
- 撤回即停采；
- 密钥删除；
- 重启后无可访问残留；
- 备份/导出副本有明确删除边界。

## 最小状态

```text
consented -> active -> stopped -> deletion_requested -> deleted
                |          |
                +-> expired (retention boundary)
```

没有“软删除但数据仍在明文副本里”的状态。

## 必须记录

- consent version / scope / grantedAt / withdrawalAt
- collection start/stop
- retentionUntil
- encryption key id / key version（不记录密钥本身）
- deletion request/completion/method
- backup/export copies and their deletion status
- restart test evidence
- residual scan result

## 合成数据验收

1. 写入合成 session；确认只有研究存储可见。
2. 撤回同意；确认采集停止、密钥删除、无法再读。
3. 重启应用/进程；确认没有可访问残留。
4. 查看导出/备份副本；确认删除边界，不伪造“已删除”。
5. 留存到期；确认删除路径执行。
6. 删除完成；确认 `deleted` 不可逆地拒绝再次读取。

## 不做

- 不在 schema 里假装运行时撤回已实现。
- 不把产品摘要当作研究原始数据。
- 不为“复现”默认永久保存敏感原始信号。
- 不用软删除冒充删除。

## 完成标准

- 合成数据能证明上述状态转换和残留检查；
- 删除/撤回在重启后仍可验证；
- 备份/导出副本边界被记录；
- 实际研究存储只有在伦理、加密和访问控制通过后才接入。
