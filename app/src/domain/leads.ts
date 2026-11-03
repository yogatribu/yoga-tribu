// Regole dei contatti (Interessati). Funzioni pure: niente database, niente schermate.
// Le date sono testi "AAAA-MM-GG" per evitare problemi di fuso orario.
// Regole in .claude/skills/app-fatta-bene/riferimenti/regole-di-business.md, "Contatti: fasi, richiamo, importazione".

import { aggiungiGiorni, oggi } from './date.ts';

export { aggiungiGiorni, oggi };

export const FASI = ['interessato', 'prova_fissata', 'prova_fatta', 'iscritto', 'non_prosegue'] as const;
export type Fase = (typeof FASI)[number];

export const MOTIVI_CHIUSURA = ['troppo_lontano', 'prezzo', 'orari_non_adatti', 'non_risponde', 'altro'] as const;
export type MotivoChiusura = (typeof MOTIVI_CHIUSURA)[number];

export type Rimando = 'domani' | '3_giorni' | 'settimana';

const GIORNI_RIMANDO: Record<Rimando, number> = { domani: 1, '3_giorni': 3, settimana: 7 };

export const GIORNI_DOPO_PROVA = 2;
export const GIORNI_SENZA_RISPOSTA = 2;
export const GIORNI_DOPO_ASSENZA = 1;

/** Dopo "prova fatta" si richiama dopo 2 giorni. */
export function richiamoDopoProva(dataProva: string): string {
  return aggiungiGiorni(dataProva, GIORNI_DOPO_PROVA);
}

/** Dopo un messaggio senza risposta si richiama dopo 2 giorni. */
export function richiamoSenzaRisposta(dataMessaggio: string): string {
  return aggiungiGiorni(dataMessaggio, GIORNI_SENZA_RISPOSTA);
}

/** Se la persona non si presenta la prova torna da fissare e si richiama il giorno dopo. */
export function richiamoDopoAssenza(dataProva: string): string {
  return aggiungiGiorni(dataProva, GIORNI_DOPO_ASSENZA);
}

/** "Rimanda" a domani, tra 3 giorni o tra una settimana, contando da oggi. */
export function rimanda(oggi: string, quando: Rimando): string {
  return aggiungiGiorni(oggi, GIORNI_RIMANDO[quando]);
}

const PASSAGGI: Record<Fase, readonly Fase[]> = {
  interessato: ['prova_fissata', 'iscritto', 'non_prosegue'],
  prova_fissata: ['interessato', 'prova_fatta', 'non_prosegue'],
  prova_fatta: ['prova_fissata', 'iscritto', 'non_prosegue'],
  iscritto: [],
  non_prosegue: ['interessato'],
};

export function puoPassare(da: Fase, a: Fase): boolean {
  return PASSAGGI[da].includes(a);
}

export type Passaggio = { ok: true } | { ok: false; motivo: string };

/** Controlla un cambio di fase. Chiudere un contatto chiede sempre un motivo. */
export function controllaPassaggio(da: Fase, a: Fase, motivo?: MotivoChiusura): Passaggio {
  if (!puoPassare(da, a)) return { ok: false, motivo: 'Questo cambio di fase non è previsto.' };
  if (a === 'non_prosegue' && !motivo) return { ok: false, motivo: 'Per chiudere un contatto serve il motivo.' };
  return { ok: true };
}

export type ContattoPerRichiamo = {
  fase: Fase;
  richiamoIl: string | null;
};

/** Un contatto è "da richiamare" se ha un richiamo fissato per oggi o per un giorno passato e non è chiuso. */
export function daRichiamare(c: ContattoPerRichiamo, oggi: string): boolean {
  if (c.fase === 'iscritto' || c.fase === 'non_prosegue') return false;
  return c.richiamoIl !== null && c.richiamoIl <= oggi;
}

/** Telefono in forma confrontabile: solo cifre, senza prefisso italiano. Serve a trovare i doppioni. */
export function telefonoNormalizzato(telefono: string): string {
  const cifre = telefono.replace(/\D/g, '');
  if (cifre.startsWith('0039')) return cifre.slice(4);
  if (cifre.startsWith('39') && cifre.length > 10) return cifre.slice(2);
  return cifre;
}

export function telefonoValido(telefono: string): boolean {
  const n = telefonoNormalizzato(telefono);
  return n.length >= 9 && n.length <= 11;
}

/** I quattro promemoria che l'app ricorda da sola (Impostazioni dello studio, "Cosa ti ricordiamo in automatico"). */
export type Promemoria = { prima: boolean; dopo: boolean; silenzio: boolean; assente: boolean };
export const PROMEMORIA_PREDEFINITI: Promemoria = { prima: true, dopo: true, silenzio: true, assente: true };
export const PROMEMORIA_TESTI: readonly [keyof Promemoria, string, string][] = [
  ['prima', 'Il giorno prima della prova', 'Ti ricordiamo di mandare il promemoria, già scritto.'],
  ['dopo', 'Due giorni dopo la prova', 'Ti ricordiamo di scrivere a chi è venuto, mentre il ricordo è fresco.'],
  ['silenzio', 'Dopo due giorni senza risposta', 'Ti ricordiamo di richiamare chi non ha risposto.'],
  ['assente', "Il giorno dopo un'assenza", 'Ti ricordiamo di scrivere a chi non si è presentato.'],
];

/** Quando richiamare dopo un cambio di fase. Solo "prova fatta" fissa un richiamo da sola (se il promemoria è acceso). */
export function richiamoAlCambioFase(nuova: Fase, giornoOggi: string, p: Promemoria = PROMEMORIA_PREDEFINITI): string | null {
  return nuova === 'prova_fatta' && p.dopo ? richiamoDopoProva(giornoOggi) : null;
}

/** Richiamo di un contatto appena scritto o a cui si è appena scritto: due giorni, se non risponde. */
export function richiamoSilenzio(giornoOggi: string, p: Promemoria = PROMEMORIA_PREDEFINITI): string | null {
  return p.silenzio ? richiamoSenzaRisposta(giornoOggi) : null;
}

/** Dopo un'assenza alla prova: domani, se il promemoria è acceso. */
export function richiamoAssenza(giornoOggi: string, p: Promemoria = PROMEMORIA_PREDEFINITI): string | null {
  return p.assente ? richiamoDopoAssenza(giornoOggi) : null;
}

export type ProvaContatto = { fase: Fase; provaIl: string | null; avvisatoIl: string | null };

/** "Da avvisare": la prova è oggi o domani e il promemoria non è ancora stato mandato. */
export function daAvvisare(c: ProvaContatto, giornoOggi: string, p: Promemoria = PROMEMORIA_PREDEFINITI): boolean {
  return p.prima && c.fase === 'prova_fissata' && c.provaIl !== null && c.avvisatoIl !== c.provaIl && c.provaIl <= aggiungiGiorni(giornoOggi, 1);
}

export type TipoMessaggioLead = 'primo' | 'conferma' | 'dopo' | 'richiamo' | 'promemoria';

/** Quale messaggio proporre: dipende dalla fase e da cosa è già stato scritto. */
export function tipoMessaggioLead(c: ProvaContatto, avvisare: boolean, haGiaScritto: boolean): TipoMessaggioLead {
  if (c.fase === 'prova_fatta') return 'dopo';
  if (c.fase === 'prova_fissata') return avvisare ? 'promemoria' : 'conferma';
  return haGiaScritto ? 'richiamo' : 'primo';
}

export type ContestoMessaggioLead = {
  nome: string;
  provaIl: string | null;
  provaOra: string | null;
  provaTipo: string | null;
  oggi: string;
  provaEtichetta: string;
  provaPrezzo: number;
  inStudio: string;
};

const GIORNI_TESTO = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
const MESI_TESTO = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];

/** I testi già scritti del prototipo (LTPL), da controllare e inviare con un tocco. */
export function testoMessaggioLead(tipo: TipoMessaggioLead, c: ContestoMessaggioLead): string {
  const n = c.nome.split(' ')[0];
  const prova = c.provaEtichetta.toLowerCase();
  const quando = (iso: string) => {
    const d = new Date(`${iso}T12:00:00Z`);
    return `${GIORNI_TESTO[d.getUTCDay()]} ${d.getUTCDate()} ${MESI_TESTO[d.getUTCMonth()]}`;
  };
  switch (tipo) {
    case 'primo':
      return `Ciao ${n}! Grazie per averci scritto. ${c.provaPrezzo ? `La ${prova} costa ${c.provaPrezzo}€, si paga in studio.` : `La ${prova} è gratuita.`} Quando ti verrebbe comodo venire?`;
    case 'conferma':
      return `Ciao ${n}! Ti aspettiamo ${c.provaIl ? quando(c.provaIl) : ''} alle ${c.provaOra ?? ''} ${c.inStudio}${c.provaTipo ? ` per ${c.provaTipo}` : ''}. Arriva 10 minuti prima.`;
    case 'dopo':
      return `Ciao ${n}! Com'è andata la lezione di prova? Se vuoi ti aiutiamo a capire quale pratica fa per te.`;
    case 'richiamo':
      return `Ciao ${n}! Ti scrivo per la lezione di prova: ti va di scegliere un giorno?`;
    case 'promemoria':
      return `Ciao ${n}! Ti ricordo che ${c.provaIl === c.oggi ? 'oggi' : 'domani'} alle ${c.provaOra ?? ''} ti aspettiamo ${c.inStudio} per la ${prova}. Arriva 10 minuti prima. Se non riesci a venire, scrivimi.`;
  }
}

export type MessaggioLead = { tipo: 'messaggio_inviato' | 'risposta'; creatoIl: string };

/** La riga "Hai scritto ieri, senza risposta" / "Ha scritto 2 giorni fa: tocca a te" della scheda e della lista. */
export function ultimoMessaggio(eventi: readonly MessaggioLead[], fase: Fase, quando: (iso: string) => string): string {
  const m = eventi.filter((e) => e.tipo === 'messaggio_inviato' || e.tipo === 'risposta').sort((a, b) => b.creatoIl.localeCompare(a.creatoIl))[0];
  if (!m) return 'Nessun messaggio ancora';
  return m.tipo === 'messaggio_inviato'
    ? `Hai scritto ${quando(m.creatoIl)}${fase === 'interessato' || fase === 'prova_fatta' ? ', senza risposta' : ''}`
    : `Ha scritto ${quando(m.creatoIl)}: tocca a te`;
}

/** Numero per il link WhatsApp: prefisso italiano e sole cifre. Vuoto se il telefono non è valido. */
export function numeroWhatsApp(telefono: string): string {
  if (!telefonoValido(telefono)) return '';
  return `39${telefonoNormalizzato(telefono)}`;
}

export const NOME_FASE: Record<Fase, string> = {
  interessato: 'Interessato',
  prova_fissata: 'Prova fissata',
  prova_fatta: 'Prova fatta',
  iscritto: 'Iscritto',
  non_prosegue: 'Non prosegue',
};

export const NOME_MOTIVO: Record<MotivoChiusura, string> = {
  troppo_lontano: 'Troppo lontano',
  prezzo: 'Prezzo',
  orari_non_adatti: 'Orari non adatti',
  non_risponde: 'Non risponde',
  altro: 'Altro',
};

export const NOME_RIMANDO: Record<Rimando, string> = {
  domani: 'Domani',
  '3_giorni': 'Tra 3 giorni',
  settimana: 'Tra una settimana',
};

export const FASI_APERTE: readonly Fase[] = ['interessato', 'prova_fissata', 'prova_fatta'];
