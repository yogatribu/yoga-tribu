// Base dati finta in memoria con le stesse funzioni di data/leads.ts (solo per la galleria di prova in sviluppo).
import type * as Reale from './leads';
import { aggiungiGiorni, oggi } from '../domain/date';
import { PROMEMORIA_PREDEFINITI, richiamoAlCambioFase, richiamoAssenza, richiamoSilenzio, rimanda, type MessaggioLead } from '../domain/leads';

const ok = { ok: true } as const;
const c = (id: string, nome: string, o: Partial<Reale.Contatto> = {}): Reale.Contatto => ({
  id, studio: 'tribu', nome, telefono: '347 555 0142', fonte: 'Instagram', cerca: 'Iyengar', nota: null, fase: 'interessato',
  richiamoIl: null, motivoChiusura: null, campi: {}, provaIl: null, provaOra: null, provaTipo: null, assenze: 0, importato: false,
  avvisatoIl: null, haAvutoProva: false, personaId: null, creatoIl: aggiungiGiorni(oggi(), -3) + 'T10:00:00Z', ...o,
});

const contatti: Reale.Contatto[] = [
  c('l1', 'Sofia Marchetti', { richiamoIl: oggi(), nota: 'Ha mal di schiena' }),
  c('l2', 'Luca Fontana', { fonte: 'Passaparola', cerca: 'Ashtanga', fase: 'prova_fissata', provaIl: aggiungiGiorni(oggi(), 1), provaOra: '18:30', provaTipo: 'Ashtanga', haAvutoProva: true }),
  c('l3', 'Martina Serra', { fase: 'prova_fatta', richiamoIl: aggiungiGiorni(oggi(), -1), cerca: 'Vinyasa', provaIl: aggiungiGiorni(oggi(), -3), provaOra: '9:00', provaTipo: 'Flow', haAvutoProva: true }),
  c('l4', 'Davide Longo', { fase: 'iscritto' }),
  c('l5', 'Silvia Ricci', { fase: 'non_prosegue', motivoChiusura: 'prezzo', assenze: 1 }),
  c('l6', 'Roberto Villa', { telefono: null, fonte: 'Google' }),
];
const eventi = new Map<string, Reale.EventoContatto[]>([
  ['l1', [{ id: 'e1', tipo: 'nota', testo: 'Primo contatto da Instagram', creatoIl: aggiungiGiorni(oggi(), -3) + 'T10:00:00Z' }]],
]);
const messaggi = new Map<string, MessaggioLead[]>([
  ['l1', [{ tipo: 'messaggio_inviato', creatoIl: aggiungiGiorni(oggi(), -2) + 'T10:00:00Z' }]],
  ['l3', [{ tipo: 'messaggio_inviato', creatoIl: aggiungiGiorni(oggi(), -3) + 'T19:00:00Z' }, { tipo: 'risposta', creatoIl: aggiungiGiorni(oggi(), -1) + 'T08:00:00Z' }]],
]);
let n = 100;
const evento = (id: string, tipo: Reale.EventoContatto['tipo'], testo: string) => eventi.set(id, [{ id: `e${++n}`, tipo, testo, creatoIl: new Date().toISOString() }, ...(eventi.get(id) ?? [])]);

export const elencaContatti: typeof Reale.elencaContatti = async () => contatti.map((x) => ({ ...x }));
export const elencaEventi: typeof Reale.elencaEventi = async (id) => eventi.get(id) ?? [];
export const elencaMessaggi: typeof Reale.elencaMessaggi = async () => new Map(messaggi);
export const creaContatto: typeof Reale.creaContatto = async (studio, d, p = PROMEMORIA_PREDEFINITI) => {
  const nuovo = c(`l${++n}`, d.nome, { studio, telefono: d.telefono || null, fonte: d.fonte || null, cerca: d.cerca || null, nota: d.nota || null, richiamoIl: richiamoSilenzio(oggi(), p), creatoIl: new Date().toISOString() });
  contatti.unshift(nuovo);
  evento(nuovo.id, 'nota', `Primo contatto da ${nuovo.fonte ?? 'Altro'}`);
  return { ok: true, contatto: { ...nuovo } };
};
export const creaContatti: typeof Reale.creaContatti = async (studio, righe, fonte, p = PROMEMORIA_PREDEFINITI) => {
  const nuove = righe.filter((r) => r.stato === 'nuovo');
  for (const r of nuove) {
    const x = c(`l${++n}`, r.nome, { studio, telefono: r.telefono || null, fonte: r.fonte || fonte, importato: true, richiamoIl: richiamoSilenzio(oggi(), p), creatoIl: new Date().toISOString() });
    contatti.unshift(x);
    evento(x.id, 'nota', 'Importato da un elenco');
  }
  return { ok: true, quanti: nuove.length };
};
export const cambiaFase: typeof Reale.cambiaFase = async (x, nuova, motivo, p = PROMEMORIA_PREDEFINITI) => {
  const t = contatti.find((y) => y.id === x.id);
  if (t) { t.fase = nuova; t.richiamoIl = richiamoAlCambioFase(nuova, oggi(), p); t.motivoChiusura = nuova === 'non_prosegue' ? (motivo ?? null) : null; }
  return ok;
};
export const fissaProva: typeof Reale.fissaProva = async (x, prova) => {
  const t = contatti.find((y) => y.id === x.id);
  if (t) Object.assign(t, { fase: 'prova_fissata', provaIl: prova.data, provaOra: prova.ora, provaTipo: prova.tipo, haAvutoProva: true, richiamoIl: null, avvisatoIl: null });
  evento(x.id, 'cambio_fase', `Prova fissata: ${prova.data} ${prova.ora} · ${prova.tipo}`);
  return ok;
};
export const segnaAssente: typeof Reale.segnaAssente = async (x, p = PROMEMORIA_PREDEFINITI) => {
  const t = contatti.find((y) => y.id === x.id);
  if (t) Object.assign(t, { fase: 'interessato', provaIl: null, provaOra: null, provaTipo: null, assenze: t.assenze + 1, richiamoIl: richiamoAssenza(oggi(), p) });
  evento(x.id, 'cambio_fase', 'Assente alla prova');
  return ok;
};
export const registraMessaggio: typeof Reale.registraMessaggio = async (x, testo, promemoriaProva, p = PROMEMORIA_PREDEFINITI) => {
  const t = contatti.find((y) => y.id === x.id);
  if (t && (t.fase === 'interessato' || t.fase === 'prova_fatta')) t.richiamoIl = richiamoSilenzio(oggi(), p);
  if (t && promemoriaProva) t.avvisatoIl = t.provaIl;
  messaggi.set(x.id, [...(messaggi.get(x.id) ?? []), { tipo: 'messaggio_inviato', creatoIl: new Date().toISOString() }]);
  evento(x.id, 'messaggio_inviato', testo);
  return ok;
};
export const registraRisposta: typeof Reale.registraRisposta = async (x, testo) => {
  messaggi.set(x.id, [...(messaggi.get(x.id) ?? []), { tipo: 'risposta', creatoIl: new Date().toISOString() }]);
  evento(x.id, 'risposta', testo);
  return ok;
};
export const collegaPersona: typeof Reale.collegaPersona = async (x, personaId) => {
  const t = contatti.find((y) => y.id === x.id);
  if (t) Object.assign(t, { fase: 'iscritto', personaId, richiamoIl: null });
  return ok;
};
export const rimandaRichiamo: typeof Reale.rimandaRichiamo = async (x, quando) => {
  const t = contatti.find((y) => y.id === x.id);
  if (t) t.richiamoIl = rimanda(oggi(), quando);
  return ok;
};
export const aggiungiNota: typeof Reale.aggiungiNota = async (x, testo) => {
  evento(x.id, 'nota', testo);
  return ok;
};
export const salvaCampo: typeof Reale.salvaCampo = async (x, campoId, valore) => {
  const t = contatti.find((y) => y.id === x.id);
  if (t) t.campi = { ...t.campi, [campoId]: valore };
  return ok;
};
export const salvaTelefono: typeof Reale.salvaTelefono = async (x, telefono) => {
  const t = contatti.find((y) => y.id === x.id);
  if (t) t.telefono = telefono.trim();
  return ok;
};
