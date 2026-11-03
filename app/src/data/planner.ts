import { supabase } from '@/services/supabase';
import type { StudioId } from '@/config/tema';
import type { EventoPlanner, SalvataggioPost, TipoPlanner } from '@/domain/planner';

// Accesso ai dati del planner: cosa è stato deciso sui post, gli eventi aggiunti a mano e le informazioni in più sugli eventi.

export type Esito = { ok: true } | { ok: false; motivo: string };
export type Extra = EventoPlanner['extra'];
export type NuovoEventoManuale = { id?: string; tipo: TipoPlanner; titolo: string; data: string; luogo: string; prezzoEuro: number; posti: number; con: string; extra: Extra };

const ERRORE = 'Non sono riuscito a salvare. Controlla la connessione e riprova.';

function db() {
  if (!supabase) throw new Error('Supabase non collegato');
  return supabase;
}

type RigaPost = {
  riga_id: string; stato: SalvataggioPost['stato']; data: string | null; formato: SalvataggioPost['formato']; data_evento: string | null; sposta: string | null;
  ok: boolean; istantanea: SalvataggioPost['istantanea']; risultati: SalvataggioPost['risultati'];
};

export async function elencaPost(studio: StudioId): Promise<Record<string, Partial<SalvataggioPost>> | null> {
  const { data, error } = await db().from('content_posts').select('*').eq('studio_id', studio);
  if (error || !data) return null;
  const r: Record<string, Partial<SalvataggioPost>> = {};
  for (const x of data as RigaPost[]) r[x.riga_id] = { stato: x.stato, data: x.data, formato: x.formato, dataEvento: x.data_evento, sposta: x.sposta, ok: x.ok, istantanea: x.istantanea, risultati: x.risultati };
  return r;
}

/** Salva cosa si è deciso su un post, senza perdere quello che c'era già. */
export async function salvaPost(studio: StudioId, rigaId: string, patch: Partial<SalvataggioPost>, attuale: Partial<SalvataggioPost> = {}): Promise<Esito> {
  const { data: utente } = await db().auth.getUser();
  const u = { ...attuale, ...patch };
  const { error } = await db().from('content_posts').upsert({
    studio_id: studio, riga_id: rigaId, stato: u.stato ?? 'proposto', data: u.data ?? null, formato: u.formato ?? null, data_evento: u.dataEvento ?? null,
    sposta: u.sposta ?? null, ok: u.ok ?? false, istantanea: u.istantanea ?? null, risultati: u.risultati ?? null, aggiornato_il: new Date().toISOString(), aggiornato_da: utente.user?.id ?? null,
  }, { onConflict: 'studio_id,riga_id' });
  return error ? { ok: false, motivo: ERRORE } : { ok: true };
}

export async function elencaEventiManuali(studio: StudioId): Promise<EventoPlanner[] | null> {
  const { data, error } = await db().from('content_events').select('*').eq('studio_id', studio).order('data');
  if (error || !data) return null;
  return data.map((r) => ({
    id: r.id, tipo: r.tipo, titolo: r.titolo, data: r.data, fine: null, luogo: r.luogo, prezzoEuro: (r.prezzo_cent ?? 0) / 100, posti: r.posti ?? 0, con: r.con,
    orario: null, completo: false, extra: r.extra ?? {},
  }));
}

export async function salvaEventoManuale(studio: StudioId, n: NuovoEventoManuale): Promise<Esito> {
  const { data: utente } = await db().auth.getUser();
  const id = n.id ?? `m-${crypto.randomUUID().slice(0, 8)}`;
  const { error } = await db().from('content_events').upsert({
    id, studio_id: studio, tipo: n.tipo, titolo: n.titolo, data: n.data, luogo: n.luogo || null, prezzo_cent: Math.round(n.prezzoEuro * 100), posti: n.posti || null,
    con: n.con || null, extra: n.extra, creato_da: utente.user?.id ?? null,
  });
  return error ? { ok: false, motivo: ERRORE } : { ok: true };
}

export async function elencaExtra(studio: StudioId): Promise<Record<string, Extra> | null> {
  const { data, error } = await db().from('content_event_extra').select('evento_id, extra').eq('studio_id', studio);
  if (error || !data) return null;
  return Object.fromEntries(data.map((r) => [r.evento_id as string, (r.extra ?? {}) as Extra]));
}

export async function salvaExtra(studio: StudioId, eventoId: string, extra: Extra): Promise<Esito> {
  const { error } = await db().from('content_event_extra').upsert({ studio_id: studio, evento_id: eventoId, extra }, { onConflict: 'studio_id,evento_id' });
  return error ? { ok: false, motivo: ERRORE } : { ok: true };
}
