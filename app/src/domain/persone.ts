// Regole sugli allievi: dati mancanti, età, crediti, scadenze, importi da incassare.
// Funzioni pure. Le date sono "AAAA-MM-GG", gli importi in centesimi.

import { aggiungiGiorni } from './date.ts';

export type Persona = {
  id: string;
  nome: string;
  cognome: string | null;
  telefono: string | null;
  email: string | null;
  dataNascita: string | null;
  fonte: string | null;
  tag: string[];
  creditiIllimitati: boolean;
  consensoNovita: boolean;
  consensoFoto: 'si' | 'no' | 'da_chiedere';
  informativaPresa: boolean;
  iscrittoIl: string;
};

export type Acquisto = {
  id: string;
  nome: string;
  crediti: number;
  prezzoCent: number;
  scadeIl: string | null;
  incassato: boolean;
  creatoIl?: string;
};

export type VoceRegistro = { acquistoId: string | null; delta: number };

export const GIORNI_PREAVVISO_SCADENZA = 10;

export function nomeCompleto(p: Pick<Persona, 'nome' | 'cognome'>): string {
  return [p.nome, p.cognome].filter((x) => x && x.trim() !== '').join(' ');
}

/** Cosa manca per considerare il profilo completo. La fonte è facoltativa, non si chiede. */
export function datiMancanti(p: Pick<Persona, 'telefono' | 'dataNascita'>): string[] {
  const m: string[] = [];
  if (!p.telefono || p.telefono.trim() === '') m.push('telefono');
  if (!p.dataNascita) m.push('data di nascita');
  return m;
}

export function eta(dataNascita: string, giorno: string): number {
  const [an, mn, gn] = dataNascita.split('-').map(Number);
  const [a, m, g] = giorno.split('-').map(Number);
  return a - an - (m < mn || (m === mn && g < gn) ? 1 : 0);
}

export function eMinorenne(dataNascita: string | null, giorno: string): boolean {
  return dataNascita !== null && eta(dataNascita, giorno) < 18;
}

export function saldo(registro: readonly VoceRegistro[]): number {
  return registro.reduce((s, v) => s + v.delta, 0);
}

export function residuoAcquisto(acquistoId: string, registro: readonly VoceRegistro[]): number {
  return registro.filter((v) => v.acquistoId === acquistoId).reduce((s, v) => s + v.delta, 0);
}

/** Data di scadenza di un pacchetto acquistato oggi, o null se non scade. */
export function scadenzaDa(oggi: string, validitaGiorni: number | null): string | null {
  return validitaGiorni === null ? null : aggiungiGiorni(oggi, validitaGiorni);
}

export function giorniAllaScadenza(scadeIl: string, oggi: string): number {
  const [a1, m1, g1] = oggi.split('-').map(Number);
  const [a2, m2, g2] = scadeIl.split('-').map(Number);
  return Math.round((Date.UTC(a2, m2 - 1, g2) - Date.UTC(a1, m1 - 1, g1)) / 86_400_000);
}

/** La prossima scadenza tra i pacchetti che hanno ancora crediti. */
export function prossimaScadenza(acquisti: readonly Acquisto[], registro: readonly VoceRegistro[]): string | null {
  const date = acquisti
    .filter((a) => a.scadeIl !== null && residuoAcquisto(a.id, registro) > 0)
    .map((a) => a.scadeIl as string)
    .sort();
  return date[0] ?? null;
}

/** In scadenza: crediti ancora da usare e scadenza entro 10 giorni, oppure un solo credito rimasto dopo un pacchetto più grande. */
export function inScadenza(
  persona: Pick<Persona, 'creditiIllimitati'>,
  acquisti: readonly Acquisto[],
  registro: readonly VoceRegistro[],
  oggi: string,
): boolean {
  if (persona.creditiIllimitati) return false;
  const s = saldo(registro);
  if (s <= 0) return false;
  const scad = prossimaScadenza(acquisti, registro);
  if (scad !== null && giorniAllaScadenza(scad, oggi) <= GIORNI_PREAVVISO_SCADENZA) return true;
  return s === 1 && acquisti.some((a) => a.crediti > 1);
}

export function daIncassareCent(acquisti: readonly Acquisto[]): number {
  return acquisti.filter((a) => !a.incassato).reduce((s, a) => s + a.prezzoCent, 0);
}

export function euro(cent: number): string {
  const e = cent / 100;
  return `${Number.isInteger(e) ? e : e.toFixed(2).replace('.', ',')}€`;
}

export type Ricorrenza = { persona: Persona; tipo: 'compleanno' | 'anniversario'; data: string; anni: number };

/** Compleanni e anniversari di iscrizione (da 1 anno in su) che cadono tra le due date, estremi inclusi. */
export function ricorrenze(persone: readonly Persona[], da: string, a: string): Ricorrenza[] {
  const risultato: Ricorrenza[] = [];
  const annoDa = Number(da.slice(0, 4));
  const annoA = Number(a.slice(0, 4));
  for (let anno = annoDa; anno <= annoA; anno++) {
    for (const p of persone) {
      const aggiungi = (iso: string, tipo: Ricorrenza['tipo'], nato: string) => {
        const data = `${anno}-${iso.slice(5)}`;
        const valida = iso.slice(5) !== '02-29' || new Date(anno, 1, 29).getDate() === 29;
        const anni = anno - Number(nato.slice(0, 4));
        if (valida && data >= da && data <= a && (tipo === 'compleanno' ? anni >= 0 : anni >= 1)) {
          risultato.push({ persona: p, tipo, data, anni });
        }
      };
      if (p.dataNascita) aggiungi(p.dataNascita, 'compleanno', p.dataNascita);
      aggiungi(p.iscrittoIl, 'anniversario', p.iscrittoIl);
    }
  }
  return risultato.sort((x, y) => x.data.localeCompare(y.data) || nomeCompleto(x.persona).localeCompare(nomeCompleto(y.persona)));
}
