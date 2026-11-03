// Regole del Programma: quali lezioni ci sono in un giorno, quali sono ferme, come si valuta una lezione nuova.
// Funzioni pure. Un "modello" è una lezione che si ripete ogni settimana; un "blocco" ferma una sola data.

import { aggiungiGiorni, giornoDellaSettimana } from './date.ts';

export type Modello = {
  id: string;
  giorno: number;
  ora: string;
  stile: string;
  tipo: string;
  insegnante: string;
  durataMin: number | null;
  posti: number;
  attivo: boolean;
  aggiuntoAMano?: boolean;
};

export type Blocco = { modelloId: string; data: string; motivo: string | null };

/** Un "Blocca" fatto da chi gestisce: più lezioni ferme con lo stesso motivo e lo stesso periodo. */
export type GruppoBlocco = { gruppoId: string; scope: string; da: string; a: string; motivo: string | null; lezioni: number };

export type LezioneDelGiorno = { modello: Modello; data: string; fermata: Blocco | null };

export const NOME_GIORNO = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'] as const;

// Gli stessi nomi di src/config/studi.ts alla radice.
export const NOME_STILE: Record<string, string> = {
  iyengar: 'Iyengar',
  ashtanga: 'Ashtanga',
  flow: 'Vinyasa',
  teen: 'Teen Yoga',
  workshop: 'Approfondimenti',
  kundalini: 'Kundalini',
  'livello-1': 'Livello 1',
  'livello-2': 'Livello 2',
  restorative: 'Restorative',
};

/** Lezioni attive di un giorno, in ordine di orario, con l'eventuale blocco di quella data. */
export function lezioniDelGiorno(data: string, modelli: readonly Modello[], blocchi: readonly Blocco[]): LezioneDelGiorno[] {
  const g = giornoDellaSettimana(data);
  return modelli
    .filter((m) => m.attivo && m.giorno === g)
    .sort((a, b) => a.ora.localeCompare(b.ora) || a.tipo.localeCompare(b.tipo))
    .map((modello) => ({
      modello,
      data,
      fermata: blocchi.find((b) => b.modelloId === modello.id && b.data === data) ?? null,
    }));
}

export type NuovaLezione = {
  giorno: number;
  ora: string;
  stile: string;
  tipo: string;
  insegnante: string;
  posti: number;
};

export type Validazione = { ok: true } | { ok: false; motivo: string };

/** "7:5" non vale: l'ora si scrive come 07:05. */
export function oraValida(ora: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(ora);
}

export function validaNuovaLezione(l: NuovaLezione, esistenti: readonly Modello[]): Validazione {
  if (l.tipo.trim() === '') return { ok: false, motivo: 'Scrivi il nome della lezione.' };
  if (l.insegnante.trim() === '') return { ok: false, motivo: "Scrivi chi la tiene." };
  if (!oraValida(l.ora)) return { ok: false, motivo: "Scegli l'ora." };
  if (!Number.isInteger(l.giorno) || l.giorno < 0 || l.giorno > 6) return { ok: false, motivo: 'Scegli il giorno.' };
  if (!Number.isInteger(l.posti) || l.posti < 1) return { ok: false, motivo: 'I posti devono essere almeno 1.' };
  const doppia = esistenti.some(
    (m) => m.attivo && m.giorno === l.giorno && m.ora === l.ora && m.tipo.trim().toLowerCase() === l.tipo.trim().toLowerCase(),
  );
  if (doppia) return { ok: false, motivo: 'Questa lezione c\'è già, allo stesso giorno e alla stessa ora.' };
  return { ok: true };
}

/** Le lezioni che un blocco ferma: tutte quelle attive tra le due date (estremi inclusi), di tutti o di un solo insegnante. */
export function lezioniDaFermare(modelli: readonly Modello[], da: string, a: string, scope: string): { modello: Modello; data: string }[] {
  const risultato: { modello: Modello; data: string }[] = [];
  for (let d = da; d <= a; d = aggiungiGiorni(d, 1)) {
    for (const modello of modelli) {
      const suo = scope === 'tutti' || modello.insegnante.toLowerCase().includes(scope.toLowerCase());
      if (modello.attivo && suo && modello.giorno === giornoDellaSettimana(d)) risultato.push({ modello, data: d });
    }
  }
  return risultato;
}

export function validaBlocco(da: string, a: string): Validazione {
  if (!da || !a) return { ok: false, motivo: 'Scegli il periodo.' };
  if (a < da) return { ok: false, motivo: 'La data finale va dopo quella iniziale.' };
  return { ok: true };
}

/** Gli insegnanti che compaiono negli orari, uno per nome ("Glenda e Mattia" dà Glenda e Mattia). */
export function insegnantiDegliOrari(modelli: readonly Modello[]): string[] {
  const nomi = new Set<string>();
  for (const m of modelli) for (const n of m.insegnante.split(/\s+e\s+|,\s*/)) if (n.trim() !== '') nomi.add(n.trim());
  return [...nomi].sort((x, y) => x.localeCompare(y));
}
