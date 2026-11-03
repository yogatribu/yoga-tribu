import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chiaveMese, mesiDelCiclo, nomeSeminario, stagioneDelMese, validaTema, TEMA_VUOTO } from '../../src/domain/ciclo.ts';

test('stagione del mese: gennaio inverno, ottobre autunno', () => {
  assert.equal(stagioneDelMese(0), 'inverno');
  assert.equal(stagioneDelMese(9), 'autunno');
  assert.equal(stagioneDelMese(6), 'estate');
});

test('il ciclo parte dall\'inizio della stagione e dura dodici mesi in quattro gruppi', () => {
  const c = mesiDelCiclo('2026-11-02');
  assert.equal(c.length, 4);
  assert.deepEqual(c[0].map((m) => m.chiave), ['2026-10', '2026-11', '2026-12']);
  assert.deepEqual(c[1].map((m) => m.chiave), ['2027-01', '2027-02', '2027-03']);
  assert.equal(c[3][2].chiave, '2027-09');
  assert.deepEqual(c.map((g) => g[0].stagione), ['autunno', 'inverno', 'primavera', 'estate']);
});

test('nome del seminario e chiave del mese', () => {
  assert.equal(nomeSeminario('autunno'), "Seminario d'Autunno");
  assert.equal(nomeSeminario('estate'), "Seminario d'Estate");
  assert.equal(nomeSeminario('primavera'), 'Seminario di Primavera');
  assert.equal(chiaveMese('2026-11-02'), '2026-11');
});

test('il tema è una parola sola', () => {
  assert.equal(validaTema({ ...TEMA_VUOTO, tema: 'Osservare' }).ok, true);
  assert.equal(validaTema({ ...TEMA_VUOTO, tema: 'Tante parole' }).ok, false);
  assert.equal(validaTema(TEMA_VUOTO).ok, true);
});
