import { test } from 'node:test';
import assert from 'node:assert/strict';
import { descriviPersone, destinatari, eNotte, gruppoConsentito, personeDelGruppo, type PersonaAvviso } from '../../src/domain/avvisi.ts';

const p = (id: string, nome: string, o: Partial<PersonaAvviso> = {}): PersonaAvviso => ({
  id, nome, tag: [], consensoNovita: true, stato: 'Regolare', inScadenza: false, datiMancanti: false, lezioniRecenti: [], ...o,
});
const tutte = [
  p('1', 'Anna', { tag: ['Over 60'], lezioniRecenti: ['Iyengar'] }),
  p('2', 'Bruno', { consensoNovita: false, stato: 'A rischio', tag: ['Over 60', 'Gravidanza'] }),
  p('3', 'Carla', { stato: 'In prova', datiMancanti: true, inScadenza: true }),
];

test('gruppi: tutti, tag, lezione, segmenti', () => {
  assert.equal(personeDelGruppo('tutti', tutte).length, 3);
  assert.deepEqual(personeDelGruppo('tag|Over 60', tutte).map((x) => x.id), ['1', '2']);
  assert.deepEqual(personeDelGruppo('lez|Iyengar', tutte).map((x) => x.id), ['1']);
  assert.deepEqual(personeDelGruppo('seg|rischio', tutte).map((x) => x.id), ['2']);
  assert.deepEqual(personeDelGruppo('seg|prova', tutte).map((x) => x.id), ['3']);
  assert.deepEqual(personeDelGruppo('seg|dati', tutte).map((x) => x.id), ['3']);
  assert.deepEqual(personeDelGruppo('seg|scadenza', tutte).map((x) => x.id), ['3']);
  assert.deepEqual(personeDelGruppo('qualcosa', tutte), []);
});

test('destinatari: una sola volta, e le novità solo a chi ha dato il consenso', () => {
  const nov = destinatari(['tag|Over 60', 'seg|rischio'], 'novita', tutte);
  assert.deepEqual(nov.tutti.map((x) => x.id), ['1', '2']);
  assert.deepEqual(nov.ricevono.map((x) => x.id), ['1']);
  assert.deepEqual(nov.esclusi.map((x) => x.id), ['2']);
  const imp = destinatari(['tag|Over 60'], 'importante', tutte);
  assert.deepEqual(imp.ricevono.map((x) => x.id), ['1', '2']);
  assert.equal(imp.esclusi.length, 0);
});

test('i tag di salute non guidano le novità, ma si possono usare per un avviso importante', () => {
  assert.equal(gruppoConsentito('tag|Gravidanza', 'novita'), false);
  assert.equal(gruppoConsentito('tag|Gravidanza', 'importante'), true);
  assert.equal(gruppoConsentito('tag|Over 60', 'novita'), true);
  assert.equal(gruppoConsentito('tutti', 'novita'), true);
});

test('di notte le novità aspettano la mattina; singolare e plurale', () => {
  assert.equal(eNotte(22), true);
  assert.equal(eNotte(7), true);
  assert.equal(eNotte(8), false);
  assert.equal(eNotte(20), false);
  assert.equal(descriviPersone(1), '1 persona');
  assert.equal(descriviPersone(3), '3 persone');
});
