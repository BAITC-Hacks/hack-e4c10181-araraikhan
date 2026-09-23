import test from 'node:test';
import assert from 'node:assert/strict';
import { handleApi } from '../api.mjs';
import { example } from '../public/engine.mjs';
const req = (body) =>
  new Request('http://localhost:5173/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
test('validates choices before contacting AI and distinguishes missing configuration', async () => {
  assert.equal((await handleApi(req({ selections: [] }))).status, 400);
  assert.equal((await handleApi(req({ selections: example }))).status, 503);
  assert.equal((await handleApi(req(null))).status, 400);
});
test('ignores tampered scores and sends authoritative facts to model', async () => {
  let called = false;
  const response = await handleApi(
    req({ selections: example, score: 100 }),
    { OPENAI_API_KEY: 'test-only', OPENAI_MODEL: 'test-model' },
    async (url, options) => {
      called = true;
      assert.equal(url, 'https://api.openai.com/v1/responses');
      const body = JSON.parse(options.body);
      const facts = JSON.parse(body.input);
      assert.ok(Math.abs(facts.result.score - 56.54307) < 1e-8);
      assert.equal(body.store, false);
      assert.equal(body.model, 'test-model');
      assert.equal(facts.readingGuide.score, '56,54');
      assert.equal(facts.readingGuide.scoreChange, '3,99');
      const school = facts.readingGuide.needsAttention.find((c) => c.district === 'Нура' && c.code === 'S1');
      assert.equal(school.value, 48);
      assert.equal(school.critical, false);
      assert.deepEqual(facts.readingGuide.resolvedCritical.map((c) => c.code), ['S1', 'S2']);
      const rail = facts.checkedSingleReplacements.find((c) => c.add.id === 'M3');
      assert.match(rail.label.add, /Линия ЛРТ.*Нура/);
      assert.match(rail.label.remove, /чистое топливо.*Сарыарка/);
      const lostAirBenefit = rail.changesComparedWithCurrent.find((c) => c.district === 'Сарыарка' && c.indicator === 'E2');
      assert.equal(lostAirBenefit.delta, -8.75);
      assert.equal(lostAirBenefit.after, 40);
      return Response.json({
        status: 'completed',
        output: [
          { type: 'message', content: [{ type: 'output_text', text: 'Проверенное объяснение.' }] },
        ],
      });
    },
  );
  assert.ok(called);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).text, 'Проверенное объяснение.');
});
test('rejects cross-origin, oversized and malformed requests', async () => {
  const foreign = req({ selections: example });
  foreign.headers.set('origin', 'https://other.example');
  assert.equal((await handleApi(foreign)).status, 403);
  assert.equal((await handleApi(req({ pad: 'x'.repeat(17000) }))).status, 413);
  const bad = new Request('http://localhost:5173/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{',
  });
  assert.equal((await handleApi(bad)).status, 400);
});
test('provider errors do not expose keys or raw provider messages', async () => {
  const response = await handleApi(
    req({ selections: example }),
    { OPENAI_API_KEY: 'test-only' },
    async () => new Response('sensitive error', { status: 401 }),
  );
  assert.equal(response.status, 502);
  const body = await response.text();
  assert.ok(!body.includes('sensitive'));
  assert.ok(!body.includes('test-only'));
});

test('event is validated and forwarded to the model with the shocked start', async () => {
  assert.equal((await handleApi(req({ selections: example, event: 'EV99' }))).status, 400);
  assert.equal((await handleApi(req({ selections: example, event: 'EV2' }))).status, 400);
  let facts;
  const response = await handleApi(
    req({ selections: example, event: 'EV1' }),
    { OPENAI_API_KEY: 'test-only' },
    async (url, options) => {
      facts = JSON.parse(JSON.parse(options.body).input);
      return Response.json({
        status: 'completed',
        output: [{ type: 'message', content: [{ type: 'output_text', text: 'ok' }] }],
      });
    },
  );
  assert.equal(response.status, 200);
  assert.equal(facts.result.event.id, 'EV1');
  assert.ok(facts.result.start.score < facts.baseline.score);
  assert.equal(facts.readingGuide.scoreChange,
    (facts.result.score - facts.result.start.score).toLocaleString('ru-RU', { maximumFractionDigits: 2 }));
});
