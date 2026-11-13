<!--
SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
SPDX-License-Identifier: CC-BY-4.0
-->
# QoL_Stress ECG HRV pipeline check

日期：2026-11-13。状态：简单 R-peak/HRV 管线检查；不是研究级 HRV 验证。

## 数据

QoL_Stress v1.0.0，132 条 ECG 记录（66 人 × relax/stress），每条约 30 秒、7,500 samples。
数据中没有明确写入采样率；按 250 Hz 处理。

## 方法

`src/ecg-hrv.ts`：

- 绝对一阶差分能量；
- 中位数 + 0.35 范围阈值；
- 250 ms refractory；
- RR 过滤 0.3–2.0 s；
- SDNN、RMSSD。

`src/qol-adapter.ts` 把每个 phase 的 HRV 均值加入 canonical signals：

- `ecgHrvSdnnMs`
- `ecgHrvRmssdMs`
- `ecgRPeakCount`

## 检测器与记录心率对照

```text
records=132 detected=120
mean_abs_hr_error=2.79 bpm
within_10_bpm=117/120
mean_sdnn_ms=107.7
```

12 条未产生可用 HRV；检测器的平均心率与设备记录心率接近，但这不证明 R-peak 检测准确。

## Phase 变化

| 变量 | paired | mean delta | median delta | increased | decreased |
| --- | ---: | ---: | ---: | ---: | ---: |
| ECG heart rate | 66 | -0.409 | 0.000 | 29 | 30 |
| HRV SDNN | 56 | 20.396 ms | 13.405 | 33 | 23 |
| HRV RMSSD | 56 | 8.658 ms | 12.437 | 34 | 22 |
| EDA mean SCL | 60 | -0.673 | -0.017 | 30 | 30 |
| STAI state anxiety | 66 | 3.227 | 3.000 | 43 | 12 |

## 外部专家标注验证

MIT-BIH + LUDB 的冻结协议验证已完成，**两套检测器均未通过**；见
[R-peak external validation](rpeak-external-validation-report.md)。HRV 保持探索性、排除出主要分析。

## 独立 SciPy 检查

`scripts/qol_hrv_verify.py` 用 SciPy `butter` + `find_peaks` 重新实现：

```text
records=132 detected=132
mean_abs_hr_error=16.21 bpm
within_10_bpm=55/132
mean_sdnn_ms=162.5
```

与简单 TS 检测器的 `2.79 bpm / 117/120` 不一致。这说明：

- 至少一个检测器不适用于 QoL 的短 ECG；
- 两种实现都没有与参考标注比对；
- 不能把任一 HRV 数值当作可靠测量；
- TS 检测器的“接近记录心率”不足以证明 R-peak 正确。

## 解释边界

- 30 秒短记录不足以稳定估计 HRV；SDNN/RMSSD 对记录长度敏感。
- 简单阈值检测器没有与 NeuroKit2/其他参考实现比对。
- 12 条记录无可用 HRV；缺失不是随机。
- HRV 方向变化弱且不一致，不能称为压力效应。
- 没有 p 值、因果、临床或构念效度结论。
- 这个管线只说明“可以从公开 ECG 提取候选 HRV 特征”，不说明这些特征可靠；
- 独立 SciPy 检查未通过一致性，因此 HRV 结果只能标记为探索性。

## 复现

```bash
python3 scripts/qol_hrv_verify.py --in <QoL_Stress/data>/ecg.csv
```

```bash
pnpm qol:hrv-check --in <QoL_Stress/data>/ecg.csv
pnpm qol:canonical --root <QoL_Stress/data> --out /tmp/qol.jsonl
pnpm qol:phase-control --in /tmp/qol.jsonl
```

## 下一步

1. 用 NeuroKit2 或独立 R-peak 实现做一致性检查
2. 固定采样率/滤波/检测器版本
3. 只使用质量合格的记录，并预注册排除规则
4. 不在 30 秒记录上过度解释 HRV
