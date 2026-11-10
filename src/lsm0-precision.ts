// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Deterministic precision simulation for the LSM-0 pilot design.
 *
 * This is not a power calculator or a result; it is an audit aid for choosing
 * sample size, session count and interval estimation before protocol freeze.
 * It reports estimation precision and interval coverage under explicit
 * simulation assumptions, including temporal autocorrelation.
 */
import { spearmanRho } from './lsm0-eval'

export interface PrecisionScenario {
  participants: number
  sessions: number
  /** Generator coefficient; NOT the population Spearman correlation. */
  latentCoupling: number
  /** AR(1) persistence of the latent session state. */
  autocorrelation: number
  signalNoise: number
  reportNoise: number
  missingRate: number
  /** SD of participant-specific true coupling; 0 means a homogeneous generator. */
  participantEffectSd: number
}

export interface PrecisionInterval {
  method: 'ordinary_bootstrap' | 'moving_block_bootstrap'
  meanWidth: number | null
  coverage: number | null
}

export interface PrecisionScenarioResult extends PrecisionScenario {
  replications: number
  evaluableParticipantRate: number
  /** Population Spearman target, estimated by independent Monte Carlo. */
  populationSpearman: number | null
  meanObservedRho: number | null
  /** SD of observed estimates, not an estimate of true effect heterogeneity. */
  observedRhoSd: number | null
  /** The generator's participant-effect SD; not estimated from this run. */
  trueBetweenParticipantSd: number
  ordinary: PrecisionInterval
  movingBlock: PrecisionInterval
}

export interface PrecisionReport {
  version: 'lsm0-precision-v1'
  generatedAt: string
  seed: number
  bootstrapReplicates: number
  blockLength: number
  scenarios: PrecisionScenarioResult[]
  limitations: string[]
}

export interface PrecisionOptions {
  seed?: number
  replications?: number
  bootstrapReplicates?: number
  blockLength?: number
  scenarios?: PrecisionScenario[]
}

function lcg(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 0x100000000
  }
}

function normal(random: () => number) {
  const u = Math.max(random(), Number.EPSILON)
  const v = random()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return Number.NaN
  const index = (sorted.length - 1) * p
  const lower = Math.floor(index)
  const upper = Math.ceil(index)
  return lower === upper ? sorted[lower] : sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower)
}

function interval(bounds: Array<{ low: number; high: number; target: number }>): { meanWidth: number | null; coverage: number | null } {
  const usable = bounds.filter(bound => Number.isFinite(bound.low) && Number.isFinite(bound.high) && Number.isFinite(bound.target))
  if (!usable.length) return { meanWidth: null, coverage: null }
  return {
    meanWidth: usable.reduce((sum, bound) => sum + Math.max(0, bound.high - bound.low), 0) / usable.length,
    coverage: usable.filter(bound => bound.low <= bound.target && bound.target <= bound.high).length / usable.length,
  }
}

function bootstrapRho(xs: Array<number | null>, ys: Array<number | null>, random: () => number, replicates: number, blockLength: number, block: boolean): number[] {
  const n = xs.length
  const out: number[] = []
  for (let replicate = 0; replicate < replicates; replicate += 1) {
    const bx: number[] = []
    const by: number[] = []
    if (!block) {
      // Ordinary bootstrap: resample observed pairs only.
      const observed = xs.map((value, index) => value === null || ys[index] === null ? null : [value, ys[index]!] as const).filter((value): value is readonly [number, number] => value !== null)
      if (!observed.length) continue
      for (let index = 0; index < observed.length; index += 1) {
        const pick = Math.floor(random() * observed.length)
        bx.push(observed[pick][0]); by.push(observed[pick][1])
      }
    } else {
      // Non-circular moving-block bootstrap over the ORIGINAL session positions,
      // preserving missing positions rather than collapsing them.
      for (const index of movingBlockIndices(n, blockLength, random)) {
        if (xs[index] === null || ys[index] === null) continue
        bx.push(xs[index]!); by.push(ys[index]!)
      }
    }
    if (bx.length < 4) continue
    const rho = spearmanRho(bx, by)
    if (rho !== null) out.push(rho)
  }
  return out
}

/**
 * Analytic population Spearman target for the Gaussian generator:
 * rho_P = c / sqrt((1 + sx^2)(1 + sy^2));
 * rho_S = (6/pi) asin(rho_P / 2).
 */
export function analyticPopulationSpearman(coupling: number, scenario: PrecisionScenario): number {
  const clamped = Math.max(-0.95, Math.min(0.95, coupling))
  const pearson = clamped / Math.sqrt((1 + scenario.signalNoise ** 2) * (1 + scenario.reportNoise ** 2))
  return (6 / Math.PI) * Math.asin(Math.max(-1, Math.min(1, pearson / 2)))
}

/** Monte Carlo cross-check for the analytic target (not used as the primary target). */
export function estimatePopulationSpearmanMonteCarlo(scenario: PrecisionScenario, draws = 50_000): number | null {
  return estimatePopulationSpearmanForCoupling(scenario.latentCoupling, scenario, draws)
}

/** Monte Carlo cross-check for a given coupling coefficient. */
export function estimatePopulationSpearmanForCoupling(coupling: number, scenario: PrecisionScenario, draws = 20_000): number | null {
  const clamped = Math.max(-0.95, Math.min(0.95, coupling))
  const random = lcg(91_337 + Math.round(clamped * 10_000) * 31 + scenario.participants * 17 + scenario.sessions * 7)
  const xs: number[] = []
  const ys: number[] = []
  for (let index = 0; index < draws; index += 1) {
    const latent = normal(random)
    xs.push(latent + scenario.signalNoise * normal(random))
    ys.push(clamped * latent + Math.sqrt(Math.max(0, 1 - clamped ** 2)) * normal(random) + scenario.reportNoise * normal(random))
  }
  return spearmanRho(xs, ys)
}

/** Backwards-compatible name for the analytic target. */
export function estimatePopulationSpearman(scenario: PrecisionScenario): number | null {
  return analyticPopulationSpearman(scenario.latentCoupling, scenario)
}

/** Testable non-circular moving-block index generator; always returns exactly n positions. */
export function movingBlockIndices(n: number, blockLength: number, random: () => number): number[] {
  if (!Number.isInteger(n) || n <= 0) return []
  if (!Number.isInteger(blockLength) || blockLength <= 0) throw new Error('block_length_must_be_positive_integer')
  const starts = Math.max(1, n - blockLength + 1)
  const indices: number[] = []
  while (indices.length < n) {
    const start = Math.floor(random() * starts)
    for (let offset = 0; offset < blockLength && indices.length < n; offset += 1) {
      const index = start + offset
      if (index < n) indices.push(index)
    }
  }
  return indices
}

function simulateScenario(scenario: PrecisionScenario, options: Required<Pick<PrecisionOptions, 'seed' | 'replications' | 'bootstrapReplicates' | 'blockLength'>>): PrecisionScenarioResult {
  const random = lcg(options.seed + scenario.participants * 1009 + scenario.sessions * 9176)
  const observed: number[] = []
  const ordinaryCis: Array<{ low: number; high: number; target: number }> = []
  const blockCis: Array<{ low: number; high: number; target: number }> = []
  const trueTargets: number[] = []
  let evaluable = 0
  let attempted = 0
  for (let replication = 0; replication < options.replications; replication += 1) {
    for (let participant = 0; participant < scenario.participants; participant += 1) {
      attempted += 1
      let latent = normal(random)
      const coupling = Math.max(-0.95, Math.min(0.95, scenario.latentCoupling + scenario.participantEffectSd * normal(random)))
      const trueTarget = analyticPopulationSpearman(coupling, scenario)
      const xs: Array<number | null> = []
      const ys: Array<number | null> = []
      for (let session = 0; session < scenario.sessions; session += 1) {
        if (session > 0) latent = scenario.autocorrelation * latent + Math.sqrt(Math.max(0, 1 - scenario.autocorrelation ** 2)) * normal(random)
        const x = latent + scenario.signalNoise * normal(random)
        const y = coupling * latent + Math.sqrt(Math.max(0, 1 - coupling ** 2)) * normal(random) + scenario.reportNoise * normal(random)
        if (random() >= scenario.missingRate) { xs.push(x); ys.push(y) } else { xs.push(null); ys.push(null) }
      }
      const pairs = xs.map((x, index) => x === null || ys[index] === null ? null : [x, ys[index]!] as const).filter((pair): pair is readonly [number, number] => pair !== null)
      const rho = pairs.length >= 4 ? spearmanRho(pairs.map(pair => pair[0]), pairs.map(pair => pair[1])) : null
      if (rho === null || trueTarget === null) continue
      evaluable += 1
      trueTargets.push(trueTarget)
      observed.push(rho)
      const ordinary = bootstrapRho(xs, ys, random, options.bootstrapReplicates, options.blockLength, false).sort((a, b) => a - b)
      const block = bootstrapRho(xs, ys, random, options.bootstrapReplicates, options.blockLength, true).sort((a, b) => a - b)
      if (ordinary.length) ordinaryCis.push({ low: percentile(ordinary, 0.025), high: percentile(ordinary, 0.975), target: trueTarget })
      if (block.length) blockCis.push({ low: percentile(block, 0.025), high: percentile(block, 0.975), target: trueTarget })
    }
  }
  const mean = observed.length ? observed.reduce((a, b) => a + b, 0) / observed.length : null
  const variance = observed.length > 1 ? observed.reduce((sum, value) => sum + (value - (mean ?? 0)) ** 2, 0) / (observed.length - 1) : null
  const population = trueTargets.length ? trueTargets.reduce((a, b) => a + b, 0) / trueTargets.length : analyticPopulationSpearman(scenario.latentCoupling, scenario)
  return {
    ...scenario,
    populationSpearman: population,
    replications: options.replications,
    evaluableParticipantRate: attempted ? evaluable / attempted : 0,
    meanObservedRho: mean,
    observedRhoSd: variance === null ? null : Math.sqrt(variance),
    trueBetweenParticipantSd: scenario.participantEffectSd,
    ordinary: { method: 'ordinary_bootstrap', ...interval(ordinaryCis) },
    movingBlock: { method: 'moving_block_bootstrap', ...interval(blockCis) },
  }
}

export const defaultPrecisionScenarios: PrecisionScenario[] = [
  { participants: 12, sessions: 8, latentCoupling: 0.4, participantEffectSd: 0, autocorrelation: 0.3, signalNoise: 0.7, reportNoise: 0.7, missingRate: 0.1 },
  { participants: 16, sessions: 8, latentCoupling: 0.4, participantEffectSd: 0, autocorrelation: 0.3, signalNoise: 0.7, reportNoise: 0.7, missingRate: 0.1 },
  { participants: 12, sessions: 12, latentCoupling: 0.4, participantEffectSd: 0, autocorrelation: 0.3, signalNoise: 0.7, reportNoise: 0.7, missingRate: 0.1 },
  { participants: 16, sessions: 12, latentCoupling: 0.4, participantEffectSd: 0, autocorrelation: 0.3, signalNoise: 0.7, reportNoise: 0.7, missingRate: 0.1 },
  { participants: 20, sessions: 12, latentCoupling: 0.4, participantEffectSd: 0, autocorrelation: 0.3, signalNoise: 0.7, reportNoise: 0.7, missingRate: 0.1 },
]

export function simulatePrecision(options: PrecisionOptions = {}): PrecisionReport {
  const resolved = {
    seed: options.seed ?? 20261107,
    replications: options.replications ?? 100,
    bootstrapReplicates: options.bootstrapReplicates ?? 100,
    blockLength: options.blockLength ?? 3,
  }
  const scenarios = options.scenarios ?? defaultPrecisionScenarios
  return {
    version: 'lsm0-precision-v1',
    generatedAt: '2026-11-07T00:00:00.000Z',
    seed: resolved.seed,
    bootstrapReplicates: resolved.bootstrapReplicates,
    blockLength: resolved.blockLength,
    scenarios: scenarios.map(scenario => simulateScenario(scenario, resolved)),
    limitations: [
      'Simulation assumptions are not empirical estimates; run sensitivity analyses before protocol freeze.',
      'Coverage/width are descriptive; no p-values, clinical claims or model selection are made.',
      'Ordinary bootstrap ignores temporal dependence by construction; moving-block bootstrap is reported as a sensitivity comparator.',
      'The latent AR(1) generator is a simplification, not evidence about real physiology or self-report.',
    ],
  }
}

export function formatPrecisionReport(report: PrecisionReport): string {
  const lines = [
    `LSM-0 precision simulation (${report.version})`,
    `seed ${report.seed}; replications ${report.scenarios[0]?.replications ?? 0}; bootstrap ${report.bootstrapReplicates}; block ${report.blockLength}`,
    'N x S | population rho | mean rho | observed SD | true effect SD | ordinary width (coverage) | block width (coverage) | evaluable',
  ]
  for (const scenario of report.scenarios) {
    const metric = (value: number | null) => value === null ? 'n/a' : value.toFixed(3)
    lines.push(`${scenario.participants} x ${scenario.sessions} | ${metric(scenario.populationSpearman)} | ${metric(scenario.meanObservedRho)} | ${metric(scenario.observedRhoSd)} | ${metric(scenario.trueBetweenParticipantSd)} | ${metric(scenario.ordinary.meanWidth)} (${metric(scenario.ordinary.coverage)}) | ${metric(scenario.movingBlock.meanWidth)} (${metric(scenario.movingBlock.coverage)}) | ${scenario.evaluableParticipantRate.toFixed(2)}`)
  }
  lines.push('Descriptive simulation only; no p-values or clinical claims.')
  return lines.join('\n')
}
