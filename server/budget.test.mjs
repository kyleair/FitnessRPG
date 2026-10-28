import test from 'node:test';
import assert from 'node:assert/strict';
import { createApiBudget } from './budget.mjs';

test('uses read and overall headers, serializes athletes, persists reservations and resumes at reset', async () => {
  let now = Date.UTC(2026, 9, 28, 12), saved, calls = 0;
  const options = { clock: () => now, persist: value => { saved = structuredClone(value); } };
  const budget = createApiBudget(options);
  const request = () => budget.request(async () => {
    calls++;
    assert.equal(saved.shortUsed, calls, 'reservation committed before request');
    return new Response(null, { headers: { 'X-ReadRateLimit-Limit': '2,1000', 'X-ReadRateLimit-Usage': `${calls},${calls}`,
      'X-RateLimit-Limit': '200,2000', 'X-RateLimit-Usage': `${calls},${calls}` } });
  });
  const results = await Promise.allSettled([request(), request(), request()]);
  assert.deepEqual(results.map(r => r.status), ['fulfilled', 'fulfilled', 'rejected']);
  assert.equal(calls, 2);
  const restored = createApiBudget({ ...options, initial: saved });
  await assert.rejects(restored.request(() => { throw new Error('must not fetch'); }), error => error.rateLimited && error.retryAt > now);
  now += 900001;
  await restored.request(async () => new Response(null));
  assert.equal(saved.shortUsed, 1);
  assert.equal(saved.dailyUsed, 3);
});

test('honors overall and daily limits independently, including across restart', async () => {
  let now = Date.UTC(2026, 9, 28, 12), saved;
  const options = { clock: () => now, persist: value => { saved = structuredClone(value); } };
  const budget = createApiBudget(options);
  await budget.request(async () => new Response(null, { headers: {
    'x-readratelimit-limit': '100,3', 'x-readratelimit-usage': '1,3',
    'x-ratelimit-limit': '2,2000', 'x-ratelimit-usage': '2,10',
  } }));
  assert.equal(budget.retryAt(), Date.UTC(2026, 9, 29) + 1000);
  now += 900001;
  const restored = createApiBudget({ ...options, initial: saved });
  await assert.rejects(restored.request(async () => new Response(null)), /budget paused/);
  now = Date.UTC(2026, 9, 29, 0, 0, 2);
  await restored.request(async () => new Response(null));
  assert.equal(saved.dailyUsed, 1);
});

test('missing headers fall back to 25 requests per window and 429 pauses without retry loops', async () => {
  let now = Date.UTC(2026, 9, 28, 12), calls = 0;
  const budget = createApiBudget({ clock: () => now });
  for (let i = 0; i < 25; i++) await budget.request(async () => { calls++; return new Response(null); });
  await assert.rejects(budget.request(async () => { calls++; return new Response(null); }), /budget paused/);
  assert.equal(calls, 25);
  now += 900001;
  await assert.rejects(budget.request(async () => new Response(null, { status: 429, headers: { 'retry-after': '1800' } })), error => error.rateLimited && error.retryAt >= now + 1800000);
  await assert.rejects(budget.request(async () => { throw new Error('must not fetch'); }), /budget paused/);
});

test('storage failure prevents a request from being sent', async () => {
  const budget = createApiBudget({ persist: () => { throw new Error('disk full'); } });
  await assert.rejects(budget.request(async () => { throw new Error('must not fetch'); }), /disk full/);
});

test('overall exhaustion pauses reads even when the read budget has capacity', async () => {
  const now = Date.UTC(2026, 9, 28, 12);
  const budget = createApiBudget({ clock: () => now });
  await budget.request(async () => new Response(null, { headers: {
    'x-readratelimit-limit': '100,1000', 'x-readratelimit-usage': '1,1',
    'x-ratelimit-limit': '200,2000', 'x-ratelimit-usage': '200,200',
  } }));
  assert.equal(budget.retryAt(), now + 900000 + 1000);
  await assert.rejects(budget.request(async () => { throw new Error('must not fetch'); }), /budget paused/);
});
