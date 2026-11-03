// Base dati finta in memoria con le stesse funzioni di data/impostazioni.ts (solo per la galleria di prova in sviluppo).
import type * as Reale from './impostazioni';
import type { CampoContatto, Insegnante } from '../domain/impostazioni';
import { PROMEMORIA_PREDEFINITI, type Promemoria } from '../domain/leads';

const ok = { ok: true } as const;
const ins: Insegnante[] = [
  { id: 't1', nome: 'Glenda', email: 'glenda@yogatribu.it', stili: ['iyengar'], faPrivate: true, responsabile: true, privateAuto: false },
  { id: 't2', nome: 'Victor', email: null, stili: ['ashtanga'], faPrivate: true, responsabile: false, privateAuto: false },
  { id: 't3', nome: 'Giulia', email: null, stili: ['flow'], faPrivate: false, responsabile: false, privateAuto: false },
  { id: 't4', nome: 'Sara', email: null, stili: [], faPrivate: false, responsabile: false, privateAuto: false },
];
const campi: CampoContatto[] = [{ id: 'c1', nome: 'Obiettivo', tipo: 'scelta', opzioni: ['Schiena', 'Stress', 'Forza', 'Flessibilità'] }];
const fisse: Record<string, { stili: string[]; quante: number }> = { Glenda: { stili: ['iyengar'], quante: 9 }, Victor: { stili: ['ashtanga'], quante: 5 }, Giulia: { stili: ['flow'], quante: 3 } };
let n = 0;

export const elencaInsegnanti: typeof Reale.elencaInsegnanti = async () => ins.map((x) => ({ ...x }));
export const lezioniFisse: typeof Reale.lezioniFisse = async (_s, nome) => fisse[nome] ?? { stili: [], quante: 0 };
export const aggiungiInsegnante: typeof Reale.aggiungiInsegnante = async (_s, x) => {
  ins.push({ id: `t${100 + ++n}`, nome: x.nome, email: x.email || null, stili: x.stili, faPrivate: x.faPrivate, responsabile: x.responsabile, privateAuto: false });
  return ok;
};
export const aggiornaInsegnante: typeof Reale.aggiornaInsegnante = async (id, c) => {
  const t = ins.find((y) => y.id === id);
  if (t) Object.assign(t, c);
  return ok;
};
export const togliInsegnante: typeof Reale.togliInsegnante = async (id) => {
  const i = ins.findIndex((y) => y.id === id);
  if (i >= 0) ins.splice(i, 1);
  return ok;
};
export const elencaCampi: typeof Reale.elencaCampi = async () => campi.map((x) => ({ ...x }));
export const aggiungiCampo: typeof Reale.aggiungiCampo = async (_s, nome, tipo, opzioni) => {
  campi.push({ id: `c${100 + ++n}`, nome, tipo, opzioni });
  return ok;
};
export const togliCampo: typeof Reale.togliCampo = async (id) => {
  const i = campi.findIndex((y) => y.id === id);
  if (i >= 0) campi.splice(i, 1);
  return ok;
};
let promemoria: Promemoria = { ...PROMEMORIA_PREDEFINITI };
export const leggiPromemoria: typeof Reale.leggiPromemoria = async () => ({ ...promemoria });
export const salvaPromemoria: typeof Reale.salvaPromemoria = async (_s, p) => {
  promemoria = { ...p };
  return ok;
};
export const impostaConfermaAutomatica: typeof Reale.impostaConfermaAutomatica = async (id, acceso) => {
  const t = ins.find((y) => y.id === id);
  if (t) t.privateAuto = acceso;
  return ok;
};

let regalo = { compleanni: false, anniversari: false };
export const leggiRegaloAutomatico: typeof Reale.leggiRegaloAutomatico = async () => ({ ...regalo });
export const salvaRegaloAutomatico: typeof Reale.salvaRegaloAutomatico = async (_s, tipo, acceso) => {
  regalo = { ...regalo, [tipo]: acceso };
  return ok;
};
