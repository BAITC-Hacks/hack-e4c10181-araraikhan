import {
  districts,
  indicators,
  measures,
  areas,
  example,
  validate,
  simulate,
  explain,
  improvements,
  events,
  findEvent,
  budgetFor,
  coveredAreas,
  presentation,
} from './engine.mjs';
const $ = (id) => document.getElementById(id);
const fmt = (x) =>
  x.toLocaleString('ru-RU', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
const short = (x) => x.toLocaleString('ru-RU', { maximumFractionDigits: 3 });
let selections = [],
  filter = -1,
  revision = 0,
  aiAvailable = false,
  busy = false,
  event = null;
// Scenarios saved for side-by-side comparison (teams sharing one screen at the demo).
const saved = [];
const escapeHtml = (text) => String(text).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const costOf = (list) => list.reduce((sum, s) => sum + measures.find((m) => m.id === s.id).cost, 0);
const describe = (list) =>
  list
    .map(
      (s) => `${s.id}${s.district ? ` (${districts.find((d) => d.id === s.district).name})` : ''}`,
    )
    .join(', ');
const targets = Object.fromEntries(
  measures.filter((m) => m.scope === 'district').map((m) => [m.id, 'nura']),
);
function render() {
  // An event can shrink the budget below an already chosen set; then the draft is shown as
  // blocked (no Score) until the user reallocates.
  const draft = simulate(selections, { partial: true, event });
  const blocked = draft.valid ? [] : draft.errors;
  const r = draft.valid ? draft : simulate([], { partial: true, event });
  const start = r.start;
  const cost = costOf(selections),
    budget = budgetFor(event);
  renderEvent();
  $('filters').innerHTML = ['Все', ...areas]
    .map(
      (a, i) =>
        `<button class="filter" data-filter="${i - 1}" aria-pressed="${filter === i - 1}">${a}</button>`,
    )
    .join('');
  $('catalog').innerHTML = measures
    .filter((m) => filter === -1 || m.area === filter)
    .map((m) => {
      const selected = selections.some((s) => s.id === m.id),
        candidate = { id: m.id, ...(m.scope === 'district' ? { district: targets[m.id] } : {}) };
      const errors = selected ? [] : validate([...selections, candidate], { partial: true, event });
      return `<article class="measure ${selected ? 'chosen' : ''}"><div class="measure-top"><span>${areas[m.area]}</span><span class="measure-id">${m.id}</span></div><h3>${m.name}</h3><div class="measure-meta"><span>${m.scope === 'city' ? 'Весь город' : 'Один район'}</span><span>Лаг ${m.lag} кв. · ${short(((8 - m.lag) / 8) * 100)}% эффекта</span></div><div class="effects">${Object.entries(
        m.effects,
      )
        .map(
          ([k, v]) =>
            `<span class="effect ${v < 0 ? 'negative' : ''}" title="${indicators.find((i) => i[0] === k)[1]}: полный эффект ${v > 0 ? '+' : ''}${v}">${k} ${v > 0 ? '+' : ''}${short((v * (8 - m.lag)) / 8)}</span>`,
        )
        .join(
          '',
        )}</div>${m.scope === 'district' ? `<label class="scope-label" for="target-${m.id}">Район реализации</label><select id="target-${m.id}" data-target="${m.id}" ${selected ? 'disabled' : ''}>${districts.map((d) => `<option value="${d.id}" ${targets[m.id] === d.id ? 'selected' : ''}>${d.name}</option>`).join('')}</select>` : '<span class="scope-label">Охват</span><div class="city-scope">Все пять районов</div>'}<div class="measure-bottom"><span class="price">${m.cost} <small>ед.</small></span><button class="add-button" data-add="${m.id}" ${errors.length ? 'disabled' : ''}>${selected ? '✓ Выбрано' : '+ Добавить'}</button></div>${errors.length ? `<p class="blocked-reason">${errors[0]}</p>` : ''}</article>`;
    })
    .join('');
  $('remaining').textContent = budget - cost;
  $('budget-total').textContent = budget;
  $('spent').textContent = `Использовано ${cost}`;
  $('count').textContent = `${selections.length} / 5 решений`;
  $('coverage').textContent = `Охвачено направлений: ${coveredAreas(selections)} из 5`;
  $('budget-fill').style.width = `${Math.min(100, (cost / budget) * 100)}%`;
  $('budget-fill').classList.toggle('over', cost > budget);
  $('selected').innerHTML =
    selections
      .map((s, i) => {
        const m = measures.find((m) => m.id === s.id);
        return `<div class="selection"><span>${i + 1}.</span><div>${m.name}<small>${s.district ? districts.find((d) => d.id === s.district).name : 'Весь город'} · ${m.cost} ед.</small></div><button class="remove" data-remove="${s.id}" aria-label="Удалить ${m.name}">×</button></div>`;
      })
      .join('') +
    Array.from(
      { length: 5 - selections.length },
      (_, i) => `<div class="empty-slot">${selections.length + i + 1}. Выберите инициативу</div>`,
    ).join('');
  $('status').textContent = blocked.length
    ? `Событие требует перераспределить бюджет: ${blocked.join(' ')} Удалите или замените меру.`
    : r.complete
      ? 'Сценарий допустим. Можно разобрать результат.'
      : `Осталось выбрать ${5 - selections.length} мер. Итоговый Score появится после пятого решения.`;
  $('score-label').textContent = r.complete
    ? 'Итоговый Quality of Life Score'
    : 'Исходный Quality of Life Score';
  $('score').textContent = fmt(r.complete ? r.score : start.score);
  $('score-delta').textContent = r.complete
    ? `${r.score >= start.score ? '+' : ''}${fmt(r.score - start.score)} к базе`
    : 'из 100*';
  $('score-note').textContent = r.complete
    ? `Слабейший район: ${r.weakest}. Критических показателей: ${r.critical.length}.`
    : 'Промежуточные изменения показаны ниже. Итог пока не рассчитан.';
  $('analyze').disabled = !r.complete || blocked.length > 0;
  $('city-caption').textContent = selections.length
    ? r.complete
      ? 'Результат через 8 кварталов'
      : 'Предварительные изменения · сценарий не завершён'
    : 'Исходное состояние';
  $('districts').innerHTML = districts
    .map(
      (d, i) =>
        `<article class="district ${r.scores[i] === r.minimum ? 'weakest' : ''}"><div class="district-name">${d.name}<span>${short(d.pop * 100)}% жителей</span></div><div class="district-score">${fmt(r.scores[i])}${r.scores[i] !== start.scores[i] ? `<small>${r.scores[i] >= start.scores[i] ? '+' : ''}${fmt(r.scores[i] - start.scores[i])}</small>` : ''}</div><div class="district-bar" role="meter" aria-label="Оценка района ${d.name}" aria-valuenow="${r.scores[i]}" aria-valuemin="0" aria-valuemax="100"><div style="width:${r.scores[i]}%"></div></div><p>${d.profile}</p></article>`,
    )
    .join('');
  $('matrix').innerHTML =
    `<caption class="fine">Показатели районов через 8 кварталов · значения 0–100 · в скобках изменение к базе</caption><thead><tr><th>Район</th>${indicators.map(([k, name, w]) => `<th><abbr title="${name}; вес ${short(w * 100)}%">${k}</abbr></th>`).join('')}</tr></thead><tbody>${districts.map((d, i) => `<tr><th>${d.name}</th>${r.rows[i].map((v, k) => `<td class="${v < 40 ? 'cell-critical' : v > start.rows[i][k] ? 'cell-improved' : ''}" title="${indicators[k][1]}">${short(v)}${v !== start.rows[i][k] ? `<small>(${v > start.rows[i][k] ? '+' : ''}${short(v - start.rows[i][k])})</small>` : ''}</td>`).join('')}</tr>`).join('')}</tbody>`;
}
function renderEvent() {
  const current = findEvent(event);
  $('event-select').value = event ?? '';
  $('event-card').hidden = !current;
  if (current)
    $('event-card').innerHTML =
      `<strong>${current.id}. ${current.title}</strong><span>${current.description}</span><span class="event-effects">${[
        ...current.shocks.map(
          (x) =>
            `${districts.find((d) => d.id === x.district).name}: ${x.indicator} ${x.delta > 0 ? '+' : '−'}${Math.abs(x.delta)}`,
        ),
        ...(current.budgetCut ? [`бюджет −${current.budgetCut}`] : []),
      ].join(' · ')}</span>`;
}
function setEvent(id) {
  event = findEvent(id)?.id ?? null;
  revision++;
  busy = false;
  $('analysis-section').hidden = true;
  render();
}
function update(next) {
  const errors = validate(next, { partial: true, event });
  // Removing a measure is always allowed, even while an event keeps the set over budget.
  if (errors.length && next.length >= selections.length) throw Error(errors.join(' '));
  selections = next;
  selections.forEach((s) => {
    if (s.district) targets[s.id] = s.district;
  });
  revision++;
  busy = false;
  $('analysis-section').hidden = true;
  render();
}
function analyze() {
  const r = simulate(selections, { event });
  if (!r.valid) return;
  $('analysis-section').hidden = false;
  $('analysis-mode').textContent = 'Автоматический разбор по правилам';
  $('analysis-text').textContent = explain(r).join('\n\n');
  $('formula').innerHTML = [
    ['Среднее по населению × 0,7', r.average * 0.7],
    ['Слабейший район × 0,3', r.minimum * 0.3],
    ['Штраф за критические показатели', r.critical.length ? -r.critical.length : 0],
    ['Итоговый Score', r.score],
  ]
    .map(
      ([label, value]) =>
        `<div class="formula-row"><span>${label}</span><strong>${fmt(value)}</strong></div>`,
    )
    .join('');
  const options = improvements(selections, { event });
  $('suggestions').innerHTML = options.length
    ? options
        .map((s, i) => {
          const m = measures.find((m) => m.id === s.add.id),
            old = measures.find((m) => m.id === s.remove.id);
          return `<div class="suggestion">${old.id} ${old.name} → ${m.id} ${m.name} (${s.add.district ? districts.find((d) => d.id === s.add.district).name : 'весь город'})<br><strong>Score ${fmt(s.score)} · +${fmt(s.gain)}</strong> · бюджет ${s.cost}<br><button class="add-button" data-suggestion="${i}">Применить замену</button></div>`;
        })
        .join('')
    : '<p class="fine">Одна замена не улучшает этот сценарий. Это не доказывает глобальную оптимальность.</p>';
  $('suggestions').onclick = (e) => {
    const b = e.target.closest('[data-suggestion]');
    if (!b) return;
    const s = options[Number(b.dataset.suggestion)];
    update(selections.map((x) => (x.id === s.remove.id ? s.add : x)));
    analyze();
  };
  $('ai-button').disabled = busy || !aiAvailable;
  $('ai-status').textContent = aiAvailable
    ? 'AI объяснит проверенные сервером расчёты.'
    : 'OpenAI пока не подключён. Для локального запуска добавьте OPENAI_API_KEY в .env; для сайта — в секреты сервера.';
}
$('filters').onclick = (e) => {
  const b = e.target.closest('[data-filter]');
  if (b) {
    filter = Number(b.dataset.filter);
    render();
  }
};
$('catalog').onchange = (e) => {
  if (e.target.dataset.target) {
    targets[e.target.dataset.target] = e.target.value;
    render();
  }
};
$('catalog').onclick = (e) => {
  const b = e.target.closest('[data-add]');
  if (!b) return;
  const id = b.dataset.add;
  if (selections.some((s) => s.id === id)) update(selections.filter((s) => s.id !== id));
  else {
    const m = measures.find((m) => m.id === id);
    update([...selections, { id, ...(m.scope === 'district' ? { district: targets[id] } : {}) }]);
  }
};
$('selected').onclick = (e) => {
  const b = e.target.closest('[data-remove]');
  if (b) update(selections.filter((s) => s.id !== b.dataset.remove));
};
$('example').onclick = () => update(example.map((s) => ({ ...s })));
$('event-select').innerHTML =
  '<option value="">Без события</option>' +
  events.map((e) => `<option value="${e.id}">${e.id}. ${e.title}</option>`).join('');
$('event-select').onchange = (e) => setEvent(e.target.value || null);
$('event-random').onclick = () => {
  const pool = events.filter((e) => e.id !== event);
  setEvent(pool[Math.floor(Math.random() * pool.length)].id);
};
$('save-compare').onclick = () => {
  const r = simulate(selections, { event });
  if (!r.valid || !r.complete) return;
  const team = $('team-name').value.trim() || `Сценарий ${saved.length + 1}`;
  saved.push({
    team,
    event: r.event?.title ?? '—',
    measures: describe(selections),
    cost: `${r.cost} / ${r.budget}`,
    score: r.score,
    gain: r.score - r.start.score,
    weakest: r.weakest,
    critical: r.critical.length,
  });
  if (saved.length > 8) saved.shift();
  renderCompare();
  $('compare-section').scrollIntoView({ block: 'nearest' });
};
function renderCompare() {
  $('compare-section').hidden = saved.length === 0;
  const best = Math.max(...saved.map((s) => s.score));
  $('compare').innerHTML =
    `<thead><tr><th>Команда</th><th>Событие</th><th>Меры</th><th>Бюджет</th><th>Score</th><th>Δ к исходному</th><th>Слабейший район</th><th>&lt; 40</th><th></th></tr></thead><tbody>${saved
      .map(
        (s, i) =>
          `<tr class="${s.score === best ? 'best' : ''}"><th>${escapeHtml(s.team)}${s.score === best ? ' <span class="badge">лидер</span>' : ''}</th><td>${s.event}</td><td>${s.measures}</td><td>${s.cost}</td><td><strong>${fmt(s.score)}</strong></td><td>${s.gain >= 0 ? '+' : ''}${fmt(s.gain)}</td><td>${s.weakest}</td><td>${s.critical}</td><td><button class="remove" data-drop="${i}" aria-label="Удалить из сравнения">×</button></td></tr>`,
      )
      .join('')}</tbody>`;
}
$('compare').onclick = (e) => {
  const b = e.target.closest('[data-drop]');
  if (!b) return;
  saved.splice(Number(b.dataset.drop), 1);
  renderCompare();
};
$('download-deck').onclick = () => {
  const team = $('team-name').value.trim() || 'Команда';
  const md = presentation(selections, { event, team });
  if (!md) return;
  const url = URL.createObjectURL(new Blob([md], { type: 'text/markdown;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: 'akim-scenario.md' });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
$('reset').onclick = () => update([]);
$('analyze').onclick = () => {
  analyze();
  $('analysis-section').scrollIntoView({
    behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    block: 'start',
  });
};
$('ai-button').onclick = async () => {
  const current = revision;
  busy = true;
  $('ai-button').disabled = true;
  $('ai-status').textContent = 'AI анализирует сценарий…';
  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selections, event }),
      signal: AbortSignal.timeout(65000),
    });
    const data = await response.json();
    if (!response.ok) throw Error(data.error || 'Не удалось получить ответ AI.');
    if (current !== revision) return;
    $('analysis-mode').textContent = 'Объяснение OpenAI · расчёты проверены сервером';
    $('analysis-text').textContent = data.text;
    $('ai-status').textContent =
      'Числа рассчитаны моделью симулятора. Текст AI может требовать проверки.';
  } catch (e) {
    if (current === revision)
      $('ai-status').textContent =
        e.name === 'TimeoutError' ? 'AI не успел ответить. Попробуйте ещё раз.' : e.message;
  } finally {
    if (current === revision) {
      busy = false;
      $('ai-button').disabled = !aiAvailable;
    }
  }
};
render();
fetch('/api/config')
  .then((r) => r.json())
  .then((c) => {
    aiAvailable = c.aiAvailable === true;
    if (!$('analysis-section').hidden) analyze();
  })
  .catch(() => {});
if (document.modelContext?.registerTool) {
  for (const tool of [
    {
      name: 'read_city_scenario',
      description: 'Read current city selections and calculated indicators.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true },
      execute: () => ({
        selections,
        event,
        result: simulate(selections, { partial: true, event }),
      }),
    },
    {
      name: 'set_city_scenario',
      description: 'Replace the visible draft with up to five valid actions. Does not call AI.',
      inputSchema: {
        type: 'object',
        properties: {
          selections: {
            type: 'array',
            maxItems: 5,
            items: {
              type: 'object',
              properties: { id: { type: 'string' }, district: { type: 'string' } },
              required: ['id'],
              additionalProperties: false,
            },
          },
        },
        required: ['selections'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false },
      execute: (input) => {
        update(input.selections);
        return { selections, event, result: simulate(selections, { partial: true, event }) };
      },
    },
  ]) {
    try {
      Promise.resolve(document.modelContext.registerTool(tool)).catch(() => {});
    } catch {}
  }
}
