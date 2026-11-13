<!--
SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
SPDX-License-Identifier: CC-BY-4.0
-->
# R-peak external validation protocol (frozen before results)

日期：2026-11-14。状态：冻结；用于一次 MIT-BIH + LUDB 外部验证。

## 目的

在决定 QoL HRV 能否进入主要分析之前，用专家标注的真实 ECG 比较两个 R-peak
检测器：

- TypeScript `src/ecg-hrv.ts` 检测器（当前 QoL 管线）
- Python SciPy `find_peaks` 检测器（当前独立检查）

本协议在查看任何检测指标前冻结。不得根据结果修改容差、排除规则或接受标准。

## 数据

### MIT-BIH Arrhythmia Database 1.0.0

- 全部 48 records。
- 信号：lead MLII；若 header 没有 MLII，则用第一条通道（记录在结果中）。
- 采样率：360 Hz（以 header 为准）。
- 注释：`atr` annotation；只保留 beat symbols：
  `N L R B A a J S V r F e j n E / f Q`。
- 排除非 beat/rhythm/comment symbols（包括 `?`、`+`、`~`、`|`、`!`、`[`、`]`、`x`）。
- ZIP SHA-256：
  `47b26926927c11bd9174154d367c811afc1b186f650f8a205931ca8c520f0a87`
- 许可：ODC-By 1.0（PhysioNet MIT-BIH）。

### Lobachevsky University Electrocardiography Database 1.0.1

- 全部 200 records。
- 信号：lead `ii`。
- 采样率：500 Hz（header）。
- 注释：`ii` annotation；只保留 `N`（QRS peak）。
- ZIP SHA-256：
  `d03192c7361ab5deeaba3f0d46e274b9ecb0b74c9caf8964151e20f1b5a7df06`
- 许可：ODC-By 1.0。

原始数据只放在临时目录，不进入仓库。

## 共同输入与预处理

两个检测器使用**同一份预滤波样本**和同一时间基准：

1. 读取物理信号；
2. 5–15 Hz 零相位 Butterworth 2 阶带通（`sosfiltfilt`）；
3. 写成 Float64 little-endian；
4. TypeScript 与 SciPy 读取同一个 `.f64`，采样率以 header 为准。

检测器算法：

- TS：绝对一阶差分能量 + 中位数阈值 + 250 ms refractory（现有实现，不改参数）。
- SciPy：`abs(filtered)` + `find_peaks(distance=0.25*fs, height=85th percentile)`。
- 两者都不使用专家标注调参。

## 心搏匹配

- 容差：**150 ms**（四舍五入到样本）。
- 一对一最近匹配；一个检测峰最多匹配一个标注，一个标注最多匹配一个峰。
- 未匹配检测 = false positive；未匹配标注 = false negative。
- 时间误差：匹配峰与标注的绝对时间差。

## 指标

每个记录与总体：

- sensitivity = TP / (TP + FN)
- PPV = TP / (TP + FP)
- F1
- median / 95th percentile absolute timing error
- missing/extra 数量

## 冻结接受标准

只有同时满足以下条件，才考虑将 HRV 从探索性升级为“检测器候选”：

- MIT-BIH：Se ≥ 0.99，PPV ≥ 0.99，F1 ≥ 0.99，median timing error ≤ 20 ms
- LUDB：Se ≥ 0.98，PPV ≥ 0.98，F1 ≥ 0.98，median timing error ≤ 20 ms
- 两个检测器都不出现单记录 F1 < 0.90
- 两个检测器的总体 F1 差异 ≤ 0.02

任一条件失败：

- HRV 保持探索性；
- 不批准主要分析；
- 记录失败模式；
- 不再通过增加检测器版本无限追查。

即使通过，也仍需独立验证正常搏间期筛选、伪迹处理和 HRV 指标重算，不能直接声称
HRV 可靠。

## 停止条件

如果 MIT-BIH 与 LUDB 仍不能定位 QoL 的检测差异，记录为 **domain shift 未解决**，
停止该方向，不继续增加检测器版本。

## 失败模式分类

- noise/基线漂移
- 异常心搏/起搏
- QRS 形态（宽 QRS、低振幅）
- 阈值/refractory 选择
- 记录边界/短记录
- 导联选择
