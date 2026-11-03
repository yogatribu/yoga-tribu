// Regole degli eventi condivisi e dei percorsi di Sara. Funzioni pure; le date sono "AAAA-MM-GG".
import { aggiungiGiorni, giornoDellaSettimana } from './date.ts';

export const TIPI_EVENTO = ['workshop', 'seminario', 'incontro', 'ritiro'] as const;
export type TipoEvento = (typeof TIPI_EVENTO)[number];
export const NOME_TIPO: Record<TipoEvento | 'percorso', string> = {
  workshop: 'Workshop', seminario: 'Seminario', incontro: 'Incontro', ritiro: 'Ritiro', percorso: 'Percorso con Sara',
};

export type Passo = 'gravidanza' | 'neonatale' | 'postparto' | 'pertutti';

// I quattro percorsi di Sara e la scala: gravidanza, poi neonatale e post parto, poi per tutti, poi le lezioni dello studio.
export const PASSI: Record<Passo, { nome: string; ora: string; dopo: Passo[]; descrizione: string; frase: string }> = {
  gravidanza: {
    nome: 'Pavimento pelvico in gravidanza', ora: '20:00', dopo: ['neonatale', 'postparto'],
    descrizione: "Metodo De Gasquet: l'approccio posturo-respiratorio per accompagnare il corpo durante la gravidanza. Si lavora su postura e respiro, su come gestire gli sforzi e sul perineo.",
    frase: 'Dopo la nascita ripartiamo con il massaggio neonatale, per bambini da 0 a 7 mesi, e con il pavimento pelvico post parto. Vuoi che ti avvisi appena apriamo i posti?',
  },
  neonatale: {
    nome: 'Massaggio neonatale', ora: '10:15', dopo: ['postparto'],
    descrizione: 'Un tempo di ascolto, presenza e contatto, in uno spazio di condivisione e accoglienza. Per bambini da 0 a 7 mesi.',
    frase: "Per continuare c'è il pavimento pelvico post parto, a cui puoi venire anche con il tuo bambino o la tua bambina. Vuoi che ti avvisi appena apriamo i posti?",
  },
  postparto: {
    nome: 'Pavimento pelvico post parto', ora: '10:15', dopo: ['pertutti'],
    descrizione: "Metodo De Gasquet: l'approccio posturo-respiratorio per ritrovare il corpo dopo il parto. Puoi partecipare con il tuo bambino o la tua bambina.",
    frase: "Ora c'è il pavimento pelvico per tutti, ed è un buon momento per provare anche una lezione di yoga in studio. Vuoi che ti dia le date?",
  },
  pertutti: {
    nome: 'Pavimento pelvico per tutti', ora: '8:45', dopo: [],
    descrizione: "Metodo De Gasquet: l'approccio posturo-respiratorio, in ogni fase della vita. Si lavora su postura e respiro, su come gestire gli sforzi e sul perineo.",
    frase: 'In studio puoi provare una lezione di yoga: scrivimi e ti consiglio quella più adatta. Vuoi che ti dia le date?',
  },
};
export const ORDINE_PASSI: Passo[] = ['gravidanza', 'neonatale', 'postparto', 'pertutti'];

export type Evento = {
  id: string;
  tipo: TipoEvento | 'percorso';
  titolo: string;
  descrizione: string | null;
  da: string;
  a: string | null;
  dateIncontri: string[] | null;
  ora: string | null;
  orario: string | null;
  luogo: string;
  prezzoCent: number | null;
  suRichiesta: boolean;
  posti: number;
  iscrittiFissi: number;
  listaFissa: number;
  studioOrigine: string;
  soloStudio: string | null;
  insegnanti: string[];
  passo: Passo | null;
  chiuso: boolean;
};

export type Iscrizione = { id: string; eventoId: string; personId: string | null; nome: string; stato: 'in_attesa' | 'confermata' | 'lista'; messaggio: 'proposto' | 'rimandato' | null; studioId: string };

/** Posti presi: gli iscritti fuori dall'app più chi è in attesa o confermato. La lista d'attesa non occupa posti. */
export function occupati(e: Pick<Evento, 'iscrittiFissi'>, iscrizioni: readonly Pick<Iscrizione, 'stato'>[]): number {
  return e.iscrittiFissi + iscrizioni.filter((i) => i.stato === 'in_attesa' || i.stato === 'confermata').length;
}

export function liberi(e: Pick<Evento, 'posti' | 'iscrittiFissi'>, iscrizioni: readonly Pick<Iscrizione, 'stato'>[]): number {
  return Math.max(0, e.posti - occupati(e, iscrizioni));
}

/** Al completo se non ci sono posti liberi o se le iscrizioni sono state chiuse a mano. */
export function completo(e: Pick<Evento, 'posti' | 'iscrittiFissi' | 'chiuso'>, iscrizioni: readonly Pick<Iscrizione, 'stato'>[]): boolean {
  return e.chiuso || liberi(e, iscrizioni) === 0;
}

export function stato(e: Pick<Evento, 'posti' | 'iscrittiFissi' | 'chiuso'>, iscrizioni: readonly Pick<Iscrizione, 'stato'>[]): { testo: 'Al completo' | 'Ultimi posti' | 'Aperto'; tono: 'w' | 'ok' } {
  if (completo(e, iscrizioni)) return { testo: 'Al completo', tono: 'w' };
  return liberi(e, iscrizioni) <= 3 ? { testo: 'Ultimi posti', tono: 'w' } : { testo: 'Aperto', tono: 'ok' };
}

export type FasePercorso = 'prossimo' | 'incorso' | 'finito';

export function fine(e: Pick<Evento, 'da' | 'a'>): string {
  return e.a ?? e.da;
}

export function fase(e: Pick<Evento, 'da' | 'a'>, oggi: string): FasePercorso {
  return fine(e) < oggi ? 'finito' : e.da <= oggi ? 'incorso' : 'prossimo';
}

/** Il prossimo incontro di un percorso, con il numero d'ordine; null se sono finiti. */
export function prossimoIncontro(e: Pick<Evento, 'da' | 'dateIncontri'>, oggi: string): { data: string; n: number; tot: number } | null {
  const l = e.dateIncontri && e.dateIncontri.length ? e.dateIncontri : [e.da];
  const i = l.findIndex((d) => d >= oggi);
  return i < 0 ? null : { data: l[i], n: i + 1, tot: l.length };
}

/** I percorsi appena finiti (o che finiscono entro una settimana): sono le persone a cui proporre il passo dopo. */
export function coorti(percorsi: readonly Evento[], oggi: string): Evento[] {
  return percorsi.filter((e) => fase(e, oggi) !== 'prossimo' && fine(e) >= aggiungiGiorni(oggi, -60) && fine(e) <= aggiungiGiorni(oggi, 7));
}

export function testoPassoSuccessivo(passo: Passo, nome: string): string {
  return `Ciao ${nome.trim().split(/\s+/)[0]}, è stato un piacere averti nel percorso. ${PASSI[passo].frase} Sara`;
}

/** Gli incontri sono una volta a settimana, alla stessa ora: la data di ognuno. */
export function dateIncontri(primo: string, incontri: number): string[] {
  return Array.from({ length: incontri }, (_, i) => aggiungiGiorni(primo, i * 7));
}

export type Validazione = { ok: true } | { ok: false; motivo: string };

export function validaNuovoPercorso(primo: string, incontri: number, posti: number, oggi: string): Validazione {
  if (!primo) return { ok: false, motivo: 'Scegli la data del primo incontro.' };
  if (primo < oggi) return { ok: false, motivo: 'Il primo incontro non può essere nel passato.' };
  if (!Number.isInteger(incontri) || incontri < 1 || incontri > 12) return { ok: false, motivo: 'Gli incontri devono essere da 1 a 12.' };
  if (!Number.isInteger(posti) || posti < 1) return { ok: false, motivo: 'I posti devono essere almeno 1.' };
  return { ok: true };
}

export function validaNuovoEvento(titolo: string, tipo: TipoEvento, da: string, a: string, posti: number): Validazione {
  if (titolo.trim() === '') return { ok: false, motivo: 'Scrivi il titolo.' };
  if (!da) return { ok: false, motivo: 'Scegli la data.' };
  if (tipo === 'ritiro' && (!a || a < da)) return { ok: false, motivo: 'La data finale va dopo quella iniziale.' };
  if (!Number.isInteger(posti) || posti < 1) return { ok: false, motivo: 'I posti devono essere almeno 1.' };
  return { ok: true };
}

/** "Giovedì 20:00 · 4 incontri" per un percorso che parte il giorno indicato. */
export function orarioPercorso(primo: string, ora: string, incontri: number): string {
  const g = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'][giornoDellaSettimana(primo)];
  return `${g.charAt(0).toUpperCase()}${g.slice(1)} ${ora} · ${incontri} incontri`;
}
