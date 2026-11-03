import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { caroselloDaEvento, caroselloHtml, costruisci, daEvento, lum, lumN, meta, nuovoCarosello, slideCarosello, slug, TIPI, ErroreVolantino, type Dati, type Templates } from '../../src/domain/volantini.ts';
import type { Evento } from '../../src/domain/eventi.ts';

// I template veri, come li prepara scripts/sync-contenuti.mjs (stessa pulizia).
const T: Templates = {};
const sorgente = readFileSync(new URL('../../src/config/volantini-template.generated.ts', import.meta.url), 'utf8');
Object.assign(T, JSON.parse(sorgente.slice(sorgente.indexOf('{'), sorgente.lastIndexOf('}') + 1)));

const ev = (o: Partial<Evento> = {}): Evento => ({
  id: 'e1', tipo: 'workshop', titolo: 'Torsioni', descrizione: 'Una mattinata **dedicata** alle torsioni.', da: '2026-11-18', a: null, dateIncontri: null, ora: '9:00', orario: null, luogo: 'Studio Yoga Tribù · San Giuseppe di Cassola',
  prezzoCent: 3000, suRichiesta: false, posti: 15, iscrittiFissi: 0, listaFissa: 0, studioOrigine: 'tribu', soloStudio: null, insegnanti: ['Glenda', 'Mattia'], passo: null, chiuso: false, ...o,
});
const base: Dati = { LUMINOSITA: 50, FOTO_X: 50, FOTO_Y: 40, FOTO: '/images/studio.webp' };

test('luminosità: il centro è il valore di prima, gli estremi sono i limiti', () => {
  assert.deepEqual(lum(50, { min: [0, .94], media: [.24, .96], max: [.55, .98] }), ['0.240', '0.960']);
  assert.deepEqual(lum(0, { min: [0, .94], media: [.24, .96], max: [.55, .98] }), ['0.000', '0.940']);
  assert.equal(lumN('scura'), 75);
  assert.equal(lumN(250), 100);
});

test('ogni tipo di post si compila da un evento senza lasciare segni vuoti, in post e in storia', () => {
  for (const [tipo] of TIPI) {
    if (tipo === 'carosello' || tipo === 'avviso-a4') continue;
    const { d } = daEvento(ev(), base);
    for (const fmt of ['post', 'storia'] as const) {
      const r = costruisci(T, tipo, fmt, { ...d, TITOLO: 'Ritrovare spazio\ncon le torsioni.' }, true);
      assert.ok(!/\{\{[A-Z0-9_]+\}\}/.test(r.html), `${tipo} ${fmt} ha segni vuoti`);
      assert.match(r.html, /Ritrovare spazio<br>con le torsioni\./);
    }
  }
});

test('il grassetto con ** diventa <b> e il testo è protetto', () => {
  const r = costruisci(T, 'approfondimento', 'post', { ...base, TITOLO: 'Ciao', TESTO: 'Una **parola** e <script>' }, true);
  assert.match(r.html, /Una <b>parola<\/b> e &lt;script&gt;/);
});

test('il trattino lungo diventa corto e lo dice', () => {
  const r = costruisci(T, 'approfondimento', 'post', { ...base, TITOLO: 'A — B' }, true);
  assert.match(r.html, /A – B/);
  assert.deepEqual(r.avvisi, ['Ho sostituito il trattino lungo con un trattino corto.']);
});

test('esportando servono titolo e foto; in anteprima no', () => {
  assert.throws(() => costruisci(T, 'approfondimento', 'post', { ...base, TITOLO: '' }, false), ErroreVolantino);
  assert.throws(() => costruisci(T, 'approfondimento', 'post', { TITOLO: 'x' }, false), /foto/);
  assert.doesNotThrow(() => costruisci(T, 'approfondimento', 'post', { TITOLO: '' }, true));
});

test('le parti fisse si possono cambiare', () => {
  const m = meta(T, 'approfondimento');
  assert.ok(m.cta.length > 0);
  const r = costruisci(T, 'approfondimento', 'post', { ...base, TITOLO: 'x', CTA: 'Scrivici ora', TELEFONO: '347 109 8694' }, true);
  assert.match(r.html, /Scrivici ora/);
  assert.match(r.html, /347 109 8694/);
});

test("l'avviso A4 si compila e ha i suoi campi", () => {
  const m = meta(T, 'avviso-a4');
  assert.deepEqual(m.formati, ['a4']);
  const r = costruisci(T, 'avviso-a4', 'a4', { TITOLO: 'Orari da settembre', PARAGRAFO: 'Testo' }, true);
  assert.ok(!/\{\{[A-Z0-9_]+\}\}/.test(r.html));
});

test('da evento: tipo, quota, periodo e luogo del Pozzo', () => {
  const a = daEvento(ev({ tipo: 'ritiro', da: '2026-06-05', a: '2026-06-09', titolo: 'Ritiro in Marocco' }), base);
  assert.equal(a.tipo, 'ritiro');
  assert.equal(a.d.DATE, '5-9 giugno');
  assert.equal(a.d.FOTO, '/images/marocco/hero_marocco.webp');
  const b = daEvento(ev({ luogo: "Studio Pozzo dell'Eternità · Colico", prezzoCent: null, suRichiesta: true }), base);
  assert.match(String(b.d.LUOGO), /Colico/);
  assert.equal(b.d.QUOTA, '');
  assert.equal(daEvento(ev(), base).d.QUOTA, '30€');
  assert.equal(daEvento(ev({ tipo: 'percorso' }), base).tipo, 'salute-femminile');
});

test('slug del nome file', () => {
  assert.equal(slug('Ritrovare spazio\ncon le torsioni!'), 'ritrovare-spazio-con-le-torsioni');
  assert.equal(slug(''), 'volantino');
});

test('carosello: copertina, foto interne e chiusura facoltativa', () => {
  const k = nuovoCarosello('tribu');
  assert.equal(slideCarosello(k).length, 3);
  k.cta.on = true;
  const sl = slideCarosello(k);
  assert.equal(sl.length, 4);
  assert.equal(sl[3].tipo, 'cta');
  for (let i = 0; i < sl.length; i++) assert.ok(!/\{\{[A-Z0-9_]+\}\}/.test(caroselloHtml(T, k, i)), `slide ${i}`);
  assert.match(caroselloHtml(T, k, 3), /Scrivici su WhatsApp/);
  assert.throws(() => caroselloHtml(T, k, 9), /almeno una foto/);
  assert.equal(caroselloDaEvento(k, ev({ tipo: 'seminario', luogo: 'Pozzo · Colico' })).luogo, 'pozzo');
});
