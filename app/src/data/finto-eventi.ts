// Base dati finta in memoria con le stesse funzioni di data/eventi.ts (solo per la galleria di prova in sviluppo).
import type * as Reale from './eventi';
import { aggiungiGiorni, oggi } from '../domain/date';
import { dateIncontri, orarioPercorso, PASSI, type Evento, type Iscrizione } from '../domain/eventi';

const ok = { ok: true } as const;
const base = (id: string, passo: Evento['passo'] & string, da: string, o: Partial<Evento> = {}): Evento => {
  const date = dateIncontri(da, 4);
  return {
    id, tipo: 'percorso', titolo: PASSI[passo].nome, descrizione: PASSI[passo].descrizione, da, a: date[3], dateIncontri: date, ora: PASSI[passo].ora,
    orario: orarioPercorso(da, PASSI[passo].ora, 4), luogo: 'Studio Yoga Tribù · San Giuseppe di Cassola', prezzoCent: null, suRichiesta: true, posti: 15,
    iscrittiFissi: 9, listaFissa: 0, studioOrigine: 'tribu', soloStudio: 'tribu', insegnanti: ['Sara Zampierin'], passo, chiuso: false, ...o,
  };
};
const eventi: Evento[] = [
  base('p1', 'neonatale', aggiungiGiorni(oggi(), -24), { iscrittiFissi: 12 }),
  base('p2', 'postparto', aggiungiGiorni(oggi(), 14), { iscrittiFissi: 14 }),
  base('p3', 'gravidanza', aggiungiGiorni(oggi(), 28), { iscrittiFissi: 5 }),
  {
    id: 'w1', tipo: 'workshop', titolo: 'Approfondimento', descrizione: null, da: aggiungiGiorni(oggi(), 12), a: null, dateIncontri: null, ora: '9:00', orario: null,
    luogo: 'Studio Yoga Tribù · San Giuseppe di Cassola', prezzoCent: 3000, suRichiesta: false, posti: 15, iscrittiFissi: 6, listaFissa: 0, studioOrigine: 'tribu',
    soloStudio: null, insegnanti: ['Glenda', 'Mattia'], passo: null, chiuso: false,
  },
];
const iscrizioni: Iscrizione[] = [
  { id: 'i1', eventoId: 'p1', personId: 'p1', nome: 'Chiara Bianchi', stato: 'confermata', messaggio: null, studioId: 'tribu' },
  { id: 'i2', eventoId: 'p1', personId: 'p2', nome: 'Marco Rossi', stato: 'confermata', messaggio: 'proposto', studioId: 'tribu' },
  { id: 'i3', eventoId: 'p2', personId: 'p4', nome: 'Giulia Moretti', stato: 'in_attesa', messaggio: null, studioId: 'tribu' },
  { id: 'i4', eventoId: 'p2', personId: 'p6', nome: 'Anna Greco', stato: 'lista', messaggio: null, studioId: 'tribu' },
];
let n = 0;

export const elencaEventi: typeof Reale.elencaEventi = async () => eventi.map((x) => ({ ...x }));
export const elencaIscrizioni: typeof Reale.elencaIscrizioni = async () => iscrizioni.map((x) => ({ ...x }));
export const postiPresi: typeof Reale.postiPresi = async (id) => {
  const e = eventi.find((x) => x.id === id);
  return e ? e.iscrittiFissi + iscrizioni.filter((i) => i.eventoId === id && i.stato !== 'lista').length : null;
};
export const creaEvento: typeof Reale.creaEvento = async (studio, d) => {
  eventi.push({ id: `w${100 + ++n}`, tipo: d.tipo, titolo: d.titolo, descrizione: d.descrizione || null, da: d.da, a: d.tipo === 'ritiro' ? d.a : null, dateIncontri: null, ora: d.ora, orario: null, luogo: d.luogo, prezzoCent: d.prezzoEuro * 100, suRichiesta: false, posti: d.posti, iscrittiFissi: 0, listaFissa: 0, studioOrigine: studio, soloStudio: null, insegnanti: d.insegnanti, passo: null, chiuso: false });
  return ok;
};
export const creaPercorso: typeof Reale.creaPercorso = async (studio, passo, primo, incontri, posti, luogo) => {
  const date = dateIncontri(primo, incontri);
  eventi.push(base(`p${100 + ++n}`, passo, primo, { dateIncontri: date, a: date[date.length - 1], posti, iscrittiFissi: 0, luogo, studioOrigine: studio, orario: orarioPercorso(primo, PASSI[passo].ora, incontri) }));
  return ok;
};
export const eliminaEvento: typeof Reale.eliminaEvento = async (id) => {
  const i = eventi.findIndex((x) => x.id === id);
  if (i >= 0) eventi.splice(i, 1);
  return ok;
};
export const impostaChiuso: typeof Reale.impostaChiuso = async (id, chiuso) => {
  const e = eventi.find((x) => x.id === id);
  if (e) e.chiuso = chiuso;
  return ok;
};
export const iscriviPersona: typeof Reale.iscriviPersona = async (studio, eventoId, p, stato) => {
  iscrizioni.push({ id: `i${100 + ++n}`, eventoId, personId: p.id, nome: p.nome, stato, messaggio: null, studioId: studio });
  return ok;
};
export const cambiaStatoIscrizione: typeof Reale.cambiaStatoIscrizione = async (id, stato) => {
  const i = iscrizioni.find((x) => x.id === id);
  if (i) i.stato = stato;
  return ok;
};
export const segnaMessaggio: typeof Reale.segnaMessaggio = async (id, m) => {
  const i = iscrizioni.find((x) => x.id === id);
  if (i) i.messaggio = m;
  return ok;
};
export const togliIscrizione: typeof Reale.togliIscrizione = async (id) => {
  const i = iscrizioni.findIndex((x) => x.id === id);
  if (i >= 0) iscrizioni.splice(i, 1);
  return ok;
};
