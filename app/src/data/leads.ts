import { supabase } from '@/services/supabase';
import type { StudioId } from '@/config/tema';
import {
  controllaPassaggio,
  NOME_FASE,
  oggi,
  puoPassare,
  PROMEMORIA_PREDEFINITI,
  richiamoAlCambioFase,
  richiamoAssenza,
  richiamoSilenzio,
  rimanda,
  type Fase,
  type MessaggioLead,
  type MotivoChiusura,
  type Promemoria,
  type Rimando,
} from '@/domain/leads';
import type { RigaImportata } from '@/domain/importa';

// Tutte le letture e scritture dei contatti passano da qui. Le regole di sicurezza sono nel database.

export type Contatto = {
  id: string;
  studio: StudioId;
  nome: string;
  telefono: string | null;
  fonte: string | null;
  cerca: string | null;
  nota: string | null;
  fase: Fase;
  richiamoIl: string | null;
  motivoChiusura: MotivoChiusura | null;
  campi: Record<string, string>;
  provaIl: string | null;
  provaOra: string | null;
  provaTipo: string | null;
  assenze: number;
  importato: boolean;
  avvisatoIl: string | null;
  haAvutoProva: boolean;
  personaId: string | null;
  creatoIl: string;
};

export type EventoContatto = {
  id: string;
  tipo: 'nota' | 'messaggio_inviato' | 'risposta' | 'cambio_fase' | 'richiamo';
  testo: string | null;
  creatoIl: string;
};

export type NuovoContatto = {
  nome: string;
  telefono: string;
  fonte: string;
  cerca: string;
  nota: string;
};

export type Esito = { ok: true } | { ok: false; motivo: string };

const ERRORE_GENERICO = 'Non sono riuscito a salvare. Controlla la connessione e riprova.';

function db() {
  if (!supabase) throw new Error('Supabase non collegato');
  return supabase;
}

type Riga = {
  id: string;
  studio_id: string;
  nome: string;
  telefono: string | null;
  fonte: string | null;
  cerca: string | null;
  nota: string | null;
  fase: Fase;
  richiamo_il: string | null;
  motivo_chiusura: MotivoChiusura | null;
  campi: Record<string, string> | null;
  prova_il: string | null;
  prova_ora: string | null;
  prova_tipo: string | null;
  assenze: number;
  importato: boolean;
  avvisato_il: string | null;
  ha_avuto_prova: boolean;
  persona_id: string | null;
  creato_il: string;
};

function daRiga(r: Riga): Contatto {
  return {
    id: r.id,
    studio: r.studio_id as StudioId,
    nome: r.nome,
    telefono: r.telefono,
    fonte: r.fonte,
    cerca: r.cerca,
    nota: r.nota,
    fase: r.fase,
    richiamoIl: r.richiamo_il,
    motivoChiusura: r.motivo_chiusura,
    campi: r.campi ?? {},
    provaIl: r.prova_il,
    provaOra: r.prova_ora,
    provaTipo: r.prova_tipo,
    assenze: r.assenze,
    importato: r.importato,
    avvisatoIl: r.avvisato_il,
    haAvutoProva: r.ha_avuto_prova,
    personaId: r.persona_id,
    creatoIl: r.creato_il,
  };
}

async function utenteId(): Promise<string | null> {
  const { data } = await db().auth.getUser();
  return data.user?.id ?? null;
}

export async function elencaContatti(studio: StudioId): Promise<Contatto[] | null> {
  const { data, error } = await db()
    .from('leads')
    .select('*')
    .eq('studio_id', studio)
    .order('creato_il', { ascending: false });
  if (error || !data) return null;
  return (data as Riga[]).map(daRiga);
}

export async function elencaEventi(contattoId: string): Promise<EventoContatto[]> {
  const { data, error } = await db()
    .from('lead_events')
    .select('id, tipo, testo, creato_il')
    .eq('lead_id', contattoId)
    .order('creato_il', { ascending: false });
  if (error || !data) return [];
  return data.map((e) => ({ id: e.id, tipo: e.tipo, testo: e.testo, creatoIl: e.creato_il }));
}

async function scriviEvento(contatto: Contatto, tipo: EventoContatto['tipo'], testo: string): Promise<void> {
  const autore = await utenteId();
  if (!autore) return;
  await db().from('lead_events').insert({ lead_id: contatto.id, studio_id: contatto.studio, tipo, testo, autore });
}

export async function creaContatto(studio: StudioId, c: NuovoContatto, p: Promemoria = PROMEMORIA_PREDEFINITI): Promise<{ ok: true; contatto: Contatto } | { ok: false; motivo: string }> {
  const autore = await utenteId();
  if (!autore) return { ok: false, motivo: ERRORE_GENERICO };
  const vuoto = (t: string) => (t.trim() === '' ? null : t.trim());
  const { data, error } = await db().from('leads').insert({
    studio_id: studio,
    nome: c.nome.trim(),
    telefono: vuoto(c.telefono),
    fonte: vuoto(c.fonte),
    cerca: vuoto(c.cerca),
    nota: vuoto(c.nota),
    richiamo_il: richiamoSilenzio(oggi(), p),
    creato_da: autore,
  }).select('*').single();
  if (error || !data) return { ok: false, motivo: ERRORE_GENERICO };
  const contatto = daRiga(data as Riga);
  await scriviEvento(contatto, 'nota', `Primo contatto da ${contatto.fonte ?? 'Altro'}`);
  return { ok: true, contatto };
}

/** Importa un elenco già controllato (solo le righe nuove). Ogni contatto riceve la nota "Importato da un elenco". */
export async function creaContatti(studio: StudioId, righe: readonly RigaImportata[], fonteDiPartenza: string, p: Promemoria = PROMEMORIA_PREDEFINITI): Promise<{ ok: true; quanti: number } | { ok: false; motivo: string }> {
  const autore = await utenteId();
  const nuove = righe.filter((r) => r.stato === 'nuovo');
  if (!autore) return { ok: false, motivo: ERRORE_GENERICO };
  if (nuove.length === 0) return { ok: true, quanti: 0 };
  const { data, error } = await db().from('leads').insert(nuove.map((r) => ({
    studio_id: studio, nome: r.nome, telefono: r.telefono === '' ? null : r.telefono, fonte: r.fonte || fonteDiPartenza,
    importato: true, richiamo_il: richiamoSilenzio(oggi(), p), creato_da: autore,
  }))).select('id');
  if (error || !data) return { ok: false, motivo: ERRORE_GENERICO };
  await db().from('lead_events').insert(data.map((x) => ({ lead_id: x.id, studio_id: studio, tipo: 'nota', testo: 'Importato da un elenco', autore })));
  return { ok: true, quanti: data.length };
}

export type Prova = { data: string; ora: string; tipo: string };

/** Fissa o sposta la prova: giorno, ora e lezione (o "Lezione di prova" se è un orario libero). */
export async function fissaProva(contatto: Contatto, prova: Prova): Promise<Esito> {
  if (contatto.fase !== 'prova_fissata' && !puoPassare(contatto.fase, 'prova_fissata')) return { ok: false, motivo: 'Questo cambio di fase non è previsto.' };
  const { error } = await db().from('leads').update({
    fase: 'prova_fissata', prova_il: prova.data, prova_ora: prova.ora, prova_tipo: prova.tipo,
    ha_avuto_prova: true, richiamo_il: null, avvisato_il: null,
  }).eq('id', contatto.id);
  if (error) return { ok: false, motivo: ERRORE_GENERICO };
  await scriviEvento(contatto, 'cambio_fase', `Prova fissata: ${prova.data} ${prova.ora} · ${prova.tipo}`);
  return { ok: true };
}

/** Non si è presentato: la prova torna da fissare e si richiama il giorno dopo (se il promemoria è acceso). */
export async function segnaAssente(contatto: Contatto, p: Promemoria = PROMEMORIA_PREDEFINITI): Promise<Esito> {
  const { error } = await db().from('leads').update({
    fase: 'interessato', prova_il: null, prova_ora: null, prova_tipo: null, assenze: contatto.assenze + 1, richiamo_il: richiamoAssenza(oggi(), p),
  }).eq('id', contatto.id);
  if (error) return { ok: false, motivo: ERRORE_GENERICO };
  await scriviEvento(contatto, 'cambio_fase', 'Assente alla prova');
  return { ok: true };
}

/** Il messaggio è partito (WhatsApp o posta): si scrive nella cronologia e si fissa il richiamo se non risponde. */
export async function registraMessaggio(contatto: Contatto, testo: string, promemoriaProva: boolean, p: Promemoria = PROMEMORIA_PREDEFINITI): Promise<Esito> {
  await scriviEvento(contatto, 'messaggio_inviato', testo.trim());
  const cambi: Record<string, string | null> = {};
  if (contatto.fase === 'interessato' || contatto.fase === 'prova_fatta') cambi.richiamo_il = richiamoSilenzio(oggi(), p);
  if (promemoriaProva && contatto.provaIl) cambi.avvisato_il = contatto.provaIl;
  if (Object.keys(cambi).length > 0) {
    const { error } = await db().from('leads').update(cambi).eq('id', contatto.id);
    if (error) return { ok: false, motivo: ERRORE_GENERICO };
  }
  return { ok: true };
}

export async function registraRisposta(contatto: Contatto, testo: string): Promise<Esito> {
  if (testo.trim() === '') return { ok: false, motivo: 'Scrivi cosa ha risposto.' };
  await scriviEvento(contatto, 'risposta', testo.trim());
  return { ok: true };
}

/** Messaggi inviati e ricevuti di tutti i contatti dello studio: servono alla riga "Hai scritto ieri, senza risposta". */
export async function elencaMessaggi(studio: StudioId): Promise<Map<string, MessaggioLead[]>> {
  const { data } = await db().from('lead_events').select('lead_id, tipo, creato_il').eq('studio_id', studio).in('tipo', ['messaggio_inviato', 'risposta']);
  const mappa = new Map<string, MessaggioLead[]>();
  for (const e of data ?? []) mappa.set(e.lead_id, [...(mappa.get(e.lead_id) ?? []), { tipo: e.tipo as MessaggioLead['tipo'], creatoIl: e.creato_il }]);
  return mappa;
}

/** Il contatto è diventato allievo: si collega alla scheda della persona. */
export async function collegaPersona(contatto: Contatto, personaId: string): Promise<Esito> {
  const { error } = await db().from('leads').update({ fase: 'iscritto', persona_id: personaId, richiamo_il: null }).eq('id', contatto.id);
  if (error) return { ok: false, motivo: ERRORE_GENERICO };
  await scriviEvento(contatto, 'cambio_fase', `${NOME_FASE[contatto.fase]} → ${NOME_FASE.iscritto}`);
  return { ok: true };
}

export async function cambiaFase(contatto: Contatto, nuova: Fase, motivo?: MotivoChiusura, p: Promemoria = PROMEMORIA_PREDEFINITI): Promise<Esito> {
  const controllo = controllaPassaggio(contatto.fase, nuova, motivo);
  if (!controllo.ok) return controllo;
  const { error } = await db()
    .from('leads')
    .update({
      fase: nuova,
      richiamo_il: richiamoAlCambioFase(nuova, oggi(), p),
      motivo_chiusura: nuova === 'non_prosegue' ? (motivo ?? null) : null,
    })
    .eq('id', contatto.id);
  if (error) return { ok: false, motivo: ERRORE_GENERICO };
  await scriviEvento(contatto, 'cambio_fase', `${NOME_FASE[contatto.fase]} → ${NOME_FASE[nuova]}`);
  return { ok: true };
}

export async function rimandaRichiamo(contatto: Contatto, quando: Rimando): Promise<Esito> {
  const giorno = rimanda(oggi(), quando);
  const { error } = await db().from('leads').update({ richiamo_il: giorno }).eq('id', contatto.id);
  if (error) return { ok: false, motivo: ERRORE_GENERICO };
  await scriviEvento(contatto, 'richiamo', `Rimandato al ${giorno}`);
  return { ok: true };
}

export async function aggiungiNota(contatto: Contatto, testo: string): Promise<Esito> {
  if (testo.trim() === '') return { ok: false, motivo: 'Scrivi qualcosa nella nota.' };
  await scriviEvento(contatto, 'nota', testo.trim());
  return { ok: true };
}

/** Salva la risposta a un campo su misura (le altre risposte restano com'erano). */
export async function salvaCampo(contatto: Contatto, campoId: string, valore: string): Promise<Esito> {
  const campi = { ...contatto.campi, [campoId]: valore };
  const { error } = await db().from('leads').update({ campi }).eq('id', contatto.id);
  return error ? { ok: false, motivo: ERRORE_GENERICO } : { ok: true };
}

/** Il numero serve per scrivere su WhatsApp: si aggiunge dal messaggio se il contatto non l'aveva. */
export async function salvaTelefono(contatto: Contatto, telefono: string): Promise<Esito> {
  const { error } = await db().from('leads').update({ telefono: telefono.trim() }).eq('id', contatto.id);
  return error ? { ok: false, motivo: ERRORE_GENERICO } : { ok: true };
}
