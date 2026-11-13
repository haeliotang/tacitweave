<!--
SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
SPDX-License-Identifier: CC-BY-4.0
-->
# WESAD adapter contract and access decision

日期：2026-11-13。状态：adapter 契约 + 合成 fixture；**未下载或分析真实 WESAD**。

## 数据与许可

- 数据集：[WESAD](https://ubi29.informatik.uni-siegen.de/usi/data_wesad.html)，
  Schmidt et al., ICMI 2018。
- 官方声明：仅可用于**科研、非商业**用途，发表时需引用作者。
- 原始压缩包约 **2.5 GB**；单受试者解压后约 1.1 GB。
- 本仓库不打包、不转售、不重新分发 WESAD 原始数据。

## 决定

本轮不自动下载 2.5 GB 原始包。原因：

- 当前会话无法可靠完成下载、校验和真实结构检查；
- 许可限制需要在研究使用场景下单独核对；
- 没有真实数据时，不应编造 adapter 结果。

adapter 仅以本地用户提供的 WESAD 数据为输入；若创始人提供数据，再运行并生成
manifest。

## Adapter 契约

`scripts/wesad_adapter.py`：

```bash
python3 scripts/wesad_adapter.py --root WESAD --out /tmp/wesad-canonical.jsonl
```

预期结构：

```text
WESAD/S2/S2.pkl
WESAD/S3/S3.pkl
...
```

每个 pickle 的已知字段：

- `subject`
- `signal.chest`: `ACC`, `ECG`, `EDA`, `EMG`, `RESP`, `TEMP`（700 Hz）
- `signal.wrist`: `ACC`, `BVP`, `EDA`, `TEMP`（较低采样率）
- `label` / `labels`（700 Hz 条件标签）

条件映射：`1=baseline`、`2=stress`、`3=amusement`。

输出：

- 每个受试者每个条件一个 canonical session；
- chest 信号均值；
- wrist 信号只有在采样长度与标签一致时才聚合，否则不静默错配；
- `selfReport` 为空：WESAD condition 标签不是内在体验自报；
- 不把 `stress` 标签当作情绪真值。

## 测试

```bash
python3 scripts/test_wesad_adapter.py
```

测试使用**合成 WESAD-shaped pickle**，验证：

- 条件划分；
- chest ECG/EDA 均值；
- `selfReport` 不被伪造；
- 输出 3 个条件 session。

## 不主张

- 未在真实 WESAD 上运行。
- 没有压力分类、情绪识别或前语言假设结论。
- 没有用条件标签替代自报。
- 未把 WESAD 数据加入仓库。

## 下一步

如果决定使用 WESAD：

1. 核对许可并记录来源/版本；
2. 下载、校验 hash；
3. 在临时目录运行 adapter 和 manifest verifier；
4. 只提交聚合报告与 manifest，不提交原始数据；
5. 明确条件标签不是构念效度证据。
