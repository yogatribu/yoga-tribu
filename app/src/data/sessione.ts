import { supabase } from '@/services/supabase';
import { emailNonAbilitata } from '@/domain/accesso';
import { eStudioId, type StudioId } from '@/config/tema';
import type { Ruolo } from '@/domain/ruoli';

// Accesso ai dati del login e delle appartenenze. Le schermate passano da qui, mai direttamente da Supabase.

export type Appartenenza = { studio: StudioId; ruolo: Ruolo };

function db() {
  if (!supabase) throw new Error('Supabase non collegato');
  return supabase;
}

export async function inviaCodice(email: string): Promise<{ ok: boolean; nonAbilitata?: boolean; dettaglio?: string }> {
  const { error } = await db().auth.signInWithOtp({
    email: email.trim(),
    options: { shouldCreateUser: true },
  });
  if (!error) return { ok: true };
  if (emailNonAbilitata(error.message)) return { ok: false, nonAbilitata: true };
  // Il motivo tecnico serve a chi gestisce l'app (limite di invii, utente non trovato, email non configurata).
  return { ok: false, dettaglio: `${error.status ?? ''} ${error.code ?? ''} ${error.message}`.trim() };
}

export async function verificaCodice(email: string, codice: string): Promise<{ ok: boolean }> {
  const { error } = await db().auth.verifyOtp({ email: email.trim(), token: codice, type: 'email' });
  return { ok: !error };
}

export async function esci(): Promise<void> {
  await db().auth.signOut();
}

export async function leggiAppartenenze(): Promise<Appartenenza[]> {
  const { data, error } = await db().from('memberships').select('studio_id, ruolo');
  if (error || !data) return [];
  return data.flatMap((r) => (eStudioId(r.studio_id) ? [{ studio: r.studio_id, ruolo: r.ruolo as Ruolo }] : []));
}

export async function emailCorrente(): Promise<string | null> {
  const { data } = await db().auth.getSession();
  return data.session?.user.email ?? null;
}

export function ascoltaSessione(aggiorna: (connesso: boolean) => void): () => void {
  const client = db();
  void client.auth.getSession().then(({ data }) => aggiorna(Boolean(data.session)));
  const { data } = client.auth.onAuthStateChange((_evento, sessione) => aggiorna(Boolean(sessione)));
  return () => data.subscription.unsubscribe();
}

/** Il nome di chi ha fatto l'accesso, per il saluto in Home (vuoto se non l'ha ancora scritto). */
export async function nomeProfilo(): Promise<string> {
  const client = db();
  const { data } = await client.auth.getUser();
  if (!data.user) return '';
  const { data: p } = await client.from('profiles').select('nome').eq('id', data.user.id).maybeSingle();
  return p?.nome ?? '';
}

/** True se chi ha fatto l'accesso è un'insegnante segnata per i Percorsi in questo studio (oggi solo Sara). */
export async function vedoIPercorsi(studio: StudioId): Promise<boolean> {
  const client = db();
  const { data: u } = await client.auth.getUser();
  if (!u.user) return false;
  const { data } = await client.from('teachers').select('fa_percorsi').eq('studio_id', studio).eq('user_id', u.user.id);
  return (data ?? []).some((r) => r.fa_percorsi === true);
}

/** L'insegnante collegata a chi ha fatto l'accesso in questo studio (dall'email, migrazione 0008), se c'è. */
export async function mioInsegnante(studio: StudioId): Promise<{ id: string; nome: string } | null> {
  const client = db();
  const { data: u } = await client.auth.getUser();
  if (!u.user) return null;
  const { data } = await client.from('teachers').select('id, nome').eq('studio_id', studio).eq('user_id', u.user.id).limit(1);
  return data && data.length > 0 ? { id: data[0].id, nome: data[0].nome } : null;
}

export type Profilo = { nome: string; cognome: string; telefono: string; email: string };

/** I dati di chi ha fatto l'accesso: nome, cognome e telefono sono nel profilo, l'email è quella del login. */
export async function leggiProfilo(): Promise<Profilo | null> {
  const client = db();
  const { data: u } = await client.auth.getUser();
  if (!u.user) return null;
  const { data } = await client.from('profiles').select('nome, cognome, telefono').eq('id', u.user.id).maybeSingle();
  return { nome: data?.nome ?? '', cognome: data?.cognome ?? '', telefono: data?.telefono ?? '', email: u.user.email ?? '' };
}

export async function salvaProfilo(p: { nome: string; cognome: string; telefono: string }): Promise<{ ok: boolean }> {
  const client = db();
  const { data } = await client.auth.getUser();
  if (!data.user) return { ok: false };
  const { error } = await client.from('profiles').update({ nome: p.nome.trim(), cognome: p.cognome.trim(), telefono: p.telefono.trim() }).eq('id', data.user.id);
  return { ok: !error };
}
