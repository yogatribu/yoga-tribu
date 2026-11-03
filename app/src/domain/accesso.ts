// Controlli sui dati inseriti nel login. Funzioni pure.

export function emailValida(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

/** Supabase manda un codice di sole cifre (6 di default, fino a 10 se cambiato nel pannello). */
export function codiceValido(codice: string): boolean {
  return /^\d{6,10}$/.test(codice.replace(/\s/g, ''));
}

export function pulisciCodice(codice: string): string {
  return codice.replace(/\s/g, '');
}

/** Il database rifiuta le email non abilitate (migrazione 0008): Supabase lo riporta come errore di salvataggio dell'utente. */
export function emailNonAbilitata(messaggio: string): boolean {
  return /database error saving new user|email non abilitata/i.test(messaggio);
}
