// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
// Local-only browser measurement. Requires `pnpm dev` and a Chrome instance
// started with --remote-debugging-port=9222.
const cdp = 'http://127.0.0.1:9222'
const targets = await (await fetch(`${cdp}/json`)).json() as Array<{ type: string; webSocketDebuggerUrl: string; url: string }>
const page = targets.find(target => target.type === 'page')
if (!page) throw new Error('no page target; start Chrome with --remote-debugging-port=9222')
const socket = new WebSocket(page.webSocketDebuggerUrl)
await new Promise<void>((resolve, reject) => { socket.onopen = () => resolve(); socket.onerror = () => reject(new Error('CDP websocket failed')) })
let nextId = 0
const pending = new Map<number, (message: any) => void>()
socket.onmessage = event => {
  const message = JSON.parse(String(event.data))
  if (message.id && pending.has(message.id)) { pending.get(message.id)!(message); pending.delete(message.id) }
}
function send(method: string, params: Record<string, unknown> = {}) {
  return new Promise<any>((resolve, reject) => {
    const id = ++nextId
    pending.set(id, message => message.error ? reject(new Error(`${method}: ${message.error.message}`)) : resolve(message.result))
    socket.send(JSON.stringify({ id, method, params }))
  })
}
async function evaluate(expression: string, awaitPromise = false) {
  const result = await send('Runtime.evaluate', { expression, awaitPromise, returnByValue: true })
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text ?? 'evaluation failed')
  return result.result.value
}
await send('Page.enable')
await send('Network.enable')
await send('Network.setCacheDisabled', { cacheDisabled: true })
await send('Runtime.enable')

async function loadPage() {
  await send('Page.navigate', { url: 'http://127.0.0.1:5173/' })
  await new Promise(resolve => setTimeout(resolve, 2500))
}

async function measureFrames(durationMs: number) {
  return evaluate(`new Promise(resolve => {
    const intervals = []
    let last = performance.now()
    const start = last
    function tick(now) {
      intervals.push(now - last)
      last = now
      if (now - start < ${durationMs}) requestAnimationFrame(tick)
      else {
        const sorted = [...intervals].sort((a, b) => a - b)
        const at = ratio => Number(sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * ratio))].toFixed(2))
        resolve({
          durationMs: ${durationMs},
          samples: intervals.length,
          avgMs: Number((intervals.reduce((sum, value) => sum + value, 0) / intervals.length).toFixed(2)),
          p95Ms: at(.95),
          p99Ms: at(.99),
          maxGapMs: Number(Math.max(...intervals).toFixed(2)),
          visibility: document.visibilityState,
        })
      }
    }
    requestAnimationFrame(tick)
  })`, true)
}

async function measureSession(buttonText: string, durationMs: number) {
  await loadPage()
  const clicked = await evaluate(`(() => {
    const button = [...document.querySelectorAll('button')].find(item => item.textContent?.includes(${JSON.stringify(buttonText)}))
    button?.click()
    return Boolean(button)
  })()`)
  await new Promise(resolve => setTimeout(resolve, 800))
  const mounted = await evaluate(`Boolean(document.querySelector('.symbolic-episode'))`)
  if (!clicked || !mounted) throw new Error(`symbolic session failed to mount: ${buttonText}`)
  return { clicked, mounted, frames: await measureFrames(durationMs) }
}

if (process.argv.includes('--full')) {
  const encounter = await measureSession('相遇示例', 75_000)
  const space = await measureSession('空间示例', 180_000)
  process.stdout.write(`${JSON.stringify({ encounter, space }, null, 2)}\n`)
  socket.close()
  process.exit(0)
}

await loadPage()
const navigation = await evaluate(`(() => {
  const nav = performance.getEntriesByType('navigation')[0]
  return nav ? { domContentLoadedMs: Math.round(nav.domContentLoadedEventEnd), loadMs: Math.round(nav.loadEventEnd), transferSize: nav.transferSize } : null
})()`)
const paints = await evaluate(`performance.getEntriesByType('paint').map(entry => ({ name: entry.name, startTime: Math.round(entry.startTime) }))`)
const initialText = await evaluate(`document.body.innerText.slice(0, 120)`)
const clicked = await evaluate(`(() => {
  const button = [...document.querySelectorAll('button')].find(item => item.textContent?.includes('空间示例'))
  button?.click()
  return Boolean(button)
})()`)
await new Promise(resolve => setTimeout(resolve, 1200))
const symbolic = await evaluate(`Boolean(document.querySelector('.symbolic-episode'))`)
const frames = await measureFrames(2000)
process.stdout.write(`${JSON.stringify({ navigation, paints, initialText, clickedSpaceDemo: clicked, symbolicMounted: symbolic, frameSample: frames }, null, 2)}\n`)
socket.close()
