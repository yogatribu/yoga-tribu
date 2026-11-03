import { test } from 'node:test';
import assert from 'node:assert/strict';
import { leggiElenco } from '../../src/domain/importa.ts';

const FONTI = ['Instagram', 'Passaparola', 'Altro'];
const esistenti = [
  { nome: 'Anna Rossi', telefono: '347 555 0100', dove: 'tra gli interessati' },
  { nome: 'Paolo Bianchi', telefono: null, dove: 'tra gli allievi' },
];

test('importa: separatori diversi, ordine libero, intestazione ignorata', () => {
  const r = leggiElenco('Nome;Telefono\nGiada Moretto; 347 555 1234\n349 555 8800, stefano brusadin, Instagram', [], FONTI);
  assert.equal(r.length, 2);
  assert.deepEqual([r[0].nome, r[0].telefono, r[0].stato], ['Giada Moretto', '347 555 1234', 'nuovo']);
  assert.deepEqual([r[1].nome, r[1].telefono, r[1].fonte], ['Stefano Brusadin', '349 555 8800', 'Instagram']);
});

test('importa: doppioni per telefono (anche con prefisso) e per nome', () => {
  const r = leggiElenco('Anna R.; +39 347 555 0100\nPaolo Bianchi\nLuca Verdi; 340 111 2233', esistenti, FONTI);
  assert.deepEqual(r.map((x) => x.stato), ['doppio', 'doppio', 'nuovo']);
  assert.equal(r[0].perche, 'già tra gli interessati');
  assert.equal(r[1].perche, 'già tra gli allievi');
});

test('importa: ripetuti nell\'elenco, senza nome, telefono incompleto', () => {
  const r = leggiElenco('Luca Verdi; 340 111 2233\nLuca Verdi; 340 111 2233\n340 999 8877\nMaria Neri; 123', [], FONTI);
  assert.deepEqual(r.map((x) => x.stato), ['nuovo', 'doppio', 'controlla', 'controlla']);
  assert.equal(r[1].perche, "ripetuto nell'elenco");
  assert.equal(r[2].perche, 'manca il nome');
  assert.equal(r[3].perche, 'telefono incompleto');
});
