import { supabase } from '@/services/supabase';
import type { StudioId } from '@/config/tema';
import { oggi } from '@/domain/date';
import { scadenzaDa, type Acquisto, type Persona, type VoceRegistro } from '@/domain/persone';
import type { MotivoMessaggio } from '@/domain/messaggi';

// Accesso ai dati di persone, pacchetti, acquisti e crediti. Le regole di sicurezza sono nel database.

export type Esito = { ok: true } | { ok: false; motivo: string };
export type Pacchetto = { id: string; nome: string; prezzoCent: number; crediti: number; validitaGiorni: number | null };
export type Nota = { id: string; tipo: 'nota' | 'salute'; testo: string; creatoIl: string };
export type Scheda = { persona: Persona; saldo: number; daIncassareCent: number };
export type DettaglioPersona = { acquisti: Acquisto[]; registro: VoceRegistro[]; note: Nota[] };
export type NuovaPersona = {
  nome: string; cognome: string; telefono: string; email: string; dataNascita: string; fonte: string;
  informativaPresa: boolean; consensoNovita: boolean;
};

const ERRORE = 'Non sono riuscito a salvare. Controlla la connessione e riprova.';

function db() {
  if (!supabase) throw new Error('Supabase non collegato');
  return supabase;
}

async function utenteId(): Promise<string | null> {
  const { data } = await db().auth.getUser();
  return data.user?.id ?? null;
}

type RigaPersona = {
  id: string; nome: string; cognome: string | null; telefono: string | null; email: string | null; data_nascita: string | null;
  fonte: string | null; tag: string[]; crediti_illimitati: boolean; consenso_novita: boolean;
  consenso_foto: 'si' | 'no' | 'da_chiedere'; informativa_presa: boolean; iscritto_il: string;
};

function daRiga(r: RigaPersona): Persona {
  return {
    id: r.id, nome: r.nome, cognome: r.cognome, telefono: r.telefono, email: r.email, dataNascita: r.data_nascita,
    fonte: r.fonte, tag: r.tag ?? [], creditiIllimitati: r.crediti_illimitati, consensoNovita: r.consenso_novita,
    consensoFoto: r.consenso_foto, informativaPresa: r.informativa_presa, iscrittoIl: r.iscritto_il,
  };
}

export async function elencaPersone(studio: StudioId): Promise<Scheda[] | null> {
  const [p, t] = await Promise.all([
    db().from('people').select('*').eq('studio_id', studio).eq('attivo', true).order('nome'),
    db().from('person_totals').select('person_id, saldo, da_incassare_cent').eq('studio_id', studio),
  ]);
  if (p.error || !p.data || t.error || !t.data) return null;
  const totali = new Map(t.data.map((r) => [r.person_id as string, r]));
  return (p.data as RigaPersona[]).map((r) => ({
    persona: daRiga(r),
    saldo: Number(totali.get(r.id)?.saldo ?? 0),
    daIncassareCent: Number(totali.get(r.id)?.da_incassare_cent ?? 0),
  }));
}

export async function elencaAcquistiERegistro(studio: StudioId): Promise<{ acquisti: Map<string, Acquisto[]>; registro: Map<string, VoceRegistro[]> } | null> {
  const [a, l] = await Promise.all([
    db().from('purchases').select('id, person_id, nome, crediti, prezzo_cent, scade_il, incassato, creato_il').eq('studio_id', studio),
    db().from('credit_ledger').select('person_id, purchase_id, delta').eq('studio_id', studio),
  ]);
  if (a.error || !a.data || l.error || !l.data) return null;
  const acquisti = new Map<string, Acquisto[]>();
  for (const r of a.data) {
    const lista = acquisti.get(r.person_id) ?? [];
    lista.push({ id: r.id, nome: r.nome, crediti: r.crediti, prezzoCent: r.prezzo_cent, scadeIl: r.scade_il, incassato: r.incassato, creatoIl: r.creato_il });
    acquisti.set(r.person_id, lista);
  }
  const registro = new Map<string, VoceRegistro[]>();
  for (const r of l.data) {
    const lista = registro.get(r.person_id) ?? [];
    lista.push({ acquistoId: r.purchase_id, delta: r.delta });
    registro.set(r.person_id, lista);
  }
  return { acquisti, registro };
}

export async function dettaglioPersona(studio: StudioId, id: string): Promise<DettaglioPersona | null> {
  const [a, l, n] = await Promise.all([
    db().from('purchases').select('id, nome, crediti, prezzo_cent, scade_il, incassato').eq('person_id', id).order('creato_il', { ascending: false }),
    db().from('credit_ledger').select('purchase_id, delta').eq('person_id', id),
    db().from('person_notes').select('id, tipo, testo, creato_il').eq('person_id', id).eq('studio_id', studio).order('creato_il', { ascending: false }),
  ]);
  if (a.error || !a.data || l.error || !l.data || n.error || !n.data) return null;
  return {
    acquisti: a.data.map((r) => ({ id: r.id, nome: r.nome, crediti: r.crediti, prezzoCent: r.prezzo_cent, scadeIl: r.scade_il, incassato: r.incassato })),
    registro: l.data.map((r) => ({ acquistoId: r.purchase_id, delta: r.delta })),
    note: n.data.map((r) => ({ id: r.id, tipo: r.tipo, testo: r.testo, creatoIl: r.creato_il })),
  };
}

export async function elencaPacchetti(studio: StudioId): Promise<Pacchetto[]> {
  const { data } = await db().from('packages').select('*').eq('studio_id', studio).eq('attivo', true).order('ordine');
  return (data ?? []).map((r) => ({ id: r.id, nome: r.nome, prezzoCent: r.prezzo_cent, crediti: r.crediti, validitaGiorni: r.validita_giorni }));
}

const vuoto = (t: string) => (t.trim() === '' ? null : t.trim());

export async function creaPersona(studio: StudioId, p: NuovaPersona): Promise<{ ok: true; id: string } | { ok: false; motivo: string }> {
  const autore = await utenteId();
  if (!autore) return { ok: false, motivo: ERRORE };
  const { data, error } = await db().from('people').insert({
    studio_id: studio, nome: p.nome.trim(), cognome: vuoto(p.cognome), telefono: vuoto(p.telefono), email: vuoto(p.email),
    data_nascita: vuoto(p.dataNascita), fonte: vuoto(p.fonte), informativa_presa: p.informativaPresa, consenso_novita: p.consensoNovita,
    creato_da: autore,
  }).select('id').single();
  return error || !data ? { ok: false, motivo: ERRORE } : { ok: true, id: data.id };
}

export async function aggiornaPersona(id: string, campi: Partial<{ nome: string; cognome: string; telefono: string; email: string; dataNascita: string; fonte: string; tag: string[]; informativaPresa: boolean; creditiIllimitati: boolean; consensoNovita: boolean; consensoFoto: 'si' | 'no' | 'da_chiedere' }>): Promise<Esito> {
  const r: Record<string, unknown> = {};
  if (campi.nome !== undefined && campi.nome.trim() !== '') r.nome = campi.nome.trim();
  if (campi.cognome !== undefined) r.cognome = vuoto(campi.cognome);
  if (campi.informativaPresa !== undefined) r.informativa_presa = campi.informativaPresa;
  if (campi.telefono !== undefined) r.telefono = vuoto(campi.telefono);
  if (campi.email !== undefined) r.email = vuoto(campi.email);
  if (campi.dataNascita !== undefined) r.data_nascita = vuoto(campi.dataNascita);
  if (campi.fonte !== undefined) r.fonte = vuoto(campi.fonte);
  if (campi.tag !== undefined) r.tag = campi.tag;
  if (campi.creditiIllimitati !== undefined) r.crediti_illimitati = campi.creditiIllimitati;
  if (campi.consensoNovita !== undefined) r.consenso_novita = campi.consensoNovita;
  if (campi.consensoFoto !== undefined) r.consenso_foto = campi.consensoFoto;
  const { error } = await db().from('people').update(r).eq('id', id);
  return error ? { ok: false, motivo: ERRORE } : { ok: true };
}

export async function aggiungiNota(studio: StudioId, personaId: string, tipo: 'nota' | 'salute', testo: string): Promise<Esito> {
  if (testo.trim() === '') return { ok: false, motivo: 'Scrivi qualcosa nella nota.' };
  const autore = await utenteId();
  if (!autore) return { ok: false, motivo: ERRORE };
  const { error } = await db().from('person_notes').insert({ person_id: personaId, studio_id: studio, tipo, testo: testo.trim(), autore });
  return error ? { ok: false, motivo: ERRORE } : { ok: true };
}

/** Vende un pacchetto in studio: nasce "da incassare" e i crediti entrano subito nel registro. */
export async function vendiPacchetto(studio: StudioId, personaId: string, pk: Pacchetto): Promise<Esito> {
  const autore = await utenteId();
  if (!autore) return { ok: false, motivo: ERRORE };
  const { data, error } = await db().from('purchases').insert({
    studio_id: studio, person_id: personaId, package_id: pk.id, nome: pk.nome, crediti: pk.crediti, prezzo_cent: pk.prezzoCent,
    scade_il: scadenzaDa(oggi(), pk.validitaGiorni), creato_da: autore,
  }).select('id').single();
  if (error || !data) return { ok: false, motivo: ERRORE };
  const { error: e2 } = await db().from('credit_ledger').insert({
    studio_id: studio, person_id: personaId, purchase_id: data.id, delta: pk.crediti, motivo: `Acquisto ${pk.nome}`, creato_da: autore,
  });
  return e2 ? { ok: false, motivo: ERRORE } : { ok: true };
}

export async function segnaIncassato(acquistoId: string): Promise<Esito> {
  const { error } = await db().from('purchases').update({ incassato: true, incassato_il: new Date().toISOString() }).eq('id', acquistoId);
  return error ? { ok: false, motivo: ERRORE } : { ok: true };
}

/** Aggiunge o toglie crediti a mano, sempre con un motivo scritto nel registro. */
export async function correggiCrediti(studio: StudioId, personaId: string, delta: number, motivo: string): Promise<Esito> {
  if (delta === 0) return { ok: false, motivo: 'Scrivi quanti crediti aggiungere o togliere.' };
  if (motivo.trim() === '') return { ok: false, motivo: 'Scrivi il motivo.' };
  const autore = await utenteId();
  if (!autore) return { ok: false, motivo: ERRORE };
  const { error } = await db().from('credit_ledger').insert({
    studio_id: studio, person_id: personaId, delta, motivo: motivo.trim(), creato_da: autore,
  });
  return error ? { ok: false, motivo: ERRORE } : { ok: true };
}

/** Giorni per cui un motivo, già gestito, non si ripropone nell'elenco "Da contattare". */
export const GIORNI_SILENZIO = 7;

export async function richiamiRecenti(studio: StudioId): Promise<Set<string>> {
  const da = new Date(Date.now() - GIORNI_SILENZIO * 86_400_000).toISOString();
  const { data } = await db().from('contact_log').select('person_id, motivo').eq('studio_id', studio).gte('creato_il', da);
  return new Set((data ?? []).map((r) => `${r.motivo}|${r.person_id}`));
}

export async function segnaContattato(studio: StudioId, personaId: string, motivo: MotivoMessaggio): Promise<Esito> {
  const autore = await utenteId();
  if (!autore) return { ok: false, motivo: ERRORE };
  const { error } = await db().from('contact_log').insert({ studio_id: studio, person_id: personaId, motivo, creato_da: autore });
  return error ? { ok: false, motivo: ERRORE } : { ok: true };
}

/** Un omaggio per ricorrenza e per anno: si controlla nel registro prima di aggiungerne un altro. */
export async function regaloGiaFatto(personaId: string, motivo: string): Promise<boolean> {
  const { data } = await db().from('credit_ledger').select('id').eq('person_id', personaId).eq('motivo', motivo).limit(1);
  return (data ?? []).length > 0;
}

/** Gli omaggi già dati (a mano o dal regalo automatico), come "motivo|persona". Serve a non offrire due volte lo stesso regalo. */
export async function regaliFatti(studio: StudioId): Promise<Set<string>> {
  const { data } = await db().from('credit_ledger').select('person_id, motivo').eq('studio_id', studio).like('motivo', 'Omaggio %');
  return new Set((data ?? []).map((r) => `${r.motivo}|${r.person_id}`));
}

export async function regalaLezione(studio: StudioId, personaId: string, motivo: string): Promise<Esito> {
  if (await regaloGiaFatto(personaId, motivo)) return { ok: false, motivo: 'Questa lezione è già stata regalata.' };
  return correggiCrediti(studio, personaId, 1, motivo);
}

/** Le persone iscritte a un percorso di salute femminile: sono di Sara, i messaggi per loro li manda lei (migrazione 0015). */
export async function personeDiSara(studio: StudioId): Promise<Set<string>> {
  const { data } = await db().rpc('persone_di_sara', { p_studio: studio });
  return new Set((data ?? []) as string[]);
}
