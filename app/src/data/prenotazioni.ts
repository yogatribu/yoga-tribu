import { supabase } from '@/services/supabase';
import type { StudioId } from '@/config/tema';
import { disdettaInTempo, minutiAllaLezione, type Prenotazione } from '@/domain/prenotazioni';
import type { Modello } from '@/domain/programma';

// Accesso ai dati delle prenotazioni. I crediti si muovono sempre dal registro (credit_ledger):
// prenotare toglie un credito, disdire in tempo lo rende, disdire tardi no (lo studio può restituirlo).

export type Esito = { ok: true } | { ok: false; motivo: string };
export type PersonaCrediti = { id: string; nome: string; creditiIllimitati: boolean; saldo: number };

const ERRORE = 'Non sono riuscito a salvare. Controlla la connessione e riprova.';

function db() {
  if (!supabase) throw new Error('Supabase non collegato');
  return supabase;
}

async function utenteId(): Promise<string | null> {
  const { data } = await db().auth.getUser();
  return data.user?.id ?? null;
}

type Riga = { id: string; template_id: string; data: string; person_id: string; stato: Prenotazione['stato']; disdetta_il: string | null; minuti_prima: number | null; creato_il: string };
const daRiga = (r: Riga): Prenotazione & { creato: string } => ({
  id: r.id, modelloId: r.template_id, data: r.data, personId: r.person_id, stato: r.stato, disdettaIl: r.disdetta_il, minutiPrima: r.minuti_prima, creato: r.creato_il,
});

export async function elencaPrenotazioni(studio: StudioId, da: string, a: string): Promise<(Prenotazione & { creato: string })[] | null> {
  const { data, error } = await db().from('bookings').select('id, template_id, data, person_id, stato, disdetta_il, minuti_prima, creato_il').eq('studio_id', studio).gte('data', da).lte('data', a);
  if (error || !data) return null;
  return (data as Riga[]).map(daRiga);
}

async function muoviCredito(studio: StudioId, personId: string, delta: number, motivo: string): Promise<boolean> {
  const autore = await utenteId();
  if (!autore) return false;
  const { error } = await db().from('credit_ledger').insert({ studio_id: studio, person_id: personId, delta, motivo, creato_da: autore });
  return !error;
}

const nomeLezione = (m: Modello, data: string) => `${m.tipo} ${data.slice(8)}/${data.slice(5, 7)} ${m.ora}`;

/** Prenota una persona a una lezione: toglie un credito (se non è illimitata). */
export async function prenota(studio: StudioId, m: Modello, data: string, p: PersonaCrediti): Promise<Esito> {
  const autore = await utenteId();
  if (!autore) return { ok: false, motivo: ERRORE };
  const { error } = await db().from('bookings').insert({ studio_id: studio, template_id: m.id, data, person_id: p.id, stato: 'prenotata', creato_da: autore });
  if (error) return { ok: false, motivo: 'Non riesco a prenotare: forse è già prenotata a questa lezione.' };
  if (!p.creditiIllimitati && !(await muoviCredito(studio, p.id, -1, `Prenotata ${nomeLezione(m, data)}`))) return { ok: false, motivo: ERRORE };
  return { ok: true };
}

export async function mettiInLista(studio: StudioId, m: Modello, data: string, personId: string): Promise<Esito> {
  const autore = await utenteId();
  if (!autore) return { ok: false, motivo: ERRORE };
  const { error } = await db().from('bookings').insert({ studio_id: studio, template_id: m.id, data, person_id: personId, stato: 'lista', creato_da: autore });
  return error ? { ok: false, motivo: ERRORE } : { ok: true };
}

/**
 * Disdice una prenotazione. Oltre 2 ore prima il credito torna; dopo no, e finisce in "Disdette last minute".
 * Se si libera un posto entra il primo in lista che ha ancora un credito (passato in `candidati`, in ordine).
 */
export async function disdici(
  studio: StudioId, b: Prenotazione, m: Modello, p: PersonaCrediti, adesso: Date, candidati: { prenotazione: Prenotazione; persona: PersonaCrediti }[],
): Promise<{ ok: true; tardiva: boolean; entrata: string | null } | { ok: false; motivo: string }> {
  const minuti = minutiAllaLezione(b.data, m.ora, adesso);
  const inTempo = disdettaInTempo(minuti);
  const { error } = await db().from('bookings').update({ stato: inTempo ? 'annullata' : 'tardiva', disdetta_il: adesso.toISOString(), minuti_prima: minuti }).eq('id', b.id);
  if (error) return { ok: false, motivo: ERRORE };
  if (inTempo && !p.creditiIllimitati) await muoviCredito(studio, p.id, 1, `Disdetta in tempo ${nomeLezione(m, b.data)}`);
  const primo = candidati.find((c) => c.persona.creditiIllimitati || c.persona.saldo > 0);
  let entrata: string | null = null;
  if (primo) {
    const { error: e2 } = await db().from('bookings').update({ stato: 'prenotata' }).eq('id', primo.prenotazione.id);
    if (!e2) {
      if (!primo.persona.creditiIllimitati) await muoviCredito(studio, primo.persona.id, -1, `Prenotata dalla lista d'attesa ${nomeLezione(m, b.data)}`);
      entrata = primo.persona.nome;
    }
  }
  return { ok: true, tardiva: !inTempo, entrata };
}

/** Lo studio restituisce il credito di una disdetta tardiva, se l'imprevisto è vero. */
export async function restituisciCredito(studio: StudioId, b: Prenotazione, m: Modello): Promise<Esito> {
  const { error } = await db().from('bookings').update({ stato: 'restituita' }).eq('id', b.id);
  if (error) return { ok: false, motivo: ERRORE };
  return (await muoviCredito(studio, b.personId, 1, `Credito restituito dallo studio ${nomeLezione(m, b.data)}`)) ? { ok: true } : { ok: false, motivo: ERRORE };
}
