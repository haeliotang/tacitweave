#!/usr/bin/env node
// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { evaluateLsm1, syntheticLsm1Rows, type Lsm1SyntheticScenario } from '../src/lsm1-eval'

const scenarios: Lsm1SyntheticScenario[] = ['planted', 'null', 'derived_action', 'leakage']
for (const scenario of scenarios) {
  const result = evaluateLsm1(syntheticLsm1Rows(scenario))
  const improvement = result.relativeImprovement === null ? 'n/a' : result.relativeImprovement.toFixed(3)
  console.log(`${scenario}: status=${result.status} reason=${result.reason ?? '-'} decision=${result.decision} relative_improvement=${improvement} train=${result.trainRows} test=${result.testRows}`)
}
console.log('Synthetic contract only; no LSM-1 model or empirical claim.')
