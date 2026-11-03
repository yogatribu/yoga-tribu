import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  daIncassareCent, datiMancanti, eMinorenne, eta, euro, giorniAllaScadenza, inScadenza, nomeCompleto, prossimaScadenza,
  residuoAcquisto, ricorrenze, saldo, scadenzaDa, type Acquisto, type Persona, type VoceRegistro,
} from '../../src/domain/persone.ts';

const persona = (o: Partial<Persona> = {}): Persona => ({
  id: 'p1', nome: 'Chiara', cognome: 'Bianchi', telefono: '328 767 5966', email: null, dataNascita: '1990-11-05', fonte: null,
  tag: [], creditiIllimitati: false, consensoNovita: false, consensoFoto: 'da_chiedere', informativaPresa: false, iscrittoIl: '2024-11-04', ...o,
});
const acq = (o: Partial<Acquisto> = {}): Acquisto => ({ id: 'a1', nome: '10 lezioni', crediti: 10, prezzoCent: 15000, scadeIl: '2026-12-01', incassato: false, ...o });

test('nome completo senza spazi di troppo', () => {
  assert.equal(nomeCompleto({ nome: 'Chiara', cognome: 'Bianchi' }), 'Chiara Bianchi');
  assert.equal(nomeCompleto({ nome: 'Chiara', cognome: null }), 'Chiara');
  assert.equal(nomeCompleto({ nome: 'Chiara', cognome: ' ' }), 'Chiara');
});

test('dati mancanti: telefono e data di nascita', () => {
  assert.deepEqual(datiMancanti({ telefono: null, dataNascita: null }), ['telefono', 'data di nascita']);
  assert.deepEqual(datiMancanti({ telefono: ' ', dataNascita: '1990-01-01' }), ['telefono']);
  assert.deepEqual(datiMancanti({ telefono: '3287675966', dataNascita: '1990-01-01' }), []);
});

test('età e maggiore età il giorno del compleanno', () => {
  assert.equal(eta('2008-11-02', '2026-11-01'), 17);
  assert.equal(eta('2008-11-02', '2026-11-02'), 18);
  assert.equal(eMinorenne('2008-11-02', '2026-11-01'), true);
  assert.equal(eMinorenne('2008-11-02', '2026-11-02'), false);
  assert.equal(eMinorenne(null, '2026-11-02'), false);
});

test('saldo e residuo per acquisto', () => {
  const r: VoceRegistro[] = [{ acquistoId: 'a1', delta: 10 }, { acquistoId: 'a1', delta: -3 }, { acquistoId: null, delta: 1 }];
  assert.equal(saldo(r), 8);
  assert.equal(residuoAcquisto('a1', r), 7);
});

test('scadenza dal giorno dell\'acquisto', () => {
  assert.equal(scadenzaDa('2026-11-02', 90), '2027-01-31');
  assert.equal(scadenzaDa('2026-11-02', null), null);
  assert.equal(giorniAllaScadenza('2026-11-12', '2026-11-02'), 10);
  assert.equal(giorniAllaScadenza('2026-11-01', '2026-11-02'), -1);
});

test('in scadenza: entro 10 giorni con crediti, oppure ultimo credito', () => {
  const r: VoceRegistro[] = [{ acquistoId: 'a1', delta: 10 }, { acquistoId: 'a1', delta: -2 }];
  assert.equal(inScadenza({ creditiIllimitati: false }, [acq({ scadeIl: '2026-11-10' })], r, '2026-11-02'), true);
  assert.equal(inScadenza({ creditiIllimitati: false }, [acq({ scadeIl: '2026-12-30' })], r, '2026-11-02'), false);
  assert.equal(inScadenza({ creditiIllimitati: true }, [acq({ scadeIl: '2026-11-03' })], r, '2026-11-02'), false);
  const finito: VoceRegistro[] = [{ acquistoId: 'a1', delta: 10 }, { acquistoId: 'a1', delta: -10 }];
  assert.equal(inScadenza({ creditiIllimitati: false }, [acq({ scadeIl: '2026-11-03' })], finito, '2026-11-02'), false);
  const ultimo: VoceRegistro[] = [{ acquistoId: 'a1', delta: 10 }, { acquistoId: 'a1', delta: -9 }];
  assert.equal(inScadenza({ creditiIllimitati: false }, [acq({ scadeIl: null })], ultimo, '2026-11-02'), true);
  assert.equal(prossimaScadenza([acq({ scadeIl: null })], r), null);
});

test('da incassare: somma solo i non incassati; euro senza centesimi inutili', () => {
  assert.equal(daIncassareCent([acq(), acq({ id: 'a2', prezzoCent: 2000, incassato: true }), acq({ id: 'a3', prezzoCent: 2000 })]), 17000);
  assert.equal(euro(15000), '150€');
  assert.equal(euro(1125), '11,25€');
});

test('ricorrenze: compleanno e anniversario nel periodo, non il primo giorno di iscrizione', () => {
  const p = [persona(), persona({ id: 'p2', nome: 'Paolo', dataNascita: null, iscrittoIl: '2026-11-03' })];
  const r = ricorrenze(p, '2026-11-02', '2026-11-08');
  assert.deepEqual(r.map((x) => [x.persona.nome, x.tipo, x.data, x.anni]), [
    ['Chiara', 'anniversario', '2026-11-04', 2],
    ['Chiara', 'compleanno', '2026-11-05', 36],
  ]);
});

test('ricorrenze a cavallo dell\'anno e 29 febbraio', () => {
  const p = [persona({ dataNascita: '1992-01-02', iscrittoIl: '2020-02-29' })];
  assert.deepEqual(ricorrenze(p, '2026-12-28', '2027-01-03').map((x) => x.data), ['2027-01-02']);
  assert.deepEqual(ricorrenze(p, '2027-02-01', '2027-03-01').filter((x) => x.tipo === 'anniversario'), []);
  assert.equal(ricorrenze(p, '2028-02-28', '2028-03-01').filter((x) => x.tipo === 'anniversario').length, 1);
});
