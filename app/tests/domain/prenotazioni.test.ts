import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ago, disdettaInTempo, minutiAllaLezione, postiLiberi, primoDellaLista, puoPrenotare, statoAllievo, ultimaLezione, lezioniFatte, type Prenotazione,
} from '../../src/domain/prenotazioni.ts';

const p = (o: Partial<Prenotazione> & { creato?: string } = {}) => ({ id: 'b', modelloId: 'm', data: '2026-11-10', personId: 'p1', stato: 'prenotata' as const, disdettaIl: null, minutiPrima: null, creato: '2026-11-01', ...o });

test('minuti alla lezione e disdetta: oltre 2 ore il credito torna', () => {
  assert.equal(minutiAllaLezione('2026-11-10', '19:15', new Date(2026, 10, 10, 17, 15)), 120);
  assert.equal(disdettaInTempo(121), true);
  assert.equal(disdettaInTempo(120), false);
  assert.equal(disdettaInTempo(30), false);
  assert.equal(minutiAllaLezione('2026-11-10', '07:00', new Date(2026, 10, 10, 8, 0)), -60);
});

test('posti liberi: contano solo le prenotate, non la lista né le disdette', () => {
  const l = [p(), p({ personId: 'p2' }), p({ personId: 'p3', stato: 'lista' }), p({ personId: 'p4', stato: 'annullata' })];
  assert.equal(postiLiberi(3, l), 1);
  assert.equal(postiLiberi(2, l), 0);
});

test('prenotare: crediti, doppioni, posti, lezione iniziata', () => {
  const ok = { creditiIllimitati: false, saldo: 3 };
  assert.deepEqual(puoPrenotare(ok, 15, [], 'p1', false), { ok: true });
  assert.equal(puoPrenotare({ creditiIllimitati: false, saldo: 0 }, 15, [], 'p1', false).ok, false);
  assert.deepEqual(puoPrenotare({ creditiIllimitati: true, saldo: 0 }, 15, [], 'p1', false), { ok: true });
  assert.equal(puoPrenotare(ok, 15, [p()], 'p1', false).ok, false);
  assert.equal(puoPrenotare(ok, 1, [p({ personId: 'p9' })], 'p1', false).ok, false);
  assert.equal(puoPrenotare(ok, 15, [], 'p1', true).ok, false);
});

test('lista d\'attesa: entra il primo che ha ancora un credito', () => {
  const l = [p({ personId: 'a', stato: 'lista', creato: '2026-11-01' }), p({ personId: 'b', stato: 'lista', creato: '2026-11-02' })];
  assert.equal(primoDellaLista(l, { a: { creditiIllimitati: false, saldo: 0 }, b: { creditiIllimitati: false, saldo: 2 } })?.personId, 'b');
  assert.equal(primoDellaLista(l, { a: { creditiIllimitati: false, saldo: 1 }, b: { creditiIllimitati: false, saldo: 2 } })?.personId, 'a');
  assert.equal(primoDellaLista(l, { a: { creditiIllimitati: false, saldo: 0 }, b: { creditiIllimitati: false, saldo: 0 } }), null);
});

test('stato dell\'allievo come nel prototipo', () => {
  const oggi = '2026-11-02';
  assert.equal(statoAllievo(1, '2026-10-30', '2026-10-30', oggi), 'In prova');
  assert.equal(statoAllievo(5, '2026-10-20', '2026-10-30', oggi), 'Nuovo ingresso');
  assert.equal(statoAllievo(20, '2025-01-01', '2026-10-25', oggi), 'Regolare');
  assert.equal(statoAllievo(20, '2025-01-01', '2026-10-10', oggi), 'A rischio');
  assert.equal(statoAllievo(20, '2025-01-01', '2026-08-01', oggi), 'In pausa');
  assert.equal(statoAllievo(20, '2025-01-01', null, oggi), 'In pausa');
});

test('ultima lezione e lezioni fatte: solo date passate o di oggi, prenotate o disdette tardi', () => {
  const l = [p({ data: '2026-10-20' }), p({ data: '2026-10-30' }), p({ data: '2026-11-10' }), p({ data: '2026-10-25', stato: 'annullata' }), p({ data: '2026-10-28', stato: 'tardiva' })];
  assert.equal(lezioniFatte(l, '2026-11-02').length, 3);
  assert.equal(ultimaLezione(l, '2026-11-02'), '2026-10-30');
  assert.equal(ultimaLezione([], '2026-11-02'), null);
});

test('ago', () => {
  assert.equal(ago(0), 'oggi');
  assert.equal(ago(1), 'ieri');
  assert.equal(ago(8), '8 giorni fa');
});
