// Dispositivi mobili emulati (viewport, user agent e tocco reali; il motore è quello vero).
// Non sostituiscono la prova su un telefono fisico.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import * as playwright from 'playwright';

const PORT = 4397;
const BASE = `http://localhost:${PORT}`;
const KEY = 'yt_cookie_consent';
const GA = /googletagmanager\.com|google-analytics\.com/;
const DEVICES = [
  ['iPhone 13', 'webkit'],
  ['Pixel 7', 'chromium'],
];
let server;

before(async () => {
  server = spawn('npx', ['astro', 'preview', '--port', String(PORT)], { stdio: 'ignore' });
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(BASE)).ok) break; } catch { /* non ancora pronto */ }
    await new Promise((r) => setTimeout(r, 500));
  }
});
after(() => server?.kill());

for (const [deviceName, engine] of DEVICES) {
  test(`${deviceName} (${engine}): banner nello schermo, tocco su Accetta, Gestisci cookie, tocco fuori e X`, async () => {
    const browser = await playwright[engine].launch();
    try {
    const context = await browser.newContext({ ...playwright.devices[deviceName] });
    const external = [];
    await context.route('**/*', (route) => {
      const url = route.request().url();
      if (url.startsWith(BASE) && !url.endsWith('/api/consent')) return route.continue();
      if (!url.startsWith(BASE)) external.push(url);
      return route.fulfill({ status: 204, body: '' });
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const vp = page.viewportSize();
    const banner = page.locator('#cookie-banner');
    const record = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k) || 'null'), KEY);

    await page.goto(BASE + '/');
    await page.waitForTimeout(800);
    assert.deepEqual(external, [], 'nessuna richiesta esterna prima della scelta');
    const box = await banner.boundingBox();
    assert.ok(box.x >= 0 && box.x + box.width <= vp.width && box.y >= 0 && box.y + box.height <= vp.height, 'il banner sta nello schermo');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, 'nessuno scroll orizzontale');

    // Su telefono "Accetta tutti" sta sotto a "Personalizza" (zona del pollice) ed è il più grande
    const main = banner.locator('[data-cb-view="main"]');
    const accept = await main.getByRole('button', { name: 'Accetta tutti' }).boundingBox();
    const custom = await main.getByRole('button', { name: 'Personalizza' }).boundingBox();
    assert.ok(accept.y > custom.y, 'Accetta tutti è più in basso');
    assert.ok(accept.height >= 44 && custom.height >= 44, 'bersagli di tocco di almeno 44px');

    // tocco fuori dal banner dalle preferenze: indietro
    await main.getByRole('button', { name: 'Personalizza' }).tap();
    await page.touchscreen.tap(4, vp.height / 3);
    assert.equal(await main.isVisible(), true);
    assert.equal(await record(), null);

    // X
    const close = main.getByRole('button', { name: 'Chiudi e continua senza accettare' });
    assert.ok((await close.boundingBox()).width >= 32);
    await close.tap();
    await page.waitForTimeout(300);
    assert.equal((await record()).action, 'reject_x');
    assert.equal(await banner.isVisible(), false);
    assert.deepEqual(external, []);

    // Gestisci cookie dal footer, poi Accetta tutti nel pannello
    await page.locator('footer [data-cookie-open]').scrollIntoViewIfNeeded();
    await page.locator('footer [data-cookie-open]').tap();
    await page.locator('#cookie-banner [data-cb-view="prefs"]').getByRole('button', { name: 'Accetta tutti' }).tap();
    await page.waitForTimeout(800);
    assert.equal((await record()).action, 'accept_all');
    assert.ok(external.some((u) => GA.test(u)), 'Analytics parte dopo il consenso');
    assert.deepEqual(errors, []);
    } finally {
      await browser.close();
    }
  });
}
