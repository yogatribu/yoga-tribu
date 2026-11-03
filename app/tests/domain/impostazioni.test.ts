import { test } from 'node:test';
import assert from 'node:assert/strict';
import { leggiOpzioni, maiuscole, puoTogliere, validaCampo, validaNuovoInsegnante } from '../../src/domain/impostazioni.ts';

test('maiuscole: una per parola', () => {
  assert.equal(maiuscole('  marta rossi '), 'Marta Rossi');
});

test('nuovo insegnante: nome, doppioni, email', () => {
  const es = [{ nome: 'Glenda' }];
  assert.deepEqual(validaNuovoInsegnante('marta', 'marta@esempio.it', es), { ok: true });
  assert.deepEqual(validaNuovoInsegnante('marta', '', es), { ok: true });
  assert.equal(validaNuovoInsegnante(' ', '', es).ok, false);
  assert.equal(validaNuovoInsegnante('glenda', '', es).ok, false);
  assert.equal(validaNuovoInsegnante('Marta', 'marta@', es).ok, false);
});

test('togliere un insegnante: solo senza lezioni fisse', () => {
  assert.deepEqual(puoTogliere(0), { ok: true });
  const r = puoTogliere(1);
  assert.equal(r.ok, false);
  assert.match(r.ok ? '' : r.motivo, /1 lezione in programma/);
  assert.match(puoTogliere(3).ok ? '' : (puoTogliere(3) as { motivo: string }).motivo, /3 lezioni/);
});

test('opzioni: senza vuoti né doppioni', () => {
  assert.deepEqual(leggiOpzioni('Schiena, Stress,  Forza,, schiena'), ['Schiena', 'Stress', 'Forza']);
  assert.deepEqual(leggiOpzioni(''), []);
});

test('campo su misura: nome, doppioni, almeno due risposte per la scelta', () => {
  const es = [{ nome: 'Obiettivo' }];
  assert.deepEqual(validaCampo('Esperienza', 'testo', '', es), { ok: true });
  assert.deepEqual(validaCampo('Esperienza', 'scelta', 'Poca, Molta', es), { ok: true });
  assert.equal(validaCampo('', 'testo', '', es).ok, false);
  assert.equal(validaCampo('obiettivo', 'testo', '', es).ok, false);
  assert.equal(validaCampo('Esperienza', 'scelta', 'Poca', es).ok, false);
});

test('maiuscole mentre si scrive: lo spazio finale resta, apostrofi e trattini contano', async () => {
  const { maiuscoleScrivendo } = await import('../../src/domain/impostazioni.ts');
  assert.equal(maiuscoleScrivendo('marta '), 'Marta ');
  assert.equal(maiuscoleScrivendo('maria grazia'), 'Maria Grazia');
  assert.equal(maiuscoleScrivendo("d'angelo"), "D'Angelo");
  assert.equal(maiuscoleScrivendo('de-luca'), 'De-Luca');
  assert.equal(maiuscoleScrivendo(''), '');
});
