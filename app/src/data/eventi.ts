import { supabase } from '@/services/supabase';
import type { StudioId } from '@/config/tema';
import { dateIncontri, orarioPercorso, PASSI, type Evento, type Iscrizione, type Passo, type TipoEvento } from '@/domain/eventi';

// Accesso ai dati di eventi condivisi, percorsi e iscrizioni. Le regole di sicurezza sono nel database:
// ogni studio vede le iscrizioni delle proprie persone e, dell'altro, solo il numero dei posti presi.

export type Esito = { ok: true } | { ok: false; motivo: string };
export type NuovoEvento = {
  tipo: TipoEvento; titolo: string; descrizione: string; da: string; a: string; ora: string; luogo: string; prezzoEuro: number;
  posti: number; insegnanti: string[];
};

const ERRORE = 'Non sono riuscito a salvare. Controlla la connessione e riprova.';

function db() {
  if (!supabase) throw new Error('Supabase non collegato');
  return supabase;
}

type Riga = {
  id: string; tipo: Evento['tipo']; titolo: string; descrizione: string | null; da: string; a: string | null; date_incontri: string[] | null;
  ora: string | null; orario: string | null; luogo: string; prezzo_cent: number | null; su_richiesta: boolean; posti: number;
  iscritti_fissi: number; lista_fissa: number; studio_origine: string; solo_studio: string | null; insegnanti: string[]; passo: Passo | null; chiuso: boolean;
};

const daRiga = (r: Riga): Evento => ({
  id: r.id, tipo: r.tipo, titolo: r.titolo, descrizione: r.descrizione, da: r.da, a: r.a, dateIncontri: r.date_incontri, ora: r.ora, orario: r.orario,
  luogo: r.luogo, prezzoCent: r.prezzo_cent, suRichiesta: r.su_richiesta, posti: r.posti, iscrittiFissi: r.iscritti_fissi, listaFissa: r.lista_fissa,
  studioOrigine: r.studio_origine, soloStudio: r.solo_studio, insegnanti: r.insegnanti ?? [], passo: r.passo, chiuso: r.chiuso,
});

export async function elencaEventi(): Promise<Evento[] | null> {
  const { data, error } = await db().from('events').select('*').order('da');
  if (error || !data) return null;
  return (data as Riga[]).map(daRiga);
}

/** Le iscrizioni delle persone di questo studio. */
export async function elencaIscrizioni(studio: StudioId): Promise<Iscrizione[] | null> {
  const { data, error } = await db().from('event_registrations').select('id, event_id, person_id, nome, stato, messaggio, studio_id').eq('studio_id', studio);
  if (error || !data) return null;
  return data.map((r) => ({ id: r.id, eventoId: r.event_id, personId: r.person_id, nome: r.nome, stato: r.stato, messaggio: r.messaggio, studioId: r.studio_id }));
}

/** Posti presi in tutto, anche dall'altro studio: solo il numero. */
export async function postiPresi(eventoId: string): Promise<number | null> {
  const { data, error } = await db().rpc('posti_occupati', { p_evento: eventoId });
  return error || data === null ? null : Number(data);
}

async function utenteId(): Promise<string | null> {
  const { data } = await db().auth.getUser();
  return data.user?.id ?? null;
}

export async function creaEvento(studio: StudioId, n: NuovoEvento): Promise<Esito> {
  const autore = await utenteId();
  if (!autore) return { ok: false, motivo: ERRORE };
  const { error } = await db().from('events').insert({
    tipo: n.tipo, titolo: n.titolo.trim(), descrizione: n.descrizione.trim() || null, da: n.da, a: n.tipo === 'ritiro' ? n.a : null,
    ora: n.tipo === 'ritiro' ? null : n.ora || null, luogo: n.luogo, prezzo_cent: Math.round(n.prezzoEuro * 100), posti: n.posti,
    studio_origine: studio, insegnanti: n.insegnanti, creato_da: autore,
  });
  return error ? { ok: false, motivo: ERRORE } : { ok: true };
}

export async function creaPercorso(studio: StudioId, passo: Passo, primo: string, incontri: number, posti: number, luogo: string): Promise<Esito> {
  const autore = await utenteId();
  if (!autore) return { ok: false, motivo: ERRORE };
  const date = dateIncontri(primo, incontri);
  const p = PASSI[passo];
  const { error } = await db().from('events').insert({
    tipo: 'percorso', passo, titolo: p.nome, descrizione: p.descrizione, da: date[0], a: date[date.length - 1], date_incontri: date, ora: p.ora,
    orario: orarioPercorso(primo, p.ora, incontri), luogo, su_richiesta: true, posti, studio_origine: studio, solo_studio: studio,
    insegnanti: ['Sara Zampierin'], creato_da: autore,
  });
  return error ? { ok: false, motivo: ERRORE } : { ok: true };
}

export async function eliminaEvento(id: string): Promise<Esito> {
  const { error } = await db().from('events').delete().eq('id', id);
  return error ? { ok: false, motivo: ERRORE } : { ok: true };
}

export async function impostaChiuso(id: string, chiuso: boolean): Promise<Esito> {
  const { error } = await db().from('events').update({ chiuso }).eq('id', id);
  return error ? { ok: false, motivo: ERRORE } : { ok: true };
}

export async function iscriviPersona(studio: StudioId, eventoId: string, persona: { id: string; nome: string }, stato: Iscrizione['stato']): Promise<Esito> {
  const autore = await utenteId();
  if (!autore) return { ok: false, motivo: ERRORE };
  const { error } = await db().from('event_registrations').insert({ event_id: eventoId, studio_id: studio, person_id: persona.id, nome: persona.nome, stato, creato_da: autore });
  return error ? { ok: false, motivo: ERRORE } : { ok: true };
}

export async function cambiaStatoIscrizione(id: string, stato: Iscrizione['stato']): Promise<Esito> {
  const { error } = await db().from('event_registrations').update({ stato }).eq('id', id);
  return error ? { ok: false, motivo: ERRORE } : { ok: true };
}

export async function segnaMessaggio(id: string, messaggio: 'proposto' | 'rimandato'): Promise<Esito> {
  const { error } = await db().from('event_registrations').update({ messaggio }).eq('id', id);
  return error ? { ok: false, motivo: ERRORE } : { ok: true };
}

export async function togliIscrizione(id: string): Promise<Esito> {
  const { error } = await db().from('event_registrations').delete().eq('id', id);
  return error ? { ok: false, motivo: ERRORE } : { ok: true };
}
