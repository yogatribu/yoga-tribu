// Base dati finta in memoria con le stesse funzioni di data/ciclo.ts (solo per la galleria di prova in sviluppo).
import type * as Reale from './ciclo';
import type { TemaMese } from '../domain/ciclo';

const temi = new Map<string, TemaMese>([
  ['2026-10', { tema: 'Osservare', testo: "Prima di cambiare qualcosa, guardarla. Questo mese portiamo l'attenzione su come ti muovi, come respiri, come reagisci.", libro: 'Titolo del libro', autore: 'Autore', articolo: '' }],
  ['2026-11', { tema: 'Stabilità', testo: 'Con il freddo che arriva cerchiamo un punto fermo: nel corpo, nel respiro, nelle abitudini.', libro: '', autore: '', articolo: '' }],
  ['2026-12', { tema: 'Desiderio', testo: 'Tra feste e fretta, capire cosa vuoi davvero e cosa è solo rumore.', libro: '', autore: '', articolo: '' }],
]);

export const elencaTemi: typeof Reale.elencaTemi = async () => new Map([...temi].map(([k, v]) => [k, { ...v }]));
export const salvaTema: typeof Reale.salvaTema = async (_s, mese, t) => {
  temi.set(mese, { ...t });
  return { ok: true };
};
