<!--
SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
SPDX-License-Identifier: CC-BY-4.0
-->
# Gate 2A — OpenBCI Cyton 非人体台架计划

日期：2026-11-07
状态：**计划，未执行；不得据此声称 Gate 2A 通过。**
目标设备：OpenBCI Cyton 8-channel Biosensing Board（参考设备）。
替代路径：若 Cyton 不可得，可用 DFRobot/Seeed + ESP32-S3 自组台架，但必须保持同等证据要求。

## 0. 授权边界

允许：

- 设备选型、采购/借用
- BrainFlow/SDK 研究
- 非人体电信号注入、板载测试信号、GND
- 适配器开发
- Tauri 重启、删除、导出、日志验证
- 失败记录

不允许：

- 人体电极采集
- LSM-0 正式研究采集
- 把 `origin: hardware` 当作人体生理数据证明
- 把内部测试脉冲写入研究数据集
- 在未冻结阈值前开始正式台架运行

## 1. 设备识别与基线锁定

执行前记录并冻结：

- [ ] 板卡型号、硬件 revision
- [ ] 实际固件版本（不是包装盒版本）
- [ ] BrainFlow 版本
- [ ] Python/OS 版本
- [ ] USB 串口路径（macOS `/dev/cu.*`）
- [ ] 采样率
- [ ] 8 个通道配置（启用/禁用、增益、输入类型）
- [ ] 设备 pseudonym（keyed/random，不存明文序列号）
- [ ] adapterVersion
- [ ] 首次 `streamId` epoch
- [ ] Git commit
- [ ] 适配器源码 commit/hash

命令/接口示例（以实际 BrainFlow API 为准）：

```python
from brainflow.board_shim import BoardShim, BrainFlowInputParams, BoardIds

params = BrainFlowInputParams()
params.serial_port = "/dev/cu.usbserial-..."
board = BoardShim(BoardIds.CYTON_BOARD, params)
board.prepare_session()
board.start_stream()
```

不要仅凭 `CYTON_BOARD` 常量就认定固件、采样率或通道配置已验证。

## 2. 无人体采样验证

使用板载测试信号/GND，不使用人体电极。

每个 session 独立执行三次：

- [ ] 启动前记录设备状态
- [ ] 采集至少 60 秒
- [ ] 保存工程诊断数据
- [ ] 保存采样时间戳
- [ ] 保存包序号
- [ ] 保存异常计数
- [ ] 保存版本清单
- [ ] 计算并记录 SHA-256

### 证据标注

内部测试信号必须标注：

```text
internal_test_signal
```

该标记不得进入人体研究数据集。
它只能证明管线、时钟、丢包与恢复行为，不能证明人体生理测量可靠性。

## 3. 设备身份与故障注入

- [ ] 稳定 `devicePseudonym`
- [ ] 稳定 `streamId`
- [ ] 每包/每帧 `seq` 语义明确
- [ ] channel 映射明确
- [ ] 合法重放不重复计数
- [ ] 同身份不同载荷触发 `signal_identity_conflict`
- [ ] 人为重复包
- [ ] 人为断线
- [ ] 自动重连
- [ ] 设备重启
- [ ] seq 重置 + 新 streamId
- [ ] 旧 stream 不和新 stream 混淆
- [ ] 多通道同 frame seq 不误判冲突

## 4. 时钟与采样完整性

对比：

- 板卡采样计数
- 设备时间信息（如提供）
- 主机单调时钟
- Bridge 接收时间

记录：

- [ ] 有效采样率
- [ ] 采样率漂移
- [ ] 最大间隔
- [ ] >1s 间隔
- [ ] 重复包
- [ ] 丢失包
- [ ] 乱序包
- [ ] 重连后时间连续性
- [ ] 设备重启时间基准变化

### 阈值冻结

必须在正式台架运行前冻结：

- 可接受采样率误差
- 最大允许 gap
- 漂移上限
- 丢包/重复包上限
- 重连恢复时间
- 异常 session 排除规则

不得在看到结果后调整阈值。

## 5. 应用恢复与证据封存

- [ ] Tauri 关闭后重启
- [ ] 重新连接设备
- [ ] 摘要恢复
- [ ] session 删除
- [ ] 重载后无残留
- [ ] 导出时间轴
- [ ] 日志中无 token/序列号/原始敏感数据
- [ ] 失败记录保留

### 证据包

最终输出一份可独立检查的证据包：

```text
gate2a-cyton-<date>/
  manifest.json
  device-config.json
  firmware.txt
  brainflow-version.txt
  adapter-commit.txt
  raw/
  timestamps/
  sequence/
  errors/
  hashes.sha256
  run-log.txt
  failures.md
  report.md
```

`manifest.json` 至少包含：

- device model/revision
- firmware
- BrainFlow version
- adapterVersion
- devicePseudonym
- streamId
- Git commit
- file SHA-256
- run started/ended
- pass/fail per check
- known limitations

## 6. Gate 2A 判定

PASS 仅当：

- 每项测试有可复核运行记录
- 失败项已记录并解释
- 阈值在运行前冻结
- 证据包可独立重放/检查
- 来源标记与设备身份绑定
- 没有任何人体数据

任一未满足 → **FAIL 或 PARTIAL**，不得口头通过。

## 7. 已知边界

- `origin: hardware` 是适配器自声明，不是硬件真实性证明；需绑定固件、适配器版本和实测日志。
- `internal_test_signal` 不是人体生理数据。
- `mergeSignalTraces()` 当前把多来源 provenance 简化为单一可选字段；本计划仅覆盖单设备。跨设备来源追溯需另行验收。
- 低价模块若用于人体接触，必须重新做电气安全与隔离评估；本计划不覆盖。

## 8. 下一步

1. 确认 Cyton 是否可得；若不可得，决定是否改用 DFRobot/Seeed + ESP32-S3 自组台架。
2. 冻结设备配置与阈值。
3. 运行三次无人体 session。
4. 生成证据包。
5. 只根据证据包判定 Gate 2A；不据 SIL 或 CLI 参数判定。
