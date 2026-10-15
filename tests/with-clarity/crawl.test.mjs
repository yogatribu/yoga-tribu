// Come tests/crawl.test.mjs, ma con Microsoft Clarity attivo (è la configurazione di produzione).
// Scansione di tutte le pagine del build: senza consenso non deve partire
// nessuna richiesta verso domini esterni e nessun cookie deve essere scritto.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import * as playwright from 'playwright';

// Motore da provare: ENGINE=chromium | firefox | webkit (npm run test:consent:all li prova tutti)
const ENGINE = process.env.ENGINE || 'chromium';

const PORT = 4395;
const BASE = `http://localhost:${PORT}`;
let server;
let browser;

function htmlPages(dir, root = dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return htmlPages(full, root);
    if (name !== 'index.html') return [];
    const path = '/' + relative(root, dir);
    return [path === '/.' || path === '/' ? '/' : path];
  });
}

before(async () => {
  server = spawn('npx', ['astro', 'preview', '--port', String(PORT)], { stdio: 'ignore' });
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(BASE)).ok) break; } catch { /* non ancora pronto */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  browser = await playwright[ENGINE].launch();
});
after(async () => { await browser?.close(); server?.kill(); });

test('con Clarity attivo, nessuna pagina contatta domini esterni o scrive cookie prima del consenso', async () => {
  const pages = htmlPages('dist').filter((p) => !p.startsWith('/_'));
  assert.ok(pages.length > 30, `trovate solo ${pages.length} pagine`);
  const context = await browser.newContext();
  const external = [];
  let current = '';
  await context.route('**/*', (route) => {
    const url = route.request().url();
    if (url.startsWith(BASE) || url.startsWith('data:')) return route.continue();
    // I redirect delle vecchie URL puntano al sito di produzione: non lo seguiamo, testiamo solo questo build.
    if (/^https:\/\/(www\.)?yogatribu\.it\//.test(url)) return route.fulfill({ status: 200, body: '' });
    external.push(`${current} -> ${url}`);
    return route.fulfill({ status: 200, body: '' });
  });
  const page = await context.newPage();
  for (const p of pages) {
    current = p;
    await page.goto(BASE + p, { waitUntil: 'load' });
    await page.waitForTimeout(250);
  }
  assert.deepEqual(external, [], 'richieste esterne senza consenso');
  assert.deepEqual(await context.cookies(), [], 'cookie scritti senza consenso');
  await context.close();
});
