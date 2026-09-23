import {
  simulate,
  baseline,
  districts,
  indicators,
  improvements,
  explain,
} from './public/engine.mjs';
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
    districts: districts.map((d) => ({ name: d.name, populationShare: d.pop })),
    checkedSingleReplacements: improvements(payload.selections, { event }),
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
        max_output_tokens: 3000,
        instructions:
          'Ты советник в учебном симуляторе «Аким на 5 часов». Объясняй по-русски, короткими абзацами без Markdown. Все числовые результаты уже рассчитаны кодом. Используй только переданные факты; не пересчитывай и не придумывай показатели, стоимость, проценты, эффекты или прогнозы. Объясни сильные стороны, оставшиеся проблемы, лаги и компромиссы. Рекомендации с числами бери только из checkedSingleReplacements; не называй их глобальным оптимумом. Вклад measures — изменения показателей, не аддитивные вклады в Score. Это синтетическая модель. Сначала итог, затем сильные стороны, риски и одна проверенная рекомендация, если есть. Если в result.event есть городское событие, объясни, как оно изменило исходные показатели и бюджет и как выбранные меры на него отвечают; сравнивай с result.start, а не с baseline. Не обещай реальных последствий.',
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
