// Formati di data e importi come nel prototipo ("5 nov 2026", "ieri", "3 giorni fa").
import { giorniAllaScadenza } from './persone.ts';

export const MESI_BREVI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'] as const;
export const MESI_LUNGHI = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'] as const;

export function fdate(iso: string): string {
  const [a, m, g] = iso.slice(0, 10).split('-').map(Number);
  return `${g} ${MESI_BREVI[m - 1]} ${a}`;
}

/** "oggi", "ieri", "3 giorni fa", poi la data. Come quandoRel del prototipo. */
export function quandoRel(iso: string, oggi: string): string {
  const n = -giorniAllaScadenza(iso.slice(0, 10), oggi);
  return n <= 0 ? 'oggi' : n === 1 ? 'ieri' : n < 7 ? `${n} giorni fa` : fdate(iso);
}

export function iniziale(nome: string): string {
  return nome.trim().charAt(0).toUpperCase();
}

/** "14 set → 5 ott" oppure "14 set" se è un solo giorno. */
export function intervallo(da: string, a: string | null): string {
  const f = (iso: string) => `${Number(iso.slice(8, 10))} ${MESI_BREVI[Number(iso.slice(5, 7)) - 1]}`;
  return a && a !== da ? `${f(da)} → ${f(a)}` : f(da);
}
