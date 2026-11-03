// Base dati finta in memoria con le stesse funzioni di data/programma.ts (solo per la galleria di prova in sviluppo).
import type * as Reale from './programma';
import { lezioniDaFermare, type GruppoBlocco, type Modello } from '../domain/programma';

const ok = { ok: true } as const;
const m = (id: string, giorno: number, ora: string, stile: string, tipo: string, insegnante: string): Modello => ({ id, giorno, ora, stile, tipo, insegnante, durataMin: null, posti: 15, attivo: true });
const modelli: Modello[] = [
  m('m1', 1, '07:00', 'iyengar', 'Flessibilità', 'Glenda'), m('m2', 1, '19:15', 'iyengar', 'Flessibilità', 'Glenda'),
  m('m3', 2, '17:30', 'ashtanga', 'Mysore', 'Victor'), m('m4', 3, '07:30', 'flow', 'Vinyasa', 'Giulia'),
  m('m5', 4, '17:30', 'ashtanga', 'Mysore', 'Victor'), m('m6', 0, '17:30', 'flow', 'Vinyasa', 'Giulia'),
];
const gruppi: GruppoBlocco[] = [{ gruppoId: 'g1', scope: 'Giulia', da: '2026-12-24', a: '2026-12-26', motivo: 'Giulia è a un ritiro', lezioni: 1 }];
let n = 0;

export const elencaModelli: typeof Reale.elencaModelli = async () => modelli.map((x) => ({ ...x }));
export const elencaBlocchi: typeof Reale.elencaBlocchi = async () => [];
export const elencaGruppiBlocco: typeof Reale.elencaGruppiBlocco = async () => gruppi.map((x) => ({ ...x }));
export const bloccaPeriodo: typeof Reale.bloccaPeriodo = async (_s, mm, scope, da, a, motivo) => {
  const k = lezioniDaFermare(mm, da, a, scope).length;
  if (k === 0) return { ok: false, motivo: 'Nel periodo scelto non ci sono lezioni da bloccare.' };
  gruppi.push({ gruppoId: `g${++n + 1}`, scope, da, a, motivo: motivo || null, lezioni: k });
  return { ok: true, fermate: k };
};
export const riattivaGruppo: typeof Reale.riattivaGruppo = async (id) => {
  const i = gruppi.findIndex((g) => g.gruppoId === id);
  if (i >= 0) gruppi.splice(i, 1);
  return ok;
};
export const aggiungiModello: typeof Reale.aggiungiModello = async (_s, l) => {
  modelli.push({ id: `m${100 + ++n}`, giorno: l.giorno, ora: l.ora, stile: l.stile, tipo: l.tipo, insegnante: l.insegnante, durataMin: l.durataMin, posti: l.posti, attivo: true, aggiuntoAMano: true });
  return ok;
};
export const togliModello: typeof Reale.togliModello = async (id) => {
  const x = modelli.find((y) => y.id === id);
  if (x) x.attivo = false;
  return ok;
};
