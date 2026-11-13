<!--
SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
SPDX-License-Identifier: CC-BY-4.0
-->
# R-peak external validation: failed acceptance

日期：2026-11-14。
状态：按冻结协议完成一次 MIT-BIH + LUDB 验证；**两套检测器均未通过接受标准**。
原始数据未提交；只保留聚合/逐记录指标和脚本。

## 数据

| 数据 | 版本 | 记录 | 采样率 | 标注 | ZIP SHA-256 |
| --- | --- | ---: | ---: | --- | --- |
| MIT-BIH | 1.0.0 | 48 | 360 Hz | `atr` beat symbols | `47b26926927c11bd9174154d367c811afc1b186f650f8a205931ca8c520f0a87` |
| LUDB | 1.0.1 | 200 | 500 Hz | lead ii 的 `N` QRS peak | `d03192c7361ab5deeaba3f0d46e274b9ecb0b74c9caf8964151e20f1b5a7df06` |

两者均为 ODC-By 1.0。协议见
[`rpeak-external-validation-protocol.md`](rpeak-external-validation-protocol.md)。

## 方法

- 同一滤波样本：5–15 Hz 零相位 Butterworth 2 阶；
- 同一时间基准：sample index / fs；
- 匹配容差：150 ms，一对一最近；
- TS 检测器：现有 `src/ecg-hrv.ts`；
- SciPy 检测器：`abs(filtered)` + `find_peaks(distance=0.25fs, height=85th percentile)`；
- 未根据结果调参。

## 总体结果

### MIT-BIH（48 records）

| 检测器 | TP | FN | FP | Sensitivity | PPV | F1 | median timing error |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| TS | 97,964 | 11,530 | 64 | 0.8947 | 0.99935 | 0.94413 | 19.4 ms |
| SciPy | 109,300 | 194 | 7,997 | 0.99823 | 0.93182 | 0.96388 | 0.0 ms |

TS 单记录 F1 < 0.90：6 条；最差：
`105` (0.049)、`228` (0.347)、`104` (0.478)、`203` (0.600)、`222` (0.718)、`108` (0.886)。

SciPy 单记录 F1 < 0.90：5 条；最差：
`113` (0.668)、`117` (0.673)、`123` (0.717)、`111` (0.788)、`232` (0.802)。

### LUDB（200 records）

| 检测器 | TP | FN | FP | Sensitivity | PPV | F1 | median timing error |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| TS | 1,807 | 24 | 419 | 0.98689 | 0.81177 | 0.89081 | 18.0 ms |
| SciPy | 1,829 | 2 | 872 | 0.99891 | 0.67716 | 0.80715 | 2.0 ms |

TS 单记录 F1 < 0.90：101/200；SciPy：126/200。

## 失败模式

- **TS 在 MIT-BIH 漏检**：paced/异常/宽 QRS 记录（105、228、104、203、222、108）出现大量 FN；
  灵敏度 0.895，不满足 Se ≥ 0.99。
- **SciPy 在 MIT-BIH 过检**：灵敏度高但 PPV 0.932，7,997 个额外峰；
  可能来自 T 波/异常形态被当作 R 峰。
- **LUDB 过检更严重**：SciPy PPV 0.677；TS PPV 0.812。
  10 秒记录短，任何额外检测都会显著拉低 PPV。
- **阈值/refractory**：TS 的固定中位数阈值在低振幅/宽 QRS 上漏检；
  SciPy 的 85th percentile 阈值在 10 秒记录上过检。
- **导联/预滤波**：统一 5–15 Hz 可能改变宽 QRS 与起搏形态；未做 per-record 调整。
- **记录长度**：LUDB 10 秒不足以稳定单记录 F1；总体仍失败，不是抽样噪声。

## 决定

冻结接受标准未满足：

- MIT-BIH F1 0.944（TS）/0.964（SciPy），低于 0.99；
- LUDB F1 0.891/0.807，低于 0.98；
- 两套数据均出现单记录 F1 < 0.90；
- 两个检测器差异 > 0.02。

因此：

1. **HRV 保持探索性**，不进入主要分析；
2. 不批准任何 HRV 结论；
3. 按协议停止继续增加检测器版本；
4. 将失败模式记录为 **domain shift / 检测器未验证**，等待有标注的 QoL 自身数据或新的独立验证输入；
5. 不通过调参把结果“修到”阈值内。

## 复现

```bash
# 本地 PhysioNet 数据目录，不提交
python3 scripts/rpeak_validate.py \
  --mit-root <mitdb>/mit-bih-arrhythmia-database-1.0.0 \
  --ludb-root <ludb>/lobachevsky-university-electrocardiography-database-1.0.1 \
  --out /tmp/rpeak-results.json
```

逐记录结果：[`rpeak-external-validation-results.json`](rpeak-external-validation-results.json)。

## 结论

这次验证不是“成功证明检测器可靠”，而是**按预先标准失败**。
它比继续增加合成测试更有价值：现在有真实专家标注证据表明，TS 与 SciPy 检测器都不能作为
QoL HRV 的可靠基础。
