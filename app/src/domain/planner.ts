// Planner dei contenuti: da ogni evento nascono i post da pubblicare, e il piano li mette nei giorni giusti.
// Port del prototipo (plRighe, plPiano, plDidascalia in src/pages/app-demo.astro). Funzioni pure; date "AAAA-MM-GG".
// Per ora non ci sono "Tema del mese" e "Cambio stagione": dipendono dal Ciclo, che non è ancora nell'app vera.

import { aggiungiGiorni, giornoDellaSettimana } from './date.ts';

export type TipoPlanner = 'ritiro' | 'seminario' | 'corso' | 'approfondimento' | 'salute' | 'percorso' | 'conferenza' | 'lezione' | 'incontro' | 'avviso' | 'serie';
export type FasePlanner = 'annuncio' | 'promemoria' | 'countdown' | 'giorno' | 'recap' | 'rubrica' | 'completo';
export type FormatoPlanner = 'carosello' | 'reel' | 'post' | 'storie' | 'a4';
export type StatoPost = 'proposto' | 'confermato' | 'creato' | 'pubblicato' | 'annullato';

type Passo = [FasePlanner, number, FormatoPlanner, string, number?, number?];
export const PL_TIPI: Record<Exclude<TipoPlanner, 'serie'>, { l: string; w: number; p: Passo[] }> = {
  ritiro: { l: 'Ritiro', w: 5, p: [['annuncio', -56, 'carosello', 'Far conoscere il ritiro: dove, quando, per chi'], ['promemoria', -28, 'reel', 'Convertire: perché partire, early bird'], ['promemoria', -14, 'storie', "Ricordare la scadenza dell'early bird"], ['countdown', -7, 'storie', 'Countdown: gli ultimi posti', 7], ['giorno', 0, 'storie', 'Storie dal vivo il giorno della partenza'], ['annuncio', -56, 'a4', 'Foglio da esporre in studio', 0, 1], ['recap', 2, 'carosello', 'Racconto e foto del ritiro', 0, 1]] },
  seminario: { l: 'Seminario', w: 5, p: [['annuncio', -28, 'carosello', 'Presentare il seminario: chi lo tiene, cosa si lavora, per chi è'], ['promemoria', -14, 'reel', 'Convertire: un assaggio del lavoro del seminario', 0, 1], ['countdown', -7, 'storie', 'Countdown giornaliero fino al seminario', 7], ['giorno', 0, 'storie', 'Storie dal seminario'], ['recap', 1, 'carosello', 'Racconto e foto del seminario', 0, 1]] },
  corso: { l: 'Corso', w: 4, p: [['annuncio', -21, 'carosello', 'Presentare il nuovo corso: a chi serve, cosa si impara'], ['promemoria', -7, 'reel', 'Convertire: iscriversi ora'], ['countdown', -3, 'storie', 'Ultimi posti per le iscrizioni', 3], ['annuncio', -21, 'a4', 'Volantino da esporre in studio', 0, 1], ['recap', 7, 'carosello', 'Le prime impressioni di chi ha iniziato', 0, 1]] },
  approfondimento: { l: 'Approfondimento', w: 3, p: [['annuncio', -7, 'storie', "Annunciare l'approfondimento: tema, data, quota"], ['annuncio', -5, 'carosello', "Post sul tema dell'approfondimento, utile anche a chi non viene"], ['promemoria', -2, 'storie', 'Ricordare data e posti', 0, 1], ['giorno', 0, 'storie', "Storie dall'approfondimento"], ['recap', 1, 'storie', "Com'è andata", 0, 1]] },
  salute: { l: 'Salute femminile', w: 3, p: [['annuncio', -10, 'carosello', 'Carosello educativo sul tema, con tono dedicato'], ['annuncio', -10, 'storie', "Annunciare l'incontro"], ['promemoria', -2, 'storie', 'Ricordare data e come prenotare'], ['annuncio', -14, 'reel', 'Reel sul tema, se si presta', 0, 1], ['recap', 1, 'storie', 'Ringraziare chi è venuta', 0, 1]] },
  percorso: { l: 'Percorso con Sara', w: 4, p: [['annuncio', -21, 'carosello', 'Presentare il percorso: a chi serve e cosa si lavora'], ['annuncio', -14, 'storie', 'Annunciare giorno, ora e numero di incontri'], ['promemoria', -7, 'storie', 'Ricordare le date e come iscriversi'], ['countdown', -3, 'storie', 'Ultimi posti per iscriversi', 3], ['recap', 7, 'storie', 'Ringraziare chi ha iniziato', 0, 1]] },
  conferenza: { l: 'Conferenza', w: 2, p: [['annuncio', -14, 'storie', 'Annunciare la conferenza'], ['annuncio', -14, 'post', 'Post con titolo, relatore, data'], ['promemoria', -3, 'storie', 'Ricordare data e luogo', 0, 1], ['giorno', 0, 'storie', 'Storie dalla conferenza'], ['recap', 1, 'storie', "Com'è andata", 0, 1]] },
  lezione: { l: 'Lezione speciale', w: 2, p: [['annuncio', -7, 'storie', 'Annunciare la lezione speciale'], ['annuncio', -7, 'post', 'Post con cosa si fa, quando e chi la tiene'], ['promemoria', -1, 'storie', 'Ricordare orario e posti'], ['giorno', 0, 'storie', 'Storie dalla lezione']] },
  incontro: { l: 'Incontro', w: 1, p: [['annuncio', -7, 'storie', "Annunciare l'incontro"], ['promemoria', -1, 'storie', 'Ricordare data e luogo', 0, 1], ['giorno', 0, 'storie', "Storie dall'incontro"]] },
  avviso: { l: 'Avviso', w: 1, p: [['annuncio', -2, 'storie', 'Avvisare in anticipo, se è una chiusura programmata', 0, 1], ['giorno', 0, 'storie', "Dare l'avviso"], ['giorno', 0, 'post', "Post solo se l'avviso è rilevante per tutti", 0, 1]] },
};

export const PL_FMT: Record<FormatoPlanner, string> = { carosello: 'Carosello', reel: 'Reel', post: 'Post 4:5', storie: 'Storie', a4: 'Foglio A4' };
export const PL_ORA: Record<FormatoPlanner, string> = { carosello: '19:00', reel: '12:30', post: '19:00', storie: '9:00', a4: 'da stampare' };
export const PL_FASE: Record<FasePlanner, string> = { annuncio: 'Annuncio', promemoria: 'Promemoria', countdown: 'Ultimi giorni', giorno: 'Il giorno', recap: "Dopo l'evento", rubrica: 'Rubrica', completo: 'Al completo' };
export const PL_STATI: Record<StatoPost, [string, string]> = {
  proposto: ['Da confermare', '#b8841f'], confermato: ['Da preparare', '#9c9a66'], creato: ['Da pubblicare', '#7a6b5f'], pubblicato: ['Pubblicato', '#7a9d6e'], annullato: ['Non lo faccio', '#9b9b9b'],
};
export const PL_BLOCCATI: StatoPost[] = ['confermato', 'creato', 'pubblicato'];
const PL_FEED: FormatoPlanner[] = ['carosello', 'reel', 'post'];

export type EventoPlanner = {
  id: string; tipo: TipoPlanner; titolo: string; data: string; fine: string | null; luogo: string | null; prezzoEuro: number; posti: number;
  con: string | null; orario: string | null; completo: boolean; extra: { scadenza?: string; pubblico?: string; link?: string };
};

export type SalvataggioPost = {
  stato: StatoPost; data: string | null; formato: FormatoPlanner | null; dataEvento: string | null; sposta: string | null; ok: boolean;
  istantanea: { titolo: string; tipoL: string; fase: FasePlanner; ob: string; span: number } | null; risultati: Record<string, unknown> | null;
};

export type Riga = {
  id: string; ev: EventoPlanner | null; off: number; tipoL: string; w: number; fase: FasePlanner; fmt: FormatoPlanner; ob: string; span: number; opz: boolean;
  ideal: string; giorni: number; chiuso?: boolean;
  // calcolati dal piano
  s?: Partial<SalvataggioPost>; st?: StatoPost; f?: FormatoPlanner; data?: string; fisso?: boolean; ritardo?: boolean; orfano?: boolean; avviso?: boolean;
  titoloEv?: string; conf?: { txt: string; togli?: boolean; sposta?: string; fmt?: FormatoPlanner };
};

const diff = (a: string, b: string) => Math.round((Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10)) - Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10))) / 86_400_000);
const MESI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
const MESI_L = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
export const breve = (iso: string) => `${Number(iso.slice(8))} ${MESI[Number(iso.slice(5, 7)) - 1]}`;
const lungo = (iso: string) => `${Number(iso.slice(8))} ${MESI_L[Number(iso.slice(5, 7)) - 1]}`;

function serie(id: string, titolo: string, data: string): EventoPlanner {
  return { id, tipo: 'serie', titolo, data, fine: null, luogo: null, prezzoEuro: 0, posti: 0, con: null, orario: null, completo: false, extra: {} };
}

/** Le righe del piano: un post per ogni passo previsto per ogni evento, più le rubriche che ci sono sempre. */
export function righe(eventi: readonly EventoPlanner[], oggi: string): Riga[] {
  const R: Riga[] = [];
  for (const ev of eventi) {
    if (ev.tipo === 'serie') continue;
    const t = PL_TIPI[ev.tipo];
    t.p.forEach(([fase, off, fmt, ob, span, opz], i) => {
      const base = off > 0 && ev.fine ? ev.fine : ev.data;
      const ideal = aggiungiGiorni(base, off);
      if (!(ideal >= oggi || ev.data >= oggi || (fase === 'recap' && ideal >= aggiungiGiorni(oggi, -7)))) return;
      R.push({ id: `${ev.id}~${i}`, ev, off, tipoL: t.l, w: t.w, fase, fmt, ob, span: span ?? 0, opz: Boolean(opz), ideal, giorni: diff(ev.data, oggi), chiuso: ev.completo && (fase === 'promemoria' || fase === 'countdown') });
    });
  }
  // Quando i posti finiscono, un solo post per dirlo e invitare a mettersi in lista.
  for (const ev of eventi) {
    if (ev.completo && ev.tipo !== 'serie' && ev.data >= oggi) {
      const t = PL_TIPI[ev.tipo];
      R.push({ id: `${ev.id}~completo`, ev, off: 0, tipoL: t.l, w: t.w + 1, fase: 'completo', fmt: 'post', span: 0, opz: false, ideal: oggi, giorni: diff(ev.data, oggi),
        ob: ev.tipo === 'percorso' ? 'Dire che i posti sono finiti e invitare a mettersi in lista per il prossimo percorso' : 'Dire che i posti sono finiti e invitare a mettersi in lista' });
    }
  }
  const rubrica = (ev: EventoPlanner, k: string, fase: FasePlanner, fmt: FormatoPlanner, ob: string, ideal: string, w: number, tipoL: string) => {
    if (ideal >= oggi) R.push({ id: `${ev.id}~${k}`, ev, off: 0, tipoL, w, fase, fmt, ob, span: 0, opz: false, ideal, giorni: diff(ideal, oggi) });
  };
  // Una lezione di prova ogni due settimane, a partire da un lunedì di riferimento.
  const ancora = '2026-01-05';
  for (let i = 0; i < 90; i++) {
    const d = aggiungiGiorni(oggi, i);
    if (giornoDellaSettimana(d) === 1 && (diff(d, ancora) / 7) % 2 === 0) {
      rubrica(serie(`pr-${d}`, 'Lezione di prova', d), 'p', 'rubrica', 'reel', 'Portare alla prima lezione: come funziona e cosa aspettarsi', d, 1, 'Lezione di prova');
    }
  }
  // Il Wrapped di fine anno.
  for (const a of [Number(oggi.slice(0, 4)), Number(oggi.slice(0, 4)) + 1]) {
    const ev = serie(`wr-${a}`, `Wrapped di fine anno ${a}`, `${a}-12-20`);
    rubrica(ev, 't', 'annuncio', 'reel', "Teaser dei dati dell'anno", `${a}-12-13`, 3, 'Wrapped');
    rubrica(ev, 'p', 'giorno', 'carosello', "Il Wrapped: il recap dell'anno", `${a}-12-20`, 3, 'Wrapped');
  }
  return R;
}

/**
 * Il piano: i post già confermati restano dove sono, solo quelli proposti si sistemano
 * (prima chi ha più priorità, mai prima della data ideale; un post nel feed al giorno, fino a 6 storie al giorno).
 */
export function piano(base: Riga[], salvati: Record<string, Partial<SalvataggioPost>>, oggi: string): Riga[] {
  const R = base.map((r) => ({ ...r }));
  const viste = new Set(R.map((r) => r.id));
  for (const [id, s] of Object.entries(salvati)) {
    if (!viste.has(id) && s.stato && PL_BLOCCATI.includes(s.stato) && s.istantanea) {
      R.push({ id, ev: null, orfano: true, off: 0, tipoL: s.istantanea.tipoL, fase: s.istantanea.fase, fmt: s.formato ?? 'storie', ob: s.istantanea.ob, span: s.istantanea.span, opz: false, w: 0, ideal: s.data ?? oggi, giorni: 0, titoloEv: s.istantanea.titolo });
    }
  }
  for (const r of R) {
    r.s = salvati[r.id] ?? {};
    r.st = r.s.stato ?? 'proposto';
    r.f = r.s.formato ?? r.fmt;
    r.titoloEv = r.ev ? (r.ev.tipo === 'serie' ? r.ev.titolo : `${r.ev.titolo} · ${breve(r.ev.data)}`) : r.titoloEv;
  }
  // Al completo i contenuti che invitano a iscriversi non servono più: quelli solo proposti spariscono, quelli già confermati si chiedono.
  for (let i = R.length - 1; i >= 0; i--) if (R[i].chiuso && R[i].st === 'proposto') R.splice(i, 1);
  for (const r of R) {
    if (r.chiuso && r.ev && (r.st === 'confermato' || r.st === 'creato')) r.conf = { txt: `${r.ev.tipo === 'percorso' ? 'Il percorso' : "L'evento"} è al completo: questo contenuto invita a iscriversi. Lo tolgo?`, togli: true };
  }
  const occF: Record<string, number> = {};
  const occS: Record<string, number> = {};
  const giorniDi = (r: Riga) => Array.from({ length: Math.max(1, r.span) }, (_, i) => aggiungiGiorni(r.data as string, i));
  const occupa = (r: Riga) => {
    if (PL_FEED.includes(r.f as FormatoPlanner)) occF[r.data as string] = (occF[r.data as string] ?? 0) + 1;
    else if (r.f === 'storie') for (const k of giorniDi(r)) occS[k] = (occS[k] ?? 0) + 1;
  };
  for (const r of R.filter((x) => x.st !== 'annullato' && ((x.st && PL_BLOCCATI.includes(x.st)) || x.s?.sposta))) {
    r.data = (r.st && PL_BLOCCATI.includes(r.st) ? r.s?.data : r.s?.sposta) ?? r.ideal;
    r.fisso = true;
    occupa(r);
  }
  const pr = (r: Riga) => r.w * (1 + 14 / (1 + Math.max(0, r.giorni))) * (r.opz ? 0.5 : 1);
  const proposte = R.filter((r) => r.st === 'proposto' && !r.fisso).sort((a, b) => pr(b) - pr(a) || a.ideal.localeCompare(b.ideal) || (a.id < b.id ? -1 : 1));
  for (const r of proposte) {
    const d = r.ideal < oggi ? oggi : r.ideal;
    r.ritardo = r.ideal < oggi;
    r.data = d;
    if (PL_FEED.includes(r.f as FormatoPlanner)) {
      const fineSett = aggiungiGiorni(d, 6 - ((giornoDellaSettimana(d) + 6) % 7));
      const limite = r.ev && r.ev.tipo !== 'serie' && r.fase !== 'recap' ? r.ev.data : aggiungiGiorni(d, 6);
      let x = d;
      while (x <= fineSett && x <= limite && (occF[x] ?? 0) >= 1) x = aggiungiGiorni(x, 1);
      if (x <= fineSett && x <= limite) r.data = x;
      else {
        let y = aggiungiGiorni(fineSett, 1);
        while ((occF[y] ?? 0) >= 1) y = aggiungiGiorni(y, 1);
        r.conf = y <= limite
          ? { txt: `Tutti i giorni di questa settimana hanno già un post nel feed. Lo sposto a ${breve(y)}?`, sposta: y }
          : { txt: 'Tutti i giorni di questa settimana hanno già un post nel feed e dopo sarebbe troppo tardi. Lo trasformo in una storia?', fmt: 'storie' };
      }
    }
    occupa(r);
  }
  const perGiorno: Record<string, Riga[]> = {};
  for (const r of R.filter((x) => x.st !== 'annullato' && x.f === 'storie' && x.data)) for (const k of giorniDi(r)) (perGiorno[k] = perGiorno[k] ?? []).push(r);
  for (const [k, a] of Object.entries(perGiorno)) {
    if (a.length > 6) {
      a.sort((x, y) => (y.fisso ? 1e6 : pr(y)) - (x.fisso ? 1e6 : pr(x))).slice(6).forEach((r) => { r.conf = r.conf ?? { txt: `Il ${breve(k)} ci sono più di 6 storie: conviene unirne qualcuna o toglierne una.` }; });
    }
  }
  for (const r of R) {
    const e = r.ev;
    r.avviso = Boolean(r.st && PL_BLOCCATI.includes(r.st) && !r.s?.ok && (r.orfano || !e || (r.s?.dataEvento && e.tipo !== 'serie' && r.s.dataEvento !== e.data)));
  }
  return R.sort((a, b) => (a.data as string).localeCompare(b.data as string) || (PL_ORA[a.f as FormatoPlanner] < PL_ORA[b.f as FormatoPlanner] ? -1 : 1) || (a.id < b.id ? -1 : 1));
}

/** Il prezzo va solo nei post di conversione (promemoria e ultimi giorni, da 1-2 settimane prima di seminario, ritiro e corso). */
export function eConversione(r: Riga): boolean {
  return Boolean(r.ev) && ['ritiro', 'seminario', 'corso'].includes((r.ev as EventoPlanner).tipo) && (r.fase === 'promemoria' || r.fase === 'countdown') && r.off <= -1 && r.off >= -14;
}
export const prezzoRiga = (r: Riga): string => (eConversione(r) && r.ev && r.ev.prezzoEuro ? `${r.ev.prezzoEuro}€` : '');

export function titoloRiga(r: Riga): string {
  return `${PL_FASE[r.fase]}: ${r.titoloEv}`;
}

export function descrizioneRiga(r: Riga): string {
  const x = r.ev?.extra;
  return r.ob + (/scadenza/.test(r.ob) && x?.scadenza ? `, entro il ${breve(x.scadenza)}` : '');
}

/** Bozza della didascalia. Per Salute femminile e Percorsi c'è sempre il promemoria di rileggerla con attenzione. */
export function didascalia(r: Riga, oggi: string, telefonoStudio: string, telefonoSara: string): string {
  const e = r.ev;
  const titolo = e ? e.titolo : r.titoloEv ?? '';
  const x = e?.extra ?? {};
  const quando = e ? (e.fine ? `dal ${Number(e.data.slice(8))} al ${lungo(e.fine)}` : lungo(e.data)) : '';
  const gg = e ? Math.max(0, diff(e.data, oggi)) : 0;
  const conIscrizioni = e && ['ritiro', 'corso', 'seminario'].includes(e.tipo);
  const hook: Record<FasePlanner, string> = {
    annuncio: `${titolo}, ${quando}.${conIscrizioni ? ' Si aprono le iscrizioni.' : ''}`,
    promemoria: gg > 1 ? `Mancano ${gg} giorni a ${titolo}.` : `${titolo} è quasi qui.`,
    countdown: `Ultimi posti per ${titolo}.`, giorno: `Oggi: ${titolo}.`, recap: `Com'è andata: ${titolo}.`, rubrica: `${titolo}.`, completo: `${titolo}: siamo al completo.`,
  };
  const riga: string[] = [];
  if (e && e.tipo !== 'serie') {
    if (e.tipo === 'percorso' && e.orario) riga.push(`Quando: ${e.orario}`);
    if (e.luogo) riga.push(`Dove: ${e.luogo.replace(/^Studio /, '')}`);
    if (e.con) riga.push(`Con: ${e.con}`);
    if (prezzoRiga(r)) riga.push(`Quota: ${prezzoRiga(r)}`);
    if (e.posti && ['ritiro', 'corso', 'seminario', 'percorso'].includes(e.tipo)) riga.push(`Posti: ${e.posti}`);
  }
  if (x.scadenza) riga.push(`Iscrizioni entro il ${breve(x.scadenza)}`);
  if (x.pubblico && x.pubblico !== 'tutti') riga.push(x.pubblico === 'principianti' ? 'Adatto a chi inizia' : 'Per chi pratica già');
  const conv = eConversione(r) || r.fase === 'promemoria' || r.fase === 'countdown' || (r.fase === 'annuncio' && conIscrizioni) || (e?.tipo === 'serie' && r.tipoL === 'Lezione di prova');
  const cta = e?.tipo === 'percorso'
    ? (r.fase === 'completo' ? `Per metterti in lista scrivi a Sara su WhatsApp al ${telefonoSara}.` : r.fase === 'recap' ? 'Tutte le informazioni nel link in bio.' : `Per iscriverti scrivi a Sara su WhatsApp al ${telefonoSara}.`)
    : conv ? (x.link ? `Per prenotare: ${x.link}. Oppure scrivici su WhatsApp al ${telefonoStudio}.` : `Per prenotare scrivici su WhatsApp al ${telefonoStudio}.`)
    : 'Tutte le informazioni nel link in bio.';
  const tag = e?.tipo === 'percorso'
    ? ['#yogatribu', '#salutefemminile', '#pavimentopelvico', '#cassola', '#yogaveneto']
    : ['#yogatribu', '#yogabassano', '#yogacassola', '#praticayoga', e?.tipo === 'ritiro' ? '#ritiroyoga' : e?.tipo === 'seminario' ? '#seminarioyoga' : '#yogaveneto', '#iyengaryoga', e?.tipo === 'ritiro' ? '#yogaretreat' : '#yogacommunity'];
  return [hook[r.fase], riga.join('\n'), cta, tag.join(' ')].filter(Boolean).join('\n\n') + (e && ['salute', 'percorso'].includes(e.tipo) ? '\n\n[Salute femminile: rileggi con attenzione prima di confermare]' : '');
}
