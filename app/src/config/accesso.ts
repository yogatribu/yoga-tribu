// Chi può entrare lo decide il database (migrazione 0008): solo le email degli insegnanti (Impostazioni)
// e quelle in `accessi_extra`. L'app chiede sempre il codice; se l'email non è abilitata Supabase risponde con un errore.
// Quando si apre l'app agli allievi si cambia la regola nel database, con informativa e termini nella schermata di primo accesso.

// Quante cifre ha il codice che manda Supabase (Authentication, Email, "Email OTP Length"). Il prototipo ne mostra 6.
export const CIFRE_CODICE = 6;
