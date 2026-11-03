import { test } from 'node:test';
import assert from 'node:assert/strict';
import { eVistaStudio, puo, vedePercorsi } from '../../src/domain/ruoli.ts';

test('un insegnante usa Allievi, Interessati, Ricorrenze, Programma e Da contattare', () => {
  for (const f of ['allievi', 'interessati', 'ricorrenze', 'programma', 'contattare'] as const) {
    assert.equal(puo('insegnante', f), true, f);
  }
});

test('Contenuti, Percorsi, Statistiche e Impostazioni non sono degli insegnanti', () => {
  for (const f of ['contenuti', 'percorsi', 'statistiche', 'impostazioni'] as const) {
    assert.equal(puo('insegnante', f), false, f);
    assert.equal(puo('amministrazione', f), true, f);
  }
});

test('l\'allievo non entra in nessuna funzione dello studio', () => {
  for (const f of ['interessati', 'allievi', 'programma', 'modificaProgramma', 'contattare', 'contenuti', 'percorsi', 'ricorrenze', 'crediti', 'impostazioni', 'statistiche'] as const) {
    assert.equal(puo('allievo', f), false, f);
  }
});

test('impostazioni e statistiche solo ai responsabili', () => {
  assert.equal(puo('insegnante', 'impostazioni'), false);
  assert.equal(puo('amministrazione', 'impostazioni'), true);
  assert.equal(puo('insegnante', 'statistiche'), false);
  assert.equal(puo('amministrazione', 'statistiche'), true);
  assert.equal(puo('gestione', 'statistiche'), true);
});

test('senza ruolo non si può niente', () => {
  assert.equal(puo(null, 'programma'), false);
  assert.equal(puo(undefined, 'interessati'), false);
  assert.equal(eVistaStudio(null), false);
});

test('vista studio per chi non è allievo', () => {
  assert.equal(eVistaStudio('allievo'), false);
  assert.equal(eVistaStudio('insegnante'), true);
});

test('solo i responsabili modificano il Programma', () => {
  assert.equal(puo('insegnante', 'modificaProgramma'), false);
  assert.equal(puo('amministrazione', 'modificaProgramma'), true);
  assert.equal(puo('gestione', 'modificaProgramma'), true);
});

test('crediti e incassi solo ai responsabili', () => {
  assert.equal(puo('insegnante', 'crediti'), false);
  assert.equal(puo('amministrazione', 'crediti'), true);
  assert.equal(puo('gestione', 'crediti'), true);
  assert.equal(puo('insegnante', 'contattare'), true);
});

test('i Percorsi li vede chi gestisce lo studio e l\'insegnante segnata, non gli altri', () => {
  assert.equal(vedePercorsi('gestione', false), true);
  assert.equal(vedePercorsi('amministrazione', false), true);
  assert.equal(vedePercorsi('insegnante', true), true);
  assert.equal(vedePercorsi('insegnante', false), false);
  assert.equal(vedePercorsi('allievo', true), false);
  assert.equal(vedePercorsi(null, true), false);
});
