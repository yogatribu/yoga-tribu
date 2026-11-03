import { supabase } from '@/services/supabase';
import type { StudioId } from '@/config/tema';

// Richieste di nuove lezioni fatte da un insegnante. Le decide un responsabile (Andrea o Glenda). Regole nel database (migrazione 0015).

export type Esito = { ok: true } | { ok: false; motivo: string };
export type StatoRichiesta = 'attesa' | 'approvata' | 'rifiutata';
export type RichiestaLezione = {
  id: string; studio: StudioId; richiedente: string; giorno: number; ora: string; stile: string; tipo: string; posti: number; durataMin: number | null;
  nota: string | null; stato: StatoRichiesta; creatoIl: string;
};
export type NuovaRichiestaLezione = { giorno: number; ora: string; stile: string; tipo: string; posti: number; durataMin: number | null; nota: string };

const ERRORE = 'Non sono riuscito a salvare. Controlla la connessione e riprova.';

function db() {
  if (!supabase) throw new Error('Supabase non collegato');
  return supabase;
}

/** Un responsabile le vede tutte, un insegnante solo le sue (lo decide il database). */
export async function elencaRichiesteLezioni(studio: StudioId): Promise<RichiestaLezione[] | null> {
  const { data, error } = await db().from('lesson_requests').select('id, studio_id, richiedente_nome, giorno, ora, stile, tipo, posti, durata_min, nota, stato, creato_il').eq('studio_id', studio).order('creato_il', { ascending: false });
  if (error || !data) return null;
  return data.map((r) => ({
    id: r.id, studio: r.studio_id, richiedente: r.richiedente_nome, giorno: r.giorno, ora: r.ora, stile: r.stile, tipo: r.tipo, posti: r.posti, durataMin: r.durata_min,
    nota: r.nota, stato: r.stato, creatoIl: r.creato_il,
  }));
}

export async function chiediLezione(studio: StudioId, nomeInsegnante: string, l: NuovaRichiestaLezione): Promise<Esito> {
  const { data: utente } = await db().auth.getUser();
  if (!utente.user) return { ok: false, motivo: ERRORE };
  const { error } = await db().from('lesson_requests').insert({
    studio_id: studio, richiedente: utente.user.id, richiedente_nome: nomeInsegnante, giorno: l.giorno, ora: l.ora, stile: l.stile, tipo: l.tipo.trim(),
    posti: l.posti, durata_min: l.durataMin, nota: l.nota.trim() === '' ? null : l.nota.trim(),
  });
  return error ? { ok: false, motivo: ERRORE } : { ok: true };
}

/** Approvando, la lezione entra nell'orario con l'insegnante che l'ha chiesta. */
export async function decidiRichiestaLezione(id: string, approva: boolean): Promise<Esito> {
  const { error } = await db().rpc('decidi_richiesta_lezione', { p_id: id, p_approva: approva });
  return error ? { ok: false, motivo: ERRORE } : { ok: true };
}
