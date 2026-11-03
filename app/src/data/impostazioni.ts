import { supabase } from '@/services/supabase';
import type { StudioId } from '@/config/tema';
import type { CampoContatto, Insegnante } from '@/domain/impostazioni';
import { PROMEMORIA_PREDEFINITI, type Promemoria } from '@/domain/leads';

// Accesso ai dati delle Impostazioni (insegnanti e campi dei contatti). Le regole di sicurezza sono nel database.

export type Esito = { ok: true } | { ok: false; motivo: string };
export type NuovoInsegnante = { nome: string; email: string; stili: string[]; faPrivate: boolean; responsabile: boolean };

const ERRORE = 'Non sono riuscito a salvare. Controlla la connessione e riprova.';

function db() {
  if (!supabase) throw new Error('Supabase non collegato');
  return supabase;
}

export async function elencaInsegnanti(studio: StudioId): Promise<Insegnante[] | null> {
  const { data, error } = await db().from('teachers').select('*').eq('studio_id', studio).eq('attivo', true).order('nome');
  if (error || !data) return null;
  return data.map((r) => ({ id: r.id, nome: r.nome, email: r.email, stili: r.stili ?? [], faPrivate: r.fa_private, responsabile: r.responsabile, privateAuto: r.private_auto ?? false }));
}

/** Quante lezioni fisse a settimana tiene ancora quell'insegnante (conta anche "Glenda e Mattia"). */
export async function lezioniFisse(studio: StudioId, nome: string): Promise<{ stili: string[]; quante: number } | null> {
  const { data, error } = await db().from('lesson_templates').select('stile, insegnante').eq('studio_id', studio).eq('attivo', true);
  if (error || !data) return null;
  const sue = data.filter((r) => r.insegnante.toLowerCase().includes(nome.toLowerCase()));
  return { stili: [...new Set(sue.map((r) => r.stile as string))], quante: sue.length };
}

export async function aggiungiInsegnante(studio: StudioId, n: NuovoInsegnante): Promise<Esito> {
  const { error } = await db().from('teachers').insert({
    studio_id: studio, nome: n.nome, email: n.email.trim() === '' ? null : n.email.trim(), stili: n.stili, fa_private: n.faPrivate, responsabile: n.responsabile,
  });
  return error ? { ok: false, motivo: ERRORE } : { ok: true };
}

export async function aggiornaInsegnante(id: string, c: Partial<{ stili: string[]; faPrivate: boolean; responsabile: boolean; email: string | null }>): Promise<Esito> {
  const r: Record<string, unknown> = {};
  if (c.stili !== undefined) r.stili = c.stili;
  if (c.faPrivate !== undefined) r.fa_private = c.faPrivate;
  if (c.responsabile !== undefined) r.responsabile = c.responsabile;
  // L'email decide chi può entrare nell'app: il database collega l'account e toglie l'accesso a quella vecchia (migrazione 0008).
  if (c.email !== undefined) r.email = c.email === null || c.email.trim() === '' ? null : c.email.trim().toLowerCase();
  const { error } = await db().from('teachers').update(r).eq('id', id);
  return error ? { ok: false, motivo: ERRORE } : { ok: true };
}

export async function togliInsegnante(id: string): Promise<Esito> {
  const { error } = await db().from('teachers').update({ attivo: false }).eq('id', id);
  return error ? { ok: false, motivo: ERRORE } : { ok: true };
}

export async function elencaCampi(studio: StudioId): Promise<CampoContatto[] | null> {
  const { data, error } = await db().from('lead_fields').select('*').eq('studio_id', studio).eq('attivo', true).order('ordine').order('creato_il');
  if (error || !data) return null;
  return data.map((r) => ({ id: r.id, nome: r.nome, tipo: r.tipo, opzioni: r.opzioni ?? [] }));
}

export async function aggiungiCampo(studio: StudioId, nome: string, tipo: CampoContatto['tipo'], opzioni: string[]): Promise<Esito> {
  const { error } = await db().from('lead_fields').insert({ studio_id: studio, nome: nome.trim(), tipo, opzioni: tipo === 'scelta' ? opzioni : [] });
  return error ? { ok: false, motivo: ERRORE } : { ok: true };
}

/** Il campo non si cancella: smette di comparire, e le risposte già scritte restano salvate. */
export async function togliCampo(id: string): Promise<Esito> {
  const { error } = await db().from('lead_fields').update({ attivo: false }).eq('id', id);
  return error ? { ok: false, motivo: ERRORE } : { ok: true };
}

/** I quattro promemoria degli Interessati ("Cosa ti ricordiamo in automatico"); se non sono mai stati toccati sono tutti accesi. */
export async function leggiPromemoria(studio: StudioId): Promise<Promemoria> {
  const { data } = await db().from('studio_settings').select('valore').eq('studio_id', studio).eq('chiave', 'promemoria_interessati').maybeSingle();
  return { ...PROMEMORIA_PREDEFINITI, ...((data?.valore as Partial<Promemoria> | undefined) ?? {}) };
}

export async function salvaPromemoria(studio: StudioId, p: Promemoria): Promise<Esito> {
  const { error } = await db().from('studio_settings').upsert({ studio_id: studio, chiave: 'promemoria_interessati', valore: p });
  return error ? { ok: false, motivo: ERRORE } : { ok: true };
}

/** Conferma automatica delle private: chi sceglie un orario dell'insegnante è già prenotato, senza aspettare la sua risposta. */
export async function impostaConfermaAutomatica(insegnanteId: string, acceso: boolean): Promise<Esito> {
  const { error } = await db().from('teachers').update({ private_auto: acceso }).eq('id', insegnanteId);
  return error ? { ok: false, motivo: ERRORE } : { ok: true };
}

export type RegaloAutomatico = { compleanni: boolean; anniversari: boolean };
const CHIAVI_REGALO = { compleanni: 'regalo_compleanni', anniversari: 'regalo_anniversari' } as const;

/** Se il database deve regalare da solo una lezione nel giorno del compleanno o dell'anniversario (migrazione 0013). Spento di partenza. */
export async function leggiRegaloAutomatico(studio: StudioId): Promise<RegaloAutomatico> {
  const { data } = await db().from('studio_settings').select('chiave, valore').eq('studio_id', studio).in('chiave', Object.values(CHIAVI_REGALO));
  const acceso = (k: string) => (data ?? []).some((r) => r.chiave === k && r.valore === true);
  return { compleanni: acceso(CHIAVI_REGALO.compleanni), anniversari: acceso(CHIAVI_REGALO.anniversari) };
}

export async function salvaRegaloAutomatico(studio: StudioId, tipo: keyof RegaloAutomatico, acceso: boolean): Promise<Esito> {
  const { error } = await db().from('studio_settings').upsert({ studio_id: studio, chiave: CHIAVI_REGALO[tipo], valore: acceso });
  return error ? { ok: false, motivo: ERRORE } : { ok: true };
}
