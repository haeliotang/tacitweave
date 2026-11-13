<!--
SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
SPDX-License-Identifier: CC-BY-4.0
-->
# QoL_Stress phase check: self-report positive control, physiological nulls

日期：2026-11-13。状态：描述性 phase 检查；不是效应估计，不是 Tacitweave 假设检验。

## 数据

QoL_Stress v1.0.0（CC-BY-4.0），66 位参与者，relax/stress 两个 phase。
source SHA-256 与之前 bundle 一致：

```text
d16fe9c5f319eb9dff8cf9089399f18eef68fa8cdb1085f6032f5750814d1362
```

## 方法

`src/phase-control.ts` 计算每个参与者的 **stress − relax** 差值：

- 只使用两个 phase 都有值的参与者；
- 不插补；
- 报告 paired 数、缺失、均值/中位数、增加/减少/不变人数；
- 不做 p 值、不估计因果、不把 phase 标签当构念。

## 结果

| 变量 | paired | missing relax | missing stress | mean delta | median delta | increased | decreased | unchanged |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| ECG heart rate (bpm) | 66 | 0 | 0 | -0.409 | 0.000 | 29 | 30 | 7 |
| EDA mean SCL (µS) | 60 | 2 | 6 | -0.673 | -0.017 | 30 | 30 | 0 |
| STAI state anxiety | 66 | 0 | 0 | 3.227 | 3.000 | 43 | 12 | 11 |

## HRV 补充

加入简单 ECG R-peak/HRV 管线后（见 [ECG HRV pipeline](ecg-hrv-pipeline.md)）：

| 变量 | paired | mean delta | median delta | increased | decreased |
| --- | ---: | ---: | ---: | ---: | ---: |
| HRV SDNN | 56 | 20.396 ms | 13.405 | 33 | 23 |
| HRV RMSSD | 56 | 8.658 ms | 12.437 | 34 | 22 |

这仍不是压力效应：30 秒记录、简单检测器、12 条无可用 HRV、缺失非随机。

## 解释

- **STAI** 显示了方向一致的 phase 差异（43 增加 / 12 减少），符合 stress induction 的预期；这是自报问卷的阳性对照。
- **ECG 心率均值** 和 **EDA 均值** 没有显示简单方向变化；不能据此说管线错误，也不能说压力没有生理效应：
  - 这里只用 phase 内均值，不分析时间动态/HRV；
  - 设备为 Fitbit，ECG 只在 phase 末尾 30 秒采集；
  - EDA 缺失和有效样本差异大；
  - phase 标签不是个体体验真值。
- 这组结果支持“问卷链路能检测已知 phase 差异”，但**不支持**“ECG/EDA 均值是压力测量”。

## 边界

- 没有 p 值、置信区间或因果推断。
- 没有做多重比较校正；不报告“显著”。
- 没有把 QoL phase 当作 Tacitweave 前语言构念。
- 没有用这个结果训练 LSM 或选择特征。

## 复现

```bash
pnpm qol:canonical --root <QoL_Stress/data> --out /tmp/qol.jsonl
pnpm qol:phase-control --in /tmp/qol.jsonl
```

## 下一步

- 对 ECG 做 HRV/时间动态，而不是只看 phase 均值；
- 对 EDA 做缺失/质量分层；
- 把“自报阳性对照 vs 生理 null”写入 Gate 2B 的解释边界。
