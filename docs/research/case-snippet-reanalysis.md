<!--
SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
SPDX-License-Identifier: CC-BY-4.0
-->
# CASE snippet reanalysis: pipeline check, not a hypothesis test

日期：2026-11-13。状态：小样本公开数据管线验证；不构成 Tacitweave 实证结论。

## 数据与许可

- 数据集：CASE — *A dataset of continuous affect annotations and physiological
  signals for emotion analysis*，Sharma et al., Scientific Data 2019。
- 入口：[Figshare CASE snippet](https://springernature.figshare.com/articles/dataset/CASE_Datatset-snippet/8869160)，
  DOI `10.6084/m9.figshare.8869160.v1`。
- 许可：Figshare 元数据为 **CC0 1.0**。
- 本次使用 `CASE_snippet.zip`（2 位参与者；29,0255,036 bytes；MD5
  `f99baa69e5c6e37332c308d59f8bdcef`）。
- 原始数据不进入本仓库；只保留聚合结果、代码和限制说明。

## 转换

`src/case-adapter.ts` 读取 CASE `interpolated` 目录的 annotation 与
physiological CSV：

- 按 `video` 聚合每个视频片段；
- 自报：`arousal` 的片段均值 → `selfReport.intensity`；
- 信号：`gsr`、`bvp`、`ecg`、`rsp`、`skt`、三路 EMG 的片段均值；
- 不做逐样本重采样之外的额外插值；
- 不把视频条件标签当作内在体验真值。

产生 **22** 个 canonical sessions（2 参与者 × 11 视频）。

## 结果（描述性）

`gsrMeanMicroSiemens` 与 `arousal` 的个体内 Spearman：

| 参与者 | paired | rho | circular shift | shuffled |
| --- | ---: | ---: | ---: | ---: |
| P1 | 11 | -0.218 | -0.109 | 0.300 |
| P2 | 11 | 0.873 | 0.609 | 0.073 |

`bvpMeanPct` 与 `arousal`：

| 参与者 | paired | rho | circular shift | shuffled |
| --- | ---: | ---: | ---: | ---: |
| P1 | 11 | -0.282 | 0.291 | -0.236 |
| P2 | 11 | -0.164 | 0.455 | 0.409 |

独立第二环境（Python 标准库重写 Spearman）复算 GSR：

```text
P1: paired=11 rho=-0.218182
P2: paired=11 rho=0.872727
```

与 Node harness 的 `-0.218` / `0.873` 一致（四舍五入）。

## 解释边界

- **不证明** Tacitweave 的前语言假设。
- **不证明** GSR 是情绪或内在体验的测量。
- 只有 2 位参与者、每人 11 个视频片段；不能估计人群效应。
- P2 的 GSR 相关在 circular-shift 对照下仍高（0.609），提示时间/片段结构可能贡献相关；不能当作独立证据。
- P1/P2 方向不一致，说明个体差异/特征选择可能主导结果。
- 视频片段不是 Tacitweave session；`arousal` 是连续自报均值，不是构念效度金标准。
- 没有 p 值；没有模型训练；没有临床声明。

## 复现

数据需从 Figshare 自行取得，放入临时目录，不提交：

```bash
pnpm case:canonical --root <CASE_snippet> --participants 1,2 --out /tmp/case-canonical.jsonl
pnpm lsm0:public --in /tmp/case-canonical.jsonl --feature gsrMeanMicroSiemens
python3 scripts/case_verify.py --in /tmp/case-canonical.jsonl --feature gsrMeanMicroSiemens
pnpm test src/case-adapter.test.ts
```

## 结论

CASE 管线已经可以：

1. 读取真实公开 CSV；
2. 按视频片段聚合；
3. 保持个体内分析；
4. 输出缺失/配对/对照；
5. 由第二环境重算。

这只验证了工具链，不验证 Tacitweave 的测量假设。

## 下一步

- 加 WESAD 跨设备/活动状态检查；
- 固定排除规则与 adapter version；
- 把原始 CSV 读取/特征版本/hash 写入可复现 manifest；
- 不在公开数据上事后选择特征来制造“显著”。
