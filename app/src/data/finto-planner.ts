// Base dati finta in memoria con le stesse funzioni di data/planner.ts (solo per la galleria di prova in sviluppo).
import type * as Reale from './planner';
import type { EventoPlanner, SalvataggioPost } from '../domain/planner';

const ok = { ok: true } as const;
const post: Record<string, Partial<SalvataggioPost>> = {};
const manuali: EventoPlanner[] = [
  { id: 'm1', tipo: 'conferenza', titolo: 'Serata sul respiro', data: '2026-11-27', fine: null, luogo: 'Studio Yoga Tribù', prezzoEuro: 0, posti: 0, con: 'Glenda', orario: null, completo: false, extra: {} },
];
const extra: Record<string, Reale.Extra> = {};

export const elencaPost: typeof Reale.elencaPost = async () => ({ ...post });
export const salvaPost: typeof Reale.salvaPost = async (_s, id, patch, attuale = {}) => {
  post[id] = { ...attuale, ...patch };
  return ok;
};
export const elencaEventiManuali: typeof Reale.elencaEventiManuali = async () => manuali.map((x) => ({ ...x }));
export const salvaEventoManuale: typeof Reale.salvaEventoManuale = async (_s, n) => {
  const nuovo: EventoPlanner = { id: n.id ?? `m${manuali.length + 2}`, tipo: n.tipo, titolo: n.titolo, data: n.data, fine: null, luogo: n.luogo, prezzoEuro: n.prezzoEuro, posti: n.posti, con: n.con, orario: null, completo: false, extra: n.extra };
  const i = manuali.findIndex((x) => x.id === nuovo.id);
  if (i >= 0) manuali[i] = nuovo;
  else manuali.push(nuovo);
  return ok;
};
export const elencaExtra: typeof Reale.elencaExtra = async () => ({ ...extra });
export const salvaExtra: typeof Reale.salvaExtra = async (_s, id, e) => {
  extra[id] = e;
  return ok;
};
