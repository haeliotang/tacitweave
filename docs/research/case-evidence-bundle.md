<!--
SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
SPDX-License-Identifier: CC-BY-4.0
-->
# CASE evidence bundle verification

日期：2026-11-13。状态：本地 bundle 已验证；原始数据未提交。

## 来源

- 数据集：CASE snippet（2 位参与者）
- DOI：`10.6084/m9.figshare.8869160.v1`
- 许可：CC0-1.0
- source ZIP SHA-256：
  `fcb7416b44cd7b7334e0e4d38963ff7d207df94d9268f2b7c644a047f6f6d857`
- source ZIP 大小：290,255,036 bytes

## Bundle

```text
source/CASE_snippet.zip
canonical/case.jsonl
reports/case-gsr.json
manifest.json
```

关键 hash：

```text
canonical/case.jsonl
182974df3631b19b7120deb79da5c493d9697a756bdca4af727b6badd7ae6f04

reports/case-gsr.json
cb61158306f947ab9597fee9dacd580b853d02b6bad6ba02a6a6ad189a290124

manifest.json
7a99a5954ba4bff960c702e3fee08e4f348db4704dbf832f57efa1060820f88c
```

canonical：

- sessions：22
- participants：2
- feature：`gsrMeanMicroSiemens`
- outcome：`intensity`（video arousal mean）
- P1：paired=11，rho=-0.218，circular=-0.109
- P2：paired=11，rho=0.873，circular=0.609

## 验证

```bash
pnpm evidence:verify --manifest <bundle>/manifest.json --root <bundle>
```

```text
evidence manifest verified
exit 0
```

## 边界

- 只有 2 位参与者，不能估计人群效应。
- P2 的高相关在 circular-shift 下仍为 0.609，提示时间/片段结构贡献。
- 视频片段不是 Tacitweave session。
- 没有 p 值、因果或构念效度结论。
- 原始数据不进入仓库；bundle 验证后已删除。

## 结论

CASE 的 adapter → canonical → report → manifest 链路可重复验证。
这只验证分析工具链，不验证 Tacitweave 前语言假设。
