// Statistiche dello studio: numeri calcolati da prenotazioni, acquisti, persone e contatti. Funzioni pure.
import { aggiungiGiorni, giornoDellaSettimana } from './date.ts';
import type { Prenotazione } from './prenotazioni.ts';
import type { Blocco, Modello } from './programma.ts';

export type LezioneFatta = { data: string; modello: Modello; pren: number };

/** Le lezioni svolte in un periodo (esclusi i giorni di blocco) con quante persone erano prenotate. */
export function lezioniSvolte(modelli: readonly Modello[], blocchi: readonly Blocco[], pren: readonly Prenotazione[], da: string, a: string): LezioneFatta[] {
  const r: LezioneFatta[] = [];
  for (let d = da; d <= a; d = aggiungiGiorni(d, 1)) {
    for (const m of modelli) {
      if (!m.attivo || m.giorno !== giornoDellaSettimana(d)) continue;
      if (blocchi.some((b) => b.modelloId === m.id && b.data === d)) continue;
      const n = pren.filter((p) => p.modelloId === m.id && p.data === d && (p.stato === 'prenotata' || p.stato === 'tardiva' || p.stato === 'restituita')).length;
      r.push({ data: d, modello: m, pren: n });
    }
  }
  return r;
}

export const somma = (l: readonly LezioneFatta[]) => l.reduce((s, x) => s + x.pren, 0);
export const capienza = (l: readonly LezioneFatta[]) => l.reduce((s, x) => s + x.modello.posti, 0);
export const occupazione = (l: readonly LezioneFatta[]): number => (capienza(l) ? Math.round((somma(l) / capienza(l)) * 100) : 0);

export function perGiorno(l: readonly LezioneFatta[]): { giorno: number; v: number }[] {
  return [1, 2, 3, 4, 5, 6, 0].map((g) => ({ giorno: g, v: somma(l.filter((x) => giornoDellaSettimana(x.data) === g)) }));
}

export function perStile(l: readonly LezioneFatta[]): { stile: string; v: number }[] {
  const m = new Map<string, number>();
  for (const x of l) m.set(x.modello.stile, (m.get(x.modello.stile) ?? 0) + x.pren);
  return [...m.entries()].map(([stile, v]) => ({ stile, v })).sort((a, b) => b.v - a.v);
}

/** Occupazione per ogni orario settimanale (giorno, ora, lezione), dal più pieno al più vuoto. */
export function perOrario(l: readonly LezioneFatta[]): { chiave: string; v: number }[] {
  const m = new Map<string, { p: number; c: number }>();
  for (const x of l) {
    const k = `${x.modello.giorno}|${x.modello.ora}|${x.modello.tipo}`;
    const e = m.get(k) ?? { p: 0, c: 0 };
    e.p += x.pren;
    e.c += x.modello.posti;
    m.set(k, e);
  }
  return [...m.entries()].map(([chiave, e]) => ({ chiave, v: e.c ? Math.round((e.p / e.c) * 100) : 0 })).sort((a, b) => b.v - a.v);
}

export function perInsegnante(l: readonly LezioneFatta[]): { nome: string; lezioni: number; prenotatiAMedia: number; occupazione: number }[] {
  const m = new Map<string, { n: number; p: number; c: number }>();
  for (const x of l) for (const nome of x.modello.insegnante.split(/\s+e\s+|,\s*/).map((t) => t.trim()).filter(Boolean)) {
    const e = m.get(nome) ?? { n: 0, p: 0, c: 0 };
    e.n += 1; e.p += x.pren; e.c += x.modello.posti;
    m.set(nome, e);
  }
  return [...m.entries()].map(([nome, e]) => ({ nome, lezioni: e.n, prenotatiAMedia: Math.round(e.p / e.n), occupazione: e.c ? Math.round((e.p / e.c) * 100) : 0 })).sort((a, b) => b.lezioni - a.lezioni);
}

/** Somma per mese (gli ultimi n, il più vecchio per primo). `date` sono "AAAA-MM-GG". */
export function perMese(voci: readonly { data: string; v: number }[], oggi: string, n = 6): { chiave: string; v: number }[] {
  const [a, m] = oggi.split('-').map(Number);
  const mesi = Array.from({ length: n }, (_, i) => new Date(Date.UTC(a, m - 1 - (n - 1 - i), 1)).toISOString().slice(0, 7));
  return mesi.map((chiave) => ({ chiave, v: voci.filter((x) => x.data.startsWith(chiave)).reduce((s, x) => s + x.v, 0) }));
}

export type FaseContatto = 'interessato' | 'prova_fissata' | 'prova_fatta' | 'iscritto' | 'non_prosegue';

/** Il percorso dei contatti in base alla fase in cui sono ora (di chi ha chiuso non si sa fin dove era arrivato). */
export function percorsoContatti(fasi: readonly FaseContatto[]) {
  const n = fasi.length;
  const c = (...f: FaseContatto[]) => fasi.filter((x) => f.includes(x)).length;
  return { contatti: n, provaFissata: c('prova_fissata', 'prova_fatta', 'iscritto'), provaFatta: c('prova_fatta', 'iscritto'), iscritti: c('iscritto'), chiusi: c('non_prosegue'), inCorso: c('interessato', 'prova_fissata', 'prova_fatta') };
}

export const percentuale = (a: number, b: number): number => (b ? Math.round((a / b) * 100) : 0);

// ---- Conversioni dei contatti e confronto con il periodo prima ----

export type ContattoStat = { fase: FaseContatto; creatoIl: string; haAvutoProva: boolean; assenze: number; fonte: string | null; motivoChiusura: string | null };

export type Conversioni = {
  /** contatti "maturi": chi ha scritto da meno di una settimana e non è ancora andato avanti non pesa sulle percentuali */
  n: number;
  /** con una prova fissata (adesso o in passato) */
  p: number;
  /** prova fatta */
  f: number;
  /** con almeno un'assenza alla prova */
  assenti: number;
  iscritti: number;
  /** chiusi dopo essere venuti alla prova (approssimato: ha avuto una prova e non è mai mancato) */
  persiDopo: number;
  /** chi ha già deciso: iscritti più chiusi */
  decisi: number;
};

export function conversioni(contatti: readonly ContattoStat[], oggi: string): Conversioni {
  const sogliaNuovi = aggiungiGiorni(oggi, -7);
  const maturi = contatti.filter((c) => !(c.fase === 'interessato' && c.creatoIl.slice(0, 10) > sogliaNuovi));
  const iscritti = contatti.filter((c) => c.fase === 'iscritto').length;
  const chiusi = contatti.filter((c) => c.fase === 'non_prosegue');
  return {
    n: maturi.length,
    p: contatti.filter((c) => c.fase === 'prova_fissata' || c.fase === 'prova_fatta' || c.fase === 'iscritto' || c.haAvutoProva).length,
    f: contatti.filter((c) => c.fase === 'prova_fatta' || c.fase === 'iscritto').length,
    assenti: contatti.filter((c) => c.assenze > 0).length,
    iscritti,
    persiDopo: chiusi.filter((c) => c.haAvutoProva && c.assenze === 0).length,
    decisi: iscritti + chiusi.length,
  };
}

/** Percentuale intera, oppure null quando il dato non si può calcolare (nessuno ha ancora deciso). */
export const rapporto = (a: number, b: number): number | null => (b ? Math.round((a / b) * 100) : null);

export type Indicatore = { chiave: string; titolo: string; valore: number | null; prima: number | null; unita: string; spiegazione: string; menoEMeglio?: boolean };

export function indicatoriConversione(k: Conversioni, k0: Conversioni, periodoPrecedenteVuoto: boolean): Indicatore[] {
  return [
    { chiave: 'tutti', titolo: 'Contatto → prova', valore: rapporto(k.p, k.n), prima: rapporto(k0.p, k0.n), unita: '%', spiegazione: 'Quanti di chi ci scrive arriva a fissare una prova.' },
    { chiave: 'prove', titolo: 'Presenza alla prova', valore: rapporto(k.f, k.f + k.assenti), prima: rapporto(k0.f, k0.f + k0.assenti), unita: '%', spiegazione: 'Quante prove fissate si fanno davvero.' },
    { chiave: 'fatte', titolo: 'Prova → iscrizione', valore: rapporto(k.iscritti, k.iscritti + k.persiDopo), prima: rapporto(k0.iscritti, k0.iscritti + k0.persiDopo), unita: '%', spiegazione: 'Il numero più importante: quante prove diventano iscritti.' },
    { chiave: 'decisi', titolo: 'Contatto → iscritto', valore: rapporto(k.iscritti, k.decisi), prima: rapporto(k0.iscritti, k0.decisi), unita: '%', spiegazione: 'Il percorso intero, dal primo messaggio.' },
    { chiave: 'iscritto', titolo: 'Nuovi iscritti', valore: k.iscritti, prima: periodoPrecedenteVuoto ? null : k0.iscritti, unita: '', spiegazione: 'Persone passate da contatto a iscritto.' },
  ];
}

export type Confronto = { testo: string; esito: 'su' | 'giu' | 'pari' | 'nessuno' };

/** La riga sotto un indicatore: "▲ +4 punti rispetto ai 30 giorni prima". Quando il confronto non c'è lo dice. */
export function confrontoConPrima(i: Pick<Indicatore, 'valore' | 'prima' | 'unita' | 'menoEMeglio'>, giorni: number): Confronto {
  if (i.valore === null || i.prima === null) return { testo: 'nessun confronto', esito: 'nessuno' };
  const x = i.valore - i.prima;
  if (!x) return { testo: `come nei ${giorni} giorni prima`, esito: 'pari' };
  const bene = i.menoEMeglio ? x < 0 : x > 0;
  return { testo: `${x > 0 ? '▲ +' : '▼ −'}${Math.abs(x)}${i.unita === '%' ? ' punti' : i.unita} rispetto ai ${giorni} giorni prima`, esito: bene ? 'su' : 'giu' };
}

/** Dove si perdono le persone: tra chi ha chiuso, prima della prova, per assenza o dopo la prova. */
export function doveSiPerdono(contatti: readonly ContattoStat[]) {
  const chiusi = contatti.filter((c) => c.fase === 'non_prosegue');
  return {
    prima: chiusi.filter((c) => !c.haAvutoProva).length,
    assenti: chiusi.filter((c) => c.haAvutoProva && c.assenze > 0).length,
    dopo: chiusi.filter((c) => c.haAvutoProva && c.assenze === 0).length,
    totale: chiusi.length,
  };
}

export const CONSIGLIO_PERDITA: Record<'prima' | 'assenti' | 'dopo', { nome: string; consiglio: string }> = {
  prima: { nome: 'prima della prova', consiglio: 'Rispondi e proponi un giorno entro 24 ore: più passa il tempo, meno prove si fissano.' },
  assenti: { nome: 'alla prova, perché non si presentano', consiglio: 'Manda un promemoria il giorno prima della prova.' },
  dopo: { nome: 'dopo la prova', consiglio: 'Scrivi entro 2 giorni dalla prova, quando il ricordo è fresco.' },
};
