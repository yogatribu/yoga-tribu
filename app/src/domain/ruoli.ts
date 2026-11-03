// Chi può fare cosa. Il database applica le stesse regole con la sicurezza per riga:
// questa tabella serve alle schermate per decidere cosa mostrare, non sostituisce il database.

export const RUOLI = ['allievo', 'insegnante', 'amministrazione', 'gestione'] as const;
export type Ruolo = (typeof RUOLI)[number];

export type Funzione = 'interessati' | 'allievi' | 'programma' | 'modificaProgramma' | 'contattare' | 'contenuti' | 'percorsi' | 'ricorrenze' | 'crediti' | 'impostazioni' | 'statistiche';

const PERMESSI: Record<Funzione, readonly Ruolo[]> = {
  interessati: ['insegnante', 'amministrazione', 'gestione'],
  allievi: ['insegnante', 'amministrazione', 'gestione'],
  programma: ['insegnante', 'amministrazione', 'gestione'], // l'insegnante ferma le sue lezioni e chiede quelle nuove; modificaProgramma è dei responsabili
  modificaProgramma: ['amministrazione', 'gestione'],
  contattare: ['insegnante', 'amministrazione', 'gestione'],
  contenuti: ['amministrazione', 'gestione'],
  percorsi: ['amministrazione', 'gestione'], // gli insegnanti li vedono solo se hanno il flag fa_percorsi (oggi Sara): vedi vedePercorsi
  ricorrenze: ['insegnante', 'amministrazione', 'gestione'], // l'insegnante vede quelle dei suoi allievi (lo decide il database)
  crediti: ['amministrazione', 'gestione'], // vendere pacchetti, incassare, correggere i crediti
  impostazioni: ['amministrazione', 'gestione'],
  statistiche: ['amministrazione', 'gestione'],
};

export function puo(ruolo: Ruolo | null | undefined, funzione: Funzione): boolean {
  return ruolo != null && PERMESSI[funzione].includes(ruolo);
}

export function eVistaStudio(ruolo: Ruolo | null | undefined): boolean {
  return ruolo != null && ruolo !== 'allievo';
}

/** I Percorsi sono di Sara: li vede chi gestisce lo studio e l'insegnante segnata con fa_percorsi, non gli altri insegnanti. */
export function vedePercorsi(ruolo: Ruolo | null | undefined, faPercorsi: boolean): boolean {
  return puo(ruolo, 'percorsi') || (ruolo === 'insegnante' && faPercorsi);
}
