import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  coorti, completo, dateIncontri, fase, liberi, occupati, orarioPercorso, prossimoIncontro, stato, testoPassoSuccessivo,
  validaNuovoEvento, validaNuovoPercorso, type Evento,
} from '../../src/domain/eventi.ts';

const ev = (o: Partial<Evento> = {}): Evento => ({
  id: 'e1', tipo: 'percorso', titolo: 'Massaggio neonatale', descrizione: null, da: '2026-11-10', a: '2026-12-01', dateIncontri: null, ora: '10:15', orario: null,
  luogo: 'Studio', prezzoCent: null, suRichiesta: true, posti: 15, iscrittiFissi: 12, listaFissa: 0, studioOrigine: 'tribu', soloStudio: 'tribu',
  insegnanti: ['Sara'], passo: 'neonatale', chiuso: false, ...o,
});
const isc = (...stati: ('in_attesa' | 'confermata' | 'lista')[]) => stati.map((s) => ({ stato: s }));

test('posti: gli iscritti fissi più chi è in attesa o confermato, non la lista', () => {
  assert.equal(occupati(ev(), isc('confermata', 'in_attesa', 'lista')), 14);
  assert.equal(liberi(ev(), isc('confermata', 'in_attesa', 'lista')), 1);
  assert.equal(liberi(ev(), isc('confermata', 'confermata', 'confermata', 'confermata')), 0);
});

test('al completo: senza posti o chiuso a mano; stato', () => {
  assert.equal(completo(ev(), isc('confermata', 'confermata', 'confermata')), true);
  assert.equal(completo(ev({ iscrittiFissi: 2 }), []), false);
  assert.equal(completo(ev({ iscrittiFissi: 2, chiuso: true }), []), true);
  assert.deepEqual(stato(ev({ iscrittiFissi: 2 }), []), { testo: 'Aperto', tono: 'ok' });
  assert.deepEqual(stato(ev({ iscrittiFissi: 12 }), []), { testo: 'Ultimi posti', tono: 'w' });
  assert.deepEqual(stato(ev({ iscrittiFissi: 15 }), []), { testo: 'Al completo', tono: 'w' });
});

test('fase del percorso rispetto a oggi', () => {
  assert.equal(fase(ev(), '2026-11-02'), 'prossimo');
  assert.equal(fase(ev(), '2026-11-10'), 'incorso');
  assert.equal(fase(ev(), '2026-12-01'), 'incorso');
  assert.equal(fase(ev(), '2026-12-02'), 'finito');
});

test('prossimo incontro e numero d\'ordine', () => {
  const e = ev({ dateIncontri: ['2026-11-10', '2026-11-17', '2026-11-24', '2026-12-01'] });
  assert.deepEqual(prossimoIncontro(e, '2026-11-12'), { data: '2026-11-17', n: 2, tot: 4 });
  assert.equal(prossimoIncontro(e, '2026-12-02'), null);
});

test('coorti: percorsi finiti o in chiusura entro una settimana, non troppo vecchi', () => {
  const finito = ev({ id: 'a', da: '2026-10-05', a: '2026-10-26' });
  const incorso = ev({ id: 'b', da: '2026-10-26', a: '2026-11-05' });
  const lontano = ev({ id: 'c', da: '2026-11-20', a: '2026-12-10' });
  const vecchio = ev({ id: 'd', da: '2026-06-01', a: '2026-06-22' });
  assert.deepEqual(coorti([finito, incorso, lontano, vecchio], '2026-11-02').map((x) => x.id), ['a', 'b']);
});

test('messaggio del passo dopo: usa il nome e non parla di salute', () => {
  const t = testoPassoSuccessivo('gravidanza', 'Chiara Bianchi');
  assert.match(t, /^Ciao Chiara, è stato un piacere averti nel percorso\./);
  assert.match(t, /massaggio neonatale/);
  assert.match(t, /Sara$/);
  assert.doesNotMatch(t, /infortun|salute|incint/i);
});

test('date degli incontri: una a settimana', () => {
  assert.deepEqual(dateIncontri('2026-11-12', 3), ['2026-11-12', '2026-11-19', '2026-11-26']);
  assert.equal(orarioPercorso('2026-11-12', '20:00', 4), 'Giovedì 20:00 · 4 incontri');
});

test('nuovo percorso e nuovo evento: controlli', () => {
  assert.deepEqual(validaNuovoPercorso('2026-11-12', 4, 15, '2026-11-02'), { ok: true });
  assert.equal(validaNuovoPercorso('', 4, 15, '2026-11-02').ok, false);
  assert.equal(validaNuovoPercorso('2026-10-01', 4, 15, '2026-11-02').ok, false);
  assert.equal(validaNuovoPercorso('2026-11-12', 13, 15, '2026-11-02').ok, false);
  assert.equal(validaNuovoPercorso('2026-11-12', 4, 0, '2026-11-02').ok, false);
  assert.deepEqual(validaNuovoEvento('Ritiro', 'ritiro', '2026-11-12', '2026-11-14', 20), { ok: true });
  assert.equal(validaNuovoEvento('Ritiro', 'ritiro', '2026-11-12', '2026-11-10', 20).ok, false);
  assert.equal(validaNuovoEvento('', 'workshop', '2026-11-12', '', 20).ok, false);
});
