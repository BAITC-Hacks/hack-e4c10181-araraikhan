import {
  simulate,
  baseline,
  districts,
  indicators,
  measures,
  improvements,
  explain,
} from './public/engine.mjs';
// Sent on every request, independently of any previous explanation.
export const EXPLANATION_INSTRUCTIONS = `Ты помогаешь участнику учебного симулятора «Аким на 5 часов» понять свой сценарий и выбрать следующий шаг.

Читатель не знает формул и городского планирования. Пиши по-русски, спокойно и конкретно, обращаясь на «вы». Не хвали любой набор автоматически: называй и пользу, и ограничения. Объясняй смысл результата, а не пересказывай таблицу.

Формат каждого ответа
180–250 слов максимум, без вступления, приветствия и заключительного предложения «если хотите…». Четыре блока с точными заголовками на отдельных строках; между блоками пустая строка:
Итог
Что получилось
Что стоит улучшить
Следующий шаг
Под каждым заголовком 2–3 коротких предложения. Обычный текст: без Markdown-разметки, звёздочек, HTML, таблиц и формул. Не больше трёх числовых фактов в одном блоке. Числа показывай максимум с двумя знаками после запятой; для итогов бери готовые строки readingGuide. Не выводи длинные дроби.

Содержание
«Итог»: итоговая оценка, изменение относительно старта и использованный бюджет. Скажи одним предложением, на какую проблему направлен сценарий. Если действует событие, коротко учти его здесь, не добавляя отдельный длинный блок.
«Что получилось»: выбери одно-два наиболее существенных улучшения и назови район. Свяжи меру, показатель и смысл для города в рамках модели. При переходе через 40 скажи, что показатель вышел из критической зоны. Если важна синергия, объясни её как дополнительный эффект сочетания мер.
«Что стоит улучшить»: сначала оставшиеся значения ниже 40, затем значения от 40 до строго менее 50. Если их нет, назови слабейший район или ограничение охвата без выдумывания кризиса. Укажи один конкретный компромисс или задержку запуска. Результат 48 нельзя называть полностью решённой проблемой лишь потому, что он выше 40.
«Следующий шаг»: предложи ровно одну проверенную замену из checkedSingleReplacements, назови обе меры и районы человеческими названиями. Используй готовые label и display. Объясни пользу и потерю по changesComparedWithCurrent; если уменьшений нет, не придумывай потерю. Скажи, что это вариант для сравнения, а не гарантированно лучший сценарий. Если список пуст, честно сообщи, что проверенные одиночные замены не улучшили оценку; не заявляй глобальную оптимальность и не выдумывай числовую рекомендацию.

Язык
Пиши «Школы и детсады (S1)», а не голый «S1». Код меры M7 можно добавить после названия, но он не заменяет название. Избегай «критика снята», «донастройки», «оптимизация обеспеченности», «значительный потенциал» и других туманных выражений. Хороший стиль: «В Нуре улучшилась обеспеченность школами. Показатель вышел из критической зоны, но ещё нуждается в улучшении». Это пример стиля, не готовый факт для копирования.

Точность
Единственный источник фактов — переданные данные. Не придумывай население, число построенных объектов, снижение преступности, проценты или реальные сроки вне модели. Сравнивай с result.start, включая эффект события; baseline — только справочная исходная модель без события. Все изменения, штрафы и варианты уже рассчитаны сервером: не пересчитывай Score. Значения до 40 критические; от 40 до <50 — рекомендуемые улучшения, а не критические провалы. Эффекты мер — изменения показателей, не отдельные слагаемые итогового Score. По числам изменений не заявляй причинность сильнее заданных правил. Лаг уже учтён в эффектах; это эффект за восемь кварталов, не ежегодный или поквартальный прирост. Оставшийся бюджет не даёт бонуса. Говори о результате модели, не обещай реальные последствия.

Обязательные ограничения: не перечисляй все слабые показатели — выбери максимум ДВА. Не перечисляй все эффекты замены — назови одну пользу и одну потерю. Значение РОВНО 40 никогда не было критическим: переход 40 → 48,75 — улучшение, но НЕ выход из критической зоны. Выход из критической зоны разрешено упоминать только для readingGuide.resolvedCritical. Не используй слово «критика» для показателей. Не утверждай снижение напряжения семей или другие не измеренные моделью последствия. Не более 3 предложений на блок и 250 слов на весь ответ. Перед отправкой сократи перечисления и проверь эти условия; саму проверку не показывай.`;

const displayNumber = (value) => value.toLocaleString('ru-RU', { maximumFractionDigits: 2 });
function namedChoice(choice) {
  return `${measures.find((m) => m.id === choice.id).name} (${choice.id}) — ${choice.district ? districts.find((d) => d.id === choice.district).name : 'весь город'}`;
}
const json = (body, status = 200) =>
  Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
  });
export async function handleApi(request, env = {}, fetcher = fetch) {
  const path = new URL(request.url).pathname;
  if (path === '/api/config' && request.method === 'GET')
    return json({ aiAvailable: Boolean(env.OPENAI_API_KEY) });
  if (path !== '/api/analyze') return json({ error: 'Маршрут не найден.' }, 404);
  if (request.method !== 'POST') return json({ error: 'Используйте POST.' }, 405);
  if (
    request.headers.get('origin') &&
    request.headers.get('origin') !== new URL(request.url).origin
  )
    return json({ error: 'Запрос с другого сайта запрещён.' }, 403);
  if (!request.headers.get('content-type')?.startsWith('application/json'))
    return json({ error: 'Ожидается JSON.' }, 415);
  let payload;
  try {
    const reader = request.body?.getReader();
    let size = 0,
      text = '';
    const decoder = new TextDecoder();
    if (!reader) return json({ error: 'Пустой запрос.' }, 400);
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 16384) {
        await reader.cancel();
        return json({ error: 'Слишком большой запрос.' }, 413);
      }
      text += decoder.decode(value, { stream: true });
    }
    payload = JSON.parse(text + decoder.decode());
  } catch {
    return json({ error: 'Некорректный JSON.' }, 400);
  }
  const event = payload?.event ?? null;
  const result = simulate(payload?.selections, { event });
  if (!result.valid) return json({ error: result.errors.join(' ') }, 400);
  if (!env.OPENAI_API_KEY)
    return json(
      {
        error:
          'OpenAI не подключён. Добавьте OPENAI_API_KEY на сервере. Автоматический разбор доступен без ключа.',
      },
      503,
    );
  // Only server-derived numbers reach the model; client-submitted scores are ignored.
  const facts = {
    baseline: {
      score: baseline.score,
      average: baseline.average,
      minimum: baseline.minimum,
      critical: baseline.critical,
    },
    result,
    indicators,
    districts: districts.map((d) => ({ id: d.id, name: d.name, populationShare: d.pop })),
    readingGuide: {
      score: displayNumber(result.score),
      scoreChange: displayNumber(result.score - result.start.score),
      spent: displayNumber(result.cost),
      budget: displayNumber(result.cost + result.remaining),
      resolvedCritical: result.rows.flatMap((row, d) => row.flatMap((value, k) =>
        result.start.rows[d][k] < 40 && value >= 40
          ? [{ district: districts[d].name, name: indicators[k][1], code: indicators[k][0], before: result.start.rows[d][k], after: value }]
          : [])),
      needsAttention: result.rows.flatMap((row, d) => row.flatMap((value, k) =>
        value < 50 ? [{ district: districts[d].name, code: indicators[k][0], name: indicators[k][1], value, critical: value < 40 }] : [])),
    },
    checkedSingleReplacements: improvements(payload.selections, { event }).map((option) => {
      const alternative = simulate(payload.selections.map((s) => s.id === option.remove.id ? option.add : s), { event });
      return {
        ...option,
        label: { remove: namedChoice(option.remove), add: namedChoice(option.add) },
        display: { score: displayNumber(option.score), gain: displayNumber(option.gain), cost: displayNumber(option.cost) },
        changesComparedWithCurrent: alternative.rows.flatMap((row, d) => row.flatMap((value, k) => {
          const delta = value - result.rows[d][k];
          return Math.abs(delta) > 1e-9 ? [{ district: districts[d].name, indicator: indicators[k][0], name: indicators[k][1], delta, after: value }] : [];
        })),
      };
    }),
    ruleBasedSummary: explain(result),
  };
  try {
    const response = await fetcher('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(60000),
      body: JSON.stringify({
        model: env.OPENAI_MODEL || 'gpt-5',
        store: false,
        max_output_tokens: 4000,
        ...((env.OPENAI_MODEL || 'gpt-5').startsWith('gpt-5')
          ? { reasoning: { effort: 'low' } }
          : {}),
        instructions: EXPLANATION_INSTRUCTIONS,
        input: JSON.stringify(facts),
      }),
    });
    if (!response.ok) {
      await response.body?.cancel();
      return json(
        {
          error:
            response.status === 429
              ? 'Лимит OpenAI исчерпан или слишком много запросов. Попробуйте позже.'
              : response.status === 401
                ? 'OpenAI отклонил ключ. Проверьте ключ на сервере.'
                : 'OpenAI не смог обработать запрос. Проверьте доступ к модели и повторите попытку.',
        },
        502,
      );
    }
    const data = await response.json();
    const text = (data.output || [])
      .flatMap((item) => item.content || [])
      .filter((c) => c.type === 'output_text')
      .map((c) => c.text)
      .join('\n');
    if (!text || data.status === 'incomplete')
      return json({ error: 'AI не завершил объяснение. Попробуйте ещё раз.' }, 502);
    return json({ text, score: result.score });
  } catch (error) {
    return json(
      {
        error:
          error.name === 'TimeoutError'
            ? 'AI не успел ответить. Попробуйте ещё раз.'
            : 'Не удалось связаться с OpenAI. Расчёты симулятора продолжают работать.',
      },
      502,
    );
  }
}
