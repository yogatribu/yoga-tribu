import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dettaglioStatistica, type DatiDettaglio, type PersonaStat } from '../../src/domain/dettaglio-stat.ts';
import { lezioniCsv, rapportoStatistiche, tabella } from '../../src/domain/rapporto-stat.ts';
import type { Modello } from '../../src/domain/programma.ts';

const mod = (id: string, giorno: number, ora: string, stile: string, tipo: string, insegnante: string, posti = 10): Modello => ({ id, giorno, ora, stile, tipo, insegnante, durataMin: null, posti, attivo: true });
const persona = (id: string, nome: string, iscrittoIl: string, extra = {}): PersonaStat => ({
  persona: { id, nome, cognome: 'Rossi', telefono: '333 111 2222', email: 'x@y.it', dataNascita: '1985-05-05', fonte: 'Instagram', tag: ['Gravidanza'], creditiIllimitati: false, consensoNovita: true, consensoFoto: 'si', informativaPresa: true, iscrittoIl },
  saldo: 3, daIncassareCent: 0, stato: 'Regolare', ultimaLezione: '2026-10-30', inScadenza: false, acquisti: [{ id: `a${id}`, nome: '10 lezioni', crediti: 10, prezzoCent: 12000, scadeIl: null, incassato: true, creatoIl: '2026-10-15T10:00:00Z' }], ...extra,
});
const dati: DatiDettaglio = {
  oggi: '2026-11-03',
  lezioni: [
    { data: '2026-10-26', modello: mod('a', 1, '07:00', 'iyengar', 'Forza', 'Glenda'), pren: 8 },
    { data: '2026-10-27', modello: mod('b', 2, '19:00', 'ashtanga', 'Mysore', 'Victor', 5), pren: 5 },
    { data: '2026-09-14', modello: mod('a', 1, '07:00', 'iyengar', 'Forza', 'Glenda'), pren: 4 },
  ],
  persone: [persona('p1', 'Anna', '2026-10-20'), persona('p2', 'Bea', '2026-09-02', { stato: 'In pausa', acquisti: [{ id: 'z', nome: 'Singola', crediti: 1, prezzoCent: 1500, scadeIl: null, incassato: false, creatoIl: '2026-10-01T10:00:00Z' }] })],
  contatti: [
    { id: 'c1', nome: 'Luca', cerca: 'Ashtanga', fase: 'iscritto', creatoIl: '2026-10-10T10:00:00Z', haAvutoProva: true, assenze: 0, fonte: 'Instagram', motivoChiusura: null },
    { id: 'c2', nome: 'Sofia', cerca: null, fase: 'non_prosegue', creatoIl: '2026-10-12T10:00:00Z', haAvutoProva: false, assenze: 0, fonte: null, motivoChiusura: 'prezzo' },
  ],
  eventi: [],
};

test('dettaglio lezioni: righe dalla più recente, tessere e serie di dodici mesi', () => {
  const d = dettaglioStatistica('pren', dati, 30);
  assert.equal(d.righe[0].data, '2026-10-27');
  assert.equal(d.tiles[1].b, 3);
  assert.equal(d.serie?.length, 12);
  assert.equal(d.serie?.at(-2)?.v, 13);
});

test('dettaglio per giorno, slot e insegnante', () => {
  assert.equal(dettaglioStatistica('giorno|1', dati, 30).righe.length, 2);
  assert.equal(dettaglioStatistica('slot|2|19:00|Mysore', dati, 30).righe.length, 1);
  assert.equal(dettaglioStatistica('ins|Victor', dati, 30).righe.length, 1);
});

test('dettaglio persone, incassi e da incassare', () => {
  assert.equal(dettaglioStatistica('stato|In pausa', dati, 30).righe[0].titolo, 'Bea Rossi');
  assert.equal(dettaglioStatistica('inc', dati, 30).tiles[0].b, '120€');
  assert.equal(dettaglioStatistica('incasso', dati, 30).tiles[0].b, '15€');
});

test('dettaglio contatti: per fonte e per motivo', () => {
  assert.equal(dettaglioStatistica('lead|fonte|Instagram', dati, 90).righe.length, 1);
  assert.equal(dettaglioStatistica('lead|motivo|Prezzo', dati, 90).righe[0].titolo, 'Sofia');
  assert.equal(dettaglioStatistica('lead|prima', dati, 90).righe.length, 1);
});

test('il rapporto non contiene nomi, telefoni, email né tag di salute', () => {
  const r = rapportoStatistiche(dati, { studio: 'Yoga Tribù', giorni: 30 });
  for (const vietato of ['Anna', 'Bea', 'Rossi', '333 111 2222', 'x@y.it', 'Gravidanza', 'Luca', 'Sofia']) assert.ok(!r.includes(vietato), `contiene ${vietato}`);
  assert.match(r, /Le persone sono meno di 30/);
  assert.match(r, /## 8\. Dati che oggi non abbiamo/);
});

test('con trenta persone o più compare una riga per codice, a fasce', () => {
  const molte = { ...dati, persone: Array.from({ length: 30 }, (_, i) => persona(`p${i}`, `Nome${i}`, '2026-01-10')) };
  const r = rapportoStatistiche(molte, { studio: 'Yoga Tribù', giorni: 30 });
  assert.match(r, /\| P30 \|/);
  assert.ok(!r.includes('Nome3'));
});

test('tabella: il carattere | non rompe le celle; senza righe dice nessun dato', () => {
  assert.match(tabella(['A', 'B'], [['x|y', 1]]), /x\/y/);
  assert.match(tabella(['A', 'B'], []), /nessun dato/);
});

test('csv delle lezioni: intestazione e una riga per lezione', () => {
  const c = lezioniCsv(dati.lezioni).trim().split('\n');
  assert.equal(c.length, 4);
  assert.equal(c[0].split(';').length, 9);
});
