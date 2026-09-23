import test from 'node:test';
import assert from 'node:assert/strict';
import { randomScenario, findBestScenario } from '../public/scenarios.mjs';
import { events, simulate, improvements } from '../public/engine.mjs';

const key = (choices) => choices.map((s) => `${s.id}:${s.district ?? ''}`).sort().join('|');

test('random scenarios are complete, valid for every event and never immediately repeat', () => {
  for (const event of [null, ...events.map((e) => e.id)]) {
    let previous = [];
    for (let i = 0; i < 30; i++) {
      const next = randomScenario({ event, exclude: previous });
      assert.notEqual(key(next), key(previous));
      assert.equal(simulate(next, { event }).valid, true);
      previous = next;
    }
  }
});

test('exhaustive search reproduces the known global optimum and reports progress', () => {
  let progress = 0;
  const best = findBestScenario({ onProgress: (count) => { progress = count; } });
  assert.equal(best.evaluated, 694395);
  assert.ok(progress > 0 && progress <= best.evaluated);
  assert.ok(Math.abs(best.score - 57.236735) < 1e-8);
  assert.equal(best.cost, 98);
  assert.equal(simulate(best.selections).score, best.score);
});

test('search respects reduced budgets and changed starting indicators', () => {
  for (const event of ['EV2', 'EV5']) {
    const best = findBestScenario({ event });
    const result = simulate(best.selections, { event });
    assert.equal(result.valid, true);
    assert.equal(result.score, best.score);
    assert.ok(result.cost <= result.budget);
    assert.equal(improvements(best.selections, { event }).length, 0);
  }
});
