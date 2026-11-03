// Avvisi a un gruppo: a chi arriva un messaggio dello studio. Funzioni pure.
// Regola di privacy: i tag che riguardano la salute non si usano per le novità e le proposte (solo per avvisi importanti).

export type TipoAvviso = 'novita' | 'importante';

/** Tag che riguardano la salute: non guidano mai un messaggio promozionale. */
export const TAG_SENSIBILI = ['Infortunio', 'Gravidanza', 'Schiena', 'Cervicali'];

export const MESSAGGI_PRONTI: Record<string, [string, string, TipoAvviso]> = {
  nuova: ['Una nuova lezione per te', 'Abbiamo aggiunto una lezione che può interessarti. Trovi giorno e orario nel Calendario.', 'novita'],
  posti: ['Ci sono ancora posti', 'Per una delle prossime lezioni ci sono ancora posti. Prenota dal Calendario.', 'novita'],
  dati: ['Completa il tuo profilo', 'Ci mancano ancora alcuni dati. Apri Profilo e tocca Modifica profilo: ti bastano 30 secondi.', 'importante'],
  cambio: ['Cambio di orario', 'Ti scriviamo per avvisarti di un cambio di orario. Controlla il Calendario.', 'importante'],
};

export const SEGMENTI_AVVISO: readonly [string, string][] = [
  ['prova', 'In prova'], ['scadenza', 'Pacchetto in scadenza'], ['rischio', 'A rischio abbandono'], ['inattivi', 'In pausa'], ['dati', 'Dati da completare'],
];

export type PersonaAvviso = {
  id: string;
  nome: string;
  tag: string[];
  consensoNovita: boolean;
  stato: 'In prova' | 'Nuovo ingresso' | 'Regolare' | 'A rischio' | 'In pausa';
  inScadenza: boolean;
  datiMancanti: boolean;
  lezioniRecenti: string[];   // tipi di lezione frequentati negli ultimi 60 giorni
};

/** Chi appartiene a un gruppo. Gli id sono "tutti", "tag|Nome", "lez|Tipo" oppure "seg|chiave". */
export function personeDelGruppo(gruppo: string, tutte: readonly PersonaAvviso[]): PersonaAvviso[] {
  const [t, a] = gruppo.split('|');
  if (gruppo === 'tutti') return [...tutte];
  if (t === 'tag') return tutte.filter((p) => p.tag.includes(a));
  if (t === 'lez') return tutte.filter((p) => p.lezioniRecenti.includes(a));
  if (t === 'seg') {
    return tutte.filter((p) => (a === 'prova' ? p.stato === 'In prova' : a === 'scadenza' ? p.inScadenza : a === 'rischio' ? p.stato === 'A rischio' : a === 'inattivi' ? p.stato === 'In pausa' : a === 'dati' ? p.datiMancanti : false));
  }
  return [];
}

/** Chi riceve e chi resta fuori: le novità arrivano solo a chi ha accettato le comunicazioni; gli avvisi importanti a tutti. Una persona una volta sola. */
export function destinatari(gruppi: readonly string[], tipo: TipoAvviso, tutte: readonly PersonaAvviso[]): { ricevono: PersonaAvviso[]; esclusi: PersonaAvviso[]; tutti: PersonaAvviso[] } {
  const scelti = new Map<string, PersonaAvviso>();
  for (const g of gruppi) for (const p of personeDelGruppo(g, tutte)) scelti.set(p.id, p);
  const tuttiOrdinati = [...scelti.values()].sort((a, b) => a.nome.localeCompare(b.nome));
  const ok = (p: PersonaAvviso) => tipo === 'importante' || p.consensoNovita;
  return { ricevono: tuttiOrdinati.filter(ok), esclusi: tuttiOrdinati.filter((p) => !ok(p)), tutti: tuttiOrdinati };
}

/** Le novità non partono tra le 21 e le 8: se si invia di notte arrivano la mattina dopo. */
export function eNotte(ora: number): boolean {
  return ora < 8 || ora >= 21;
}

/** Un tag sensibile non si può scegliere per una novità o una proposta. */
export function gruppoConsentito(gruppo: string, tipo: TipoAvviso): boolean {
  return !(tipo === 'novita' && gruppo.startsWith('tag|') && TAG_SENSIBILI.includes(gruppo.slice(4)));
}

export function descriviPersone(n: number): string {
  return `${n} ${n === 1 ? 'persona' : 'persone'}`;
}
