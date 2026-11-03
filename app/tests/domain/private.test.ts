import { test } from 'node:test';
import assert from 'node:assert/strict';
import { alternaOra, copiaSuFeriali, faPrivate, orePrese, oreDelGiorno, prezzoDaConcordare, puoConfermare, puoDisdire } from '../../src/domain/private.ts';

const disp = [
  { insegnanteId: 'a', giorno: 1, data: null, ore: [16, 15] },
  { insegnanteId: 'a', giorno: null, data: '2026-11-09', ore: [] },
  { insegnanteId: 'b', giorno: 2, data: null, ore: [9] },
];

test('orari del giorno: settimanali, con l\'eccezione di una data che vince (anche vuota)', () => {
  assert.deepEqual(oreDelGiorno(disp, 'a', '2026-11-02'), [15, 16]);   // lunedì
  assert.deepEqual(oreDelGiorno(disp, 'a', '2026-11-09'), []);         // lunedì ma con eccezione "non disponibile"
  assert.deepEqual(oreDelGiorno(disp, 'a', '2026-11-03'), []);         // martedì: niente
  assert.deepEqual(oreDelGiorno(disp, 'b', '2026-11-03'), [9]);
});

test('compare tra chi fa le private solo con un orario nei prossimi 14 giorni', () => {
  assert.equal(faPrivate(disp, 'a', '2026-11-02'), true);
  assert.equal(faPrivate(disp, 'c', '2026-11-02'), false);
  assert.equal(faPrivate([{ insegnanteId: 'a', giorno: 1, data: null, ore: [] }], 'a', '2026-11-02'), false);
});

test('accendere e spegnere un\'ora, copiare su lunedì-venerdì', () => {
  assert.deepEqual(alternaOra([15], 16), [15, 16]);
  assert.deepEqual(alternaOra([15, 16], 15), [16]);
  assert.deepEqual(Object.keys(copiaSuFeriali([15])), ['1', '2', '3', '4', '5']);
});

test('ore già prese: solo in attesa o confermate', () => {
  const r = [
    { insegnanteId: 'a', data: '2026-11-02', ora: '15:00', stato: 'confermata' as const },
    { insegnanteId: 'a', data: '2026-11-02', ora: '16:00', stato: 'rifiutata' as const },
    { insegnanteId: 'a', data: '2026-11-03', ora: '15:00', stato: 'attesa' as const },
  ];
  assert.deepEqual(orePrese(r, 'a', '2026-11-02'), [15]);
});

test('prezzo e stati', () => {
  assert.equal(prezzoDaConcordare(4500), '45€');
  assert.equal(prezzoDaConcordare(null), 'da concordare');
  assert.equal(puoConfermare({ stato: 'attesa' }), true);
  assert.equal(puoConfermare({ stato: 'confermata' }), false);
  assert.equal(puoDisdire({ stato: 'confermata' }), true);
  assert.equal(puoDisdire({ stato: 'attesa' }), false);
});
