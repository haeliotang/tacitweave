<!--
SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
SPDX-License-Identifier: CC-BY-4.0
-->
# Evidence manifest v1

日期：2026-11-13。状态：可执行验证契约；尚未给 CASE/QoL 生成正式 manifest。

## 目的

公开数据复分析必须能回答：

- 用的是哪个数据集版本？
- 哪些文件、什么 hash？
- 哪个 adapter / feature / outcome / 排除规则？
- canonical 输出和报告是否被篡改？
- 哪些限制是当时就写明的？

manifest 只记录本地文件 hash，不打包原始数据，也不把“有 hash”冒充科学证据。

## 结构

```json
{
  "version": "lsm0-evidence-manifest-v1",
  "bundleId": "case-snippet-2026-11-13",
  "createdAt": "2026-11-13T00:00:00.000Z",
  "dataset": {
    "name": "CASE",
    "doi": "10.6084/m9.figshare.8869160.v1",
    "license": "CC0-1.0",
    "sourceFiles": [
      { "path": "source/CASE_snippet.zip", "sha256": "<64 hex>", "bytes": 290255036 }
    ]
  },
  "adapter": { "name": "case-canonical", "version": "case-canonical-v1", "commit": "<git sha>" },
  "canonical": { "path": "canonical/sessions.jsonl", "sha256": "<64 hex>", "bytes": 123, "sessions": 22, "participants": 2 },
  "analysis": {
    "command": "pnpm lsm0:public --in canonical/sessions.jsonl --feature gsrMeanMicroSiemens",
    "feature": "gsrMeanMicroSiemens",
    "outcome": "intensity",
    "exclusions": ["quality.usable=false", "non-finite signal", "paired missing"],
    "scriptVersion": "lsm0-public-data-v1"
  },
  "reports": [
    { "path": "reports/gsr.json", "sha256": "<64 hex>", "bytes": 456 }
  ],
  "limitations": [
    "two participants only",
    "video segments are not Tacitweave sessions",
    "no p-values or construct-validity claim"
  ]
}
```

## 验证

```bash
pnpm evidence:verify --manifest bundle/manifest.json --root bundle
```

验证：

- 字段完整；
- 路径相对、不能 `..` 逃逸；
- 文件存在、大小一致、SHA-256 一致；
- 至少一个 source file 和 limitation；
- canonical sessions/participants 为正整数。

## 不主张

- hash 匹配不等于结果正确。
- manifest 不替代预注册、对照、独立复算或构念效度。
- 不把原始数据提交进 AGPL 发行版。

## 当前状态

- schema + verifier + tests 已实现。
- 尚未生成 CASE/QoL 正式 bundle manifest；下一步在数据临时目录生成并验证。
