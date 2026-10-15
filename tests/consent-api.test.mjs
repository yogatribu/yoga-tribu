// Test dell'endpoint del registro dei consensi (api/consent.js), senza rete.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const { default: handler, validate } = await import('../api/consent.js');

const valid = () => ({
  id: 'a1b2c3d4-e5f6', ts: new Date().toISOString(), policy: '2026-10-15', action: 'accept_all',
  services: { ga4: true, 'google-maps': true }, ua: 'Mozilla/5.0 test', lang: 'it-IT', page: '/contatti',
});

function call({ method = 'POST', origin = 'https://www.yogatribu.it', body = valid(), host = 'www.yogatribu.it' } = {}) {
  const res = { headers: {}, status(c) { this.code = c; return this; }, end() { this.ended = true; return this; }, setHeader(k, v) { this.headers[k] = v; } };
  const req = { method, headers: { ...(origin ? { origin } : {}), host }, body };
  return handler(req, res).then(() => res);
}

let logs;
let realFetch;
let realLog;
beforeEach(() => {
  delete process.env.KV_REST_API_URL; delete process.env.KV_REST_API_TOKEN;
  delete process.env.UPSTASH_REDIS_REST_URL; delete process.env.UPSTASH_REDIS_REST_TOKEN;
  logs = [];
  realLog ??= console.log;
  console.log = (...a) => logs.push(a.join(' '));
  realFetch ??= globalThis.fetch;
  globalThis.fetch = realFetch;
});

test('accetta una scelta valida e, senza storage collegato, la scrive nei log senza IP', async () => {
  const res = await call();
  assert.equal(res.code, 204);
  assert.equal(logs.length, 1);
  const logged = JSON.parse(logs[0]);
  assert.equal(logged.storage, 'log-only');
  assert.equal(logged.action, 'accept_all');
  assert.ok(!JSON.stringify(logged).match(/\b\d{1,3}(\.\d{1,3}){3}\b/), 'nessun indirizzo IP');
});

test('con Redis collegato salva con scadenza (retention) e senza IP', async () => {
  process.env.KV_REST_API_URL = 'https://example.upstash.io/';
  process.env.KV_REST_API_TOKEN = 'secret';
  const calls = [];
  globalThis.fetch = async (url, init) => { calls.push({ url, init }); return { ok: true, status: 200 }; };
  const res = await call();
  assert.equal(res.code, 204);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://example.upstash.io/pipeline');
  assert.equal(calls[0].init.headers.Authorization, 'Bearer secret');
  const cmds = JSON.parse(calls[0].init.body);
  assert.deepEqual(cmds[0].slice(0, 2), ['LPUSH', 'consent:a1b2c3d4-e5f6']);
  assert.equal(cmds[1][0], 'EXPIRE');
  assert.equal(Number(cmds[1][2]), 730 * 86400);
  const stored = JSON.parse(cmds[0][2]);
  assert.equal(stored.policy, '2026-10-15');
  assert.ok(stored.receivedAt);
  assert.equal(logs.length, 0, 'con storage non scrive anche nei log');
});

test('storage che fallisce: risponde 500 (il client può ritentare), non perde in silenzio', async () => {
  process.env.KV_REST_API_URL = 'https://example.upstash.io';
  process.env.KV_REST_API_TOKEN = 'secret';
  globalThis.fetch = async () => ({ ok: false, status: 503 });
  const realErr = console.error; console.error = () => {};
  const res = await call();
  console.error = realErr;
  assert.equal(res.code, 500);
});

test('rifiuta metodo sbagliato, origine estranea o assente', async () => {
  assert.equal((await call({ method: 'GET' })).code, 405);
  assert.equal((await call({ origin: 'https://evil.example' })).code, 403);
  assert.equal((await call({ origin: null })).code, 403);
  assert.equal((await call({ origin: 'http://localhost:4321', host: 'localhost:4321' })).code, 204, 'stesso host (sviluppo)');
});

test('rifiuta dati non validi o manomessi', async () => {
  const bad = [
    null, [], 'x', {},
    { ...valid(), id: 'corto' },
    { ...valid(), id: 'ha spazi e <script>' },
    { ...valid(), ts: 'ieri' },
    { ...valid(), ts: new Date(Date.now() - 30 * 86400000).toISOString() },
    { ...valid(), policy: 'abc' },
    { ...valid(), action: 'hack' },
    { ...valid(), services: {} },
    { ...valid(), services: { ga4: 'yes' } },
    { ...valid(), services: { 'Servizio Strano!': true } },
    { ...valid(), ua: 'x'.repeat(301) },
    { ...valid(), page: 'senza-slash' },
  ];
  for (const body of bad) {
    const res = await call({ body });
    assert.ok([400, 413].includes(res.code), `dovrebbe rifiutare ${JSON.stringify(body)?.slice(0, 60)}`);
  }
  assert.equal((await call({ body: JSON.stringify({ ...valid(), pad: 'x'.repeat(5000) }) })).code, 413);
  assert.equal((await call({ body: '{non json' })).code, 400);
});

test('scarta i campi in più (niente dati non previsti nell\'archivio)', () => {
  const entry = validate({ ...valid(), ip: '1.2.3.4', email: 'a@b.it' });
  assert.deepEqual(Object.keys(entry).sort(), ['action', 'id', 'lang', 'page', 'policy', 'services', 'ts', 'ua']);
});
