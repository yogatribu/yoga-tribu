import { test } from 'node:test';
import assert from 'node:assert/strict';
import { capienza, lezioniSvolte, occupazione, percorsoContatti, percentuale, perGiorno, perInsegnante, perMese, perOrario, perStile, somma } from '../../src/domain/statistiche.ts';
import type { Prenotazione } from '../../src/domain/prenotazioni.ts';
import type { Modello } from '../../src/domain/programma.ts';

const m = (id: string, giorno: number, ora: string, stile: string, tipo: string, insegnante: string, posti = 10): Modello => ({ id, giorno, ora, stile, tipo, insegnante, durataMin: null, posti, attivo: true });
const modelli = [m('a', 1, '07:00', 'iyengar', 'Forza', 'Glenda'), m('b', 2, '19:00', 'ashtanga', 'Mysore', 'Victor', 5), m('c', 1, '19:15', 'iyengar', 'Forza', 'Glenda e Mattia')];
const pr = (modelloId: string, data: string, stato: Prenotazione['stato'] = 'prenotata', i = 0): Prenotazione => ({ id: `${modelloId}${data}${i}`, modelloId, data, personId: `p${i}`, stato, disdettaIl: null, minutiPrima: null });
const pren = [pr('a', '2026-10-26', 'prenotata', 1), pr('a', '2026-10-26', 'prenotata', 2), pr('a', '2026-10-26', 'annullata', 3), pr('b', '2026-10-27', 'tardiva', 1), pr('c', '2026-10-26', 'prenotata', 1)];

test('lezioni svolte: solo i giorni giusti, senza i blocchi, con le persone prenotate', () => {
  const l = lezioniSvolte(modelli, [], pren, '2026-10-26', '2026-10-27');
  assert.equal(l.length, 3);
  assert.equal(somma(l), 4); // 2 + 1 (tardiva conta) + 1; l'annullata no
  assert.equal(capienza(l), 25);
  assert.equal(occupazione(l), 16);
  const senza = lezioniSvolte(modelli, [{ modelloId: 'a', data: '2026-10-26', motivo: null }], pren, '2026-10-26', '2026-10-27');
  assert.equal(senza.length, 2);
});

test('per giorno, stile, orario, insegnante', () => {
  const l = lezioniSvolte(modelli, [], pren, '2026-10-26', '2026-10-27');
  assert.deepEqual(perGiorno(l).slice(0, 2), [{ giorno: 1, v: 3 }, { giorno: 2, v: 1 }]);
  assert.deepEqual(perStile(l), [{ stile: 'iyengar', v: 3 }, { stile: 'ashtanga', v: 1 }]);
  assert.equal(perOrario(l)[0].v, 20);
  const ins = perInsegnante(l);
  assert.equal(ins.find((x) => x.nome === 'Glenda')?.lezioni, 2);
  assert.equal(ins.find((x) => x.nome === 'Mattia')?.lezioni, 1);
});

test('per mese: gli ultimi sei, il più vecchio per primo', () => {
  const r = perMese([{ data: '2026-11-03', v: 10 }, { data: '2026-11-20', v: 5 }, { data: '2026-09-01', v: 7 }], '2026-11-02', 3);
  assert.deepEqual(r, [{ chiave: '2026-09', v: 7 }, { chiave: '2026-10', v: 0 }, { chiave: '2026-11', v: 15 }]);
});

test('percorso dei contatti e percentuali', () => {
  const p = percorsoContatti(['interessato', 'prova_fissata', 'prova_fatta', 'iscritto', 'non_prosegue', 'iscritto']);
  assert.deepEqual(p, { contatti: 6, provaFissata: 4, provaFatta: 3, iscritti: 2, chiusi: 1, inCorso: 3 });
  assert.equal(percentuale(1, 3), 33);
  assert.equal(percentuale(1, 0), 0);
});

import { confrontoConPrima, conversioni, doveSiPerdono, indicatoriConversione, rapporto, type ContattoStat } from '../../src/domain/statistiche.ts';

const ct = (fase: ContattoStat['fase'], creatoIl: string, extra: Partial<ContattoStat> = {}): ContattoStat => ({ fase, creatoIl, haAvutoProva: false, assenze: 0, fonte: null, motivoChiusura: null, ...extra });

test('conversioni: chi ha scritto da meno di una settimana non pesa', () => {
  const k = conversioni([ct('interessato', '2026-11-02'), ct('interessato', '2026-10-01'), ct('prova_fissata', '2026-10-10', { haAvutoProva: true }), ct('iscritto', '2026-10-05', { haAvutoProva: true }), ct('non_prosegue', '2026-10-06', { haAvutoProva: true })], '2026-11-03');
  assert.equal(k.n, 4);
  assert.equal(k.p, 3);
  assert.equal(k.f, 1);
  assert.equal(k.iscritti, 1);
  assert.equal(k.persiDopo, 1);
  assert.equal(k.decisi, 2);
});

test('rapporto: null se non si può calcolare', () => {
  assert.equal(rapporto(1, 0), null);
  assert.equal(rapporto(1, 3), 33);
});

test('confronto con il periodo prima', () => {
  assert.deepEqual(confrontoConPrima({ valore: 40, prima: 30, unita: '%' }, 30), { testo: '▲ +10 punti rispetto ai 30 giorni prima', esito: 'su' });
  assert.equal(confrontoConPrima({ valore: 20, prima: 30, unita: '%' }, 30).esito, 'giu');
  assert.equal(confrontoConPrima({ valore: 20, prima: 30, unita: ' giorni', menoEMeglio: true }, 30).esito, 'su');
  assert.equal(confrontoConPrima({ valore: 5, prima: 5, unita: '' }, 90).testo, 'come nei 90 giorni prima');
  assert.equal(confrontoConPrima({ valore: null, prima: 5, unita: '%' }, 30).esito, 'nessuno');
});

test('indicatori: i nuovi iscritti non hanno confronto se prima non c\'era nessun contatto', () => {
  const k = conversioni([ct('iscritto', '2026-10-05', { haAvutoProva: true })], '2026-11-03');
  const i = indicatoriConversione(k, conversioni([], '2026-11-03'), true);
  assert.equal(i.find((x) => x.chiave === 'iscritto')?.prima, null);
  assert.equal(i.length, 5);
});

test('dove si perdono le persone', () => {
  const d = doveSiPerdono([ct('non_prosegue', '2026-10-01'), ct('non_prosegue', '2026-10-01', { haAvutoProva: true, assenze: 1 }), ct('non_prosegue', '2026-10-01', { haAvutoProva: true }), ct('iscritto', '2026-10-01')]);
  assert.deepEqual(d, { prima: 1, assenti: 1, dopo: 1, totale: 3 });
});
