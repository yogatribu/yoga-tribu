// Base dati finta in memoria con le stesse funzioni di data/richieste-lezioni.ts (solo per la galleria di prova in sviluppo).
import type * as Reale from './richieste-lezioni';

const ok = { ok: true } as const;
const lista: Reale.RichiestaLezione[] = [
  { id: 'r1', studio: 'tribu', richiedente: 'Victor', giorno: 4, ora: '19:30', stile: 'ashtanga', tipo: 'Mysore serale', posti: 12, durataMin: 90, nota: 'Il giovedì sera è libero e chiedono in tanti.', stato: 'attesa', creatoIl: new Date().toISOString() },
];
let n = 10;

export const elencaRichiesteLezioni: typeof Reale.elencaRichiesteLezioni = async () => lista.map((x) => ({ ...x }));
export const chiediLezione: typeof Reale.chiediLezione = async (studio, richiedente, l) => {
  lista.unshift({ id: `r${n++}`, studio, richiedente, ...l, nota: l.nota.trim() || null, stato: 'attesa', creatoIl: new Date().toISOString() });
  return ok;
};
export const decidiRichiestaLezione: typeof Reale.decidiRichiestaLezione = async (id, approva) => {
  const r = lista.find((x) => x.id === id);
  if (r) r.stato = approva ? 'approvata' : 'rifiutata';
  return ok;
};
