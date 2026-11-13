<!--
SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
SPDX-License-Identifier: CC-BY-4.0
-->
# QoL_Stress evidence bundle verification

日期：2026-11-13。状态：本地 bundle 已验证；原始数据未提交。

## 来源

- 数据集：QoL_Stress v1.0.0，PhysioNet
- DOI：`10.13026/vqtz-pm70`
- 许可：CC-BY-4.0
- source ZIP SHA-256：
  `d16fe9c5f319eb9dff8cf9089399f18eef68fa8cdb1085f6032f5750814d1362`
- source ZIP 大小：2,206,447 bytes

## Bundle

本地临时 bundle：

```text
source/QoL_Stress.zip
canonical/qol.jsonl
reports/qol-ecg-stai.json
manifest.json
```

关键 hash：

```text
canonical/qol.jsonl  SHA-256 56a7f46775570c53ea7f9c4310ef64204dde697ae9cf5aaf21a0c42b15cf1bc8
reports/qol-ecg-stai.json SHA-256 e8b5f772bd8070841ed772da5f87636f75dca2d2f91d3a1ea7616c4845183618
manifest.json SHA-256 23722685ac125445bd5247393a088c40537ff4f5e787917fbeb039e7ac9b039c
```

canonical：

- sessions：132
- participants：66
- feature：`ecgHeartRateBpm`
- outcome：`stateAnxietyScore`
- paired：2 / participant
- rho：`n/a`（低于 4 对门槛）

## 验证

```bash
pnpm evidence:verify --manifest <bundle>/manifest.json --root <bundle>
```

结果：

```text
evidence manifest verified
exit 0
```

验证内容：

- source/canonical/report 的文件存在、大小和 SHA-256；
- 路径没有绝对/`..` 逃逸；
- manifest 有 source、canonical counts、限制说明；
- 原始数据未进入仓库。

## 解释

- 这个 bundle 证明 QoL_Stress 导入、canonical 输出和 manifest 验签可重复。
- 它**不**证明压力—生理关联。
- 每人只有两个 phase，harness 正确拒绝个体内相关估计。
- 报告的 rho 全是 `n/a`，不是阴性结果，也不是阳性结果。

## 清理

验证后临时 bundle 已删除；仓库只保留 hash、命令和限制说明。
