// Base dati finta in memoria con le stesse funzioni di data/persone.ts. Serve alla galleria di prova (solo sviluppo),
// per vedere e confrontare le schermate con il prototipo senza accedere né toccare il database.
import type * as Reale from './persone';
import { oggi } from '../domain/date';
import { aggiungiGiorni } from '../domain/date';
import type { Acquisto, Persona, VoceRegistro } from '../domain/persone';

const ok = { ok: true } as const;
const base = (id: string, nome: string, cognome: string, o: Partial<Persona> = {}): Persona => ({
  id, nome, cognome, telefono: '347 555 0110', email: null, dataNascita: '1988-03-12', fonte: 'Passaparola', tag: [],
  creditiIllimitati: false, consensoNovita: true, consensoFoto: 'si', informativaPresa: true, iscrittoIl: '2025-09-10', ...o,
});

const persone: Persona[] = [
  base('p1', 'Chiara', 'Bianchi', { tag: ['Schiena'], dataNascita: '1990-11-05', iscrittoIl: '2024-11-04' }),
  base('p2', 'Marco', 'Rossi', { telefono: null, dataNascita: null, consensoFoto: 'da_chiedere', informativaPresa: false, iscrittoIl: aggiungiGiorni(oggi(), -12) }),
  base('p3', 'Elena', 'Ferrari', { tag: ['Cervicali', 'Over 60'], creditiIllimitati: true }),
  base('p4', 'Giulia', 'Moretti', { consensoNovita: false, consensoFoto: 'no' }),
  base('p5', 'Paolo', 'Conti', { dataNascita: '1976-02-20' }),
  base('p6', 'Anna', 'Greco', { tag: ['Gravidanza'], iscrittoIl: '2026-02-01' }),
];
const acquisti = new Map<string, Acquisto[]>([
  ['p1', [{ id: 'a1', nome: '10 lezioni', crediti: 10, prezzoCent: 15000, scadeIl: aggiungiGiorni(oggi(), 6), incassato: false }]],
  ['p4', [{ id: 'a2', nome: '20 lezioni', crediti: 20, prezzoCent: 24000, scadeIl: aggiungiGiorni(oggi(), 90), incassato: true }]],
  ['p5', [{ id: 'a3', nome: '10 lezioni', crediti: 10, prezzoCent: 15000, scadeIl: aggiungiGiorni(oggi(), 30), incassato: true }]],
]);
const registro = new Map<string, VoceRegistro[]>([
  ['p1', [{ acquistoId: 'a1', delta: 10 }, { acquistoId: 'a1', delta: -7 }]],
  ['p4', [{ acquistoId: 'a2', delta: 20 }, { acquistoId: 'a2', delta: -4 }]],
  ['p5', [{ acquistoId: 'a3', delta: 10 }, { acquistoId: 'a3', delta: -9 }]],
]);
const note = new Map<string, Reale.Nota[]>([
  ['p1', [{ id: 'n1', tipo: 'salute', testo: 'Schiena: da adattare le torsioni.', creatoIl: aggiungiGiorni(oggi(), -20) + 'T10:00:00Z' }]],
]);
const pacchetti: Reale.Pacchetto[] = [
  { id: 'k1', nome: 'Lezione singola', prezzoCent: 2000, crediti: 1, validitaGiorni: null },
  { id: 'k2', nome: '10 lezioni', prezzoCent: 15000, crediti: 10, validitaGiorni: 90 },
  { id: 'k3', nome: '20 lezioni', prezzoCent: 24000, crediti: 20, validitaGiorni: 120 },
  { id: 'k4', nome: '25 lezioni', prezzoCent: 25000, crediti: 25, validitaGiorni: 60 },
];

const saldoDi = (id: string) => (registro.get(id) ?? []).reduce((s, v) => s + v.delta, 0);
const daIncassare = (id: string) => (acquisti.get(id) ?? []).filter((a) => !a.incassato).reduce((s, a) => s + a.prezzoCent, 0);
let contatore = 100;

export const elencaPersone: typeof Reale.elencaPersone = async () => persone.map((p) => ({ persona: p, saldo: saldoDi(p.id), daIncassareCent: daIncassare(p.id) }));
export const elencaAcquistiERegistro: typeof Reale.elencaAcquistiERegistro = async () => ({ acquisti, registro });
export const dettaglioPersona: typeof Reale.dettaglioPersona = async (_s, id) => ({ acquisti: acquisti.get(id) ?? [], registro: registro.get(id) ?? [], note: note.get(id) ?? [] });
export const elencaPacchetti: typeof Reale.elencaPacchetti = async () => pacchetti;
export const creaPersona: typeof Reale.creaPersona = async (_s, p) => {
  const id = `p${++contatore}`;
  persone.push(base(id, p.nome, p.cognome, { telefono: p.telefono || null, email: p.email || null, dataNascita: p.dataNascita || null, fonte: p.fonte || null, informativaPresa: p.informativaPresa, consensoNovita: p.consensoNovita, iscrittoIl: oggi() }));
  return { ok: true, id };
};
export const aggiornaPersona: typeof Reale.aggiornaPersona = async (id, campi) => {
  const p = persone.find((x) => x.id === id);
  if (p) Object.assign(p, campi);
  return ok;
};
export const aggiungiNota: typeof Reale.aggiungiNota = async (_s, id, tipo, testo) => {
  note.set(id, [{ id: `n${++contatore}`, tipo, testo, creatoIl: new Date().toISOString() }, ...(note.get(id) ?? [])]);
  return ok;
};
export const vendiPacchetto: typeof Reale.vendiPacchetto = async (_s, id, pk) => {
  const a: Acquisto = { id: `a${++contatore}`, nome: pk.nome, crediti: pk.crediti, prezzoCent: pk.prezzoCent, scadeIl: pk.validitaGiorni ? aggiungiGiorni(oggi(), pk.validitaGiorni) : null, incassato: false };
  acquisti.set(id, [a, ...(acquisti.get(id) ?? [])]);
  registro.set(id, [...(registro.get(id) ?? []), { acquistoId: a.id, delta: pk.crediti }]);
  return ok;
};
export const segnaIncassato: typeof Reale.segnaIncassato = async (aid) => {
  for (const lista of acquisti.values()) for (const a of lista) if (a.id === aid) a.incassato = true;
  return ok;
};
export const correggiCrediti: typeof Reale.correggiCrediti = async (_s, id, delta) => {
  registro.set(id, [...(registro.get(id) ?? []), { acquistoId: null, delta }]);
  return ok;
};
export const richiamiRecenti: typeof Reale.richiamiRecenti = async () => new Set();
export const segnaContattato: typeof Reale.segnaContattato = async () => ok;
export const regaloGiaFatto: typeof Reale.regaloGiaFatto = async () => false;
export const personeDiSara: typeof Reale.personeDiSara = async () => new Set();
export const regaliFatti: typeof Reale.regaliFatti = async () => new Set();
export const regalaLezione: typeof Reale.regalaLezione = async () => ok;
export const GIORNI_SILENZIO = 7;
