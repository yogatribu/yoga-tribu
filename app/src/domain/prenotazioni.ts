// Regole delle prenotazioni: posti, disdetta, crediti, e cosa si capisce di una persona da come frequenta.
// Funzioni pure. Le date sono "AAAA-MM-GG", gli orari "HH:MM".

import { aggiungiGiorni } from './date.ts';
import { giorniAllaScadenza } from './persone.ts';

export const MINUTI_DISDETTA = 120;

export type StatoPrenotazione = 'prenotata' | 'lista' | 'annullata' | 'tardiva' | 'restituita';

export type Prenotazione = {
  id: string; modelloId: string; data: string; personId: string; stato: StatoPrenotazione; disdettaIl: string | null; minutiPrima: number | null;
};

/** Minuti che mancano all'inizio della lezione, dal momento indicato (negativo se è già iniziata). */
export function minutiAllaLezione(data: string, ora: string, adesso: Date): number {
  const [a, m, g] = data.split('-').map(Number);
  const [h, mi] = ora.split(':').map(Number);
  return Math.round((new Date(a, m - 1, g, h, mi).getTime() - adesso.getTime()) / 60_000);
}

/** Più di 2 ore prima: il credito torna. Meno di 2 ore: si può disdire ma il credito non torna. */
export function disdettaInTempo(minutiMancanti: number): boolean {
  return minutiMancanti > MINUTI_DISDETTA;
}

export function attive(pren: readonly Pick<Prenotazione, 'stato'>[]): number {
  return pren.filter((p) => p.stato === 'prenotata').length;
}

export function inLista(pren: readonly Pick<Prenotazione, 'stato'>[]): number {
  return pren.filter((p) => p.stato === 'lista').length;
}

export function postiLiberi(posti: number, pren: readonly Pick<Prenotazione, 'stato'>[]): number {
  return Math.max(0, posti - attive(pren));
}

export type Controllo = { ok: true } | { ok: false; motivo: string };

export function puoPrenotare(
  p: { creditiIllimitati: boolean; saldo: number }, posti: number, pren: readonly Prenotazione[], personId: string, lezioneIniziata: boolean,
): Controllo {
  if (lezioneIniziata) return { ok: false, motivo: 'La lezione è già iniziata.' };
  if (pren.some((x) => x.personId === personId && (x.stato === 'prenotata' || x.stato === 'lista'))) return { ok: false, motivo: 'È già prenotata a questa lezione.' };
  if (!p.creditiIllimitati && p.saldo <= 0) return { ok: false, motivo: 'Non ha crediti: aggiungi prima un pacchetto.' };
  if (postiLiberi(posti, pren) === 0) return { ok: false, motivo: 'La lezione è al completo: la persona può entrare in lista.' };
  return { ok: true };
}

/** Quando si libera un posto entra il primo in lista che ha ancora un credito (o crediti illimitati). */
export function primoDellaLista(
  pren: readonly (Prenotazione & { creato: string })[], persone: Record<string, { creditiIllimitati: boolean; saldo: number }>,
): Prenotazione | null {
  const lista = pren.filter((p) => p.stato === 'lista').sort((a, b) => a.creato.localeCompare(b.creato));
  return lista.find((p) => persone[p.personId] && (persone[p.personId].creditiIllimitati || persone[p.personId].saldo > 0)) ?? null;
}

export type StatoAllievo = 'In prova' | 'Nuovo ingresso' | 'Regolare' | 'A rischio' | 'In pausa';

/**
 * Come il prototipo (stato): una sola lezione fatta è "In prova"; iscritto da meno di 30 giorni è "Nuovo ingresso";
 * poi conta l'ultima lezione: fino a 14 giorni "Regolare", fino a 35 "A rischio", oltre "In pausa".
 */
export function statoAllievo(lezioniFatte: number, iscrittoIl: string, ultimaLezione: string | null, oggi: string): StatoAllievo {
  if (lezioniFatte <= 1) return 'In prova';
  if (giorniAllaScadenza(oggi, iscrittoIl) <= 30) return 'Nuovo ingresso';
  const g = ultimaLezione ? giorniAllaScadenza(oggi, ultimaLezione) : 999;
  return g <= 14 ? 'Regolare' : g <= 35 ? 'A rischio' : 'In pausa';
}

export const COLORE_STATO: Record<StatoAllievo, string> = {
  Regolare: '#7a9d6e', 'Nuovo ingresso': 'var(--t-p)', 'In prova': 'var(--t-acc)', 'A rischio': '#b8841f', 'In pausa': '#c95a4a',
};

/** Le lezioni a cui la persona è stata davvero: prenotate, con la data già passata. */
export function lezioniFatte(pren: readonly Pick<Prenotazione, 'stato' | 'data'>[], oggi: string): Pick<Prenotazione, 'stato' | 'data'>[] {
  return pren.filter((p) => (p.stato === 'prenotata' || p.stato === 'tardiva' || p.stato === 'restituita') && p.data < oggi || (p.stato === 'prenotata' && p.data === oggi));
}

export function ultimaLezione(pren: readonly Pick<Prenotazione, 'stato' | 'data'>[], oggi: string): string | null {
  const l = lezioniFatte(pren, oggi).map((p) => p.data).sort();
  return l.length ? l[l.length - 1] : null;
}

export function giorniDal(data: string, oggi: string): number {
  return giorniAllaScadenza(oggi, data);
}

export function ago(n: number): string {
  return n <= 0 ? 'oggi' : n === 1 ? 'ieri' : `${n} giorni fa`;
}

/** Date delle prossime lezioni da mostrare: da oggi per un certo numero di giorni. */
export function prossimiGiorni(oggi: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) => aggiungiGiorni(oggi, i));
}
