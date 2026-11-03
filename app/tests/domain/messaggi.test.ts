import { test } from 'node:test';
import assert from 'node:assert/strict';
import { linkWhatsApp, primoNome, testoMessaggio } from '../../src/domain/messaggi.ts';

test('primo nome', () => {
  assert.equal(primoNome('Chiara Maria Bianchi'), 'Chiara');
  assert.equal(primoNome('  Paolo '), 'Paolo');
});

test('messaggi: usano il nome e non promettono regali', () => {
  const c = { nome: 'Chiara Bianchi', comunita: 'tribù', importo: '150€', mancanti: ['telefono', 'data di nascita'], anni: 2 };
  assert.match(testoMessaggio('compleanno', c), /Auguri Chiara/);
  assert.match(testoMessaggio('pagamento', c), /150€ da saldare/);
  assert.match(testoMessaggio('dati', c), /telefono, data di nascita/);
  assert.match(testoMessaggio('anniversario', c), /2 anni/);
  assert.match(testoMessaggio('anniversario', { ...c, anni: 1 }), /un anno/);
  for (const m of ['scadenza', 'pagamento', 'dati', 'compleanno', 'anniversario'] as const) {
    assert.doesNotMatch(testoMessaggio(m, c), /regal|omaggio|gratis|gravid|infortun|salute/i, m);
  }
  assert.equal(testoMessaggio('libero', c), '');
});

test('link WhatsApp con il testo codificato', () => {
  assert.equal(linkWhatsApp('393287675966', ''), 'https://wa.me/393287675966');
  assert.equal(linkWhatsApp('393287675966', 'Ciao, a presto'), 'https://wa.me/393287675966?text=Ciao%2C%20a%20presto');
});
