import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  controllaPassaggio,
  daRichiamare,
  richiamoDopoAssenza,
  richiamoDopoProva,
  richiamoSenzaRisposta,
  rimanda,
  telefonoNormalizzato,
  telefonoValido,
} from '../../src/domain/leads.ts';

test('richiamo due giorni dopo la prova, anche a cavallo del mese e dell\'anno', () => {
  assert.equal(richiamoDopoProva('2026-11-02'), '2026-11-04');
  assert.equal(richiamoDopoProva('2026-11-29'), '2026-12-01');
  assert.equal(richiamoDopoProva('2026-12-30'), '2027-01-01');
});

test('richiamo dopo un messaggio senza risposta e dopo un\'assenza', () => {
  assert.equal(richiamoSenzaRisposta('2026-11-02'), '2026-11-04');
  assert.equal(richiamoDopoAssenza('2026-11-02'), '2026-11-03');
});

test('rimanda a domani, 3 giorni, una settimana', () => {
  assert.equal(rimanda('2026-11-02', 'domani'), '2026-11-03');
  assert.equal(rimanda('2026-11-02', '3_giorni'), '2026-11-05');
  assert.equal(rimanda('2026-11-02', 'settimana'), '2026-11-09');
});

test('il 29 febbraio esiste solo negli anni bisestili', () => {
  assert.equal(richiamoDopoProva('2028-02-27'), '2028-02-29');
  assert.equal(richiamoDopoProva('2027-02-27'), '2027-03-01');
});

test('cambi di fase: previsti e non previsti', () => {
  assert.deepEqual(controllaPassaggio('interessato', 'prova_fissata'), { ok: true });
  assert.deepEqual(controllaPassaggio('prova_fissata', 'prova_fatta'), { ok: true });
  assert.deepEqual(controllaPassaggio('prova_fatta', 'prova_fissata'), { ok: true });
  assert.equal(controllaPassaggio('interessato', 'prova_fatta').ok, false);
  assert.equal(controllaPassaggio('iscritto', 'interessato').ok, false);
});

test('chiudere un contatto chiede il motivo', () => {
  assert.equal(controllaPassaggio('prova_fatta', 'non_prosegue').ok, false);
  assert.deepEqual(controllaPassaggio('prova_fatta', 'non_prosegue', 'prezzo'), { ok: true });
  assert.deepEqual(controllaPassaggio('non_prosegue', 'interessato'), { ok: true });
});

test('da richiamare: oggi o prima, mai se chiuso o senza data', () => {
  assert.equal(daRichiamare({ fase: 'prova_fatta', richiamoIl: '2026-11-02' }, '2026-11-02'), true);
  assert.equal(daRichiamare({ fase: 'prova_fatta', richiamoIl: '2026-10-30' }, '2026-11-02'), true);
  assert.equal(daRichiamare({ fase: 'prova_fatta', richiamoIl: '2026-11-03' }, '2026-11-02'), false);
  assert.equal(daRichiamare({ fase: 'interessato', richiamoIl: null }, '2026-11-02'), false);
  assert.equal(daRichiamare({ fase: 'non_prosegue', richiamoIl: '2026-10-01' }, '2026-11-02'), false);
  assert.equal(daRichiamare({ fase: 'iscritto', richiamoIl: '2026-10-01' }, '2026-11-02'), false);
});

test('telefoni: stessa persona scritta in modi diversi', () => {
  const forme = ['328 767 5966', '+39 328 767 5966', '0039 3287675966', '328-7675966', '(328) 767.5966'];
  for (const f of forme) assert.equal(telefonoNormalizzato(f), '3287675966', f);
});

test('telefono incompleto non è valido', () => {
  assert.equal(telefonoValido('328 767'), false);
  assert.equal(telefonoValido(''), false);
  assert.equal(telefonoValido('328 767 5966'), true);
});

import { numeroWhatsApp, oggi, richiamoAlCambioFase } from '../../src/domain/leads.ts';

test('oggi: data locale in formato AAAA-MM-GG con zeri', () => {
  assert.equal(oggi(new Date(2026, 10, 2, 23, 30)), '2026-11-02');
  assert.equal(oggi(new Date(2027, 0, 5, 0, 5)), '2027-01-05');
});

test('solo "prova fatta" fissa un richiamo da sola, a due giorni', () => {
  assert.equal(richiamoAlCambioFase('prova_fatta', '2026-11-02'), '2026-11-04');
  assert.equal(richiamoAlCambioFase('prova_fissata', '2026-11-02'), null);
  assert.equal(richiamoAlCambioFase('non_prosegue', '2026-11-02'), null);
});

test('numero per WhatsApp: prefisso 39 e solo cifre, vuoto se non valido', () => {
  assert.equal(numeroWhatsApp('328 767 5966'), '393287675966');
  assert.equal(numeroWhatsApp('+39 328 767 5966'), '393287675966');
  assert.equal(numeroWhatsApp('328'), '');
});
