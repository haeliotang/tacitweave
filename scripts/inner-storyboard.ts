// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { innerPlan, innerSpace, innerStoryboardMarkdown, type InnerFeeling } from '../src/inner'

const args = process.argv.slice(2)
const usage = '用法：pnpm inner:storyboard --fragment "一段梦/画面/感觉" [--format encounter|space] [--feeling longing|unease|calm|grief|anger|numbness] [--json]'

if (args.includes('--help') || args.includes('-h')) {
  process.stdout.write(`${usage}\n`)
  process.exit(0)
}

const fragmentFlag = args.indexOf('--fragment')
const fragment = fragmentFlag >= 0 ? args[fragmentFlag + 1] : args.filter(arg => !arg.startsWith('--')).join(' ')
if (!fragment) {
  process.stderr.write(`${usage}\n`)
  process.exit(2)
}

const formatFlag = args.indexOf('--format')
const format = formatFlag >= 0 ? args[formatFlag + 1] : 'encounter'
if (format !== 'encounter' && format !== 'space') {
  process.stderr.write(`不支持的形式：${format}\n${usage}\n`)
  process.exit(2)
}

const feelingFlag = args.indexOf('--feeling')
const feeling = feelingFlag >= 0 ? args[feelingFlag + 1] as InnerFeeling : undefined
const plan = format === 'space' ? innerSpace({ fragment, feeling }) : innerPlan({ fragment, feeling })
if (args.includes('--json')) process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`)
else process.stdout.write(`${innerStoryboardMarkdown(plan)}\n`)
