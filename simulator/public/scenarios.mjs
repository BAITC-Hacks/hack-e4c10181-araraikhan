import { measures, districts, validate, simulate } from './engine.mjs';

const key = (choices) => choices.map((s) => `${s.id}:${s.district ?? ''}`).sort().join('|');
const shuffle = (items) => {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

// Increasing indices visit each measure combination once, with every district assignment.
// Partial validation only prunes violations that adding a measure cannot fix.
function visitScenarios(event, random, accept) {
  const catalog = random ? shuffle(measures) : measures;
  if (validate([], { partial: true, event }).length) throw Error('Неизвестное событие.');
  function visit(index, selections) {
    if (selections.length === 5) return accept(selections);
    for (let i = index; i <= catalog.length - (5 - selections.length); i++) {
      const m = catalog[i];
      const targets = m.scope === 'city' ? [undefined] : districts.map((d) => d.id);
      for (const district of random ? shuffle(targets) : targets) {
        const next = [...selections, { id: m.id, ...(district ? { district } : {}) }];
        if (!validate(next, { partial: true, event }).length && visit(i + 1, next)) return true;
      }
    }
    return false;
  }
  visit(0, []);
}

export function randomScenario({ event = null, exclude = [] } = {}) {
  const previous = key(exclude);
  let result;
  visitScenarios(event, true, (choices) => {
    if (key(choices) === previous) return false;
    result = choices;
    return true;
  });
  if (!result) throw Error('Не удалось найти другой допустимый сценарий.');
  return result;
}

export function findBestScenario({ event = null, onProgress = () => {} } = {}) {
  let evaluated = 0;
  let best = null;
  visitScenarios(event, false, (choices) => {
    const result = simulate(choices, { event });
    if (!result.valid) throw Error('Сценарий не прошёл проверку.');
    evaluated++;
    if (!best || result.score > best.score) {
      best = { selections: choices, score: result.score, cost: result.cost };
    }
    if (evaluated % 10000 === 0) onProgress(evaluated);
    return false;
  });
  if (!best) throw Error('Нет допустимого сценария для текущих правил.');
  return { ...best, evaluated };
}
