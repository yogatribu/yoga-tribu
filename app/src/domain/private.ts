// Lezioni private: orari scelti da ogni insegnante, prezzi e stato delle richieste. Funzioni pure.
// Come nel prototipo (dispGiorno, dispAutoDi, insDisponibile): gli allievi scelgono solo tra gli orari dati dall'insegnante.
import { aggiungiGiorni, giornoDellaSettimana } from './date.ts';

export const ORE_PRIVATE = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20] as const;
export const NOME_PRIVATA: Record<1 | 2 | 3 | 4, string> = { 1: 'Individuale', 2: 'Duo', 3: 'Trio', 4: 'Di gruppo' };
export const STATI_PRIVATA = ['attesa', 'confermata', 'rifiutata', 'annullata'] as const;
export type StatoPrivata = (typeof STATI_PRIVATA)[number];

/** Orari di partenza di chi si aggiunge tra chi fa le private: dal lunedì al venerdì, 15-17. */
export const ORE_DI_PARTENZA: Record<number, number[]> = { 0: [], 1: [15, 16, 17], 2: [15, 16, 17], 3: [15, 16, 17], 4: [15, 16, 17], 5: [15, 16], 6: [] };

export type Disponibilita = { insegnanteId: string; giorno: number | null; data: string | null; ore: number[] };

/** Gli orari di un giorno: l'eccezione di quella data, se c'è (anche vuota: "non disponibile"), altrimenti quelli settimanali. */
export function oreDelGiorno(disp: readonly Disponibilita[], insegnanteId: string, data: string): number[] {
  const mie = disp.filter((d) => d.insegnanteId === insegnanteId);
  const eccezione = mie.find((d) => d.data === data);
  if (eccezione) return [...eccezione.ore].sort((a, b) => a - b);
  const sett = mie.find((d) => d.giorno === giornoDellaSettimana(data));
  return [...(sett?.ore ?? [])].sort((a, b) => a - b);
}

/** Chi ha dato almeno un orario nei prossimi 14 giorni compare tra gli insegnanti delle private. */
export function faPrivate(disp: readonly Disponibilita[], insegnanteId: string, oggi: string): boolean {
  return Array.from({ length: 14 }, (_, i) => aggiungiGiorni(oggi, i)).some((d) => oreDelGiorno(disp, insegnanteId, d).length > 0);
}

/** Si accende o si spegne un'ora in un elenco di orari. */
export function alternaOra(ore: readonly number[], h: number): number[] {
  return (ore.includes(h) ? ore.filter((x) => x !== h) : [...ore, h]).sort((a, b) => a - b);
}

/** "Copia su lunedì-venerdì": gli orari di un giorno diventano quelli dei giorni feriali. */
export function copiaSuFeriali(ore: readonly number[]): Record<number, number[]> {
  return { 1: [...ore], 2: [...ore], 3: [...ore], 4: [...ore], 5: [...ore] };
}

export function prezzoDaConcordare(centesimi: number | null): string {
  return centesimi == null ? 'da concordare' : `${centesimi / 100}€`;
}

export type PrivataPerOccupazione = { insegnanteId: string; data: string; ora: string; stato: StatoPrivata };

/** Ore già prese da una privata in attesa o confermata: non si possono più scegliere. */
export function orePrese(private_: readonly PrivataPerOccupazione[], insegnanteId: string, data: string): number[] {
  return private_
    .filter((r) => r.insegnanteId === insegnanteId && r.data === data && (r.stato === 'attesa' || r.stato === 'confermata'))
    .map((r) => parseInt(r.ora, 10));
}

export type Confermabile = { stato: StatoPrivata };

/** Una privata si conferma o si rifiuta solo finché è in attesa; si disdice solo se è confermata. */
export function puoConfermare(r: Confermabile): boolean {
  return r.stato === 'attesa';
}
export function puoDisdire(r: Confermabile): boolean {
  return r.stato === 'confermata';
}
