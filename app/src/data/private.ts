import { supabase } from '@/services/supabase';
import type { StudioId } from '@/config/tema';
import type { Disponibilita, StatoPrivata } from '@/domain/private';

// Lezioni private: orari dati da ogni insegnante e richieste. Le regole di sicurezza sono nel database (migrazione 0010).

export type Esito = { ok: true } | { ok: false; motivo: string };
export type Privata = {
  id: string; studio: StudioId; personaId: string; insegnanteId: string; n: 1 | 2 | 3 | 4; stile: string; data: string; ora: string;
  note: string | null; prezzoCent: number | null; stato: StatoPrivata; creatoIl: string;
};
export type NuovaPrivata = { personaId: string; insegnanteId: string; n: 1 | 2 | 3 | 4; stile: string; data: string; ora: string; note: string; prezzoCent: number | null };

const ERRORE = 'Non sono riuscito a salvare. Controlla la connessione e riprova.';

function db() {
  if (!supabase) throw new Error('Supabase non collegato');
  return supabase;
}

export async function elencaDisponibilita(studio: StudioId): Promise<Disponibilita[] | null> {
  const { data, error } = await db().from('private_availability').select('teacher_id, giorno, data, ore').eq('studio_id', studio);
  if (error || !data) return null;
  return data.map((r) => ({ insegnanteId: r.teacher_id, giorno: r.giorno, data: r.data, ore: r.ore ?? [] }));
}

/** Imposta gli orari di un giorno della settimana o di una sola data. */
export async function salvaOre(studio: StudioId, insegnanteId: string, quando: { giorno: number } | { data: string }, ore: number[]): Promise<Esito> {
  const filtro = db().from('private_availability').select('id').eq('teacher_id', insegnanteId);
  const { data: esiste } = await ('giorno' in quando ? filtro.eq('giorno', quando.giorno) : filtro.eq('data', quando.data)).maybeSingle();
  const { error } = esiste
    ? await db().from('private_availability').update({ ore }).eq('id', esiste.id)
    : await db().from('private_availability').insert({ studio_id: studio, teacher_id: insegnanteId, ...('giorno' in quando ? { giorno: quando.giorno } : { data: quando.data }), ore });
  return error ? { ok: false, motivo: ERRORE } : { ok: true };
}

/** "Torna agli orari settimanali": si toglie l'eccezione di quella data. */
export async function ripristinaData(insegnanteId: string, data: string): Promise<Esito> {
  const { error } = await db().from('private_availability').delete().eq('teacher_id', insegnanteId).eq('data', data);
  return error ? { ok: false, motivo: ERRORE } : { ok: true };
}

export async function elencaPrivate(studio: StudioId): Promise<Privata[] | null> {
  const { data, error } = await db().from('private_lessons').select('*').eq('studio_id', studio).order('data').order('ora');
  if (error || !data) return null;
  return data.map((r) => ({
    id: r.id, studio: r.studio_id as StudioId, personaId: r.person_id, insegnanteId: r.teacher_id, n: r.n, stile: r.stile, data: r.data, ora: r.ora,
    note: r.note, prezzoCent: r.prezzo_cent, stato: r.stato, creatoIl: r.creato_il,
  }));
}

/** Registra una privata per una persona. Con la conferma automatica attiva è già confermata. */
export async function creaPrivata(studio: StudioId, p: NuovaPrivata, confermaAutomatica: boolean): Promise<Esito> {
  const { data: u } = await db().auth.getUser();
  const { error } = await db().from('private_lessons').insert({
    studio_id: studio, person_id: p.personaId, teacher_id: p.insegnanteId, n: p.n, stile: p.stile, data: p.data, ora: p.ora,
    note: p.note.trim() === '' ? null : p.note.trim(), prezzo_cent: p.prezzoCent, stato: confermaAutomatica ? 'confermata' : 'attesa', creato_da: u.user?.id ?? null,
  });
  return error ? { ok: false, motivo: ERRORE } : { ok: true };
}

export async function cambiaStatoPrivata(id: string, stato: Exclude<StatoPrivata, 'attesa'>): Promise<Esito> {
  const { error } = await db().from('private_lessons').update({ stato }).eq('id', id);
  return error ? { ok: false, motivo: ERRORE } : { ok: true };
}
