<!--
SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
SPDX-License-Identifier: CC-BY-4.0
-->
# QoL_Stress import check

日期：2026-11-13。状态：数据导入/联动检查；不做个体内相关估计。

## 数据与许可

- 数据集：**QoL_Stress**，Calvo, Cejudo, Martín Andonegui，PhysioNet v1.0.0。
- DOI：`10.13026/vqtz-pm70`。
- 许可：**CC-BY-4.0**。
- ZIP SHA-256：
  `d16fe9c5f319eb9dff8cf9089399f18eef68fa8cdb1085f6032f5750814d1362`。
- 原始数据不进入仓库。

## 转换

`src/qol-adapter.ts` 读取 `ecg.csv`、`eda.csv`、`stai.csv`、`pss_14.csv`、
`participants.csv`：

- `username` 映射为匿名 `P001…P066`，不保留原始 SHA-256 用户名；
- 每人 relax/stress 两个 phase 变成一个 canonical session；
- `heart_rate` → `ecgHeartRateBpm`；
- `valid_data=True` 的 EDA `scl_avg` 均值 → `edaMeanSclMicroSiemens`；
- `stai.score` 按 phase → `stateAnxietyScore`；
- `pss_14.score` → `pss14Score`；
- 缺失 EDA 不插值。

## 导入结果

```text
sessions      132
participants   66
ECG           132
EDA           124   (8 expected recordings absent)
STAI          132
PSS-14        132
```

## 分析限制

每人只有 2 个 phase，远少于 harness 的最小 4 个 paired session 门槛。因此：

```text
paired=2, rho=n/a
```

harness 正确拒绝了个体内 Spearman 估计。这个数据集适合检查：

- 多文件按 `username` 联动；
- 匿名化映射；
- phase 标注；
- 缺失 EDA 不插值；
- ECG/EDA/问卷字段导入。

它不适合当前设计下的个体内时间序列估计；不能用来推断压力—生理关联。

## 复现

```bash
pnpm qol:canonical --root <QoL_Stress/data> --out /tmp/qol-canonical.jsonl
pnpm lsm0:public --in /tmp/qol-canonical.jsonl \
  --feature ecgHeartRateBpm --outcome stateAnxietyScore
pnpm test src/qol-adapter.test.ts
```

## 结论

QoL_Stress 导入链路可用；**没有**产生压力—生理相关结论，也没有把它写成
Tacitweave 前语言假设的证据。
