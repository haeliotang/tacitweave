// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { breaths, fragments, isSomaticCapture, regions, sensations, type SomaticCapture } from './somatic'

export type InnerFormat = 'encounter' | 'space'

export type InnerMotif = 'corridor' | 'door' | 'water' | 'house' | 'forest' | 'station' | 'mirror' | 'field'

export type InnerFeeling = 'longing' | 'unease' | 'calm' | 'grief' | 'anger' | 'numbness'

export type InnerFigure = 'shadow' | 'stranger' | 'child' | 'animal' | 'none'

export type InnerAction = 'arrive' | 'notice' | 'approach' | 'pause' | 'transform' | 'leave'

export interface InnerBeat {
  startSec: number
  endSec: number
  action: InnerAction
  intent: string
}

export interface InnerPromptPack {
  space: string
  figure: string
  sound: string
  light: string
  camera: string
  negative: string[]
}

export interface InnerPlan {
  version: 'inner-v1'
  format: InnerFormat
  durationSec: number
  motifs: InnerMotif[]
  figure: InnerFigure
  beats: InnerBeat[]
  prompts: InnerPromptPack
  somatic?: SomaticCapture
  safety: {
    notDiagnosis: true
    noInterpretation: true
    userOwnsMeaning: true
    exitAlwaysAvailable: true
    noMemoriesClaimed: true
  }
}

const motifWords: Record<InnerMotif, RegExp> = {
  water: /水|河|海|湖|雨|潮/,
  door: /门|入口|出口|门槛/,
  house: /房|屋|家|房间|窗/,
  forest: /林|树|森|枝叶/,
  station: /车站|站台|火车|列车|月台/,
  mirror: /镜|反射|倒影/,
  corridor: /走廊|通道|隧道|楼梯/,
  field: /田野|草地|草原|空地/,
}

const figureWords: Array<[InnerFigure, RegExp]> = [
  ['child', /孩子|小孩|童年|少年/],
  ['animal', /动物|狗|猫|鸟|鹿|马/],
  ['stranger', /陌生人|路人|旅人/],
  ['shadow', /影子|阴影|轮廓/],
]

const safety: InnerPlan['safety'] = {
  notDiagnosis: true,
  noInterpretation: true,
  userOwnsMeaning: true,
  exitAlwaysAvailable: true,
  noMemoriesClaimed: true,
}

function fragmentOf(fragment: string) {
  const trimmed = fragment.trim()
  if (!trimmed) throw new Error('请先写下一段梦、画面、感觉或反复出现的片段。')
  return trimmed
}

function motifsOf(fragment: string) {
  const motifs = (Object.entries(motifWords) as Array<[InnerMotif, RegExp]>)
    .filter(([, pattern]) => pattern.test(fragment))
    .map(([motif]) => motif)
  return motifs.length ? motifs.slice(0, 3) : ['corridor', 'door', 'water'] as InnerMotif[]
}

function lightOf(feeling: InnerFeeling) {
  if (feeling === 'calm') return 'Soft, even light with long shadows.'
  if (feeling === 'grief') return 'Low, warm light; some areas stay dark.'
  if (feeling === 'anger') return 'Hard directional light and deep contrast.'
  if (feeling === 'numbness') return 'Flat, almost colorless light.'
  return 'Unsteady light, as if weather is changing indoors.'
}

function negativePrompts() {
  return [
    'no diagnosis or psychological interpretation',
    'no claims about the unconscious or repressed memories',
    'no real-person likeness or voice cloning',
    'no on-screen text',
    'no engagement prompts or notifications',
  ]
}

export function innerPlan(input: { fragment: string; feeling?: InnerFeeling }): InnerPlan {
  const fragment = fragmentOf(input.fragment)
  const motifs = motifsOf(fragment)
  const figure = figureWords.find(([, pattern]) => pattern.test(fragment))?.[0] ?? 'shadow'
  const feeling = input.feeling ?? 'unease'
  return {
    version: 'inner-v1',
    format: 'encounter',
    durationSec: 75,
    motifs,
    figure,
    beats: [
      { startSec: 0, endSec: 12, action: 'arrive', intent: '进入空间，先听与看，不急着理解' },
      { startSec: 12, endSec: 28, action: 'notice', intent: '注意到一个反复出现的细节' },
      { startSec: 28, endSec: 43, action: 'approach', intent: '靠近，但不强迫自己靠近' },
      { startSec: 43, endSec: 55, action: 'pause', intent: '停留一会儿，允许矛盾同时存在' },
      { startSec: 55, endSec: 68, action: 'transform', intent: '空间或影子发生变化，不解释变化' },
      { startSec: 68, endSec: 75, action: 'leave', intent: '可以离开；离开也是这段经验的一部分' },
    ],
    prompts: {
      space: `A symbolic, dreamlike space built from: ${motifs.join(', ')}. Not a literal location; no readable text, no maps, no labels.`,
      figure: `A ${figure} presence at the edge of the space; it does not speak, judge, or explain. No real-person likeness, no identity, no diagnosis.`,
      sound: 'Low ambient sound, distant water/air/room tone; no music with a clear emotional instruction; no voice-over.',
      light: lightOf(feeling),
      camera: 'Slow first-person drift; the viewer may stop, look, approach, or leave at any time. No jump cuts.',
      negative: negativePrompts(),
    },
    safety,
  }
}

/**
 * Build a 75-second encounter from a pre-verbal capture: a body location, a
 * sensation, breath and one to three associative fragments. No free text is
 * accepted or inferred.
 */
export function innerPlanFromCapture(capture: SomaticCapture): InnerPlan {
  if (!isSomaticCapture(capture)) throw new Error('请先选择身体部位、感觉和至少一块意象。')
  const selected = capture.fragments
    .map(id => fragments.find(fragment => fragment.id === id))
    .filter((fragment): fragment is NonNullable<typeof fragment> => Boolean(fragment))
  if (!selected.length) throw new Error('请先选择至少一块意象。')
  const motifs = [...new Set(selected.flatMap(fragment => fragment.motifs))].slice(0, 3) as InnerMotif[]
  const region = regions.find(item => item.value === capture.region)?.label ?? capture.region
  const sensation = sensations.find(item => item.value === capture.sensation)?.label ?? capture.sensation
  const breath = breaths.find(item => item.value === capture.breath)?.label ?? capture.breath
  return {
    version: 'inner-v1',
    format: 'encounter',
    durationSec: 75,
    motifs: motifs.length ? motifs : ['corridor', 'door', 'water'],
    figure: 'none',
    somatic: capture,
    beats: [
      { startSec: 0, endSec: 12, action: 'arrive', intent: '进入空间，先感觉身体，不急着解释' },
      { startSec: 12, endSec: 28, action: 'notice', intent: '留意身体里最明显的那个位置' },
      { startSec: 28, endSec: 43, action: 'approach', intent: '让空间靠近那个感觉，但不强迫' },
      { startSec: 43, endSec: 55, action: 'pause', intent: '允许感觉存在，不命名它' },
      { startSec: 55, endSec: 68, action: 'transform', intent: '光、材质或距离发生变化，不解释变化' },
      { startSec: 68, endSec: 75, action: 'leave', intent: '可以离开；离开也是这段经验的一部分' },
    ],
    prompts: {
      space: `A symbolic, dreamlike space built from: ${motifs.join(', ')}. The viewer reports a bodily sense of ${capture.sensation} at the ${capture.region}, with breath ${capture.breath}. Do not diagnose, interpret, or name an emotion. No readable text, no maps, no labels.`,
      figure: 'No figure is required. Keep the space non-identifying and non-diagnostic.',
      sound: selected.map(fragment => fragment.sound).join(' '),
      light: selected.map(fragment => fragment.light).join(' '),
      camera: 'Slow first-person drift; the viewer may stop, look, approach, or leave at any time. No jump cuts.',
      negative: negativePrompts(),
    },
    safety,
  }
}

/**
 * A space is not an encounter: no required arc, no required figure, and no
 * built-in ending. The viewer can stay, look, or leave at any time.
 */
export function innerSpace(input: { fragment: string; feeling?: InnerFeeling }): InnerPlan {
  const fragment = fragmentOf(input.fragment)
  const motifs = motifsOf(fragment)
  const feeling = input.feeling ?? 'calm'
  return {
    version: 'inner-v1',
    format: 'space',
    durationSec: 180,
    motifs,
    figure: 'none',
    beats: [{ startSec: 0, endSec: 180, action: 'pause', intent: '可以待着；没有必须发生的事' }],
    prompts: {
      space: `A symbolic, dreamlike space built from: ${motifs.join(', ')}. An ambient place to stay rather than a story; no readable text, no maps, no labels, no required event.`,
      figure: 'No figure is required. If a presence appears, keep it peripheral, non-speaking, non-identifying, and non-diagnostic.',
      sound: 'Low continuous ambient sound, distant water/air/room tone; no music with a clear emotional instruction; no voice-over.',
      light: lightOf(feeling),
      camera: 'Slow first-person drift with no required arc; the viewer may stay, look, sit, or leave at any time. No jump cuts.',
      negative: negativePrompts(),
    },
    safety,
  }
}

export function innerStoryboardMarkdown(plan: InnerPlan): string {
  const beats = plan.beats.map(beat => `| ${beat.startSec}–${beat.endSec}s | ${beat.action} | ${beat.intent} |`).join('\n')
  return [
    '# Inner storyboard',
    '',
    `- 版本：${plan.version}`,
    `- 形式：${plan.format}`,
    `- 时长：${plan.durationSec} 秒`,
    `- 片段：${plan.motifs.join(' / ')}`,
    `- 影子：${plan.figure}`,
    ...(plan.somatic ? [
      `- 身体部位：${plan.somatic.region}`,
      `- 身体感觉：${plan.somatic.sensation}`,
      `- 强度：${plan.somatic.intensity}/5`,
      `- 呼吸：${plan.somatic.breath}`,
      `- 意象碎片：${plan.somatic.fragments.join(' / ')}`,
    ] : []),
    '- 本文件不包含输入原文，也不对输入做解释。',
    '',
    '## 节拍',
    '',
    '| 时间 | 动作 | 意图 |',
    '| --- | --- | --- |',
    beats,
    '',
    '## 提示词',
    '',
    `### Space\n${plan.prompts.space}`,
    '',
    `### Figure\n${plan.prompts.figure}`,
    '',
    `### Sound\n${plan.prompts.sound}`,
    '',
    `### Light\n${plan.prompts.light}`,
    '',
    `### Camera\n${plan.prompts.camera}`,
    '',
    `### Negative\n${plan.prompts.negative.map(item => `- ${item}`).join('\n')}`,
    '',
    '## 安全',
    '',
    `- 不是诊断：${plan.safety.notDiagnosis}`,
    `- 不做解释：${plan.safety.noInterpretation}`,
    `- 意义归用户：${plan.safety.userOwnsMeaning}`,
    `- 随时可离开：${plan.safety.exitAlwaysAvailable}`,
    `- 不声称恢复记忆：${plan.safety.noMemoriesClaimed}`,
    '',
  ].join('\n')
}
