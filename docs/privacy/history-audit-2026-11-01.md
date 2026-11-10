<!--
SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
SPDX-License-Identifier: CC-BY-4.0
-->
# Git 历史大文件与音频审计

日期：2026-11-01。范围：当前仓库所有可达提交（`git rev-list --objects --all`）。

## 结论

**没有发现真人语音证据。** 大文件主要是早期 3D 角色资产；历史音频全部是本地合成测试素材或合成 fixture。

2026-11-01 后续按维护者确认执行了历史清理：22 个 >1 MB 的 Quaternius 3D 资产已从 `main` 历史移除，并 force-push。更小的 `LICENSE.txt` / `provenance.json` 可能仍在历史中。

## 大文件

审计时大于 1 MB 的 blob 共 **22 个**，合计 **153.52 MB**，全部位于：

- `public/assets/quaternius/**/*.glb`
- `public/assets/quaternius/**/animations.json`

这些是早期 3D 人物/动画资产，不是音频，也不包含真人照片。它们已从 `main` 历史删除；当前 `main` 不再包含超过 1 MB 的 blob。

## 历史音频

历史中的音频共 **88 个**，合计 **9.54 MB**：

| 路径 | 数量 | 说明 |
| --- | ---: | --- |
| `artifacts/acceptance/M0/**` | 82 | Kokoro / speaker 3 / speaker 58 的本地合成验收 WAV |
| `public/assets/sample-voices/**` | 2 | `provenance.json` 明确写有 `locally generated synthetic sample lines; no user recordings` |
| `public/assets/sample-voices-female/**` | 2 | 同上，Kokoro speaker 3 |
| `server/fixtures/**` | 2 | 合成 WebM 测试 fixture |

- 最大的音频 blob 为 **183,154 B**，没有超过 1 MB 的音频。
- `docs/verification/audio-upload-retry.md` 明确记录「使用已发布通用 Kokoro 合成 general.wav，无真实录音」。
- `docs/verification/direct-recording.md` 明确记录「没有授权实际采集麦克风声音，本轮未点击录制按钮或接受麦克风权限」。
- 旧版直接录音验证页只生成 440 Hz 合成音；截图中的「本人录音」是 UI 占位，不是已提交的真人音频。

## 可选的后续清理

大文件清理已完成。如果还要进一步缩小仓库，可以继续删除剩余的 Quaternius 小文件和历史验收音频（约 9.5 MB）；那会再次改写历史，需要单独确认。
