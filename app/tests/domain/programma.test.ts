import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lezioniDelGiorno, oraValida, validaNuovaLezione, type Blocco, type Modello } from '../../src/domain/programma.ts';

const m = (id: string, giorno: number, ora: string, tipo = 'Forza', attivo = true): Modello => ({
  id, giorno, ora, stile: 'iyengar', tipo, insegnante: 'Glenda', durataMin: null, posti: 15, attivo,
});

const modelli = [m('a', 1, '19:15'), m('b', 1, '07:00', 'Flessibilità'), m('c', 2, '08:45'), m('d', 1, '08:45', 'Forza', false)];

test('lezioni del lunedì in ordine di orario, senza quelle disattivate e degli altri giorni', () => {
  const l = lezioniDelGiorno('2026-11-02', modelli, []); // lunedì
  assert.deepEqual(l.map((x) => x.modello.id), ['b', 'a']);
});

test('una lezione ferma solo nella data del blocco', () => {
  const blocchi: Blocco[] = [{ modelloId: 'a', data: '2026-11-02', motivo: 'Festivo' }];
  const lun1 = lezioniDelGiorno('2026-11-02', modelli, blocchi);
  const lun2 = lezioniDelGiorno('2026-11-09', modelli, blocchi);
  assert.equal(lun1.find((x) => x.modello.id === 'a')?.fermata?.motivo, 'Festivo');
  assert.equal(lun1.find((x) => x.modello.id === 'b')?.fermata, null);
  assert.equal(lun2.find((x) => x.modello.id === 'a')?.fermata, null);
});

test('un giorno senza lezioni dà un elenco vuoto', () => {
  assert.deepEqual(lezioniDelGiorno('2026-11-08', modelli, []), []); // domenica
});

test('ora valida: 07:05 sì, 7:5 e 24:00 no', () => {
  assert.equal(oraValida('07:05'), true);
  assert.equal(oraValida('23:59'), true);
  assert.equal(oraValida('7:5'), false);
  assert.equal(oraValida('24:00'), false);
});

test('nuova lezione: campi obbligatori e doppioni', () => {
  const base = { giorno: 3, ora: '18:00', stile: 'flow', tipo: 'Vinyasa', insegnante: 'Giulia', posti: 15 };
  assert.deepEqual(validaNuovaLezione(base, modelli), { ok: true });
  assert.equal(validaNuovaLezione({ ...base, tipo: ' ' }, modelli).ok, false);
  assert.equal(validaNuovaLezione({ ...base, insegnante: '' }, modelli).ok, false);
  assert.equal(validaNuovaLezione({ ...base, ora: '6:00' }, modelli).ok, false);
  assert.equal(validaNuovaLezione({ ...base, posti: 0 }, modelli).ok, false);
  assert.equal(validaNuovaLezione({ ...base, giorno: 1, ora: '19:15', tipo: 'forza' }, modelli).ok, false);
  // la stessa lezione, ma disattivata, si può riaggiungere
  assert.deepEqual(validaNuovaLezione({ ...base, giorno: 1, ora: '08:45', tipo: 'Forza' }, modelli), { ok: true });
});

import { insegnantiDegliOrari, lezioniDaFermare, validaBlocco } from '../../src/domain/programma.ts';

test('blocco: le lezioni del periodo, di tutti o di un solo insegnante', () => {
  const mm = [m('a', 1, '19:15'), { ...m('b', 1, '07:00'), insegnante: 'Victor' }, m('c', 2, '08:45'), m('d', 1, '10:00', 'Forza', false)];
  // da lunedì 2 a martedì 10 novembre 2026: due lunedì (2 e 9) e due martedì (3 e 10)
  assert.equal(lezioniDaFermare(mm, '2026-11-02', '2026-11-10', 'tutti').length, 6);
  assert.equal(lezioniDaFermare(mm, '2026-11-02', '2026-11-10', 'Victor').length, 2);
  assert.equal(lezioniDaFermare(mm, '2026-11-02', '2026-11-02', 'Glenda').length, 1);
  assert.deepEqual(lezioniDaFermare(mm, '2026-11-07', '2026-11-08', 'tutti'), []);
});

test('blocco: periodo valido solo se la fine non precede l\'inizio', () => {
  assert.equal(validaBlocco('2026-11-02', '2026-11-02').ok, true);
  assert.equal(validaBlocco('2026-11-03', '2026-11-02').ok, false);
  assert.equal(validaBlocco('', '2026-11-02').ok, false);
});

test('insegnanti degli orari: un nome per volta, senza doppioni', () => {
  const mm = [{ ...m('a', 1, '10:00'), insegnante: 'Glenda e Mattia' }, m('b', 2, '10:00'), { ...m('c', 3, '10:00'), insegnante: 'Victor' }];
  assert.deepEqual(insegnantiDegliOrari(mm), ['Glenda', 'Mattia', 'Victor']);
});
