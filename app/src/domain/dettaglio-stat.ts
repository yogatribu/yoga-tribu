// Pagine di dettaglio delle Statistiche: toccando un numero o una barra si vede tutta la sua storia.
// Funzioni pure. Una "chiave" come "giorno|1" o "lead|fonte|Instagram" dice cosa mostrare (stesse chiavi del prototipo).
import { aggiungiGiorni, giornoDellaSettimana } from './date.ts';
import type { Evento } from './eventi.ts';
import { fdate, MESI_BREVI, quandoRel } from './formati.ts';
import { NOME_FASE, NOME_MOTIVO, type Fase, type MotivoChiusura } from './leads.ts';
import { euro, nomeCompleto, type Acquisto, type Persona } from './persone.ts';
import type { StatoAllievo } from './prenotazioni.ts';
import { NOME_GIORNO, NOME_STILE } from './programma.ts';
import { occupazione, somma, type ContattoStat, type LezioneFatta } from './statistiche.ts';

export type PersonaStat = {
  persona: Persona; saldo: number; daIncassareCent: number; stato: StatoAllievo; ultimaLezione: string | null; inScadenza: boolean; acquisti: Acquisto[];
};
export type ContattoDettaglio = ContattoStat & { id: string; nome: string; cerca: string | null };
export type EventoStat = { evento: Evento; presi: number };
export type DatiDettaglio = { oggi: string; /* almeno gli ultimi due anni, servono per il confronto */ lezioni: LezioneFatta[]; persone: PersonaStat[]; contatti: ContattoDettaglio[]; eventi: EventoStat[] };

export type RigaDettaglio = { data: string; titolo: string; sotto: string; valore: string; personaId?: string };
export type PuntoSerie = { l: string; v: number; c?: string; chiave?: string };
export type Dettaglio = {
  titolo: string; sotto: string; tiles: { b: string | number; s: string }[]; serieTitolo?: string; serie?: PuntoSerie[]; formato?: 'percento' | 'migliaia'; righe: RigaDettaglio[];
};

const ULTIMO_ANNO = "Tutte le lezioni dell'ultimo anno, dalla più recente.";
const num = (v: number) => v.toLocaleString('it-IT');
const dec = (v: number) => v.toFixed(1).replace('.', ',');

/** Gli ultimi dodici mesi, il più vecchio per primo. */
export function ultimiMesi(oggi: string, n = 12): { chiave: string; l: string }[] {
  const [a, m] = oggi.split('-').map(Number);
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.UTC(a, m - 1 - (n - 1 - i), 1));
    return { chiave: d.toISOString().slice(0, 7), l: MESI_BREVI[d.getUTCMonth()] };
  });
}

function righeLezioni(l: readonly LezioneFatta[], come: 'pren' | 'occ'): RigaDettaglio[] {
  return [...l].sort((a, b) => b.data.localeCompare(a.data) || b.modello.ora.localeCompare(a.modello.ora)).map((x) => ({
    data: x.data, titolo: x.modello.tipo, sotto: `${fdate(x.data)} · ${x.modello.ora} · ${x.modello.insegnante}`,
    valore: come === 'occ' ? `${x.modello.posti ? Math.round((x.pren / x.modello.posti) * 100) : 0}%` : `${x.pren} su ${x.modello.posti}`,
  }));
}

function perLezioni(titolo: string, sotto: string, l: readonly LezioneFatta[], come: 'pren' | 'occ', oggi: string): Dettaglio {
  const n = l.length;
  const serie = ultimiMesi(oggi).map(({ chiave, l: et }) => {
    const m = l.filter((x) => x.data.startsWith(chiave));
    return { l: et, chiave: `mese|${chiave}|${come}`, v: come === 'occ' ? occupazione(m) : somma(m) };
  });
  return {
    titolo, sotto,
    tiles: [{ b: num(somma(l)), s: 'prenotazioni' }, { b: n, s: 'lezioni' }, { b: n ? dec(somma(l) / n) : '0', s: 'prenotati a lezione' }, { b: `${occupazione(l)}%`, s: 'posti occupati' }],
    serieTitolo: come === 'occ' ? 'Occupazione per mese' : 'Prenotazioni per mese', serie, formato: come === 'occ' ? 'percento' : undefined, righe: righeLezioni(l, come),
  };
}

function perPersone(titolo: string, sotto: string, lista: readonly PersonaStat[], oggi: string, valore: (s: PersonaStat) => string = (s) => s.stato): Dettaglio {
  const righe = [...lista].sort((a, b) => b.persona.iscrittoIl.localeCompare(a.persona.iscrittoIl)).map((s) => ({
    data: s.persona.iscrittoIl, titolo: nomeCompleto(s.persona),
    sotto: `Iscrizione ${fdate(s.persona.iscrittoIl)} · ${s.ultimaLezione ? `ultima lezione ${quandoRel(s.ultimaLezione, oggi)}` : 'nessuna lezione ancora'} · ${s.persona.creditiIllimitati ? 'illimitati' : `${s.saldo} crediti`}`,
    valore: valore(s), personaId: s.persona.id,
  }));
  const mesi = lista.length ? lista.reduce((a, s) => a + Math.max(1, (Date.parse(oggi) - Date.parse(s.persona.iscrittoIl)) / 86_400_000 / 30.4), 0) / lista.length : 0;
  return {
    titolo, sotto,
    tiles: [{ b: lista.length, s: 'persone' }, { b: lista.filter((s) => s.persona.iscrittoIl >= aggiungiGiorni(oggi, -30)).length, s: 'iscrizioni negli ultimi 30 giorni' }, { b: dec(mesi), s: 'mesi con noi, in media' }, { b: lista.reduce((a, s) => a + (s.persona.creditiIllimitati ? 0 : Math.max(0, s.saldo)), 0), s: 'crediti rimasti' }],
    serieTitolo: 'Iscrizioni per mese', serie: ultimiMesi(oggi).map(({ chiave, l }) => ({ l, chiave: `nuovemese|${chiave}`, v: lista.filter((s) => s.persona.iscrittoIl.startsWith(chiave)).length, c: 'var(--t-acc)' })), righe,
  };
}

function perContatti(titolo: string, lista: readonly ContattoDettaglio[], oggi: string): Dettaglio {
  const righe = [...lista].sort((a, b) => b.creatoIl.localeCompare(a.creatoIl)).map((c) => ({
    data: c.creatoIl, titolo: c.nome,
    sotto: [c.fonte, c.cerca, `scritto ${quandoRel(c.creatoIl, oggi)}`].filter(Boolean).join(' · '),
    valore: NOME_FASE[c.fase as Fase] + (c.motivoChiusura ? ` · ${NOME_MOTIVO[c.motivoChiusura as MotivoChiusura] ?? c.motivoChiusura}` : ''),
  }));
  const settimane = Array.from({ length: 13 }, (_, i) => {
    const fine = aggiungiGiorni(oggi, -(12 - i) * 7);
    const ini = aggiungiGiorni(fine, -6);
    const [, m, g] = ini.split('-').map(Number);
    return { l: `${g}/${m}`, v: lista.filter((c) => c.creatoIl.slice(0, 10) >= ini && c.creatoIl.slice(0, 10) <= fine).length, c: 'var(--t-acc3)' };
  });
  return {
    titolo, sotto: 'Ogni contatto, dal più recente.',
    tiles: [{ b: lista.length, s: 'contatti' }, { b: lista.filter((c) => c.fase === 'iscritto').length, s: 'iscritti' }, { b: lista.filter((c) => c.fase === 'non_prosegue').length, s: 'non proseguono' }, { b: lista.filter((c) => c.fase !== 'iscritto' && c.fase !== 'non_prosegue').length, s: 'in corso' }],
    serieTitolo: 'Contatti a settimana', serie: settimane, righe,
  };
}

function nelPeriodo(d: DatiDettaglio, n: number): ContattoDettaglio[] {
  const da = aggiungiGiorni(d.oggi, -n);
  return d.contatti.filter((c) => c.creatoIl.slice(0, 10) >= da);
}

/** Cosa mostrare per una chiave. `giorni` è il periodo scelto in alto (30, 90, 365), usato per i contatti. */
export function dettaglioStatistica(chiave: string, d: DatiDettaglio, giorni: number): Dettaglio {
  const [t, a = '', ...resto] = chiave.split('|');
  const b = resto.join('|');
  const l = d.lezioni.filter((x) => x.data >= aggiungiGiorni(d.oggi, -365));
  const slotTesto = (x: LezioneFatta) => `${x.modello.giorno}|${x.modello.ora}|${x.modello.tipo}`;
  const personeConStato = (s: StatoAllievo) => d.persone.filter((p) => p.stato === s);

  if (t === 'pren') return perLezioni('Prenotazioni', ULTIMO_ANNO, l, 'pren', d.oggi);
  if (t === 'occ') return perLezioni('Posti occupati', ULTIMO_ANNO, l, 'occ', d.oggi);
  if (t === 'giorno') return perLezioni(`Prenotazioni ${Number(a) === 0 ? 'della ' : 'del '}${NOME_GIORNO[Number(a)]}`, ULTIMO_ANNO, l.filter((x) => giornoDellaSettimana(x.data) === Number(a)), 'pren', d.oggi);
  if (t === 'stile') return perLezioni(NOME_STILE[a] ?? a, ULTIMO_ANNO, l.filter((x) => x.modello.stile === a), 'pren', d.oggi);
  if (t === 'slot') {
    const k = [a, ...resto].join('|');
    const [g, ora, ...tipo] = k.split('|');
    return perLezioni(`${NOME_GIORNO[Number(g)].slice(0, 3)} ${ora} · ${tipo.join('|')}`, ULTIMO_ANNO, l.filter((x) => slotTesto(x) === k), 'occ', d.oggi);
  }
  if (t === 'ins') return perLezioni(a, ULTIMO_ANNO, l.filter((x) => x.modello.insegnante.split(/\s+e\s+|,\s*/).map((s) => s.trim()).includes(a)), 'occ', d.oggi);
  if (t === 'mese') {
    const come = b === 'occ' ? 'occ' : 'pren';
    const [anno, mese] = a.split('-').map(Number);
    return perLezioni(`${NOME_MESE(mese)} ${anno}`, 'Le lezioni di quel mese.', l.filter((x) => x.data.startsWith(a)), come, d.oggi);
  }
  if (t === 'inc') return incassi(d);
  if (t === 'incasso') return daIncassare(d);
  if (t === 'crediti') {
    const con = d.persone.filter((p) => !p.persona.creditiIllimitati && p.saldo > 0);
    const dett = perPersone('Crediti in giro', 'Chi ha ancora lezioni nel pacchetto.', con, d.oggi, (p) => `${p.saldo} crediti`);
    return { ...dett, tiles: [{ b: con.length, s: 'persone con crediti' }, { b: con.reduce((s, p) => s + p.saldo, 0), s: 'lezioni in tutto' }, { b: euro(con.reduce((s, p) => s + p.saldo, 0) * 1200), s: 'valore stimato (12€ a lezione)' }, { b: d.persone.filter((p) => p.persona.creditiIllimitati).length, s: 'illimitati' }] };
  }
  if (t === 'nuove') return perPersone('Nuove persone', 'Chi si è iscritto, dalla più recente.', d.persone.filter((p) => p.persona.iscrittoIl >= aggiungiGiorni(d.oggi, -365)), d.oggi);
  if (t === 'nuovemese') return perPersone(`Nuove persone · ${a}`, 'Chi si è iscritto in quel mese.', d.persone.filter((p) => p.persona.iscrittoIl.startsWith(a)), d.oggi);
  if (t === 'stato') return perPersone(a, 'Le persone in questo stato adesso.', personeConStato(a as StatoAllievo), d.oggi);
  if (t === 'fonteal') return perPersone(`Conosciuti da: ${a}`, 'Come ci hanno conosciuto.', d.persone.filter((p) => (p.persona.fonte ?? 'Non indicata') === a), d.oggi);
  if (t === 'seg') {
    const tutti = d.persone;
    const mappa: Record<string, [string, PersonaStat[]]> = {
      attivi: ['Allievi attivi', tutti.filter((p) => p.stato === 'Regolare' || p.stato === 'Nuovo ingresso')],
      rischio: ['A rischio', personeConStato('A rischio')],
      inattivi: ['In pausa', personeConStato('In pausa')],
      scadenza: ['Pacchetti in scadenza', tutti.filter((p) => p.inScadenza)],
      illim: ['Crediti illimitati', tutti.filter((p) => p.persona.creditiIllimitati)],
      tutti: ['Tutte le persone', tutti],
    };
    const [ti, arr] = mappa[a] ?? mappa.tutti;
    return perPersone(ti, 'Le persone, dalla più recente.', arr, d.oggi);
  }
  if (t === 'ev') return perEvento(a, d);
  if (t === 'lead') {
    const tutti = nelPeriodo(d, giorni);
    const mappa: Record<string, [string, ContattoDettaglio[]]> = {
      tutti: ['Contatti', tutti],
      prove: ['Prove fissate', tutti.filter((c) => c.fase === 'prova_fissata' || c.fase === 'prova_fatta' || c.fase === 'iscritto' || c.haAvutoProva)],
      fatte: ['Prove fatte', tutti.filter((c) => c.fase === 'prova_fatta' || c.fase === 'iscritto')],
      decisi: ['Chi ha già deciso', tutti.filter((c) => c.fase === 'iscritto' || c.fase === 'non_prosegue')],
      iscritto: ['Nuovi iscritti', tutti.filter((c) => c.fase === 'iscritto')],
      prima: ['Persi prima della prova', tutti.filter((c) => c.fase === 'non_prosegue' && !c.haAvutoProva)],
      ass: ['Persi: assenti alla prova', tutti.filter((c) => c.fase === 'non_prosegue' && c.haAvutoProva && c.assenze > 0)],
      dopo: ['Persi dopo la prova', tutti.filter((c) => c.fase === 'non_prosegue' && c.haAvutoProva && c.assenze === 0)],
      fonte: [`Fonte: ${b}`, tutti.filter((c) => (c.fonte ?? 'Non indicata') === b)],
      motivo: [`Motivo: ${b}`, tutti.filter((c) => c.fase === 'non_prosegue' && c.motivoChiusura !== null && (NOME_MOTIVO[c.motivoChiusura as MotivoChiusura] ?? c.motivoChiusura) === b)],
    };
    const [ti, arr] = mappa[a] ?? mappa.tutti;
    return perContatti(ti, arr, d.oggi);
  }
  return perLezioni('Prenotazioni', ULTIMO_ANNO, l, 'pren', d.oggi);
}

const NOME_MESE = (m: number) => ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'][m - 1];

function incassi(d: DatiDettaglio): Dettaglio {
  const da = aggiungiGiorni(d.oggi, -365);
  const voci = d.persone.flatMap((p) => p.acquisti.filter((a) => a.incassato && (a.creatoIl ?? '').slice(0, 10) >= da).map((a) => ({ a, p })));
  const tot = voci.reduce((s, x) => s + x.a.prezzoCent, 0);
  return {
    titolo: 'Incassi', sotto: "Quello che è stato incassato nell'ultimo anno, dal più recente.",
    tiles: [{ b: euro(tot), s: 'incassati' }, { b: voci.length, s: 'pagamenti' }, { b: euro(voci.length ? Math.round(tot / voci.length) : 0), s: 'a pagamento' }, { b: new Set(voci.map((x) => x.p.persona.id)).size, s: 'persone' }],
    serieTitolo: 'Incassi per mese', formato: 'migliaia',
    serie: ultimiMesi(d.oggi).map(({ chiave, l }) => ({ l, v: Math.round(voci.filter((x) => (x.a.creatoIl ?? '').startsWith(chiave)).reduce((s, x) => s + x.a.prezzoCent, 0) / 100) })),
    righe: voci.sort((x, y) => (y.a.creatoIl ?? '').localeCompare(x.a.creatoIl ?? '')).map(({ a, p }) => ({ data: (a.creatoIl ?? '').slice(0, 10), titolo: a.nome, sotto: `${nomeCompleto(p.persona)} · ${fdate((a.creatoIl ?? d.oggi).slice(0, 10))}`, valore: euro(a.prezzoCent), personaId: p.persona.id })),
  };
}

function daIncassare(d: DatiDettaglio): Dettaglio {
  const voci = d.persone.flatMap((p) => p.acquisti.filter((a) => !a.incassato).map((a) => ({ a, p })));
  const tot = voci.reduce((s, x) => s + x.a.prezzoCent, 0);
  return {
    titolo: 'Da incassare', sotto: 'Pagamenti ancora da saldare, dal più vecchio.',
    tiles: [{ b: euro(tot), s: 'da incassare' }, { b: voci.length, s: 'pagamenti' }, { b: new Set(voci.map((x) => x.p.persona.id)).size, s: 'persone' }, { b: euro(voci.length ? Math.round(tot / voci.length) : 0), s: 'a pagamento' }],
    righe: voci.sort((x, y) => (x.a.creatoIl ?? '').localeCompare(y.a.creatoIl ?? '')).map(({ a, p }) => ({ data: (a.creatoIl ?? '').slice(0, 10), titolo: a.nome, sotto: `${nomeCompleto(p.persona)} · ${a.creatoIl ? fdate(a.creatoIl.slice(0, 10)) : ''}`, valore: euro(a.prezzoCent), personaId: p.persona.id })),
  };
}

function perEvento(id: string, d: DatiDettaglio): Dettaglio {
  const e = d.eventi.find((x) => x.evento.id === id);
  if (!e) return { titolo: 'Evento', sotto: '', tiles: [], righe: [] };
  const posti = e.evento.posti;
  return {
    titolo: e.evento.titolo, sotto: `${fdate(e.evento.da)}${e.evento.a && e.evento.a !== e.evento.da ? ` → ${fdate(e.evento.a)}` : ''}`,
    tiles: [{ b: e.presi, s: 'iscritti' }, { b: posti, s: 'posti' }, { b: Math.max(0, posti - e.presi), s: 'liberi' }, e.evento.suRichiesta || e.evento.prezzoCent === null ? { b: 'da concordare', s: 'quota' } : { b: euro(e.presi * e.evento.prezzoCent), s: 'incasso previsto' }],
    righe: [],
  };
}
