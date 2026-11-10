<!--
SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
SPDX-License-Identifier: CC-BY-4.0
-->
# Gate 2 pre-hardware hardening

日期：2026-11-07。状态：真实设备接入前的工程里程碑。逐项证据见 [gate-2-prehardware-report.md](gate-2-prehardware-report.md)。

## 目标

在首台真实设备进入 HIL 之前，先证明：

1. 完整桥接链路可回归，而不只是纯数据处理；
2. 研究采集 schema 的生命周期约束可验证；
3. 物理通道与派生特征正确分离；
4. 统计精度模拟能产生可审查报告。

这四件事不依赖真实设备，不依赖伦理批准，不应被签名/公证阻塞。

## 验收证据

### A. 完整桥接 SIL

- [ ] 使用真实本地 bridge 进程
- [ ] token 认证成功/失败
- [ ] sample/samples 转发
- [ ] 断开后重连
- [ ] 重连后重复样本去重（保留原始 sourceId/streamId/seq 身份）
- [ ] session 边界生成；SIL session 必须标记 simulated
- [ ] bridge 未声明 hardware origin 时，trace 必须按 simulated/unknown 保守标记
- [ ] 真实适配器声明 origin/devicePseudonym/adapterVersion/streamId
- [ ] 显式撤回/删除后无残留 session
- [ ] 缺失时间戳使用主机到达时间
- [ ] 测试失败时给出明确断言

### B. 研究 capture schema

- [ ] 物理通道与派生特征分开
- [ ] 派生特征必须引用存在的物理通道
- [ ] 设备 pseudonym 使用 keyed/random scheme，不直接哈希可枚举序列号
- [ ] 同意时间早于采集
- [ ] 留存期限晚于采集
- [ ] 撤回时间不早于同意
- [ ] 撤回后必须有删除请求/完成
- [ ] 删除请求不早于采集/撤回
- [ ] 删除完成不早于删除请求
- [ ] completed 状态必须有 requestedAt、完成时间和方法
- [ ] 同一 stream/seq 不同载荷必须标记冲突，不得静默新增
- [ ] 冲突必须阻断 `traceToTimeline()` / `mergeSignalTraces()`
- [ ] frame-level seq 必须映射为 channel-specific identity
- [ ] features_only 不得携带 raw 元信息
- [ ] 物理通道名唯一；pseudonym 长度/编码受校验

### C. 统计精度

- [ ] `pnpm lsm0:precision` 可重复运行
- [ ] 报告包含普通 bootstrap 与 moving-block bootstrap
- [ ] 报告包含 participant-specific population target、CI 宽度和覆盖率
- [ ] 异质性场景按每位参与者自身 target 计算 coverage
- [ ] moving-block 重采样长度严格等于 n
- [ ] 普通 bootstrap 与 non-circular moving-block 的差异被明确标注
- [ ] 报告明确时间依赖/缺失/生成模型限制
- [ ] protocol 不把 12×8 当成已验证样本量

### D. 研究/产品边界

- [ ] 产品摘要与 research capture 分开
- [ ] raw_signal / features_only 同意约束
- [ ] 原始数据留存期限/访问/删除记录
- [ ] 不默认永久保存敏感原始信号

## 通过后

才选择首台真实设备，进入 Gate 2A HIL。
Gate 2A 通过不等于 Gate 2B 通过；Gate 2B 不通过则不得进入 Gate 3A。
