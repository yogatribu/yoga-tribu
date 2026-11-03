import { test } from 'node:test';
import assert from 'node:assert/strict';
import { giornoDellaSettimana, giorniDellaSettimana, lunedi } from '../../src/domain/date.ts';

test('giorno della settimana: 0 domenica ... 6 sabato', () => {
  assert.equal(giornoDellaSettimana('2026-11-02'), 1); // lunedì
  assert.equal(giornoDellaSettimana('2026-11-08'), 0); // domenica
  assert.equal(giornoDellaSettimana('2026-11-07'), 6);
});

test('il lunedì della settimana, anche partendo da domenica e a cavallo dell\'anno', () => {
  assert.equal(lunedi('2026-11-02'), '2026-11-02');
  assert.equal(lunedi('2026-11-08'), '2026-11-02');
  assert.equal(lunedi('2027-01-01'), '2026-12-28');
});

test('sette giorni da lunedì a domenica', () => {
  const g = giorniDellaSettimana('2026-11-02');
  assert.equal(g.length, 7);
  assert.equal(g[0], '2026-11-02');
  assert.equal(g[6], '2026-11-08');
});
