import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  daAvvisare, PROMEMORIA_PREDEFINITI, richiamoAlCambioFase, richiamoAssenza, richiamoSilenzio, testoMessaggioLead, tipoMessaggioLead, ultimoMessaggio,
} from '../../src/domain/leads.ts';

const spento = { prima: false, dopo: false, silenzio: false, assente: false };

test('promemoria spenti: nessun richiamo automatico', () => {
  assert.equal(richiamoAlCambioFase('prova_fatta', '2026-11-02', spento), null);
  assert.equal(richiamoSilenzio('2026-11-02', spento), null);
  assert.equal(richiamoAssenza('2026-11-02', spento), null);
  assert.equal(richiamoSilenzio('2026-11-02', PROMEMORIA_PREDEFINITI), '2026-11-04');
  assert.equal(richiamoAssenza('2026-11-02', PROMEMORIA_PREDEFINITI), '2026-11-03');
});

test('da avvisare: prova oggi o domani, promemoria non ancora mandato', () => {
  const c = { fase: 'prova_fissata' as const, provaIl: '2026-11-03', avvisatoIl: null };
  assert.equal(daAvvisare(c, '2026-11-02'), true);
  assert.equal(daAvvisare({ ...c, provaIl: '2026-11-05' }, '2026-11-02'), false);
  assert.equal(daAvvisare({ ...c, avvisatoIl: '2026-11-03' }, '2026-11-02'), false);
  assert.equal(daAvvisare({ ...c, fase: 'interessato' }, '2026-11-02'), false);
  assert.equal(daAvvisare(c, '2026-11-02', spento), false);
});

test('quale messaggio proporre', () => {
  const base = { provaIl: null, avvisatoIl: null };
  assert.equal(tipoMessaggioLead({ ...base, fase: 'interessato' }, false, false), 'primo');
  assert.equal(tipoMessaggioLead({ ...base, fase: 'interessato' }, false, true), 'richiamo');
  assert.equal(tipoMessaggioLead({ ...base, fase: 'prova_fissata' }, false, true), 'conferma');
  assert.equal(tipoMessaggioLead({ ...base, fase: 'prova_fissata' }, true, true), 'promemoria');
  assert.equal(tipoMessaggioLead({ ...base, fase: 'prova_fatta' }, false, true), 'dopo');
});

test('testi dei messaggi come nel prototipo', () => {
  const c = { nome: 'Sofia Marchetti', provaIl: '2026-11-03', provaOra: '18:30', provaTipo: 'Iyengar', oggi: '2026-11-02', provaEtichetta: 'Lezione di prova', provaPrezzo: 10, inStudio: 'in Yoga Tribù' };
  assert.match(testoMessaggioLead('primo', c), /Ciao Sofia! .* costa 10€, si paga in studio/);
  assert.match(testoMessaggioLead('primo', { ...c, provaPrezzo: 0 }), /è gratuita/);
  assert.equal(testoMessaggioLead('conferma', c), 'Ciao Sofia! Ti aspettiamo martedì 3 novembre alle 18:30 in Yoga Tribù per Iyengar. Arriva 10 minuti prima.');
  assert.match(testoMessaggioLead('promemoria', c), /ricordo che domani alle 18:30/);
  assert.match(testoMessaggioLead('promemoria', { ...c, provaIl: '2026-11-02' }), /ricordo che oggi alle/);
});

test('ultimo messaggio: senza risposta o tocca a te', () => {
  const q = (iso: string) => `il ${iso.slice(8, 10)}`;
  assert.equal(ultimoMessaggio([], 'interessato', q), 'Nessun messaggio ancora');
  assert.equal(ultimoMessaggio([{ tipo: 'messaggio_inviato', creatoIl: '2026-11-01T10:00:00Z' }], 'interessato', q), 'Hai scritto il 01, senza risposta');
  assert.equal(ultimoMessaggio([{ tipo: 'messaggio_inviato', creatoIl: '2026-11-01T10:00:00Z' }], 'prova_fissata', q), 'Hai scritto il 01');
  assert.equal(
    ultimoMessaggio([{ tipo: 'messaggio_inviato', creatoIl: '2026-11-01T10:00:00Z' }, { tipo: 'risposta', creatoIl: '2026-11-02T09:00:00Z' }], 'interessato', q),
    'Ha scritto il 02: tocca a te',
  );
});
