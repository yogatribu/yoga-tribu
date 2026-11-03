import { test } from 'node:test';
import assert from 'node:assert/strict';
import { codiceValido, emailNonAbilitata, emailValida, pulisciCodice } from '../../src/domain/accesso.ts';

test('email: valide e non valide', () => {
  assert.equal(emailValida('glenda@yogatribu.it'), true);
  assert.equal(emailValida('  sara@yogatribu.it '), true);
  assert.equal(emailValida('sara@'), false);
  assert.equal(emailValida('sara yogatribu.it'), false);
  assert.equal(emailValida(''), false);
});

test('codice: solo cifre, anche se incollato con spazi', () => {
  assert.equal(codiceValido('123456'), true);
  assert.equal(codiceValido('123 456'), true);
  assert.equal(codiceValido('12345'), false);
  assert.equal(codiceValido('12345a'), false);
  assert.equal(pulisciCodice(' 123 456 '), '123456');
});

test('errore di invio: riconosce l\'email non abilitata dal messaggio di Supabase', () => {
  assert.equal(emailNonAbilitata('Database error saving new user'), true);
  assert.equal(emailNonAbilitata('Email non abilitata'), true);
  assert.equal(emailNonAbilitata('email rate limit exceeded'), false);
  assert.equal(emailNonAbilitata('Error sending magic link email'), false);
});
