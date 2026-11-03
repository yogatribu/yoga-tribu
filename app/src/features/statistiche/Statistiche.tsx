import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bottone } from '@/design/Bottone';
import { Chip } from '@/design/Chip';
import { Modale } from '@/design/Modale';
import { COMUNITA, NOMI_STUDI, type StudioId } from '@/config/tema';
import * as realeEventi from '@/data/eventi';
import * as realeLeads from '@/data/leads';
import * as realePersone from '@/data/persone';
import * as realePrenotazioni from '@/data/prenotazioni';
import * as realeProgramma from '@/data/programma';
import { aggiungiGiorni, oggi } from '@/domain/date';
import { dettaglioStatistica, type DatiDettaglio } from '@/domain/dettaglio-stat';
import { MESI_BREVI } from '@/domain/formati';
import { NOME_MOTIVO } from '@/domain/leads';
import { euro, inScadenza, type Acquisto, type Persona, type VoceRegistro } from '@/domain/persone';
import { COLORE_STATO, lezioniFatte, statoAllievo, ultimaLezione, type Prenotazione, type StatoAllievo } from '@/domain/prenotazioni';
import { NOME_GIORNO, NOME_STILE, type Blocco } from '@/domain/programma';
import { lezioniCsv, rapportoStatistiche } from '@/domain/rapporto-stat';
import {
  CONSIGLIO_PERDITA, confrontoConPrima, conversioni, doveSiPerdono, indicatoriConversione, lezioniSvolte, occupazione, percentuale, perGiorno, perInsegnante, perMese, perOrario, perStile, somma,
  type ContattoStat, type FaseContatto, type LezioneFatta,
} from '@/domain/statistiche';

// Stesse classi e stesso ordine di studioStat() del prototipo (.tiles, .st-grid, .stc, .hbs, .vbs, .kv, .kpis).
// Ogni numero e ogni barra si apre sulla sua storia (studioStatDettaglio). Esporta dà il rapporto da portare a un'AI.
// Il percorso dei contatti è calcolato dalla fase in cui sono adesso. Il "tempo fino all'iscrizione" non c'è: non registriamo la data di chiusura.
export type ApiStatistiche = {
  persone: typeof realePersone; prenotazioni: typeof realePrenotazioni; programma: typeof realeProgramma; leads: typeof realeLeads; eventi: typeof realeEventi;
};
const reale: ApiStatistiche = { persone: realePersone, prenotazioni: realePrenotazioni, programma: realeProgramma, leads: realeLeads, eventi: realeEventi };

type Contatti = NonNullable<Awaited<ReturnType<typeof realeLeads.elencaContatti>>>;

type Dati = {
  lezioni: LezioneFatta[]; persone: { persona: Persona; saldo: number; daIncassareCent: number }[]; acquisti: Map<string, Acquisto[]>; registro: Map<string, VoceRegistro[]>;
  pren: Prenotazione[]; contatti: Contatti; eventi: Awaited<ReturnType<typeof realeEventi.elencaEventi>>; presi: Record<string, number>;
};

type Voce = { l: string; v: number; c?: string; k?: string };

const hbars = (voci: Voce[], apri: (k: string) => void, fmtv?: (v: number) => string) => {
  const mx = Math.max(1, ...voci.map((x) => x.v));
  return (
    <div className="hbs">
      {voci.map((x) => {
        const dentro = (
          <>
            <span>{x.l}</span><i style={{ ['--w' as string]: `${Math.round((x.v / mx) * 100)}%`, ['--c' as string]: x.c ?? 'var(--t-p)' }}></i><b>{fmtv ? fmtv(x.v) : x.v}</b>
          </>
        );
        return x.k ? <button type="button" className="hb hb-b" key={x.l} onClick={() => apri(x.k as string)}>{dentro}</button> : <div className="hb" key={x.l}>{dentro}</div>;
      })}
    </div>
  );
};
const vbars = (voci: Voce[], apri: (k: string) => void, fmtv?: (v: number) => string) => {
  const mx = Math.max(1, ...voci.map((x) => x.v));
  return (
    <div className="vbs">
      {voci.map((x, i) => {
        const dentro = (
          <>
            <b>{fmtv ? fmtv(x.v) : x.v}</b><i style={{ height: `${Math.max(4, Math.round((x.v / mx) * 100))}%`, background: x.c ?? 'var(--t-p)' }}></i><small>{x.l}</small>
          </>
        );
        return x.k ? <button type="button" className="vb vb-b" key={`${x.l}${i}`} onClick={() => apri(x.k as string)}>{dentro}</button> : <div className="vb" key={`${x.l}${i}`}>{dentro}</div>;
      })}
    </div>
  );
};

const migliaia = (v: number) => (v >= 1000 ? `${Math.round(v / 100) / 10}k` : `${Math.round(v)}`);
const IMPORTA = 'Mostra altri';

function scarica(nome: string, testo: string, tipo: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([`﻿${testo}`], { type: `${tipo};charset=utf-8` }));
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

export function Statistiche({ studio, api = reale, onApriPersona }: { studio: StudioId; api?: ApiStatistiche; onApriPersona?: (id: string) => void }) {
  const [n, setN] = useState(30);
  const [dati, setDati] = useState<Dati | null>(null);
  const [errore, setErrore] = useState(false);
  const [aperto, setAperto] = useState<string | null>(null);
  const [cerca, setCerca] = useState('');
  const [quante, setQuante] = useState(60);
  const [esporta, setEsporta] = useState(false);
  const [avviso, setAvviso] = useState('');
  const giorno = oggi();

  const carica = useCallback(async () => {
    const [modelli, blocchi, pren, persone, ar, contatti, eventi] = await Promise.all([
      api.programma.elencaModelli(studio), api.programma.elencaBlocchi(studio, aggiungiGiorni(giorno, -730), aggiungiGiorni(giorno, -1)), api.prenotazioni.elencaPrenotazioni(studio, aggiungiGiorni(giorno, -740), aggiungiGiorni(giorno, 14)),
      api.persone.elencaPersone(studio), api.persone.elencaAcquistiERegistro(studio), api.leads.elencaContatti(studio), api.eventi.elencaEventi(),
    ]);
    if (!modelli || !blocchi || !pren || !persone || !ar || !contatti || !eventi) return setErrore(true);
    setErrore(false);
    const presi: Record<string, number> = {};
    for (const e of eventi.filter((x) => x.da >= giorno && (!x.soloStudio || x.soloStudio === studio)).slice(0, 5)) presi[e.id] = (await api.eventi.postiPresi(e.id)) ?? e.iscrittiFissi;
    setDati({ lezioni: lezioniSvolte(modelli, blocchi as Blocco[], pren, aggiungiGiorni(giorno, -730), aggiungiGiorni(giorno, -1)), persone, acquisti: ar.acquisti, registro: ar.registro, pren, contatti, eventi, presi });
  }, [api, studio, giorno]);

  useEffect(() => {
    void carica();
  }, [carica]);

  // I dati nella forma che servono al dettaglio e all'esportazione (funzioni pure in domain/).
  const base: DatiDettaglio | null = useMemo(() => {
    if (!dati) return null;
    const statoDi = (p: Persona): { stato: StatoAllievo; ultima: string | null } => {
      const sue = dati.pren.filter((x) => x.personId === p.id);
      return { stato: statoAllievo(lezioniFatte(sue, giorno).length, p.iscrittoIl, ultimaLezione(sue, giorno), giorno), ultima: ultimaLezione(sue, giorno) };
    };
    return {
      oggi: giorno, lezioni: dati.lezioni,
      persone: dati.persone.map((s) => {
        const { stato, ultima } = statoDi(s.persona);
        const acquisti = dati.acquisti.get(s.persona.id) ?? [];
        return { persona: s.persona, saldo: s.saldo, daIncassareCent: s.daIncassareCent, stato, ultimaLezione: ultima, inScadenza: inScadenza(s.persona, acquisti, dati.registro.get(s.persona.id) ?? [], giorno), acquisti };
      }),
      contatti: dati.contatti.map((c) => ({ id: c.id, nome: c.nome, cerca: c.cerca, fase: c.fase as FaseContatto, creatoIl: c.creatoIl, haAvutoProva: c.haAvutoProva, assenze: c.assenze, fonte: c.fonte, motivoChiusura: c.motivoChiusura })),
      eventi: (dati.eventi ?? []).filter((e) => !e.soloStudio || e.soloStudio === studio).map((e) => ({ evento: e, presi: dati.presi[e.id] ?? e.iscrittiFissi })),
    };
  }, [dati, giorno, studio]);

  const apri = (k: string) => { setAperto(k); setCerca(''); setQuante(60); window.scrollTo({ top: 0 }); };

  if (errore) return <p className="muted">Non riesco a caricare le statistiche. Riprova tra poco.</p>;
  if (dati === null || base === null) return <p className="muted">Carico le statistiche…</p>;

  if (aperto) {
    const D = dettaglioStatistica(aperto, base, n);
    const q = cerca.trim().toLowerCase();
    const righe = D.righe.filter((r) => !q || `${r.titolo} ${r.sotto} ${r.valore}`.toLowerCase().includes(q));
    const fmt = D.formato === 'percento' ? (v: number) => `${v}%` : D.formato === 'migliaia' ? migliaia : undefined;
    return (
      <>
        <div className="nav"><button type="button" aria-label="Indietro" onClick={() => setAperto(null)}>‹</button><b>{D.titolo}</b><span></span></div>
        <p className="muted" style={{ marginBottom: 14 }}>{D.sotto}</p>
        <div className="tiles">{D.tiles.map((t) => <div className="tile" key={t.s}><b>{t.b}</b><span>{t.s}</span></div>)}</div>
        {D.serie && <section className="card stc"><p className="eyebrow">{D.serieTitolo ?? 'Nel tempo'}</p>{vbars(D.serie.map((x) => ({ l: x.l, v: x.v, c: x.c, k: x.chiave })), apri, fmt)}</section>}
        <section className="card stc" style={{ marginTop: 14 }}>
          <p className="eyebrow">Storico completo · {D.righe.length}</p>
          <input className="sq" placeholder="Cerca" aria-label="Cerca nello storico" value={cerca} onChange={(e) => { setCerca(e.target.value); setQuante(60); }} />
          <div className="group rs">
            {righe.slice(0, quante).map((r, i) => {
              const dentro = (
                <>
                  <div className="lez-main"><b>{r.titolo}</b><span>{r.sotto}</span></div>
                  {r.valore && <small className="sd-v">{r.valore}</small>}
                </>
              );
              return r.personaId && onApriPersona
                ? <button type="button" className="att rs-r att-b sd-row" key={`${r.titolo}${i}`} onClick={() => onApriPersona(r.personaId as string)}>{dentro}<em className="att-go">›</em></button>
                : <div className="att rs-r sd-row" key={`${r.titolo}${i}`}>{dentro}</div>;
            })}
            {righe.length === 0 && <p className="muted pad" style={{ padding: 14 }}>Niente da mostrare.</p>}
          </div>
          {righe.length > quante && <Bottone variante="secondario" piccolo style={{ marginTop: 10 }} onClick={() => setQuante(quante + 60)}>{IMPORTA} {Math.min(60, righe.length - quante)}</Bottone>}
          <p className="muted small" style={{ marginTop: 8 }}>{righe.length === D.righe.length ? `${D.righe.length} in tutto` : `${righe.length} su ${D.righe.length}`}</p>
        </section>
      </>
    );
  }

  const d = dati;
  const da = aggiungiGiorni(giorno, -n);
  const svolte = d.lezioni.filter((x) => x.data >= da);
  const tot = base.persone.length;
  const incassi = [...d.acquisti.values()].flat().filter((a) => a.incassato && (a.creatoIl ?? '').slice(0, 10) >= da);
  const incassiEuro = incassi.reduce((s, a) => s + a.prezzoCent, 0);
  const nuovi = base.persone.filter((s) => s.persona.iscrittoIl >= da).length;
  const stati = new Map<StatoAllievo, number>();
  for (const s of base.persone) stati.set(s.stato, (stati.get(s.stato) ?? 0) + 1);
  const attivi = (stati.get('Regolare') ?? 0) + (stati.get('Nuovo ingresso') ?? 0);
  const inScad = base.persone.filter((s) => s.inScadenza).length;
  const crediti = base.persone.reduce((s, x) => s + (x.persona.creditiIllimitati ? 0 : Math.max(0, x.saldo)), 0);
  const daIncassare = base.persone.reduce((s, x) => s + x.daIncassareCent, 0);
  const illim = base.persone.filter((s) => s.persona.creditiIllimitati).length;

  const contatti = base.contatti;
  const lp = contatti.filter((c) => c.creatoIl.slice(0, 10) >= da);
  const lPrima = contatti.filter((c) => c.creatoIl.slice(0, 10) < da && c.creatoIl.slice(0, 10) >= aggiungiGiorni(giorno, -2 * n));
  const K = conversioni(lp as ContattoStat[], giorno);
  const K0 = conversioni(lPrima as ContattoStat[], giorno);
  const indicatori = indicatoriConversione(K, K0, lPrima.length === 0);
  const persi = doveSiPerdono(lp as ContattoStat[]);
  const peggiore = (['prima', 'assenti', 'dopo'] as const).map((k) => [k, persi[k]] as const).sort((a, b) => b[1] - a[1])[0];
  const percorso = { contatti: lp.length, provaFissata: K.p, provaFatta: K.f, iscritti: K.iscritti };

  const motivi = new Map<string, number>();
  for (const c of lp.filter((x) => x.fase === 'non_prosegue' && x.motivoChiusura)) motivi.set(NOME_MOTIVO[c.motivoChiusura as keyof typeof NOME_MOTIVO] ?? c.motivoChiusura!, (motivi.get(NOME_MOTIVO[c.motivoChiusura as keyof typeof NOME_MOTIVO] ?? c.motivoChiusura!) ?? 0) + 1);
  const fonti = new Map<string, { t: number; i: number }>();
  for (const c of lp) { const k = c.fonte ?? 'Non indicata'; const e = fonti.get(k) ?? { t: 0, i: 0 }; e.t += 1; if (c.fase === 'iscritto') e.i += 1; fonti.set(k, e); }
  const fontiPersone = new Map<string, number>();
  for (const s of base.persone) fontiPersone.set(s.persona.fonte ?? 'Non indicata', (fontiPersone.get(s.persona.fonte ?? 'Non indicata') ?? 0) + 1);
  const orari = perOrario(svolte);
  const etOrario = (k: string) => { const [g, ora, ...tipo] = k.split('|'); return `${NOME_GIORNO[Number(g)].slice(0, 3)} ${ora} · ${tipo.join('|')}`; };
  const mesi = (v: { data: string; v: number }[]) => perMese(v, giorno).map((x) => ({ l: MESI_BREVI[Number(x.chiave.slice(5)) - 1], v: x.v, k: x.chiave }));
  const prossimi = base.eventi.filter((e) => e.evento.da >= giorno).slice(0, 5);

  const rapporto = () => {
    scarica(`statistiche-${studio}-${giorno}.md`, rapportoStatistiche(base, { studio: NOMI_STUDI[studio], giorni: n }), 'text/markdown');
    setEsporta(false);
    setAvviso('Rapporto scaricato.');
  };
  const lezioni = () => {
    scarica(`lezioni-${studio}-${giorno}.csv`, lezioniCsv(base.lezioni.filter((x) => x.data >= aggiungiGiorni(giorno, -365))), 'text/csv');
    setEsporta(false);
    setAvviso('Lezioni scaricate.');
  };

  return (
    <>
      <p className="eyebrow">Statistiche</p>
      <h1>I numeri della <em>{COMUNITA[studio]}</em>.</h1>
      <div className="chips" style={{ marginBottom: 20 }}>
        {([[30, 'Ultimi 30 giorni'], [90, 'Ultimi 90 giorni'], [365, 'Ultimo anno']] as const).map(([k, l]) => <Chip key={k} acceso={n === k} onClick={() => setN(k)}>{l}</Chip>)}
        <Bottone variante="secondario" piccolo onClick={() => { setAvviso(''); setEsporta(true); }}>Esporta</Bottone>
      </div>
      {avviso && <p className="muted small" role="status" style={{ marginTop: -8, marginBottom: 14 }}>{avviso}</p>}
      <p className="sd-hint">Tocca un numero o una barra per vedere tutta la sua storia.</p>
      <div className="tiles">
        <button type="button" className="tile tile-b" onClick={() => apri('pren')}><b>{somma(svolte).toLocaleString('it-IT')}</b><span>prenotazioni</span></button>
        <button type="button" className="tile tile-b" onClick={() => apri('occ')}><b>{occupazione(svolte)}%</b><span>posti occupati</span></button>
        <button type="button" className="tile tile-b" onClick={() => apri('inc')}><b>{euro(incassiEuro)}</b><span>incassati</span></button>
        <button type="button" className="tile tile-b" onClick={() => apri('nuove')}><b>{nuovi}</b><span>nuove persone</span></button>
      </div>
      <div className="st-grid">
        <section className="card stc kp-w">
          <p className="eyebrow">Conversioni · ultimi {n} giorni</p>
          <p className="muted small" style={{ margin: '-4px 0 12px' }}>Contano solo le persone che hanno già deciso: chi è ancora in corso non pesa sulle percentuali.</p>
          <div className="kpis">
            {indicatori.map((k) => {
              const c = confrontoConPrima(k, n);
              return (
                <button type="button" className="kpi" key={k.chiave} onClick={() => apri(`lead|${k.chiave}`)}>
                  <b>{k.valore === null ? '–' : `${k.valore}${k.unita}`}</b><span>{k.titolo}</span>
                  <small className={`kd${c.esito === 'su' ? ' su' : c.esito === 'giu' ? ' giu' : ''}`}>{c.testo}</small>
                  <small className="kx">{k.spiegazione}</small>
                </button>
              );
            })}
          </div>
        </section>
        <section className="card stc">
          <p className="eyebrow">Dove perdiamo più persone</p>
          {persi.totale ? (
            <>
              {hbars([{ l: 'Prima della prova', v: persi.prima, c: 'var(--t-acc3)', k: 'lead|prima' }, { l: 'Assenti alla prova', v: persi.assenti, c: 'var(--t-acc)', k: 'lead|ass' }, { l: 'Dopo la prova', v: persi.dopo, c: 'var(--t-earth)', k: 'lead|dopo' }], apri)}
              <p className="muted small" style={{ marginTop: 10 }}>Ne perdi di più <b>{CONSIGLIO_PERDITA[peggiore[0]].nome}</b> ({peggiore[1]} su {persi.totale}). {CONSIGLIO_PERDITA[peggiore[0]].consiglio}</p>
            </>
          ) : <p className="muted">Nessuno ha chiuso in questo periodo.</p>}
        </section>
        <section className="card stc">
          <p className="eyebrow">Fidelizzazione</p>
          <dl className="kv">
            <dt>Allievi attivi</dt><dd><button type="button" className="kvb" onClick={() => apri('seg|attivi')}>{attivi} su {tot}{tot ? ` · ${percentuale(attivi, tot)}%` : ''}</button></dd>
            <dt>In pausa</dt><dd><button type="button" className="kvb" onClick={() => apri('seg|inattivi')}>{stati.get('In pausa') ?? 0}</button></dd>
            <dt>A rischio</dt><dd><button type="button" className="kvb" onClick={() => apri('seg|rischio')}>{stati.get('A rischio') ?? 0}</button></dd>
            <dt>Pacchetti in scadenza</dt><dd><button type="button" className="kvb" onClick={() => apri('seg|scadenza')}>{inScad}</button></dd>
          </dl>
        </section>
        <section className="card stc"><p className="eyebrow">Prenotazioni per giorno</p>{vbars(perGiorno(svolte).map((x) => ({ l: NOME_GIORNO[x.giorno].slice(0, 3), v: x.v, c: x.giorno === 0 ? 'var(--t-acc2)' : undefined, k: `giorno|${x.giorno}` })), apri)}</section>
        <section className="card stc"><p className="eyebrow">Per stile</p>{hbars(perStile(svolte).map((x) => ({ l: NOME_STILE[x.stile] ?? x.stile, v: x.v, k: `stile|${x.stile}` })), apri)}</section>
        <section className="card stc">
          <p className="eyebrow">Orari più pieni</p>{hbars(orari.slice(0, 5).map((x) => ({ l: etOrario(x.chiave), v: x.v, k: `slot|${x.chiave}` })), apri, (v) => `${v}%`)}
          <p className="eyebrow" style={{ marginTop: 14 }}>Orari più vuoti</p>{hbars(orari.slice(-3).reverse().map((x) => ({ l: etOrario(x.chiave), v: x.v, k: `slot|${x.chiave}` })), apri, (v) => `${v}%`)}
        </section>
        <section className="card stc">
          <p className="eyebrow">Insegnanti</p>
          {perInsegnante(svolte).map((v) => (
            <button type="button" className="hrow hrow-b" key={v.nome} style={{ padding: '8px 6px', border: 0 }} onClick={() => apri(`ins|${v.nome}`)}>
              <div><b>{v.nome}</b><small>{v.lezioni} lezioni · {v.prenotatiAMedia} prenotati a lezione</small></div>
              <div className="amt"><b>{v.occupazione}%</b><small>occupazione</small></div>
            </button>
          ))}
        </section>
        <section className="card stc"><p className="eyebrow">Incassi per mese</p>{vbars(mesi([...d.acquisti.values()].flat().filter((a) => a.incassato && a.creatoIl).map((a) => ({ data: (a.creatoIl as string).slice(0, 10), v: a.prezzoCent / 100 }))).map((x) => ({ ...x, k: 'inc' })), apri, migliaia)}</section>
        <section className="card stc"><p className="eyebrow">Nuove persone per mese</p>{vbars(mesi(base.persone.map((s) => ({ data: s.persona.iscrittoIl, v: 1 }))).map((x) => ({ l: x.l, v: x.v, c: 'var(--t-acc)', k: `nuovemese|${x.k}` })), apri)}</section>
        <section className="card stc">
          <p className="eyebrow">Com'è la {COMUNITA[studio]} adesso</p>
          <div className="stack">{[...stati.entries()].map(([k, v]) => <i key={k} style={{ flex: v, background: COLORE_STATO[k] }} title={k}></i>)}</div>
          <div className="legend">{[...stati.entries()].map(([k, v]) => <button type="button" className="lg-b" key={k} onClick={() => apri(`stato|${k}`)}><i style={{ background: COLORE_STATO[k] }}></i>{k} <b>{v}</b></button>)}</div>
          <dl className="kv" style={{ marginTop: 12 }}><dt>Persone</dt><dd>{tot}</dd><dt>Tasso di pausa</dt><dd>{tot ? percentuale(stati.get('In pausa') ?? 0, tot) : 0}%</dd></dl>
        </section>
        <section className="card stc">
          <p className="eyebrow">Dal contatto all'iscrizione</p>
          {hbars([{ l: 'Contatti', v: percorso.contatti, c: 'var(--t-acc3)', k: 'lead|tutti' }, { l: 'Prova fissata', v: percorso.provaFissata, c: 'var(--t-acc)', k: 'lead|prove' }, { l: 'Prova fatta', v: percorso.provaFatta, c: 'var(--t-p)', k: 'lead|fatte' }, { l: 'Iscritti', v: percorso.iscritti, c: 'var(--t-earth)', k: 'lead|iscritto' }], apri)}
          <dl className="kv" style={{ marginTop: 12 }}><dt>Assenti alla prova</dt><dd>{lp.filter((c) => c.assenze > 0).length}</dd><dt>Ancora in corso</dt><dd>{lp.filter((c) => c.fase !== 'iscritto' && c.fase !== 'non_prosegue').length}</dd></dl>
        </section>
        <section className="card stc">
          <p className="eyebrow">Quali fonti portano iscritti</p>
          {fonti.size ? hbars([...fonti.entries()].sort((a, b) => b[1].i - a[1].i || b[1].t - a[1].t).map(([l, x]) => ({ l: `${l} · ${x.i} su ${x.t}`, v: percentuale(x.i, x.t), c: 'var(--t-acc3)', k: `lead|fonte|${l}` })), apri, (v) => `${v}%`) : <p className="muted">Nessun contatto in questo periodo.</p>}
        </section>
        <section className="card stc">
          <p className="eyebrow">Perché non proseguono</p>
          {motivi.size ? hbars([...motivi.entries()].sort((a, b) => b[1] - a[1]).map(([l, v]) => ({ l, v, c: 'var(--t-earth)', k: `lead|motivo|${l}` })), apri) : <p className="muted">Nessun dato in questo periodo.</p>}
        </section>
        <section className="card stc">
          <p className="eyebrow">Come ci hanno conosciuto</p>
          {hbars([...fontiPersone.entries()].sort((a, b) => b[1] - a[1]).map(([l, v]) => ({ l, v, c: 'var(--t-acc3)', k: `fonteal|${l}` })), apri)}
        </section>
        <section className="card stc">
          <p className="eyebrow">Soldi e crediti</p>
          <dl className="kv">
            <dt>Da incassare</dt><dd><button type="button" className="kvb" onClick={() => apri('incasso')}>{euro(daIncassare)}</button></dd>
            <dt>Crediti in giro</dt><dd><button type="button" className="kvb" onClick={() => apri('crediti')}>{crediti} lezioni</button></dd>
            <dt>Illimitati</dt><dd><button type="button" className="kvb" onClick={() => apri('seg|illim')}>{illim} persone</button></dd>
          </dl>
        </section>
        <section className="card stc">
          <p className="eyebrow">Prossimi eventi</p>
          {prossimi.length ? hbars(prossimi.map((e) => ({ l: e.evento.titolo.length > 26 ? `${e.evento.titolo.slice(0, 25)}…` : e.evento.titolo, v: percentuale(e.presi, e.evento.posti), c: 'var(--t-earth)', k: `ev|${e.evento.id}` })), apri, (v) => `${v}%`) : <p className="muted">Nessun evento in programma.</p>}
          <p className="muted small" style={{ marginTop: 6 }}>Riempimento in base alle iscrizioni.</p>
        </section>
      </div>
      {esporta && (
        <Modale riga="Esporta" titolo="Rapporto del mese" onChiudi={() => setEsporta(false)}>
          <p className="muted">Un file con tutti i numeri delle statistiche, da dare a un'AI per chiederle dove migliorare. Dentro non ci sono nomi, telefoni, email né note di salute, e i dati sono a fasce. Non è però un file anonimo: contiene dati che riguardano le persone dello studio. Prima di darlo a un'AI fai approvare l'uso a chi segue la privacy.</p>
          <Bottone larga onClick={rapporto}>Scarica il rapporto · ultimi {n} giorni</Bottone>
          <Bottone variante="secondario" larga style={{ marginTop: 10 }} onClick={lezioni}>Scarica tutte le lezioni (tabella)</Bottone>
          <p className="muted small" style={{ marginTop: 12 }}>Il rapporto è un file di testo: aprilo, copialo nella chat dell'AI e scrivi "Fammi l'analisi". Le lezioni una per una servono se vuoi andare più a fondo (si apre anche con Excel).</p>
        </Modale>
      )}
    </>
  );
}
