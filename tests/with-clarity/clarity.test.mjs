// Test di Microsoft Clarity (mappe di calore). Il sito va costruito con
// PUBLIC_CLARITY_PROJECT_ID=test123: lo fa `npm run test:clarity`.
// Il servizio compare solo con quell'ID; qui si verifica che parta soltanto dopo il consenso.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import * as playwright from 'playwright';

const ENGINE = process.env.ENGINE || 'chromium';
const PORT = 4396;
const BASE = `http://localhost:${PORT}`;
const KEY = 'yt_cookie_consent';
const CLARITY = /clarity\.ms/;
const GA = /googletagmanager\.com|google-analytics\.com/;
let server;
let browser;

before(async () => {
  server = spawn('npx', ['astro', 'preview', '--port', String(PORT)], { stdio: 'ignore' });
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(BASE)).ok) break; } catch { /* non ancora pronto */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  browser = await playwright[ENGINE].launch();
});
after(async () => { await browser?.close(); server?.kill(); });

// Finto script di Clarity: registra le chiamate a window.clarity
const STUB = `window.__cl = window.__cl || [];
(function(){ var q = (window.clarity && window.clarity.q) || []; q.forEach(function(a){ window.__cl.push(Array.from(a)); });
window.clarity = function(){ window.__cl.push(Array.from(arguments)); }; })();`;

async function session() {
  const context = await browser.newContext();
  const external = [];
  await context.route('**/*', (route) => {
    const url = route.request().url();
    if (url === BASE + '/api/consent') return route.fulfill({ status: 204, body: '' });
    if (url.startsWith(BASE) || url.startsWith('data:')) return route.continue();
    external.push(url);
    return route.fulfill({ status: 200, contentType: 'application/javascript', body: CLARITY.test(url) ? STUB : '' });
  });
  const page = await context.newPage();
  return { context, page, external };
}

const banner = (p) => p.locator('#cookie-banner');
const record = (p) => p.evaluate((k) => JSON.parse(localStorage.getItem(k) || 'null'), KEY);
const settle = (p) => p.waitForTimeout(700);
const open = async (p, path = '/') => { await p.goto(BASE + path); await settle(p); };
const main = (p) => banner(p).locator('[data-cb-view="main"]');
const prefs = (p) => banner(p).locator('[data-cb-view="prefs"]');

test('prima del consenso Clarity non parte; nel pannello compare con un interruttore proprio, spento', async () => {
  const { context, page, external } = await session();
  await open(page);
  assert.equal(external.filter((u) => CLARITY.test(u)).length, 0);
  await main(page).getByRole('button', { name: 'Personalizza' }).click();
  const clarity = prefs(page).locator('input[data-service="clarity"]');
  const ga = prefs(page).locator('input[data-service="ga4"]');
  assert.equal(await clarity.isChecked(), false);
  assert.equal(await ga.isChecked(), false);
  assert.equal(await prefs(page).locator('input[data-cat="statistics"]').isChecked(), false);
  assert.deepEqual(external, []);
  await context.close();
});

test('Accetta tutti: parte Clarity con il suo ID, insieme ad Analytics', async () => {
  const { context, page, external } = await session();
  await open(page);
  await main(page).getByRole('button', { name: 'Accetta tutti' }).click();
  await settle(page);
  assert.ok(external.includes('https://www.clarity.ms/tag/test123'));
  assert.ok(external.some((u) => GA.test(u)));
  assert.deepEqual((await record(page)).services, { ga4: true, 'google-maps': true, clarity: true });
  await context.close();
});

test('consenso separato: solo Analytics oppure solo Clarity', async () => {
  for (const [on, off, expectOn, expectOff] of [['ga4', 'clarity', GA, CLARITY], ['clarity', 'ga4', CLARITY, GA]]) {
    const { context, page, external } = await session();
    await open(page);
    await main(page).getByRole('button', { name: 'Personalizza' }).click();
    await prefs(page).locator(`input[data-service="${on}"]`).click();
    await prefs(page).getByRole('button', { name: 'Salva scelte' }).click();
    await settle(page);
    assert.ok(external.some((u) => expectOn.test(u)), `${on} parte`);
    assert.equal(external.filter((u) => expectOff.test(u)).length, 0, `${off} resta spento`);
    const rec = await record(page);
    assert.equal(rec.services[on], true);
    assert.equal(rec.services[off], false);
    await context.close();
  }
});

test('l\'interruttore della categoria Statistiche governa Analytics e Clarity insieme', async () => {
  const { context, page, external } = await session();
  await open(page);
  await main(page).getByRole('button', { name: 'Personalizza' }).click();
  await prefs(page).locator('input[data-cat="statistics"]').click();
  assert.equal(await prefs(page).locator('input[data-service="clarity"]').isChecked(), true);
  assert.equal(await prefs(page).locator('input[data-service="ga4"]').isChecked(), true);
  await prefs(page).locator('input[data-service="clarity"]').click();
  assert.equal(await prefs(page).locator('input[data-cat="statistics"]').isChecked(), false, 'categoria non più tutta attiva');
  await context.close();
});

test('revoca di Clarity: ferma la registrazione (consent=false) e cancella i cookie _clck/_clsk, senza toccare Analytics', async () => {
  const { context, page } = await session();
  await open(page);
  await main(page).getByRole('button', { name: 'Accetta tutti' }).click();
  await settle(page);
  await context.addCookies([{ name: '_clck', value: 'x', url: BASE }, { name: '_clsk', value: 'y', url: BASE }, { name: '_ga', value: 'z', url: BASE }]);

  await page.locator('footer [data-cookie-open]').click();
  await prefs(page).locator('input[data-service="clarity"]').click();
  await prefs(page).getByRole('button', { name: 'Salva scelte' }).click();
  await settle(page);

  const names = (await context.cookies()).map((c) => c.name);
  assert.ok(!names.includes('_clck') && !names.includes('_clsk'), 'cookie Clarity cancellati');
  assert.ok(names.includes('_ga'), 'Analytics resta attivo');
  const calls = await page.evaluate(() => window.__cl);
  assert.ok(calls.some((c) => c[0] === 'consent' && c[1] === false), 'clarity("consent", false)');
  assert.equal((await record(page)).services.clarity, false);
  await context.close();
});

test('le informative citano Clarity e i suoi cookie quando è attivo', async () => {
  const { context, page } = await session();
  await open(page, '/privacy');
  const privacy = await page.locator('main').innerText();
  assert.ok(privacy.includes('Microsoft Clarity') && privacy.includes('mappe di calore'));
  await open(page, '/cookie');
  const cookie = await page.locator('main').innerText();
  for (const n of ['Microsoft Clarity', '_clck', '_clsk', 'Microsoft Ireland Operations Limited']) assert.ok(cookie.includes(n), n);
  await context.close();
});
