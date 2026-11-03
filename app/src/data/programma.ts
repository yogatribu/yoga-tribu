import { supabase } from '@/services/supabase';
import type { StudioId } from '@/config/tema';
import { lezioniDaFermare, type Blocco, type GruppoBlocco, type Modello, type NuovaLezione } from '@/domain/programma';

// Accesso ai dati del Programma. Le regole di sicurezza sono nel database: qui solo lettura e scrittura.

export type Esito = { ok: true } | { ok: false; motivo: string };

const ERRORE = 'Non sono riuscito a salvare. Controlla la connessione e riprova.';

function db() {
  if (!supabase) throw new Error('Supabase non collegato');
  return supabase;
}

export async function elencaModelli(studio: StudioId): Promise<Modello[] | null> {
  const { data, error } = await db().from('lesson_templates').select('*').eq('studio_id', studio).eq('attivo', true);
  if (error || !data) return null;
  return data.map((r) => ({
    id: r.id, giorno: r.giorno, ora: r.ora, stile: r.stile, tipo: r.tipo, insegnante: r.insegnante,
    durataMin: r.durata_min, posti: r.posti, attivo: r.attivo, aggiuntoAMano: r.aggiunto_a_mano,
  }));
}

/** Le lezioni ferme in un periodo, una riga per lezione e giorno. */
export async function elencaBlocchi(studio: StudioId, da: string, a: string): Promise<Blocco[] | null> {
  const { data, error } = await db().from('lesson_blocks').select('template_id, data, motivo').eq('studio_id', studio).gte('data', da).lte('data', a);
  if (error || !data) return null;
  return data.map((r) => ({ modelloId: r.template_id, data: r.data, motivo: r.motivo }));
}

/** I blocchi che finiscono oggi o dopo, uno per ogni "Blocca" fatto. */
export async function elencaGruppiBlocco(studio: StudioId, daOggi: string): Promise<GruppoBlocco[] | null> {
  const { data, error } = await db()
    .from('lesson_blocks')
    .select('gruppo_id, scope, da, a, motivo')
    .eq('studio_id', studio)
    .gte('a', daOggi);
  if (error || !data) return null;
  const gruppi = new Map<string, GruppoBlocco>();
  for (const r of data) {
    const g = gruppi.get(r.gruppo_id);
    if (g) g.lezioni += 1;
    else gruppi.set(r.gruppo_id, { gruppoId: r.gruppo_id, scope: r.scope, da: r.da, a: r.a, motivo: r.motivo, lezioni: 1 });
  }
  return [...gruppi.values()].sort((x, y) => x.da.localeCompare(y.da));
}

/** Ferma tutte le lezioni del periodo (di tutti o di un insegnante). Dice quante ne ha fermate. */
export async function bloccaPeriodo(
  studio: StudioId, modelli: Modello[], scope: string, da: string, a: string, motivo: string,
): Promise<{ ok: true; fermate: number } | { ok: false; motivo: string }> {
  const { data: utente } = await db().auth.getUser();
  if (!utente.user) return { ok: false, motivo: ERRORE };
  const daFermare = lezioniDaFermare(modelli, da, a, scope);
  if (daFermare.length === 0) return { ok: false, motivo: 'Nel periodo scelto non ci sono lezioni da bloccare.' };
  const gruppoId = crypto.randomUUID();
  const righe = daFermare.map((x) => ({
    gruppo_id: gruppoId, template_id: x.modello.id, studio_id: studio, data: x.data, scope, da, a,
    motivo: motivo.trim() === '' ? null : motivo.trim(), creato_da: utente.user.id,
  }));
  // Le lezioni già ferme per lo stesso giorno si lasciano com'erano.
  const { error } = await db().from('lesson_blocks').upsert(righe, { onConflict: 'template_id,data', ignoreDuplicates: true });
  return error ? { ok: false, motivo: ERRORE } : { ok: true, fermate: righe.length };
}

export async function riattivaGruppo(gruppoId: string): Promise<Esito> {
  const { error } = await db().from('lesson_blocks').delete().eq('gruppo_id', gruppoId);
  return error ? { ok: false, motivo: ERRORE } : { ok: true };
}

export async function aggiungiModello(studio: StudioId, l: NuovaLezione & { durataMin: number | null }): Promise<Esito> {
  const { error } = await db().from('lesson_templates').insert({
    studio_id: studio, giorno: l.giorno, ora: l.ora, stile: l.stile, tipo: l.tipo.trim(), insegnante: l.insegnante.trim(),
    durata_min: l.durataMin, posti: l.posti, aggiunto_a_mano: true,
  });
  return error ? { ok: false, motivo: ERRORE } : { ok: true };
}

export async function togliModello(id: string): Promise<Esito> {
  const { error } = await db().from('lesson_templates').update({ attivo: false }).eq('id', id);
  return error ? { ok: false, motivo: ERRORE } : { ok: true };
}
