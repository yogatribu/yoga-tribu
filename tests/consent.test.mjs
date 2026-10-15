// Test del banner cookie su build reale (astro preview).
// Si lancia con: npm run test:consent
// Ogni richiesta fuori da localhost viene intercettata, registrata e risposta
// vuota: nessun traffico reale verso Google, ma sappiamo esattamente cosa
// il sito avrebbe chiesto e quando.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import * as playwright from 'playwright';

// Motore da provare: ENGINE=chromium | firefox | webkit (npm run test:consent:all li prova tutti)
const ENGINE = process.env.ENGINE || 'chromium';

const PORT = 4399;
const BASE = `http://localhost:${PORT}`;
const KEY = 'yt_cookie_consent';
const LOG_KEY = 'yt_cookie_consent_log';
const GA = /googletagmanager\.com|google-analytics\.com|analytics\.google\.com/;
const MAPS = /maps\.google\.com|google\.com\/maps/;

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

after(async () => {
  await browser?.close();
  server?.kill();
});

async function session(viewport) {
  const context = await browser.newContext(viewport ? { viewport } : {});
  const external = [];
  const beacons = []; // scelte inviate al registro sul server (/api/consent)
  const api = { status: 204 };
  await context.route('**/*', (route) => {
    const url = route.request().url();
    if (url === BASE + '/api/consent') {
      try { beacons.push(JSON.parse(route.request().postData() || 'null')); } catch { beacons.push('non-json'); }
      return route.fulfill({ status: api.status, body: '' });
    }
    if (url.startsWith(BASE) || url.startsWith('data:')) return route.continue();
    external.push(url);
    const isScript = route.request().resourceType() === 'script';
    return route.fulfill({ status: 200, contentType: isScript ? 'application/javascript' : 'text/html', body: '' });
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  return { context, page, external, errors, beacons, api };
}

const banner = (page) => page.locator('#cookie-banner');
const record = (page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) || 'null'), KEY);
const dataLayer = (page) => page.evaluate(() => Array.from(window.dataLayer || [], (a) => Array.from(a)));
const settle = (page) => page.waitForTimeout(700);
const clickMain = (page, name) => banner(page).locator('[data-cb-view="main"]').getByRole('button', { name }).click();

async function open(page, path = '/') {
  await page.goto(BASE + path);
  await settle(page);
}

test('prima della scelta: banner visibile, nessuna richiesta esterna, nessun cookie, anche scorrendo e navigando', async () => {
  const { context, page, external } = await session();
  await open(page);
  assert.equal(await banner(page).isVisible(), true);
  await page.mouse.wheel(0, 1500);
  await page.locator('header a[href="/chi-siamo"]').first().click();
  await settle(page);
  assert.equal(await banner(page).isVisible(), true, 'la navigazione non deve valere come consenso');
  assert.deepEqual(external, []);
  assert.deepEqual(await context.cookies(), []);
  assert.equal(await record(page), null);
  await context.close();
});

test('Esc senza una scelta non chiude il banner e non è un consenso', async () => {
  const { context, page, external } = await session();
  await open(page);
  await page.keyboard.press('Escape');
  assert.equal(await banner(page).isVisible(), true);
  assert.deepEqual(external, []);
  await context.close();
});

test('Accetta tutti è il pulsante principale; Personalizza è secondario; la X per non accettare è visibile al primo livello', async () => {
  const { context, page } = await session();
  await open(page);
  const main = banner(page).locator('[data-cb-view="main"]');
  const style = (name) => main.getByRole('button', { name }).evaluate((el) => ({ bg: getComputedStyle(el).backgroundColor, w: el.getBoundingClientRect().width }));
  const accept = await style('Accetta tutti');
  const custom = await style('Personalizza');
  assert.equal(accept.bg, 'rgb(156, 154, 102)', 'Accetta tutti pieno, colore del sito');
  assert.equal(custom.bg, 'rgb(255, 255, 255)', 'Personalizza in versione secondaria');
  assert.equal(await main.getByRole('button', { name: 'Rifiuta tutti' }).count(), 0, 'nessun pulsante Rifiuta tutti');
  assert.equal(await main.getByRole('button', { name: 'Chiudi e continua senza accettare' }).isVisible(), true, 'via d\'uscita senza consenso sempre disponibile');
  await context.close();
});

test('X di chiusura (continua senza accettare): nessuna richiesta esterna, scelta ricordata, mappa bloccata', async () => {
  const { context, page, external } = await session();
  await open(page);
  await clickMain(page, 'Chiudi e continua senza accettare');
  const rec = await record(page);
  assert.equal(rec.action, 'reject_x');
  assert.deepEqual(rec.services, { ga4: false, 'google-maps': false });
  assert.equal(await banner(page).isVisible(), false);

  await open(page, '/contatti');
  assert.equal(await banner(page).isVisible(), false, 'la scelta resta valida al ricaricamento');
  assert.equal(await page.locator('[data-consent-placeholder]').isVisible(), true);
  assert.equal(await page.locator('[data-consent-embed] iframe').getAttribute('src'), null);
  assert.deepEqual(external, []);
  assert.deepEqual(await context.cookies(), []);
  await context.close();
});

test('Accetta tutti: Google Analytics parte, con Consent Mode v2 (default negato, poi analytics concesso, ads sempre negato)', async () => {
  const { context, page, external } = await session();
  await open(page);
  assert.equal(external.filter((u) => GA.test(u)).length, 0);
  await clickMain(page, 'Accetta tutti');
  await settle(page);

  assert.ok(external.some((u) => GA.test(u) && u.includes('G-0GKQSD86CG')), 'gtag.js dopo il consenso');
  const rec = await record(page);
  assert.equal(rec.action, 'accept_all');
  assert.equal(rec.policy, '2026-10-15');
  assert.ok(rec.id && rec.ts && rec.exp > Date.now());
  assert.ok(rec.exp - Date.now() <= 181 * 86400000, 'scadenza entro circa 6 mesi');

  const dl = await dataLayer(page);
  assert.deepEqual(dl[0], ['consent', 'default', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied' }]);
  const update = dl.find((e) => e[0] === 'consent' && e[1] === 'update');
  assert.deepEqual(update[2], { analytics_storage: 'granted' });
  assert.ok(!JSON.stringify(dl).includes('"ad_storage":"granted"'));

  external.length = 0;
  await page.reload();
  await settle(page);
  assert.equal(await banner(page).isVisible(), false);
  assert.ok(external.some((u) => GA.test(u)), 'dopo il ricaricamento il consenso salvato riattiva GA');
  await context.close();
});

test('Accetta tutti sblocca anche la mappa in Contatti', async () => {
  const { context, page, external } = await session();
  await open(page, '/contatti');
  assert.equal(external.filter((u) => MAPS.test(u)).length, 0);
  assert.equal(await page.locator('[data-consent-embed] iframe').getAttribute('src'), null);
  await clickMain(page, 'Accetta tutti');
  assert.ok(await page.locator('[data-consent-embed] iframe').getAttribute('src'), 'iframe sbloccato');
  // l'iframe è lazy: i motori lo scaricano quando la mappa si avvicina allo schermo
  await page.locator('[data-consent-embed]').scrollIntoViewIfNeeded();
  await settle(page);
  assert.ok(external.some((u) => MAPS.test(u)));
  assert.equal(await page.locator('[data-consent-placeholder]').isVisible(), false);
  await context.close();
});

test('Personalizza: solo statistiche attive, la mappa resta bloccata; nessun interruttore è preselezionato', async () => {
  const { context, page, external } = await session();
  await open(page);
  await clickMain(page, 'Personalizza');
  const prefs = banner(page).locator('[data-cb-view="prefs"]');
  for (const sw of await prefs.locator('input[data-cat]').all()) {
    assert.equal(await sw.isChecked(), false, 'nessuna casella preselezionata');
  }
  await prefs.locator('input[data-cat="statistics"]').click();
  await prefs.getByRole('button', { name: 'Salva scelte' }).click();
  await settle(page);
  assert.ok(external.some((u) => GA.test(u)));
  const rec = await record(page);
  assert.equal(rec.action, 'custom');
  assert.deepEqual(rec.services, { ga4: true, 'google-maps': false });

  external.length = 0;
  await open(page, '/contatti');
  assert.equal(external.filter((u) => MAPS.test(u)).length, 0);
  assert.equal(await page.locator('[data-consent-placeholder]').isVisible(), true);
  await context.close();
});

test('consenso al singolo servizio dal segnaposto della mappa: GA resta spento', async () => {
  const { context, page, external } = await session();
  await open(page, '/contatti');
  await page.getByRole('button', { name: 'Mostra la mappa' }).click();
  await settle(page);
  assert.ok(external.some((u) => MAPS.test(u)));
  assert.equal(external.filter((u) => GA.test(u)).length, 0);
  const rec = await record(page);
  assert.equal(rec.action, 'grant_service');
  assert.deepEqual(rec.services, { ga4: false, 'google-maps': true });
  await context.close();
});

test('revoca dal link «Gestisci cookie»: cookie _ga cancellati, gtag rimosso, scelta registrata, nessuna richiesta dopo il reload', async () => {
  const { context, page, external } = await session();
  await open(page);
  await clickMain(page, 'Accetta tutti');
  await settle(page);
  await context.addCookies([{ name: '_ga', value: 'GA1.1.123', url: BASE }, { name: '_ga_0GKQSD86CG', value: 'x', url: BASE }]);

  await page.locator('footer [data-cookie-open]').click();
  const prefs = banner(page).locator('[data-cb-view="prefs"]');
  assert.equal(await prefs.isVisible(), true);
  assert.equal(await prefs.locator('input[data-cat="statistics"]').isChecked(), true, 'mostra lo stato attuale');
  await prefs.locator('input[data-cat="statistics"]').click();
  await prefs.getByRole('button', { name: 'Salva scelte' }).click();
  await settle(page);

  assert.deepEqual((await context.cookies()).filter((c) => c.name.startsWith('_ga')), []);
  assert.equal(await page.evaluate(() => typeof window.gtag), 'undefined');
  const rec = await record(page);
  assert.equal(rec.services.ga4, false);
  const log = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), LOG_KEY);
  assert.ok(log.length >= 2);
  assert.deepEqual(log.map((e) => e.action).slice(-2), ['accept_all', 'custom']);
  assert.ok(log.every((e) => e.policy && e.ts && e.ua && e.id));

  external.length = 0;
  await page.reload();
  await settle(page);
  assert.equal(external.filter((u) => GA.test(u)).length, 0);
  await context.close();
});

test('versione informativa diversa, scadenza, dati corrotti o manomessi: il banner richiede di nuovo e non attiva nulla', async () => {
  const valid = { v: 1, policy: '2026-10-15', id: 'x', ts: new Date().toISOString(), exp: Date.now() + 86400000, action: 'accept_all', services: { ga4: true, 'google-maps': true } };
  const cases = {
    'versione vecchia': { ...valid, policy: '2020-01-01' },
    'scaduto': { ...valid, exp: Date.now() - 1000 },
    'scadenza oltre i 6 mesi': { ...valid, exp: Date.now() + 10 * 365 * 86400000 },
    'servizio mancante (nuovo strumento)': { ...valid, services: { ga4: true } },
    'tipo non valido': { ...valid, services: { ga4: 'yes', 'google-maps': 1 } },
    'testo corrotto': '{non json',
  };
  for (const [name, value] of Object.entries(cases)) {
    const { context, page, external, errors } = await session();
    await open(page);
    await page.evaluate(([k, v]) => localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)), [KEY, value]);
    external.length = 0;
    await page.reload();
    await settle(page);
    assert.equal(await banner(page).isVisible(), true, `${name}: banner di nuovo visibile`);
    assert.deepEqual(external, [], `${name}: nessuna richiesta esterna`);
    assert.deepEqual(errors, [], `${name}: nessun errore JS`);
    await context.close();
  }
});

test('il clic su WhatsApp non crea identificativi senza consenso; con consenso li crea', async () => {
  const { context, page } = await session();
  await open(page);
  const wa = page.locator('a[href*="wa.me"]').first();
  await wa.evaluate((a) => a.addEventListener('click', (e) => e.preventDefault()));
  await wa.dispatchEvent('click');
  assert.equal(await page.evaluate(() => sessionStorage.getItem('yt_rif')), null);

  await clickMain(page, 'Accetta tutti');
  await settle(page);
  await wa.dispatchEvent('click');
  assert.ok(await page.evaluate(() => sessionStorage.getItem('yt_rif')));
  assert.ok((await dataLayer(page)).some((e) => e[0] === 'event' && e[1] === 'whatsapp_click'));

  await page.locator('footer [data-cookie-open]').click();
  await banner(page).locator('[data-cb-view="prefs"] input[data-cat="statistics"]').click();
  await banner(page).getByRole('button', { name: 'Salva scelte' }).click();
  assert.equal(await page.evaluate(() => sessionStorage.getItem('yt_rif')), null, 'revoca = identificativo cancellato');
  await context.close();
});

test('mobile 375px: il banner sta nello schermo e la pagina non scorre in orizzontale', async () => {
  const { context, page } = await session({ width: 375, height: 812 });
  await open(page);
  const box = await banner(page).boundingBox();
  assert.ok(box.x >= 0 && box.x + box.width <= 375 && box.y >= 0 && box.y + box.height <= 812);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
  await clickMain(page, 'Personalizza');
  const box2 = await banner(page).boundingBox();
  assert.ok(box2.y >= 0 && box2.y + box2.height <= 812, 'anche il pannello preferenze sta nello schermo');
  await context.close();
});

test('informativa: /cookie elenca tutti gli strumenti del registro', async () => {
  const { context, page } = await session();
  await open(page, '/cookie');
  const text = await page.locator('main').innerText();
  for (const name of ['Google Analytics 4', 'Google Maps', 'yt_cookie_consent', 'Vercel Speed Insights']) {
    assert.ok(text.includes(name), `manca ${name}`);
  }
  await context.close();
});

test('Indietro e clic fuori dal banner tornano indietro senza mai dare consenso', async () => {
  const { context, page, external } = await session();
  await open(page);
  const main = banner(page).locator('[data-cb-view="main"]');
  const prefs = banner(page).locator('[data-cb-view="prefs"]');

  // clic fuori dal banner al primo livello: non succede niente (né consenso né chiusura)
  await page.mouse.click(400, 150);
  assert.equal(await main.isVisible(), true);
  assert.equal(await record(page), null);

  // Indietro, stile ArrowLink (ocra)
  await clickMain(page, 'Personalizza');
  assert.equal(await prefs.isVisible(), true);
  const back = prefs.getByRole('button', { name: 'Indietro' });
  assert.equal(await back.evaluate((el) => getComputedStyle(el).color), 'rgb(156, 154, 102)');
  await back.click();
  assert.equal(await main.isVisible(), true);

  // clic fuori dal banner dalle preferenze: torna al primo livello
  await clickMain(page, 'Personalizza');
  await page.mouse.click(400, 150);
  assert.equal(await main.isVisible(), true);
  assert.equal(await prefs.isVisible(), false);
  assert.equal(await banner(page).isVisible(), true);
  assert.equal(await record(page), null, 'tornare indietro non è un consenso');
  assert.deepEqual(external, []);

  // con una scelta già fatta, aperto dal footer: clic fuori = chiude senza cambiare la scelta
  await clickMain(page, 'Accetta tutti');
  await settle(page);
  const before = await record(page);
  await page.locator('footer [data-cookie-open]').click();
  assert.equal(await prefs.isVisible(), true);
  await page.mouse.click(400, 150);
  assert.equal(await banner(page).isVisible(), false);
  assert.deepEqual(await record(page), before);
  await context.close();
});

test('ogni scelta viene inviata al registro sul server con i dati attesi; prima della scelta non parte nulla', async () => {
  const { context, page, beacons } = await session();
  await open(page);
  assert.deepEqual(beacons, []);
  await clickMain(page, 'Accetta tutti');
  await settle(page);
  assert.equal(beacons.length, 1);
  const b = beacons[0];
  assert.deepEqual(Object.keys(b).sort(), ['action', 'id', 'lang', 'page', 'policy', 'services', 'ts', 'ua']);
  assert.equal(b.action, 'accept_all');
  assert.equal(b.policy, '2026-10-15');
  assert.deepEqual(b.services, { ga4: true, 'google-maps': true });
  assert.equal(b.page, '/');
  assert.equal(b.id, (await record(page)).id, 'stesso id della scelta salvata nel browser');
  assert.equal(await page.evaluate(() => localStorage.getItem('yt_cookie_consent_pending')), '[]', 'coda svuotata a invio riuscito');
  await context.close();
});

test('se il server non risponde la scelta resta in coda e viene reinviata alla pagina successiva', async () => {
  const { context, page, beacons, api } = await session();
  api.status = 503;
  await open(page);
  await clickMain(page, 'Chiudi e continua senza accettare');
  await settle(page);
  assert.equal(beacons.length, 1);
  assert.equal(JSON.parse(await page.evaluate(() => localStorage.getItem('yt_cookie_consent_pending'))).length, 1);

  api.status = 204;
  await page.reload();
  await settle(page);
  assert.equal(beacons.length, 2, 'reinvio');
  assert.equal(beacons[1].id, beacons[0].id);
  assert.equal(beacons[1].action, 'reject_x');
  assert.equal(await page.evaluate(() => localStorage.getItem('yt_cookie_consent_pending')), '[]');

  await page.reload();
  await settle(page);
  assert.equal(beacons.length, 2, 'nessun reinvio ripetuto');
  await context.close();
});

test('Privacy e Cookie Policy sono ospitate sul sito (nessun rimando a iubenda), complete e coerenti con gli strumenti in uso', async () => {
  const { context, page, external } = await session();
  for (const path of ['/privacy', '/cookie']) {
    await open(page, path);
    const html = await page.content();
    assert.ok(!/iubenda/i.test(html), `${path}: nessun riferimento a iubenda`);
    const text = await page.locator('main').innerText();
    for (const needle of ['Titolare del trattamento', 'Antico Glenda Francesca Romana', '04505320244', 'Google Analytics 4', 'Google Maps', 'Garante per la protezione dei dati personali', 'info@yogatribu.it']) {
      assert.ok(text.includes(needle), `${path}: manca «${needle}»`);
    }
  }
  assert.deepEqual(external, []);
  await context.close();
});

test('le pagine legali sono visibili subito, anche su telefono e senza scorrere (niente dissolvenza legata allo scroll)', async () => {
  const { context, page } = await session({ width: 375, height: 667 });
  for (const path of ['/privacy', '/cookie', '/termini']) {
    await page.goto(BASE + path);
    await page.waitForTimeout(150);
    const info = await page.evaluate(() => {
      const s = document.querySelector('main section');
      return { reveal: s.hasAttribute('data-reveal'), opacity: getComputedStyle(s).opacity, h1: getComputedStyle(document.querySelector('main h1')).opacity, height: s.getBoundingClientRect().height, vh: innerHeight };
    });
    assert.equal(info.reveal, false, `${path}: senza data-reveal`);
    assert.equal(info.opacity, '1', `${path}: sezione opaca subito`);
    if (path !== '/termini') assert.ok(info.height / info.vh > 8, `${path}: su telefono la sezione è lunghissima (${Math.round(info.height)}px), per questo la dissolvenza non scattava`);
  }
  await context.close();
});
