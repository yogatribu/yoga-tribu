import { test } from 'node:test';
import assert from 'node:assert/strict';
import { didascalia, piano, prezzoRiga, righe, type EventoPlanner, type Riga } from '../../src/domain/planner.ts';

const OGGI = '2026-11-02'; // lunedì
const ev = (o: Partial<EventoPlanner> = {}): EventoPlanner => ({
  id: 'e1', tipo: 'seminario', titolo: 'Seminario sulle spalle', data: '2026-11-29', fine: null, luogo: 'Studio Yoga Tribù · Cassola', prezzoEuro: 60, posti: 20,
  con: 'Glenda', orario: null, completo: false, extra: {}, ...o,
});

test('un seminario genera i suoi post, il prezzo solo in quelli di conversione', () => {
  const r = righe([ev()], OGGI).filter((x) => x.ev?.id === 'e1');
  assert.equal(r.length, 5);
  const promemoria = r.find((x) => x.fase === 'promemoria') as Riga;
  assert.equal(prezzoRiga(promemoria), '60€');
  assert.equal(prezzoRiga(r.find((x) => x.fase === 'annuncio') as Riga), '');
});

test('un evento passato da un mese non genera più nulla, il recap dura una settimana', () => {
  assert.equal(righe([ev({ data: '2026-09-01' })], OGGI).filter((x) => x.ev?.id === 'e1').length, 0);
  const recent = righe([ev({ data: '2026-10-30' })], OGGI).filter((x) => x.ev?.id === 'e1');
  assert.deepEqual(recent.map((x) => x.fase), ['recap']);
});

test('al completo: spariscono promemoria e ultimi giorni solo proposti, e nasce il post "al completo"', () => {
  const base = righe([ev({ completo: true })], OGGI);
  const p = piano(base, {}, OGGI).filter((x) => x.ev?.id === 'e1');
  assert.equal(p.some((x) => x.fase === 'promemoria' || x.fase === 'countdown'), false);
  assert.equal(p.filter((x) => x.fase === 'completo').length, 1);
});

test('al completo: un promemoria già confermato non sparisce, si chiede se toglierlo', () => {
  const base = righe([ev({ completo: true })], OGGI);
  const id = (base.find((x) => x.fase === 'promemoria') as Riga).id;
  const p = piano(base, { [id]: { stato: 'confermato', data: '2026-11-15', formato: 'reel' } }, OGGI).find((x) => x.id === id) as Riga;
  assert.equal(p.conf?.togli, true);
  assert.equal(p.data, '2026-11-15');
});

test('i post nel feed: al massimo uno al giorno', () => {
  const eventi = [ev({ id: 'a' }), ev({ id: 'b', titolo: 'Altro seminario', data: '2026-11-30' }), ev({ id: 'c', tipo: 'corso', titolo: 'Corso', data: '2026-11-25' })];
  const p = piano(righe(eventi, OGGI), {}, OGGI).filter((x) => ['carosello', 'reel', 'post'].includes(x.f as string) && !x.conf);
  const per: Record<string, number> = {};
  for (const r of p) per[r.data as string] = (per[r.data as string] ?? 0) + 1;
  assert.ok(Object.values(per).every((n) => n <= 1), JSON.stringify(per));
});

test('un post confermato resta dove è, anche se cambia il resto', () => {
  const base = righe([ev()], OGGI);
  const id = (base.find((x) => x.fase === 'annuncio') as Riga).id;
  const p = piano(base, { [id]: { stato: 'pubblicato', data: '2026-11-03', formato: 'carosello' } }, OGGI).find((x) => x.id === id) as Riga;
  assert.equal(p.data, '2026-11-03');
  assert.equal(p.fisso, true);
});

test('se la data dell\'evento cambia dopo la conferma, compare l\'avviso', () => {
  const base = righe([ev({ data: '2026-12-06' })], OGGI);
  const id = (base.find((x) => x.fase === 'annuncio') as Riga).id;
  const p = piano(base, { [id]: { stato: 'confermato', data: '2026-11-03', formato: 'carosello', dataEvento: '2026-11-29' } }, OGGI).find((x) => x.id === id) as Riga;
  assert.equal(p.avviso, true);
});

test('didascalia: dati dell\'evento, numero giusto e promemoria per la salute femminile', () => {
  const sem = righe([ev()], OGGI).find((x) => x.fase === 'promemoria') as Riga;
  const t = didascalia(sem, OGGI, '328 767 5966', '347 109 8694');
  assert.match(t, /Mancano 27 giorni a Seminario sulle spalle\./);
  assert.match(t, /Quota: 60€/);
  assert.match(t, /328 767 5966/);
  const perc = righe([ev({ id: 'p', tipo: 'percorso', titolo: 'Massaggio neonatale', orario: 'Giovedì 10:15 · 4 incontri', prezzoEuro: 0 })], OGGI).find((x) => x.ev?.id === 'p') as Riga;
  const tp = didascalia(perc, OGGI, '328 767 5966', '347 109 8694');
  assert.match(tp, /347 109 8694/);
  assert.doesNotMatch(tp, /328 767 5966/);
  assert.match(tp, /rileggi con attenzione/);
});

test('le rubriche fisse: lezione di prova ogni due settimane e Wrapped di fine anno', () => {
  const r = righe([], OGGI);
  assert.ok(r.some((x) => x.tipoL === 'Lezione di prova'));
  assert.ok(r.some((x) => x.tipoL === 'Wrapped' && x.fase === 'giorno'));
  const date = r.filter((x) => x.tipoL === 'Lezione di prova').map((x) => x.ideal);
  assert.equal(new Set(date).size, date.length);
});
