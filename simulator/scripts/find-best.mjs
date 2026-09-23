// Exhaustive search of every unordered five-measure scenario and district assignment.
// Run from simulator/: node scripts/find-best.mjs
import { writeFile } from 'node:fs/promises';
import { measures, districts, simulate, validate, coveredAreas, baseline } from '../public/engine.mjs';

const start = performance.now();
let evaluated = 0;
const best = { score: -Infinity, ties: [] };
const allFiveAreas = { score: -Infinity, ties: [] };
function keep(record, selections, result) {
  if (result.score > record.score + 1e-9) {
    record.score = result.score;
    record.ties = [];
  }
  if (Math.abs(result.score - record.score) < 1e-9) {
    record.ties.push({ selections: selections.map(s => ({...s})), cost: result.cost });
  }
}
function visit(nextIndex, selections) {
  if (selections.length === 5) {
    const result = simulate(selections);
    if (!result.valid) throw new Error('Invalid leaf escaped partial validation');
    evaluated++;
    keep(best, selections, result);
    if (coveredAreas(selections) === 5) keep(allFiveAreas, selections, result);
    return;
  }
  // Increasing catalog indices avoid permutations. Every district target is visited.
  for (let i = nextIndex; i <= measures.length - (5 - selections.length); i++) {
    const m = measures[i];
    for (const district of m.scope === 'city' ? [undefined] : districts.map(d => d.id)) {
      const next = [...selections, {id: m.id, ...(district ? {district} : {})}];
      // These violations cannot be repaired by adding more measures.
      if (!validate(next, {partial: true}).length) visit(i + 1, next);
    }
  }
}
visit(0, []);
const result = {
  assumptions: { budget: 100, actions: 5, event: null, maxPerArea: 2 },
  method: 'Exhaustive enumeration; no heuristic pruning or rounding of scores',
  feasibleScenariosEvaluated: evaluated,
  elapsedSeconds: (performance.now() - start) / 1000,
  baselineScore: baseline.score,
  best,
  bestRequiringAllFiveAreas: allFiveAreas,
  winningDetails: simulate(best.ties[0].selections),
};
await writeFile(new URL('../optimal-scenario.json', import.meta.url), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
