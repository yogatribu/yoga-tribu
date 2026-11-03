// Base dati finta in memoria con le stesse funzioni di data/private.ts (solo per la galleria di prova in sviluppo).
import type * as Reale from './private';
import { aggiungiGiorni, oggi } from '../domain/date';
import { ORE_DI_PARTENZA, type Disponibilita } from '../domain/private';

const ok = { ok: true } as const;
const disp: Disponibilita[] = Object.entries(ORE_DI_PARTENZA).map(([g, ore]) => ({ insegnanteId: 't1', giorno: Number(g), data: null, ore }));
const lista: Reale.Privata[] = [
  { id: 'v1', studio: 'tribu', personaId: 'p1', insegnanteId: 't1', n: 2, stile: 'iyengar', data: aggiungiGiorni(oggi(), 2), ora: '15:00', note: 'Veniamo in due, io ho male alla spalla.', prezzoCent: 8000, stato: 'attesa', creatoIl: new Date().toISOString() },
  { id: 'v2', studio: 'tribu', personaId: 'p2', insegnanteId: 't1', n: 1, stile: 'iyengar', data: aggiungiGiorni(oggi(), 4), ora: '16:00', note: null, prezzoCent: 4500, stato: 'confermata', creatoIl: new Date().toISOString() },
];
let n = 100;

export const elencaDisponibilita: typeof Reale.elencaDisponibilita = async () => disp.map((x) => ({ ...x, ore: [...x.ore] }));
export const salvaOre: typeof Reale.salvaOre = async (_s, insegnanteId, quando, ore) => {
  const t = disp.find((x) => x.insegnanteId === insegnanteId && ('giorno' in quando ? x.giorno === quando.giorno : x.data === quando.data));
  if (t) t.ore = [...ore];
  else disp.push({ insegnanteId, giorno: 'giorno' in quando ? quando.giorno : null, data: 'data' in quando ? quando.data : null, ore: [...ore] });
  return ok;
};
export const ripristinaData: typeof Reale.ripristinaData = async (insegnanteId, data) => {
  const i = disp.findIndex((x) => x.insegnanteId === insegnanteId && x.data === data);
  if (i >= 0) disp.splice(i, 1);
  return ok;
};
export const elencaPrivate: typeof Reale.elencaPrivate = async () => lista.map((x) => ({ ...x }));
export const creaPrivata: typeof Reale.creaPrivata = async (studio, p, auto) => {
  lista.push({ id: `v${++n}`, studio, personaId: p.personaId, insegnanteId: p.insegnanteId, n: p.n, stile: p.stile, data: p.data, ora: p.ora, note: p.note || null, prezzoCent: p.prezzoCent, stato: auto ? 'confermata' : 'attesa', creatoIl: new Date().toISOString() });
  return ok;
};
export const cambiaStatoPrivata: typeof Reale.cambiaStatoPrivata = async (id, stato) => {
  const t = lista.find((x) => x.id === id);
  if (t) t.stato = stato;
  return ok;
};
