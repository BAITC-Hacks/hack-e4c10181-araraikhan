import {
  districts,
  indicators,
  measures,
  areas,
  validate,
  simulate,
  explain,
  improvements,
  events,
  findEvent,
  budgetFor,
  coveredAreas,
  presentation,
  baseline,
  synergyPairs,
} from './engine.mjs';
import { icon, areaIcons, indicatorInfo, measureIcons } from './icons.mjs';
import { randomScenario } from './scenarios.mjs';
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
let searchWorker = null;
function stopSearch() {
  searchWorker?.terminate();
  searchWorker = null;
  $('best-scenario').textContent = 'Лучший сценарий ★';
  $('best-scenario').setAttribute('aria-busy', 'false');
  $('scenario-status').textContent = '';
}
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
    .map((m) => measureCard(m))
    .join('');
  $('remaining').textContent = budget - cost;
  $('budget-total').textContent = budget;
  $('ring-cost').textContent = cost;
  $('spent').textContent = `Использовано ${cost}`;
  $('count').textContent = `${selections.length} / 5 решений`;
  $('budget-fill').setAttribute('stroke-dasharray', `${Math.min(100, (cost / budget) * 100)} 100`);
  $('budget-fill').classList.toggle('over', cost > budget);
  $('budget-fill').classList.toggle('empty', cost === 0);
  const used = new Set(selections.map((s) => measures.find((m) => m.id === s.id).area));
  $('coverage').innerHTML =
    areas
      .map(
        (a, i) =>
          `<span class="cov ${used.has(i) ? 'on' : ''}" title="${a}${used.has(i) ? ': есть мера' : ': пока нет меры'}">${icon(areaIcons[i])}</span>`,
      )
      .join('') + `<span class="cov-text">направлений ${coveredAreas(selections)} из 5</span>`;
  $('selected').innerHTML =
    selections
      .map((s, i) => {
        const m = measures.find((m) => m.id === s.id);
        return `<div class="selection"><span class="sel-icon">${icon(measureIcons[m.id])}</span><div>${m.name}<small>${s.district ? districts.find((d) => d.id === s.district).name : 'Весь город'} · ${m.cost} ед.</small></div><button class="remove" data-remove="${s.id}" aria-label="Удалить ${m.name}">×</button></div>`;
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
  const shown = r.complete ? r.score : start.score;
  $('score').textContent = fmt(shown);
  $('score-delta').textContent = r.complete
    ? `${r.score >= start.score ? '▲ +' : '▼ '}${fmt(r.score - start.score)} к базе`
    : 'до решений';
  $('score-delta').classList.toggle('down', r.complete && r.score < start.score);
  setGauge(shown, start.score);
  $('score-note').textContent = r.complete
    ? `Слабейший район: ${r.weakest}. Критических показателей: ${r.critical.length}.`
    : 'Промежуточные изменения показаны ниже. Итог пока не рассчитан.';
  $('analyze').disabled = !r.complete || blocked.length > 0;
  $('city-caption').textContent = selections.length
    ? r.complete
      ? 'Результат через 8 кварталов'
      : 'Предварительные изменения · сценарий не завершён'
    : 'Исходное состояние';
  const before = directionScores(start.rows),
    after = directionScores(r.rows);
  $('directions').innerHTML = areas
    .map((a, i) => {
      const delta = after[i] - before[i];
      return `<article class="direction d${i}"><span class="dir-icon">${icon(areaIcons[i])}</span><span class="dir-name">${a}</span><strong>${short1(after[i])}</strong><span class="delta ${delta < 0 ? 'down' : ''}">${Math.abs(delta) < 0.05 ? 'без изменений' : `${delta > 0 ? '▲' : '▼'} ${short1(Math.abs(delta))}`}</span><div class="mini-bar"><i style="width:${after[i]}%"></i><b style="width:${before[i]}%"></b></div></article>`;
    })
    .join('');
  $('districts').innerHTML = districts
    .map((d, i) => {
      const delta = r.scores[i] - start.scores[i];
      const critical = r.critical.filter((c) => c.district === d.name).length;
      return `<article class="district ${r.scores[i] === r.minimum ? 'weakest' : ''}"><div class="district-name">${icon('pin')}<div><strong>${d.name}</strong><span>${short(d.pop * 100)}% жителей · ${d.profile}</span></div></div><div class="district-bar" role="meter" aria-label="Оценка района ${d.name}" aria-valuenow="${r.scores[i]}" aria-valuemin="0" aria-valuemax="100"><div class="before" style="width:${start.scores[i]}%"></div><div class="after" style="width:${r.scores[i]}%"></div></div><div class="district-score">${fmt(r.scores[i])}${Math.abs(delta) > 1e-9 ? `<small class="${delta < 0 ? 'down' : ''}">${delta > 0 ? '▲' : '▼'} ${fmt(Math.abs(delta))}</small>` : ''}</div><div class="district-tags">${r.scores[i] === r.minimum ? '<span class="tag weak">слабейший</span>' : ''}${critical ? `<span class="tag warn">${icon('alert')} ниже 40: ${critical}</span>` : ''}</div></article>`;
    })
    .join('');
  $('matrix').innerHTML =
    `<caption class="fine">Показатели районов через 8 кварталов · значения 0–100 · в скобках изменение к базе</caption><thead><tr><th>Район</th>${indicators.map(([k, name, w]) => `<th><span class="th-icon">${icon(indicatorInfo[k].icon)}</span><abbr title="${name}; вес ${short(w * 100)}%">${k}</abbr></th>`).join('')}</tr></thead><tbody>${districts.map((d, i) => `<tr><th>${d.name}</th>${r.rows[i].map((v, k) => `<td class="${v < 40 ? 'cell-critical' : v < 50 ? 'cell-attention' : v > start.rows[i][k] ? 'cell-improved' : ''}" title="${indicators[k][1]}${v < 40 ? ": критическое значение, штраф 1 балл" : v < 50 ? ": рекомендуется улучшить, ниже 50" : ""}">${short(v)}${v !== start.rows[i][k] ? `<small>(${v > start.rows[i][k] ? '+' : ''}${short(v - start.rows[i][k])})</small>` : ''}</td>`).join('')}</tr>`).join('')}</tbody>`;
}
function synergyHint(m) {
  const pair = synergyPairs.find(([a, b]) => m.id === a || m.id === b);
  if (!pair) return '';
  const [a, b, code, bonus] = pair;
  const first = selections.find((s) => s.id === a);
  const second = selections.find((s) => s.id === b);
  if (!first && !second) return '';
  const districtId = first?.district || targets[a];
  const district = districts.find((d) => d.id === districtId).name;
  const name = indicators.find(([k]) => k === code)[1];
  const active = first && second;
  const blocked = validate(selections, { partial: true, event }).length > 0;
  const heading = active
    ? blocked ? 'Бонус пары после исправления сценария' : 'Синергия активна'
    : `Добавьте ${first ? b : a} — получите бонус`;
  return `<div class="synergy-hint${active ? ' active' : ''}"><strong>${heading}</strong><span>${a} + ${b}: ${code} · ${name} <b>+${bonus}</b> — ${district}.</span><small>Дополнительно к эффектам мер, без уменьшения за лаг.</small></div>`;
}
function measureCard(m) {
  const selected = selections.some((s) => s.id === m.id),
    candidate = { id: m.id, ...(m.scope === 'district' ? { district: targets[m.id] } : {}) };
  const errors = selected ? [] : validate([...selections, candidate], { partial: true, event });
  const effects = Object.entries(m.effects)
    .map(([k, v]) => {
      const real = (v * (8 - m.lag)) / 8;
      const name = indicators.find((i) => i[0] === k)[1];
      return `<span class="effect ${v < 0 ? 'negative' : ''}" title="Полный эффект ${v > 0 ? '+' : ''}${v}; после учёта лага ${short(real)} балла"><strong class="effect-code">${k}</strong><span class="effect-name">${name}</span><span class="effect-value">${real > 0 ? '+' : '−'}${short(Math.abs(real))}</span></span>`;
    })
    .join('');
  const lagDots = Array.from(
    { length: 8 },
    (_, q) => `<i class="${q < m.lag ? 'wait' : 'work'}"></i>`,
  ).join('');
  const scope =
    m.scope === 'district'
      ? `<label class="scope-label" for="target-${m.id}">${icon('pin')} Район реализации</label><select id="target-${m.id}" data-target="${m.id}" ${selected ? 'disabled' : ''}>${districts.map((d) => `<option value="${d.id}" ${targets[m.id] === d.id ? 'selected' : ''}>${d.name}</option>`).join('')}</select>`
      : `<span class="scope-label">${icon('city')} Охват</span><div class="city-scope">Все пять районов</div>`;
  return `<article class="measure ${selected ? 'chosen' : ''}">
    <div class="measure-head"><span class="measure-icon a${m.area}">${icon(measureIcons[m.id])}</span><div><div class="measure-top"><span>${areas[m.area]}</span><span class="measure-id">${m.id}</span></div><h3>${m.name}</h3></div></div>
    <div class="effect-heading">Влияние на показатели · баллы</div>
    <div class="effects">${effects}</div>
    <div class="lag" title="Лаг ${m.lag} кв.: эффект работает ${8 - m.lag} из 8 кварталов (${short(((8 - m.lag) / 8) * 100)}%)">${icon('clock')}<span class="lag-dots">${lagDots}</span><span>${m.lag ? `старт через ${m.lag} кв.` : 'сразу'}</span></div>
    ${scope}
    <div class="measure-bottom"><span class="price">${icon('coin')}${m.cost} <small>ед.</small></span><button class="add-button" data-add="${m.id}" ${errors.length ? 'disabled' : ''}>${selected ? '✓ Выбрано' : '+ Добавить'}</button></div>
    ${errors.length ? `<p class="blocked-reason">${errors[0]}</p>` : ''}
    ${synergyHint(m)}
  </article>`;
}
const short1 = (x) =>
  x.toLocaleString('ru-RU', { maximumFractionDigits: 1, minimumFractionDigits: 1 });
/** Population-weighted city average of the two indicators of each direction. */
function directionScores(rows) {
  return areas.map((_, a) =>
    rows.reduce((sum, row, d) => sum + (districts[d].pop * (row[2 * a] + row[2 * a + 1])) / 2, 0),
  );
}
const GAUGE_MIN = 40,
  GAUGE_MAX = 70;
function gaugeFraction(value) {
  return Math.max(0, Math.min(1, (value - GAUGE_MIN) / (GAUGE_MAX - GAUGE_MIN)));
}
function setGauge(value, reference) {
  $('gauge-fill').setAttribute('stroke-dasharray', `${gaugeFraction(value) * 100} 100`);
  const angle = Math.PI * (1 - gaugeFraction(reference));
  const point = (radius) => [100 + radius * Math.cos(angle), 100 - radius * Math.sin(angle)];
  const [x1, y1] = point(68),
    [x2, y2] = point(92);
  Object.entries({ x1, y1, x2, y2 }).forEach(([k, v]) => $('gauge-tick').setAttribute(k, v));
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
  stopSearch();
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
  stopSearch();
  selections = next;
  selections.forEach((s) => {
    if (s.district) targets[s.id] = s.district;
  });
  revision++;
  busy = false;
  $('analysis-section').hidden = true;
  render();
}
/** Plain-language findings built only from computed numbers. */
function stories(r) {
  const items = [];
  const add = (tone, iconName, html) => items.push({ tone, iconName, html });
  const start = r.start;
  const name = (k) => indicatorInfo[indicators[k][0]].short;
  const cells = [];
  start.rows.forEach((row, d) =>
    row.forEach((before, k) => cells.push({ d, k, before, after: r.rows[d][k] })),
  );
  const fixed = cells.filter((c) => c.before < 40 && c.after >= 40);
  for (const c of fixed)
    add(
      'good',
      indicatorInfo[indicators[c.k][0]].icon,
      `<b>${districts[c.d].name}: «${name(c.k)}» больше не в красной зоне.</b> ${short(c.before)} → ${short(c.after)}, порог — 40.`,
    );
  cells
    .filter((c) => !fixed.includes(c) && c.after - c.before > 0)
    .sort((a, b) => b.after - b.before - (a.after - a.before))
    .slice(0, 2)
    .forEach((c) =>
      add(
        'good',
        indicatorInfo[indicators[c.k][0]].icon,
        `<b>${districts[c.d].name}: «${name(c.k)}» ▲ ${short(c.after - c.before)}.</b> Было ${short(c.before)}, стало ${short(c.after)}.`,
      ),
    );
  for (const s of r.synergies)
    add(
      'good',
      'spark',
      `<b>Сработала синергия ${s.pair}:</b> ещё +${s.value} к «${indicatorInfo[s.indicator].short}» в районе ${s.district}.`,
    );
  for (const c of r.critical)
    add(
      'warn',
      'alert',
      `<b>Риск: ${c.district}, «${indicatorInfo[c.indicator].short}» = ${short(c.value)}.</b> Ниже 40 — штраф 1 балл.`,
    );
  cells
    .filter((c) => c.after >= 40 && c.after < 42)
    .forEach((c) =>
      add(
        'warn',
        'alert',
        `<b>На грани: ${districts[c.d].name}, «${name(c.k)}» = ${short(c.after)}.</b> Чуть ниже — и появится штраф.`,
      ),
    );
  add(
    'info',
    'pin',
    `<b>Слабейший район — ${r.weakest} (${fmt(r.minimum)}).</b> Его балл даёт 30% итоговой оценки, поэтому помощь ему ценится выше.`,
  );
  if (r.remaining > 0)
    add(
      'info',
      'coin',
      `<b>Осталось ${r.remaining} ед. бюджета.</b> Остаток не добавляет баллов — можно заменить меру на более дорогую.`,
    );
  if (r.event)
    add(
      'info',
      'bolt',
      `<b>Событие «${r.event.title}».</b> Исходный Score до решений: ${fmt(start.score)} вместо ${fmt(baseline.score)}.`,
    );
  return items;
}
function radar(beforeValues, afterValues) {
  const MIN = 40,
    MAX = 70,
    R = 92;
  const angle = (i) => -Math.PI / 2 + (i * 2 * Math.PI) / 5;
  const point = (i, radius) => [Math.cos(angle(i)) * radius, Math.sin(angle(i)) * radius];
  const scale = (v) => (Math.max(0, Math.min(1, (v - MIN) / (MAX - MIN))) * R).toFixed(1);
  const polygon = (values) =>
    values
      .map((v, i) =>
        point(i, scale(v))
          .map((x) => x.toFixed(1))
          .join(','),
      )
      .join(' ');
  const rings = [1, 2 / 3, 1 / 3]
    .map((f) => `<polygon points="${areas.map((_, i) => point(i, R * f).join(',')).join(' ')}" />`)
    .join('');
  const spokes = areas
    .map((_, i) => `<line x1="0" y1="0" x2="${point(i, R)[0]}" y2="${point(i, R)[1]}" />`)
    .join('');
  const labels = areas
    .map((a, i) => {
      const [x, y] = point(i, R + 22);
      return `<text x="${x.toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="middle">${a}</text><text class="radar-value" x="${x.toFixed(1)}" y="${(y + 17).toFixed(1)}" text-anchor="middle">${short1(afterValues[i])}</text>`;
    })
    .join('');
  return `<svg viewBox="-150 -135 300 270" role="img" aria-label="Баланс пяти направлений: было и стало"><g class="radar-grid">${rings}${spokes}</g><polygon class="radar-before" points="${polygon(beforeValues)}" /><polygon class="radar-after" points="${polygon(afterValues)}" /><g class="radar-labels">${labels}</g></svg><div class="bar-legend"><span><i class="legend-line dashed"></i> было</span><span><i class="legend-line"></i> стало</span><span>шкала 40–70</span></div>`;
}
function analyze() {
  const r = simulate(selections, { event });
  if (!r.valid) return;
  $('analysis-section').hidden = false;
  $('analysis-mode').textContent = 'Автоматический разбор по правилам';
  const summary = explain(r);
  $('analysis-text').textContent = summary.slice(0, r.event ? 2 : 1).join('\n\n');
  $('stories').innerHTML = stories(r)
    .map(
      (item) =>
        `<li class="story ${item.tone}"><span class="story-icon">${icon(item.iconName)}</span><span>${item.html}</span></li>`,
    )
    .join('');
  $('radar').innerHTML = radar(directionScores(r.start.rows), directionScores(r.rows));
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
$('example').onclick = () => {
  update(randomScenario({ event, exclude: selections }));
  $('scenario-status').textContent = 'Новый случайный сценарий: 5 мер, бюджет и ограничения соблюдены.';
};
$('best-scenario').onclick = () => {
  if (searchWorker) {
    stopSearch();
    $('scenario-status').textContent = 'Поиск отменён. Ваш сценарий сохранён.';
    return;
  }
  $('scenario-status').textContent = 'Ищем максимальный Score для текущего события. Это может занять несколько секунд…';
  $('best-scenario').textContent = 'Отменить поиск';
  $('best-scenario').setAttribute('aria-busy', 'true');
  const fail = (message) => {
    stopSearch();
    $('scenario-status').textContent = message;
  };
  try {
    const worker = new Worker(new URL('./scenario-worker.mjs', import.meta.url), { type: 'module' });
    searchWorker = worker;
    worker.onmessage = ({ data }) => {
      if (searchWorker !== worker) return;
      if (data.type === 'progress') {
        $('scenario-status').textContent = `Ищем лучший сценарий… Проверено ${data.evaluated.toLocaleString('ru-RU')} вариантов.`;
      } else if (data.type === 'result') {
        update(data.result.selections);
        $('scenario-status').textContent = `Лучший сценарий выбран: Score ${fmt(data.result.score)}. Проверены все ${data.result.evaluated.toLocaleString('ru-RU')} допустимых вариантов для ${event ? 'выбранного события' : 'режима без события'}.`;
      } else if (data.type === 'error') {
        fail(`Не удалось завершить поиск: ${data.message}`);
      }
    };
    worker.onerror = () => {
      if (searchWorker === worker) fail('Не удалось запустить поиск. Обновите страницу и попробуйте ещё раз.');
    };
    worker.postMessage({ event });
  } catch {
    fail('Не удалось запустить поиск. Обновите страницу и попробуйте ещё раз.');
  }
};
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
