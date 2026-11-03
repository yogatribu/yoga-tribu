// Base dati finta in memoria con le stesse funzioni di data/comunicazioni.ts (solo per la galleria di prova in sviluppo).
import type * as Reale from './comunicazioni';

const ok = { ok: true } as const;
const richieste: Reale.Richiesta[] = [
  { id: 'r1', personaId: 'p1', categoria: 'Pacchetto', lezione: null, testo: 'Ho un pacchetto che scade tra poco e sono stato fermo per una settimana. Posso recuperare?', risposta: null, creatoIl: new Date().toISOString() },
];
const avvisi: Reale.AvvisoInviato[] = [];
let n = 0;

export const elencaRichieste: typeof Reale.elencaRichieste = async () => richieste.map((x) => ({ ...x }));
export const rispondiRichiesta: typeof Reale.rispondiRichiesta = async (id, testo) => {
  const t = richieste.find((x) => x.id === id);
  if (t) t.risposta = testo;
  return ok;
};
export const elencaAvvisi: typeof Reale.elencaAvvisi = async () => avvisi.map((x) => ({ ...x }));
export const salvaAvviso: typeof Reale.salvaAvviso = async (_s, a, persone) => {
  avvisi.unshift({ id: `a${++n}`, ...a, destinatari: persone.length, creatoIl: new Date().toISOString() });
  return ok;
};
