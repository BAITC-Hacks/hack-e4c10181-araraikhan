export const H = 8;
// First measure targets a district; the second is city-wide. Bonuses ignore lag.
export const synergyPairs = [
  ['M1', 'M2', 'T1', 2],
  ['M10', 'M12', 'B1', 2],
  ['M5', 'M6', 'E2', 2],
];
export const BUDGET = 100;
export const indicators = [
  ['T1', 'Разгрузка дорог', 0.1],
  ['T2', 'Общественный транспорт', 0.1],
  ['E1', 'Озеленение', 0.09],
  ['E2', 'Качество воздуха', 0.11],
  ['S1', 'Школы и детсады', 0.11],
  ['S2', 'Поликлиники', 0.11],
  ['B1', 'Безопасность улиц', 0.09],
  ['B2', 'Безопасность движения', 0.09],
  ['C1', 'Надёжность ЖКХ', 0.1],
  ['C2', 'Обращения жителей', 0.1],
];
export const districts = [
  {
    id: 'yesil',
    name: 'Есиль',
    pop: 0.27,
    values: [45, 62, 68, 72, 48, 55, 78, 60, 75, 70],
    profile: 'Пробки на мостах и переполненные школы.',
  },
  {
    id: 'almaty',
    name: 'Алматы',
    pop: 0.24,
    values: [40, 75, 50, 55, 60, 65, 62, 52, 50, 60],
    profile: 'Пробки и изношенные коммунальные сети.',
  },
  {
    id: 'saryarka',
    name: 'Сарыарка',
    pop: 0.2,
    values: [50, 70, 42, 40, 62, 68, 58, 55, 45, 55],
    profile: 'Смог от частного сектора, недостаток зелени.',
  },
  {
    id: 'baikonur',
    name: 'Байконур',
    pop: 0.13,
    values: [52, 68, 55, 50, 58, 60, 52, 58, 55, 58],
    profile: 'Умеренные показатели без резких перекосов.',
  },
  {
    id: 'nura',
    name: 'Нура',
    pop: 0.16,
    values: [55, 40, 45, 65, 38, 35, 55, 50, 60, 50],
    profile: 'Критический дефицит школ и медицинской помощи.',
  },
];
export const areas = ['Транспорт', 'Экология', 'Соцсфера', 'Безопасность', 'Сервисы'];
export const measures = [
  ['M1', 0, 'Выделенные полосы для автобусов', 'district', 18, 2, { T1: 6, T2: 9 }],
  ['M2', 0, 'Умные светофоры', 'city', 22, 2, { T1: 4, B2: 3 }],
  ['M3', 0, 'Линия ЛРТ / расширение', 'district', 30, 4, { T1: 16, T2: 20, E2: 4 }],
  ['M4', 1, 'Парк / сквер', 'district', 15, 2, { E1: 12, E2: 3, B1: 2 }],
  ['M5', 1, 'Перевод на чистое топливо', 'district', 25, 3, { E2: 14, C1: 4 }],
  ['M6', 1, 'Озеленение и ветрозащитные полосы', 'city', 20, 4, { E1: 5, E2: 3 }],
  ['M7', 2, 'Школа + детсад', 'district', 24, 3, { S1: 16 }],
  ['M8', 2, 'Центр семейного здоровья', 'district', 20, 3, { S2: 14 }],
  ['M9', 2, 'Дворовые спорт-хабы', 'district', 10, 1, { S1: 3, S2: 3, B1: 3 }],
  ['M10', 3, 'Освещение и камеры', 'district', 12, 1, { B1: 12, B2: 2 }],
  ['M11', 3, 'Безопасные переходы и школьные зоны', 'district', 10, 1, { B2: 12, T1: -2 }],
  ['M12', 4, 'Цифровая платформа обращений', 'city', 14, 1, { C2: 5 }],
  ['M13', 4, 'Модернизация тепло- и водосетей', 'district', 28, 4, { C1: 18, E2: 2 }],
  ['M14', 4, 'Аварийные бригады ЖКХ', 'city', 16, 1, { C1: 5, C2: 2 }],
].map(([id, area, name, scope, cost, lag, effects]) => ({
  id,
  area,
  name,
  scope,
  cost,
  lag,
  effects,
}));
export const example = [
  { id: 'M7', district: 'nura' },
  { id: 'M8', district: 'nura' },
  { id: 'M10', district: 'nura' },
  { id: 'M12' },
  { id: 'M5', district: 'saryarka' },
];

// Unexpected city events (optional mode). Shocks hit the starting indicators before any
// measures take effect; budgetCut lowers the available budget, forcing reallocation.
// Every team that picks the same event id gets exactly the same shock, so results stay comparable.
export const events = [
  {
    id: 'EV1',
    title: 'Авария на теплотрассе в Алматы',
    description: 'Зимой прорвало магистраль: отопление и сроки ответа на обращения просели.',
    budgetCut: 0,
    shocks: [
      { district: 'almaty', indicator: 'C1', delta: -12 },
      { district: 'almaty', indicator: 'C2', delta: -5 },
    ],
  },
  {
    id: 'EV2',
    title: 'Сокращение городского бюджета',
    description: 'Республиканский трансферт урезан: доступно 85 единиц вместо 100.',
    budgetCut: 15,
    shocks: [],
  },
  {
    id: 'EV3',
    title: 'Сильный зимний смог',
    description: 'Безветренная зима: качество воздуха в Сарыарке и Алматы упало.',
    budgetCut: 0,
    shocks: [
      { district: 'saryarka', indicator: 'E2', delta: -8 },
      { district: 'almaty', indicator: 'E2', delta: -4 },
    ],
  },
  {
    id: 'EV4',
    title: 'Рост числа детей в Есиле',
    description: 'Новые жилые комплексы сдали раньше срока: школ и детсадов не хватает.',
    budgetCut: 0,
    shocks: [{ district: 'yesil', indicator: 'S1', delta: -10 }],
  },
  {
    id: 'EV5',
    title: 'Весенний паводок в Нуре',
    description: 'Подтоплены дороги и сети; часть бюджета ушла на ликвидацию последствий.',
    budgetCut: 10,
    shocks: [
      { district: 'nura', indicator: 'T1', delta: -8 },
      { district: 'nura', indicator: 'C1', delta: -8 },
    ],
  },
];
export const findEvent = (id) => (id ? (events.find((e) => e.id === id) ?? null) : null);
export const budgetFor = (eventId) => BUDGET - (findEvent(eventId)?.budgetCut ?? 0);
export const coveredAreas = (selections) =>
  new Set(
    selections
      .map((s) => measures.find((m) => m.id === s?.id)?.area)
      .filter((a) => a !== undefined),
  ).size;

/** Starting indicator rows, optionally hit by an event shock. */
export function startingRows(eventId = null) {
  const rows = districts.map((d) => [...d.values]);
  for (const shock of findEvent(eventId)?.shocks ?? []) {
    const d = districts.findIndex((x) => x.id === shock.district);
    const k = indicators.findIndex((i) => i[0] === shock.indicator);
    rows[d][k] = Math.max(0, Math.min(100, rows[d][k] + shock.delta));
  }
  return rows;
}
export function validate(selections, { partial = false, event = null } = {}) {
  const errors = [];
  if (event !== null && event !== undefined && !findEvent(event))
    return ['Неизвестное городское событие.'];
  if (!Array.isArray(selections)) return ['Нужен список мероприятий.'];
  const budget = budgetFor(event);
  if (selections.length > 5 || (!partial && selections.length !== 5))
    errors.push('Нужно выбрать ровно 5 мероприятий.');
  const seen = new Set(),
    counts = Array(5).fill(0);
  let cost = 0;
  for (const s of selections) {
    const m = measures.find((m) => m.id === s?.id);
    if (!m) {
      errors.push('Неизвестное мероприятие.');
      continue;
    }
    if (seen.has(m.id)) errors.push(`${m.id}: повтор мероприятия запрещён.`);
    seen.add(m.id);
    counts[m.area]++;
    cost += m.cost;
    if (m.scope === 'district' && !districts.some((d) => d.id === s.district))
      errors.push(`${m.id}: выберите район.`);
    if (m.scope === 'city' && s.district !== undefined)
      errors.push(`${m.id}: городская мера не должна иметь район.`);
  }
  if (cost > budget) errors.push(`Превышение бюджета: ${cost} из ${budget}.`);
  counts.forEach((n, i) => {
    if (n > 2) errors.push(`${areas[i]}: не более 2 мер.`);
  });
  const get = (id) => selections.find((s) => s?.id === id);
  if (get('M1') && get('M3')) errors.push('M1 и M3 несовместимы в любых районах.');
  for (const [a, b] of [
    ['M4', 'M7'],
    ['M5', 'M13'],
  ])
    if (get(a) && get(b) && get(a).district === get(b).district)
      errors.push(`${a} и ${b} нельзя выбрать в одном районе.`);
  return [...new Set(errors)];
}
export function summarize(rows) {
  const scores = rows.map((row) => row.reduce((sum, v, k) => sum + v * indicators[k][2], 0));
  const average = scores.reduce((sum, v, d) => sum + v * districts[d].pop, 0);
  const minimum = Math.min(...scores);
  const critical = [];
  rows.forEach((row, d) =>
    row.forEach((v, k) => {
      if (v < 40)
        critical.push({ district: districts[d].name, indicator: indicators[k][0], value: v });
    }),
  );
  return {
    rows,
    scores,
    average,
    minimum,
    weakest: districts[scores.indexOf(minimum)].name,
    critical,
    score: 0.7 * average + 0.3 * minimum - critical.length,
  };
}
export const baseline = summarize(districts.map((d) => [...d.values]));
// Draft projections intentionally have no final Score until all five choices are valid.
export function simulate(selections, { partial = false, event = null } = {}) {
  const errors = validate(selections, { partial, event });
  if (errors.length) return { valid: false, errors, score: null };
  const start = startingRows(event),
    budget = budgetFor(event);
  const rows = start.map((r) => [...r]),
    effects = [],
    synergies = [];
  let cost = 0;
  for (const s of selections) {
    const m = measures.find((m) => m.id === s.id);
    cost += m.cost;
    const targets = m.scope === 'city' ? districts : districts.filter((d) => d.id === s.district);
    const realized = Object.fromEntries(
      Object.entries(m.effects).map(([k, v]) => [k, (v * (H - m.lag)) / H]),
    );
    for (const d of targets)
      for (const [key, v] of Object.entries(realized))
        rows[districts.indexOf(d)][indicators.findIndex((k) => k[0] === key)] += v;
    effects.push({
      id: m.id,
      name: m.name,
      target: targets.map((d) => d.name).join(', '),
      cost: m.cost,
      lag: m.lag,
      realized,
    });
  }
  for (const [a, b, k, v] of synergyPairs) {
    const first = selections.find((s) => s.id === a);
    if (first && selections.some((s) => s.id === b)) {
      const d = districts.findIndex((d) => d.id === first.district);
      rows[d][indicators.findIndex((i) => i[0] === k)] += v;
      synergies.push({ pair: `${a} + ${b}`, district: districts[d].name, indicator: k, value: v });
    }
  }
  const clipped = rows.map((r) => r.map((v) => Math.max(0, Math.min(100, v))));
  const result = summarize(clipped),
    complete = selections.length === 5;
  return {
    ...result,
    score: complete ? result.score : null,
    valid: true,
    complete,
    cost,
    budget,
    remaining: budget - cost,
    event: findEvent(event),
    start: summarize(start),
    effects,
    synergies,
    errors: [],
  };
}
export function explain(result) {
  if (!result.valid || !result.complete) return [];
  const base = result.start ?? baseline;
  const gain = result.score - base.score;
  const changes = result.scores
    .map((v, d) => ({ name: districts[d].name, delta: v - base.scores[d] }))
    .sort((a, b) => b.delta - a.delta);
  return [
    ...(result.event
      ? [
          `Событие «${result.event.title}»: исходный Score до решений снизился с ${baseline.score.toFixed(2)} до ${base.score.toFixed(2)}, бюджет — ${result.budget} единиц.`,
        ]
      : []),
    `Итоговый Score — ${result.score.toFixed(2)} (${gain >= 0 ? '+' : ''}${gain.toFixed(2)} к исходным ${base.score.toFixed(2)}). Использовано ${result.cost} из ${result.budget} единиц бюджета.`,
    `Самое большое изменение у района ${changes[0].name}: +${changes[0].delta.toFixed(2)} к оценке района. Самый слабый район после решений — ${result.weakest}, ${result.minimum.toFixed(2)} балла.`,
    result.critical.length
      ? `Осталось критических показателей: ${result.critical.length}. ${result.critical.map((c) => `${c.district}: ${c.indicator} = ${c.value.toFixed(2)}`).join('; ')}. Каждый даёт штраф 1 балл.`
      : 'Критических показателей ниже 40 больше нет. Штраф за них равен нулю.',
    result.synergies.length
      ? `Сработали синергии: ${result.synergies.map((s) => `${s.pair}: ${s.indicator} +${s.value} (${s.district})`).join('; ')}.`
      : 'В этом наборе нет синергий.',
    'Эффекты относятся к условным двум годам и уменьшены с учётом срока запуска. Остаток бюджета не добавляет баллы. Это результат синтетической модели, а не прогноз реального города.',
  ];
}
export function improvements(selections, { event = null } = {}) {
  const initial = simulate(selections, { event });
  if (!initial.valid) return [];
  const candidates = [];
  selections.forEach((old, index) => {
    for (const m of measures)
      for (const d of m.scope === 'city' ? [undefined] : districts.map((d) => d.id)) {
        const replacement = { id: m.id, ...(d ? { district: d } : {}) };
        const next = selections.map((s, i) => (i === index ? replacement : s)),
          r = simulate(next, { event });
        if (r.valid && r.score > initial.score + 1e-9)
          candidates.push({
            remove: old,
            add: replacement,
            score: r.score,
            gain: r.score - initial.score,
            cost: r.cost,
          });
      }
  });
  return candidates.sort((a, b) => b.gain - a.gain).slice(0, 3);
}

/**
 * Short Marp-compatible Markdown deck (slides separated by ---) built only from computed facts.
 * Open it in any Markdown viewer or render with `npx @marp-team/marp-cli brief.md`.
 */
export function presentation(selections, { event = null, team = 'Команда' } = {}) {
  const r = simulate(selections, { event });
  if (!r.valid || !r.complete) return null;
  const f = (x) => x.toFixed(2);
  const lines = explain(r);
  const rows = r.effects
    .map((e) => `| ${e.id} | ${e.name} | ${e.target} | ${e.cost} | ${e.lag} кв. |`)
    .join('\n');
  const districtsTable = districts
    .map(
      (d, i) =>
        `| ${d.name} | ${f(r.start.scores[i])} | ${f(r.scores[i])} | ${r.scores[i] - r.start.scores[i] >= 0 ? '+' : ''}${f(r.scores[i] - r.start.scores[i])} |`,
    )
    .join('\n');
  const tips = improvements(selections, { event });
  return `---
marp: true
paginate: true
---

# ${team}: «Аким на 5 часов»

Astana Quality of Life Score: **${f(r.score)}** (исходный ${f(r.start.score)}, ${r.score >= r.start.score ? '+' : ''}${f(r.score - r.start.score)})

Бюджет: ${r.cost} из ${r.budget}${r.event ? ` · событие: ${r.event.title}` : ''}

---

## Пять решений

| ID | Мера | Где | Стоимость | Лаг |
|---|---|---|---|---|
${rows}

---

## Как изменились районы

| Район | До | После | Δ |
|---|---|---|---|
${districtsTable}

---

## Итоги и компромиссы

${lines.map((l) => `- ${l}`).join('\n')}

---

## Что можно улучшить

${tips.length ? tips.map((t) => `- Заменить ${t.remove.id} на ${t.add.id}${t.add.district ? ` (${districts.find((d) => d.id === t.add.district).name})` : ''}: Score ${f(t.score)} (+${f(t.gain)})`).join('\n') : '- Замена одной меры не улучшает сценарий.'}

_Синтетическая модель HackAlem AI. Все числа рассчитаны кодом симулятора._
`;
}
