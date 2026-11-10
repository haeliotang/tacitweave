// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
export type SomaticRegion = 'head' | 'jaw' | 'throat' | 'shoulders' | 'chest' | 'stomach' | 'back' | 'hands' | 'legs'

export type SomaticSensation = 'pressure' | 'heaviness' | 'hollowness' | 'tightness' | 'tingling' | 'heat' | 'cold' | 'numbness'

export type BreathState = 'held' | 'shallow' | 'fast' | 'deep' | 'even'
export type SomaticCertainty = 'clear' | 'mixed' | 'unsure'

export type AssociativeFragmentId =
  | 'dusk-stairs'
  | 'wet-corridor'
  | 'cold-gaze'
  | 'window-rain'
  | 'empty-platform'
  | 'warm-door'
  | 'forest-edge'
  | 'mirror-room'

export interface SomaticCapture {
  region: SomaticRegion
  sensation: SomaticSensation
  intensity: 1 | 2 | 3 | 4 | 5
  breath: BreathState
  fragments: AssociativeFragmentId[]
  /** Optional self-reported confidence in the capture; absent means the old capture format. */
  certainty?: SomaticCertainty
}

export interface AssociativeFragment {
  id: AssociativeFragmentId
  label: string
  labelEn: string
  motifs: Array<'corridor' | 'door' | 'water' | 'house' | 'forest' | 'station' | 'mirror' | 'field'>
  light: string
  texture: string
  sound: string
  palette: string
}

export const regions: Array<{ value: SomaticRegion; label: string; labelEn: string }> = [
  { value: 'head', label: '头', labelEn: 'Head' },
  { value: 'jaw', label: '下颌', labelEn: 'Jaw' },
  { value: 'throat', label: '喉咙', labelEn: 'Throat' },
  { value: 'shoulders', label: '肩', labelEn: 'Shoulders' },
  { value: 'chest', label: '胸口', labelEn: 'Chest' },
  { value: 'stomach', label: '胃/腹部', labelEn: 'Stomach / belly' },
  { value: 'back', label: '后背', labelEn: 'Back' },
  { value: 'hands', label: '手', labelEn: 'Hands' },
  { value: 'legs', label: '腿', labelEn: 'Legs' },
]

export const sensations: Array<{ value: SomaticSensation; label: string; labelEn: string }> = [
  { value: 'pressure', label: '压迫', labelEn: 'Pressure' },
  { value: 'heaviness', label: '沉重', labelEn: 'Heaviness' },
  { value: 'hollowness', label: '空/坠', labelEn: 'Hollowness / falling' },
  { value: 'tightness', label: '绷紧', labelEn: 'Tightness' },
  { value: 'tingling', label: '发麻', labelEn: 'Tingling' },
  { value: 'heat', label: '发热', labelEn: 'Heat' },
  { value: 'cold', label: '发冷', labelEn: 'Cold' },
  { value: 'numbness', label: '麻木', labelEn: 'Numbness' },
]

export const breaths: Array<{ value: BreathState; label: string; labelEn: string }> = [
  { value: 'held', label: '屏住', labelEn: 'Held' },
  { value: 'shallow', label: '很浅', labelEn: 'Shallow' },
  { value: 'fast', label: '偏快', labelEn: 'Fast' },
  { value: 'deep', label: '很深', labelEn: 'Deep' },
  { value: 'even', label: '还算均匀', labelEn: 'Even' },
]

export const certainties: Array<{ value: SomaticCertainty; label: string; labelEn: string }> = [
  { value: 'clear', label: '比较确定', labelEn: 'Fairly clear' },
  { value: 'mixed', label: '有些矛盾', labelEn: 'Mixed' },
  { value: 'unsure', label: '说不清', labelEn: 'Not sure' },
]

export const fragments: AssociativeFragment[] = [
  { id: 'dusk-stairs', label: '黄昏的楼梯间', labelEn: 'Dusk stairwell', motifs: ['house', 'corridor'], light: 'Amber dusk light, dust in the air, long stair shadows.', texture: 'Worn wood and cool plaster.', sound: 'Distant room tone and a faint outside hum.', palette: 'dusk' },
  { id: 'wet-corridor', label: '潮湿的走廊', labelEn: 'Wet corridor', motifs: ['corridor', 'water'], light: 'Dim, greenish light reflected from wet floor.', texture: 'Damp concrete and condensation.', sound: 'Water dripping slowly in a narrow space.', palette: 'wet' },
  { id: 'cold-gaze', label: '冰冷的注视', labelEn: 'Cold gaze', motifs: ['mirror', 'door'], light: 'Hard, pale light with a dark edge.', texture: 'Glass, cold metal, a still surface.', sound: 'A low, almost inaudible room tone.', palette: 'cold' },
  { id: 'window-rain', label: '窗边的雨', labelEn: 'Rain at the window', motifs: ['house', 'water'], light: 'Soft grey daylight through rain.', texture: 'Cold window glass and fabric.', sound: 'Rain on glass and muffled street sound.', palette: 'rain' },
  { id: 'empty-platform', label: '空站台', labelEn: 'Empty platform', motifs: ['station', 'field'], light: 'Flat fluorescent light over an empty platform.', texture: 'Concrete, painted metal, open air.', sound: 'Distant rail hum and wind.', palette: 'station' },
  { id: 'warm-door', label: '半开的暖门', labelEn: 'Warm half-open door', motifs: ['door', 'house'], light: 'Warm light spilling from a narrow opening.', texture: 'Painted wood and a worn handle.', sound: 'Quiet room tone from the other side.', palette: 'warm' },
  { id: 'forest-edge', label: '森林边缘', labelEn: 'Forest edge', motifs: ['forest', 'field'], light: 'Low sun through leaves, deep green shade.', texture: 'Moss, bark and cold air.', sound: 'Leaves, wind and distant birds.', palette: 'forest' },
  { id: 'mirror-room', label: '镜子的房间', labelEn: 'Mirror room', motifs: ['mirror', 'corridor'], light: 'Soft light multiplied by reflections.', texture: 'Cool glass and polished floor.', sound: 'A slight echo with no clear source.', palette: 'mirror' },
]

export function isSomaticCapture(value: unknown): value is SomaticCapture {
  if (!value || typeof value !== 'object') return false
  const capture = value as Partial<SomaticCapture>
  return regions.some(item => item.value === capture.region)
    && sensations.some(item => item.value === capture.sensation)
    && Number.isInteger(capture.intensity) && capture.intensity! >= 1 && capture.intensity! <= 5
    && breaths.some(item => item.value === capture.breath)
    && Array.isArray(capture.fragments)
    && capture.fragments.length > 0 && capture.fragments.length <= 3
    && capture.fragments.every(id => fragments.some(fragment => fragment.id === id))
    && (capture.certainty === undefined || certainties.some(item => item.value === capture.certainty))
}
