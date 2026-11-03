// Base dati finta in memoria con le stesse funzioni di data/prenotazioni.ts (solo per la galleria di prova in sviluppo).
import type * as Reale from './prenotazioni';
import { aggiungiGiorni, oggi } from '../domain/date';
import { disdettaInTempo, minutiAllaLezione, type Prenotazione } from '../domain/prenotazioni';

const ok = { ok: true } as const;
const g = oggi();
const pren: (Prenotazione & { creato: string })[] = [
  ...['p1', 'p3', 'p4', 'p5'].map((id, i) => ({ id: `b${i}`, modelloId: 'm2', data: g, personId: id, stato: 'prenotata' as const, disdettaIl: null, minutiPrima: null, creato: '2026-10-30' })),
  { id: 'b10', modelloId: 'm2', data: g, personId: 'p6', stato: 'lista' as const, disdettaIl: null, minutiPrima: null, creato: '2026-10-31' },
  { id: 'b11', modelloId: 'm1', data: aggiungiGiorni(g, -3), personId: 'p1', stato: 'prenotata' as const, disdettaIl: null, minutiPrima: null, creato: '2026-10-20' },
  { id: 'b12', modelloId: 'm1', data: aggiungiGiorni(g, -20), personId: 'p4', stato: 'prenotata' as const, disdettaIl: null, minutiPrima: null, creato: '2026-10-01' },
  { id: 'b13', modelloId: 'm1', data: aggiungiGiorni(g, -50), personId: 'p5', stato: 'prenotata' as const, disdettaIl: null, minutiPrima: null, creato: '2026-09-01' },
  { id: 'b14', modelloId: 'm1', data: aggiungiGiorni(g, -1), personId: 'p3', stato: 'tardiva' as const, disdettaIl: null, minutiPrima: 45, creato: '2026-10-20' },
];
let n = 100;

export const elencaPrenotazioni: typeof Reale.elencaPrenotazioni = async (_s, da, a) => pren.filter((x) => x.data >= da && x.data <= a).map((x) => ({ ...x }));
export const prenota: typeof Reale.prenota = async (_s, m, data, p) => {
  pren.push({ id: `b${++n}`, modelloId: m.id, data, personId: p.id, stato: 'prenotata', disdettaIl: null, minutiPrima: null, creato: new Date().toISOString() });
  return ok;
};
export const mettiInLista: typeof Reale.mettiInLista = async (_s, m, data, personId) => {
  pren.push({ id: `b${++n}`, modelloId: m.id, data, personId, stato: 'lista', disdettaIl: null, minutiPrima: null, creato: new Date().toISOString() });
  return ok;
};
export const disdici: typeof Reale.disdici = async (_s, b, m, _p, adesso, candidati) => {
  const minuti = minutiAllaLezione(b.data, m.ora, adesso);
  const inTempo = disdettaInTempo(minuti);
  const x = pren.find((y) => y.id === b.id);
  if (x) { x.stato = inTempo ? 'annullata' : 'tardiva'; x.minutiPrima = minuti; }
  const primo = candidati.find((c) => c.persona.creditiIllimitati || c.persona.saldo > 0);
  if (primo) { const y = pren.find((z) => z.id === primo.prenotazione.id); if (y) y.stato = 'prenotata'; }
  return { ok: true, tardiva: !inTempo, entrata: primo ? primo.persona.nome : null };
};
export const restituisciCredito: typeof Reale.restituisciCredito = async (_s, b) => {
  const x = pren.find((y) => y.id === b.id);
  if (x) x.stato = 'restituita';
  return ok;
};
