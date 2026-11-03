import { supabase } from '@/services/supabase';
import type { StudioId } from '@/config/tema';
import type { TipoAvviso } from '@/domain/avvisi';

// Richieste degli allievi e avvisi a un gruppo. Le regole di sicurezza sono nel database (migrazione 0010).
// Gli avvisi per ora si salvano: arriveranno agli allievi quando potranno entrare nell'app.

export type Esito = { ok: true } | { ok: false; motivo: string };
export type Richiesta = { id: string; personaId: string; categoria: string; lezione: string | null; testo: string; risposta: string | null; creatoIl: string };
export type AvvisoInviato = { id: string; titolo: string; testo: string; tipo: TipoAvviso; quando: 'ora' | 'domani'; gruppi: string; esclusi: number; destinatari: number; creatoIl: string };
export type NuovoAvviso = { titolo: string; testo: string; tipo: TipoAvviso; quando: 'ora' | 'domani'; gruppi: string; esclusi: number };

const ERRORE = 'Non sono riuscito a salvare. Controlla la connessione e riprova.';

function db() {
  if (!supabase) throw new Error('Supabase non collegato');
  return supabase;
}

export async function elencaRichieste(studio: StudioId): Promise<Richiesta[] | null> {
  const { data, error } = await db().from('student_requests').select('*').eq('studio_id', studio).order('creato_il', { ascending: false });
  if (error || !data) return null;
  return data.map((r) => ({ id: r.id, personaId: r.person_id, categoria: r.categoria, lezione: r.lezione, testo: r.testo, risposta: r.risposta, creatoIl: r.creato_il }));
}

export async function rispondiRichiesta(id: string, testo: string): Promise<Esito> {
  if (testo.trim() === '') return { ok: false, motivo: 'Scrivi la risposta.' };
  const { error } = await db().from('student_requests').update({ risposta: testo.trim(), risposta_il: new Date().toISOString() }).eq('id', id);
  return error ? { ok: false, motivo: ERRORE } : { ok: true };
}

export async function elencaAvvisi(studio: StudioId): Promise<AvvisoInviato[] | null> {
  const { data, error } = await db().from('group_notices').select('*, group_notice_recipients(count)').eq('studio_id', studio).order('creato_il', { ascending: false });
  if (error || !data) return null;
  return data.map((r) => ({
    id: r.id, titolo: r.titolo, testo: r.testo, tipo: r.tipo, quando: r.quando, gruppi: r.gruppi, esclusi: r.esclusi,
    destinatari: (r.group_notice_recipients as unknown as { count: number }[])[0]?.count ?? 0, creatoIl: r.creato_il,
  }));
}

export async function salvaAvviso(studio: StudioId, a: NuovoAvviso, personeIds: readonly string[]): Promise<Esito> {
  const { data: u } = await db().auth.getUser();
  const { data, error } = await db().from('group_notices').insert({ studio_id: studio, ...a, creato_da: u.user?.id ?? null }).select('id').single();
  if (error || !data) return { ok: false, motivo: ERRORE };
  if (personeIds.length > 0) {
    const { error: e2 } = await db().from('group_notice_recipients').insert(personeIds.map((p) => ({ notice_id: data.id, person_id: p })));
    if (e2) return { ok: false, motivo: ERRORE };
  }
  return { ok: true };
}
