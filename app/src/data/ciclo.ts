import { supabase } from '@/services/supabase';
import type { StudioId } from '@/config/tema';
import type { TemaMese } from '@/domain/ciclo';

// Tema di ogni mese del ciclo editoriale. Le regole di sicurezza sono nel database (migrazione 0011).

export type Esito = { ok: true } | { ok: false; motivo: string };

function db() {
  if (!supabase) throw new Error('Supabase non collegato');
  return supabase;
}

export async function elencaTemi(studio: StudioId): Promise<Map<string, TemaMese> | null> {
  const { data, error } = await db().from('monthly_themes').select('*').eq('studio_id', studio);
  if (error || !data) return null;
  return new Map(data.map((r) => [r.mese, { tema: r.tema, testo: r.testo, libro: r.libro, autore: r.autore, articolo: r.articolo }]));
}

export async function salvaTema(studio: StudioId, mese: string, t: TemaMese): Promise<Esito> {
  const { error } = await db().from('monthly_themes').upsert({ studio_id: studio, mese, ...t });
  return error ? { ok: false, motivo: 'Non sono riuscito a salvare. Controlla la connessione e riprova.' } : { ok: true };
}
