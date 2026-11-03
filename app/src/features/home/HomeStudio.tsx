import { useCallback, useEffect, useMemo, useState } from 'react';
import { Conferma } from '@/design/Conferma';
import { Icona } from '@/design/Icone';
import { COLORI_AVATAR, type StudioId } from '@/config/tema';
import * as realeComunicazioni from '@/data/comunicazioni';
import * as realeEventi from '@/data/eventi';
import * as realeImpostazioni from '@/data/impostazioni';
import * as realePrivate from '@/data/private';
import * as realeLeads from '@/data/leads';
import * as realePersone from '@/data/persone';
import * as realePrenotazioni from '@/data/prenotazioni';
import * as realeProgramma from '@/data/programma';
import * as realeRichiesteLezioni from '@/data/richieste-lezioni';
import { aggiungiGiorni, giornoDellaSettimana, oggi } from '@/domain/date';
import { completo as eventoCompleto, NOME_TIPO, occupati, type Evento } from '@/domain/eventi';
import { fdate, iniziale } from '@/domain/formati';
import { daAvvisare, daRichiamare, numeroWhatsApp, PROMEMORIA_PREDEFINITI, type Promemoria } from '@/domain/leads';
import {
  attive, disdettaInTempo, minutiAllaLezione, postiLiberi, puoPrenotare, type Prenotazione,
} from '@/domain/prenotazioni';
import { euro, nomeCompleto, type Acquisto, type Persona, type VoceRegistro } from '@/domain/persone';
import { lezioniDelGiorno, NOME_GIORNO, type Blocco, type LezioneDelGiorno, type Modello } from '@/domain/programma';
import type { Contatto } from '@/data/leads';
import { Private, apiPrivateReali } from '@/features/home/Private';
import { Richieste } from '@/features/home/Richieste';
import { RichiesteLezioni } from '@/features/home/RichiesteLezioni';
import { AvvisiGruppo, apiAvvisiReali } from '@/features/home/AvvisiGruppo';

// Stesso markup e stesse classi della Home dello studio del prototipo (studioHome, rigaLezione, studioLezione, homeCash...).
export type ApiHome = {
  persone: typeof realePersone; prenotazioni: typeof realePrenotazioni; programma: typeof realeProgramma; leads: typeof realeLeads; eventi: typeof realeEventi;
  impostazioni: typeof realeImpostazioni; private: typeof realePrivate; comunicazioni: typeof realeComunicazioni; richiesteLezioni: typeof realeRichiesteLezioni;
};
const reale: ApiHome = {
  persone: realePersone, prenotazioni: realePrenotazioni, programma: realeProgramma, leads: realeLeads, eventi: realeEventi,
  impostazioni: realeImpostazioni, private: realePrivate, comunicazioni: realeComunicazioni, richiesteLezioni: realeRichiesteLezioni,
};

type Vista = null | { tipo: 'lezione'; modelloId: string; data: string } | { tipo: 'tutte' } | { tipo: 'incassi' } | { tipo: 'disdette' } | { tipo: 'emergenza' } | { tipo: 'private' } | { tipo: 'richieste' } | { tipo: 'avvisi' } | { tipo: 'lezioni' };
type Dati = {
  modelli: Modello[]; blocchi: Blocco[]; pren: (Prenotazione & { creato: string })[]; persone: Map<string, { persona: Persona; saldo: number; daIncassareCent: number }>;
  acquisti: Map<string, Acquisto[]>; registro: Map<string, VoceRegistro[]>; leads: Contatto[]; eventi: Evento[]; presiEventi: Record<string, number>;
  promemoria: Promemoria; privateInAttesa: number; richiesteSenzaRisposta: number; lezioniInAttesa: number;
};

export function HomeStudio({
  studio, nome, eResponsabile, mioInsegnanteId = null, onVai, onEsci, onProfilo, api = reale,
}: { studio: StudioId; nome: string; eResponsabile: boolean; mioInsegnanteId?: string | null; onVai: (sezione: string, id?: string) => void; onEsci?: () => void; onProfilo?: () => void; api?: ApiHome }) {
  const [dati, setDati] = useState<Dati | null>(null);
  const [errore, setErrore] = useState(false);
  const [vista, setVista] = useState<Vista>(null);
  const [giornoSel, setGiornoSel] = useState(0);
  const [chiedi, setChiedi] = useState<{ titolo: string; testo: string; ok: string; fn: () => Promise<void> } | null>(null);
  const [msg, setMsg] = useState('');
  const giorno = oggi();

  const carica = useCallback(async () => {
    const da = aggiungiGiorni(giorno, -400);
    const a = aggiungiGiorni(giorno, 14);
    const [modelli, blocchi, pren, persone, ar, leads, eventi, promemoria, private_, richieste, lezioniRichieste] = await Promise.all([
      api.programma.elencaModelli(studio), api.programma.elencaBlocchi(studio, giorno, a), api.prenotazioni.elencaPrenotazioni(studio, da, a),
      api.persone.elencaPersone(studio), api.persone.elencaAcquistiERegistro(studio), api.leads.elencaContatti(studio), api.eventi.elencaEventi(),
      api.impostazioni.leggiPromemoria(studio), api.private.elencaPrivate(studio), api.comunicazioni.elencaRichieste(studio),
      eResponsabile ? api.richiesteLezioni.elencaRichiesteLezioni(studio) : Promise.resolve([]),
    ]);
    if (!modelli || !blocchi || !pren || !persone || !ar || !leads || !eventi) return setErrore(true);
    const mie = (r: { insegnanteId: string }) => eResponsabile || r.insegnanteId === mioInsegnanteId;
    setErrore(false);
    const presi: Record<string, number> = {};
    for (const e of eventi.filter((x) => x.da >= giorno && (!x.soloStudio || x.soloStudio === studio))) presi[e.id] = (await api.eventi.postiPresi(e.id)) ?? e.iscrittiFissi;
    setDati({ modelli, blocchi, pren, persone: new Map(persone.map((s) => [s.persona.id, s])), acquisti: ar.acquisti, registro: ar.registro, leads, eventi, presiEventi: presi,
      promemoria: promemoria ?? PROMEMORIA_PREDEFINITI, privateInAttesa: (private_ ?? []).filter((r) => r.stato === 'attesa' && mie(r)).length, richiesteSenzaRisposta: (richieste ?? []).filter((r) => !r.risposta).length, lezioniInAttesa: (lezioniRichieste ?? []).filter((r) => r.stato === 'attesa').length });
  }, [api, studio, giorno, eResponsabile, mioInsegnanteId]);

  useEffect(() => {
    void carica();
  }, [carica]);

  const colori = COLORI_AVATAR[studio];
  const nomi = useMemo(() => dati ? [...dati.persone.keys()] : [], [dati]);

  if (errore) return <p className="muted">Non riesco a caricare la Home. Riprova tra poco.</p>;
  if (dati === null) return <p className="muted">Carico la Home…</p>;

  const d = dati;
  const lezioniDel = (data: string): LezioneDelGiorno[] => lezioniDelGiorno(data, d.modelli, d.blocchi);
  const prenDi = (m: Modello, data: string) => d.pren.filter((p) => p.modelloId === m.id && p.data === data);
  const persona = (id: string) => d.persone.get(id);
  const crediti = (id: string) => ({ creditiIllimitati: persona(id)?.persona.creditiIllimitati ?? false, saldo: persona(id)?.saldo ?? 0 });
  const colore = (id: string) => colori[Math.max(0, nomi.indexOf(id)) % colori.length];
  const tardive = d.pren.filter((p) => p.stato === 'tardiva');

  async function esegui(r: Promise<{ ok: boolean; motivo?: string }>) {
    const esito = await r;
    if (!esito.ok) return setMsg(esito.motivo ?? 'Non sono riuscito a salvare.');
    setMsg('');
    await carica();
  }

  const indietro = (titolo: string) => (
    <div className="nav"><button type="button" aria-label="Indietro" onClick={() => setVista(null)}>‹</button><b>{titolo}</b><span></span></div>
  );
  const apri = (l: LezioneDelGiorno) => setVista({ tipo: 'lezione', modelloId: l.modello.id, data: l.data });

  const rigaLezione = (l: LezioneDelGiorno, evid: boolean, conInsegnante: boolean) => {
    const n = attive(prenDi(l.modello, l.data));
    const fin = l.data === giorno && minutiAllaLezione(l.data, l.modello.ora, new Date()) + 60 < 0;
    return (
      <button type="button" key={`${l.modello.id}${l.data}`} className={`ag-r ${evid ? 'now' : ''} ${fin ? 'fin' : ''} ${l.fermata ? 'blk' : ''}`} onClick={() => apri(l)}>
        <span className="ag-t"><b>{l.modello.ora.replace(/^0/, '')}</b></span>
        <span className="ag-m"><b>{l.modello.tipo}</b><small>{l.fermata ? `Annullata${l.fermata.motivo ? ` · ${l.fermata.motivo}` : ''}` : fin ? 'Finita' : `${n} su ${l.modello.posti} prenotati`}{conInsegnante ? ` · ${l.modello.insegnante}` : ''}</small></span>
        <span className="ag-c">›</span>
      </button>
    );
  };

  // ---- Lezione (elenco dei prenotati) ----
  if (vista?.tipo === 'lezione') {
    const m = d.modelli.find((x) => x.id === vista.modelloId);
    if (!m) return <>{indietro('Lezione')}<p className="muted">Lezione non trovata.</p></>;
    const fermata = d.blocchi.find((b) => b.modelloId === m.id && b.data === vista.data) ?? null;
    const tutte = prenDi(m, vista.data);
    const att = tutte.filter((p) => p.stato === 'prenotata');
    const lista = tutte.filter((p) => p.stato === 'lista').sort((a, b) => a.creato.localeCompare(b.creato));
    const iniziata = minutiAllaLezione(vista.data, m.ora, new Date()) <= 0;
    const liberi = postiLiberi(m.posti, tutte);
    const candidati = [...d.persone.values()].filter((s) => !tutte.some((p) => p.personId === s.persona.id && (p.stato === 'prenotata' || p.stato === 'lista'))).sort((a, b) => nomeCompleto(a.persona).localeCompare(nomeCompleto(b.persona)));
    const disdici = (p: Prenotazione) => {
      const per = persona(p.personId);
      if (!per) return;
      const minuti = minutiAllaLezione(vista.data, m.ora, new Date());
      const tempo = disdettaInTempo(minuti);
      setChiedi({
        titolo: `Disdire ${nomeCompleto(per.persona)}?`,
        testo: tempo ? 'Mancano più di 2 ore: il credito torna subito.' : 'Mancano meno di 2 ore: il credito non torna. Lo vedrai in "Disdette last minute" e potrai restituirlo.',
        ok: 'Sì, disdici',
        fn: async () => {
          const ordine = lista.filter((x) => x.personId !== p.personId).map((x) => ({ prenotazione: x, persona: { id: x.personId, nome: nomeCompleto(persona(x.personId)?.persona ?? { nome: '', cognome: null }), ...crediti(x.personId) } }));
          const r = await api.prenotazioni.disdici(studio, p, m, { id: per.persona.id, nome: nomeCompleto(per.persona), ...crediti(per.persona.id) }, new Date(), ordine);
          if (!r.ok) return setMsg(r.motivo);
          setMsg(r.entrata ? `Si è liberato un posto: è entrata ${r.entrata}.` : '');
          await carica();
        },
      });
    };
    return (
      <>
        {indietro(m.tipo)}
        <div className="roster">
          <p className="muted"><b>{fdate(vista.data)} · {m.ora}</b>{m.durataMin ? ` · ${m.durataMin} min` : ''}{eResponsabile ? ` · ${m.insegnante}` : ''}</p>
          {fermata && <div className="annull"><b>Lezione annullata</b><span>{fermata.motivo}</span></div>}
          <div className="nt-seats"><div className="occ2 big"><i style={{ width: `${Math.min(100, (att.length / m.posti) * 100)}%` }}></i></div><span><b>{att.length}</b> prenotati su {m.posti}{lista.length ? ` · ${lista.length} in lista d'attesa` : ''}</span></div>
          <p className="eyebrow" style={{ marginTop: 14 }}>Prenotati · {att.length}</p>
          <div className="group rs">
            {att.length === 0 && <p className="muted pad" style={{ padding: 14 }}>Nessuna prenotazione.</p>}
            {att.map((p) => {
              const per = persona(p.personId);
              if (!per) return null;
              const pagare = per.daIncassareCent > 0;
              const nofoto = per.persona.consensoFoto !== 'si';
              return (
                <div className="att rs-r" key={p.id}>
                  <button type="button" className="att-b" style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, textAlign: 'left' }} onClick={() => onVai('allievi', per.persona.id)}>
                    <span className="av s" style={{ background: colore(per.persona.id) }}>{iniziale(per.persona.nome)}</span>
                    <div className="lez-main"><b>{nomeCompleto(per.persona)}</b>
                      <span>{pagare && <em className="flg d">{euro(per.daIncassareCent)}</em>} {nofoto && <em className="flg n">No foto</em>} {!pagare && !nofoto ? `${per.persona.creditiIllimitati ? '∞' : per.saldo} crediti` : ''}</span></div>
                  </button>
                  {eResponsabile && !fermata && <button type="button" className="btn sm ghost" onClick={() => disdici(p)}>Disdici</button>}
                </div>
              );
            })}
          </div>
          {lista.length > 0 && (
            <>
              <p className="eyebrow" style={{ marginTop: 12 }}>Lista d'attesa ({lista.length})</p>
              <div className="group rs">
                {lista.map((p, i) => {
                  const per = persona(p.personId);
                  return per ? (
                    <div className="att rs-r" key={p.id}><span className="wn">{i + 1}</span><div className="lez-main"><b>{nomeCompleto(per.persona)}</b><span>ti avvisiamo se si libera un posto</span></div></div>
                  ) : null;
                })}
              </div>
            </>
          )}
          {eResponsabile && !fermata && (
            <div style={{ marginTop: 14 }}>
              <select className="sq" aria-label="Aggiungi una persona" value="" onChange={(e) => {
                const s = persona(e.target.value);
                if (!s) return;
                const prima = puoPrenotare({ creditiIllimitati: s.persona.creditiIllimitati, saldo: s.saldo }, m.posti, tutte, s.persona.id, iniziata);
                if (!prima.ok && liberi === 0 && !iniziata) {
                  return void esegui(api.prenotazioni.mettiInLista(studio, m, vista.data, s.persona.id));
                }
                if (!prima.ok) return setMsg(prima.motivo);
                void esegui(api.prenotazioni.prenota(studio, m, vista.data, { id: s.persona.id, nome: nomeCompleto(s.persona), creditiIllimitati: s.persona.creditiIllimitati, saldo: s.saldo }));
              }}>
                <option value="">+ Aggiungi una persona</option>
                {candidati.map((s) => <option key={s.persona.id} value={s.persona.id}>{nomeCompleto(s.persona)}{s.saldo <= 0 && !s.persona.creditiIllimitati ? ' (senza crediti)' : ''}</option>)}
              </select>
              {liberi === 0 && <p className="muted small" style={{ marginTop: 6 }}>La lezione è al completo: chi aggiungi entra in lista d'attesa.</p>}
            </div>
          )}
          {msg && <p className="note" role="status">{msg}</p>}
        </div>
        {chiedi && <Conferma riga="Prenotazioni" titolo={chiedi.titolo} testo={chiedi.testo} ok={chiedi.ok} pericolo onAnnulla={() => setChiedi(null)} onOk={() => { const f = chiedi.fn; setChiedi(null); void f(); }} />}
      </>
    );
  }

  // ---- Tutte le lezioni ----
  if (vista?.tipo === 'tutte') {
    const data = aggiungiGiorni(giorno, giornoSel);
    return (
      <>
        {indietro('Tutte le lezioni')}
        <div className="days dsm">
          {Array.from({ length: 7 }, (_, i) => {
            const dd = aggiungiGiorni(giorno, i);
            return (
              <button type="button" key={dd} className={`day ${i === giornoSel ? 'on' : ''}`} onClick={() => setGiornoSel(i)}>
                <small>{NOME_GIORNO[giornoDellaSettimana(dd)].slice(0, 3)}</small><b>{Number(dd.slice(8))}</b><i className={lezioniDel(dd).length ? 'has' : ''}></i>
              </button>
            );
          })}
        </div>
        <div className="ag-l">
          {lezioniDel(data).map((l) => rigaLezione(l, false, true))}
          {lezioniDel(data).length === 0 && <p className="muted pad">Nessuna lezione in questo giorno.</p>}
        </div>
      </>
    );
  }

  // ---- Da incassare ----
  if (vista?.tipo === 'incassi') {
    const righe = [...d.persone.values()].flatMap((s) => (d.acquisti.get(s.persona.id) ?? []).filter((a) => !a.incassato).map((a) => ({ s, a })));
    return (
      <>
        {indietro('Da incassare')}
        <section className="cash">
          <h3>Da incassare in studio {righe.length > 0 && <em className="n">{righe.length}</em>}</h3>
          <p className="muted" style={{ margin: '-6px 0 8px' }}>I crediti sono già attivi. Qui vedi chi deve ancora saldare.</p>
          {righe.map(({ s, a }) => (
            <div className="cash-r" key={a.id}>
              <div className="lez-main"><b>{nomeCompleto(s.persona)}</b><span>{a.nome}</span></div>
              <b className="cash-a">{euro(a.prezzoCent)}</b>
              <div className="chips">{eResponsabile ? <button type="button" className="btn sm ghost" onClick={() => void esegui(api.persone.segnaIncassato(a.id))}>Segna incassato</button> : <span className="muted small">Lo incassa l'amministrazione</span>}</div>
            </div>
          ))}
          {righe.length === 0 && <p className="muted">Tutto incassato. Nessun pagamento in sospeso.</p>}
        </section>
        {msg && <p className="note" role="alert">{msg}</p>}
      </>
    );
  }

  // ---- Disdette last minute ----
  if (vista?.tipo === 'disdette') {
    const lista = d.pren.filter((p) => p.stato === 'tardiva' || p.stato === 'restituita');
    return (
      <>
        {indietro('Disdette last minute')}
        <section className="cash">
          <h3>Disdette last minute {tardive.length > 0 && <em className="n">{tardive.length}</em>}</h3>
          <p className="muted" style={{ margin: '-6px 0 8px' }}>Disdette arrivate a meno di 2 ore dalla lezione. Il credito non è tornato: se l'imprevisto è vero puoi restituirlo.</p>
          {lista.map((p) => {
            const m = d.modelli.find((x) => x.id === p.modelloId);
            const per = persona(p.personId);
            if (!m || !per) return null;
            return (
              <div className="cash-r" key={p.id}>
                <div className="lez-main"><b>{nomeCompleto(per.persona)}</b><span>{m.tipo} · {fdate(p.data)} {m.ora} · disdetta {p.minutiPrima ?? 0} minuti prima</span></div>
                <b className="cash-a" style={{ fontSize: 15 }}>{p.stato === 'tardiva' ? 'Credito perso' : 'Restituito'}</b>
                <div className="chips">
                  {p.stato === 'tardiva'
                    ? eResponsabile ? <button type="button" className="btn sm ghost" onClick={() => setChiedi({ titolo: 'Restituire il credito?', testo: `Aggiungiamo 1 credito a ${nomeCompleto(per.persona)}, con il motivo nel registro.`, ok: 'Sì, restituisci', fn: async () => { await esegui(api.prenotazioni.restituisciCredito(studio, p, m)); } })}>Restituisci il credito</button> : null
                    : <span className="muted small">Credito riaccreditato</span>}
                </div>
              </div>
            );
          })}
          {lista.length === 0 && <p className="muted">Nessuna disdetta last minute.</p>}
        </section>
        {chiedi && <Conferma riga="Prenotazioni" titolo={chiedi.titolo} testo={chiedi.testo} ok={chiedi.ok} onAnnulla={() => setChiedi(null)} onOk={() => { const f = chiedi.fn; setChiedi(null); void f(); }} />}
        {msg && <p className="note" role="alert">{msg}</p>}
      </>
    );
  }

  // ---- Emergenza ----
  if (vista?.tipo === 'private') {
    return <>{indietro('Lezioni private')}<Private studio={studio} eResponsabile={eResponsabile} mioId={mioInsegnanteId} api={{ ...apiPrivateReali, private: api.private, impostazioni: api.impostazioni, persone: api.persone, programma: api.programma }} /></>;
  }
  if (vista?.tipo === 'lezioni') {
    return <>{indietro('Richieste di lezioni')}<RichiesteLezioni studio={studio} api={api.richiesteLezioni} onCambiato={() => void carica()} /></>;
  }

  if (vista?.tipo === 'richieste') {
    return <>{indietro('Richieste degli allievi')}<Richieste studio={studio} api={api.comunicazioni} apiPersone={api.persone} /></>;
  }
  if (vista?.tipo === 'avvisi') {
    return <>{indietro('Avvisi a un gruppo')}<AvvisiGruppo studio={studio} api={{ ...apiAvvisiReali, comunicazioni: api.comunicazioni, persone: api.persone, prenotazioni: api.prenotazioni, programma: api.programma }} onApriPersona={(id) => onVai('allievi', id)} /></>;
  }
  if (vista?.tipo === 'emergenza') {
    return (
      <>
        {indietro('Emergenza')}
        <section className="card em-top"><b>La lezione si fa lo stesso.</b><p className="muted">Se l'app non funziona o sbaglia, chi si presenta entra. I crediti si sistemano dopo, da qui.</p></section>
        <section className="card">
          <p className="eyebrow">Elenco di oggi</p>
          {lezioniDel(giorno).length === 0 && <p className="muted small">Oggi non ci sono lezioni.</p>}
          {lezioniDel(giorno).map((l) => (
            <div key={l.modello.id} style={{ marginBottom: 12 }}>
              <b>{l.modello.ora} · {l.modello.tipo}</b>
              <p className="muted small">{prenDi(l.modello, giorno).filter((p) => p.stato === 'prenotata').map((p) => nomeCompleto(persona(p.personId)?.persona ?? { nome: '?', cognome: null })).join(', ') || 'Nessuna prenotazione'}</p>
            </div>
          ))}
          <button type="button" className="btn sm ghost" onClick={() => window.print()}>Stampa o salva l'elenco</button>
        </section>
      </>
    );
  }

  // ---- Home ----
  const oggiL = lezioniDel(giorno);
  const adesso = new Date();
  const prossima = oggiL.find((x) => !x.fermata && minutiAllaLezione(x.data, x.modello.ora, adesso) + 45 >= 0);
  const prossime: LezioneDelGiorno[] = [];
  for (let off = 1; off <= 7 && prossime.length < 4; off++) for (const l of lezioniDel(aggiungiGiorni(giorno, off)).filter((x) => !x.fermata)) if (prossime.length < 4) prossime.push(l);
  const proveOggi = d.leads.filter((c) => c.fase === 'prova_fissata' && c.provaIl === giorno);
  const avvisare = d.leads.filter((c) => daAvvisare(c, giorno, d.promemoria));
  const richiami = d.leads.filter((c) => daRichiamare(c, giorno) && (c.fase === 'interessato' || c.fase === 'prova_fatta'));
  const eventiPieni = d.eventi.filter((e) => e.da >= giorno && (!e.soloStudio || e.soloStudio === studio)).filter((e) => eventoCompleto(e, Array.from({ length: Math.max(0, (d.presiEventi[e.id] ?? e.iscrittiFissi) - e.iscrittiFissi) }, () => ({ stato: 'confermata' as const }))));
  const incassare = [...d.persone.values()].reduce((s, x) => s + x.daIncassareCent, 0);
  const nIncassare = [...d.persone.values()].filter((x) => x.daIncassareCent > 0).length;

  return (
    <>
      <h1 className="hello">{nome ? `Ciao ${nome}.` : 'Ciao.'}</h1>
      {eResponsabile && eventiPieni.length > 0 && (
        <section className="card ag-card pc-c">
          <p className="eyebrow">Posti degli eventi</p>
          <div className="pc-rl">
            {eventiPieni.map((e) => (
              <div className="pc-r pc-pe" key={e.id}>
                <div className="pc-m"><b>{e.titolo}</b><small className="muted">{NOME_TIPO[e.tipo]} · {fdate(e.da)} · {d.presiEventi[e.id] ?? occupati(e, [])} su {e.posti} posti{e.chiuso ? ' · iscrizioni chiuse da voi' : ''}</small></div>
                <span className="pc-ch w">Al completo</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="ag">
        <h3>{eResponsabile ? 'Oggi in studio' : 'Le tue lezioni di oggi'}</h3>
        {oggiL.length === 0 ? <p className="muted">Oggi non ci sono lezioni.</p> : (
          <>
            {prossima ? <p className="ag-next">La prossima: <b>{prossima.modello.ora} · {prossima.modello.tipo}</b></p> : <p className="muted small">Per oggi hai finito.</p>}
            <div className="ag-l">{oggiL.map((l) => rigaLezione(l, prossima === l, eResponsabile))}</div>
          </>
        )}
      </section>

      <section className="ag">
        <h3>Prove e contatti</h3>
        <button type="button" className="btn sm" onClick={() => onVai('interessati')}>+ Nuovo contatto</button>
        {proveOggi.length > 0 && <p className="eyebrow" style={{ marginTop: 16 }}>Prove di oggi · {proveOggi.length}</p>}
        {proveOggi.map((c) => (
          <div className="pv-c" key={c.id}>
            <div className="al-m"><b>{c.nome}</b><small>{c.provaOra} · {c.provaTipo}</small></div>
            <div className="pv-b"><button type="button" className="btn sm ghost" onClick={() => onVai('interessati')}>Apri</button></div>
          </div>
        ))}
        {avvisare.length > 0 && <p className="eyebrow" style={{ marginTop: 16 }}>Da avvisare · {avvisare.length}</p>}
        {avvisare.map((c) => (
          <div className="pv-c" key={c.id}>
            <div className="al-m"><b>{c.nome}</b><small>{c.provaIl === giorno ? 'Oggi' : 'Domani'} alle {c.provaOra} · {c.provaTipo}</small></div>
            <div className="pv-b"><button type="button" className="btn sm" onClick={() => onVai('interessati')}>Scrivi il promemoria</button></div>
          </div>
        ))}
        {richiami.length > 0 && <p className="eyebrow" style={{ marginTop: 16 }}>Da richiamare · {richiami.length}</p>}
        {richiami.slice(0, 4).map((c) => (
          <div className="pv-c" key={c.id}>
            <div className="al-m"><b>{c.nome}</b><small>{c.fase === 'prova_fatta' ? 'Prova fatta' : 'Ha scritto'}{c.telefono ? ` · ${c.telefono}` : ''}</small></div>
            <div className="pv-b">{c.telefono && numeroWhatsApp(c.telefono) && <a className="btn sm ghost" href={`https://wa.me/${numeroWhatsApp(c.telefono)}`} target="_blank" rel="noreferrer">Scrivi</a>}</div>
          </div>
        ))}
        {richiami.length > 4 && <button type="button" className="btn sm ghost" onClick={() => onVai('interessati')}>Vedi tutti</button>}
      </section>

      {prossime.length > 0 && (
        <section className="ag">
          <h3>Prossime</h3>
          <div className="ag-l">
            {prossime.map((l) => (
              <button type="button" className="ag-r" key={`${l.modello.id}${l.data}`} onClick={() => apri(l)}>
                <span className="ag-t"><b>{l.modello.ora.replace(/^0/, '')}</b><small>{l.data === aggiungiGiorni(giorno, 1) ? 'domani' : `${NOME_GIORNO[giornoDellaSettimana(l.data)].slice(0, 3)} ${Number(l.data.slice(8))}`}</small></span>
                <span className="ag-m"><b>{l.modello.tipo}</b><small>{attive(prenDi(l.modello, l.data))} su {l.modello.posti} prenotati{eResponsabile ? ` · ${l.modello.insegnante}` : ''}</small></span>
                <span className="ag-c">›</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {d.privateInAttesa > 0 && <Private studio={studio} eResponsabile={eResponsabile} mioId={mioInsegnanteId} soloElenco api={{ ...apiPrivateReali, private: api.private, impostazioni: api.impostazioni, persone: api.persone, programma: api.programma }} />}

      {tardive.length > 0 && (
        <section className="ag">
          <h3>Da vedere</h3>
          <div className="group">
            <button type="button" className="mrow" onClick={() => setVista({ tipo: 'disdette' })}><Icona nome="bell" /><span><b>{tardive.length === 1 ? 'Una disdetta last minute' : `${tardive.length} disdette last minute`}</b><small>Credito non restituito: puoi decidere tu</small></span><em>›</em></button>
          </div>
        </section>
      )}

      <section className="ag">
        <h3>Altro</h3>
        <div className="group">
          {eResponsabile && <button type="button" className="mrow" onClick={() => { setGiornoSel(0); setVista({ tipo: 'tutte' }); }}><Icona nome="cal" /><span><b>Tutte le lezioni</b><small>Di tutti gli insegnanti, per giorno</small></span><em>›</em></button>}
          <button type="button" className="mrow" onClick={() => setVista({ tipo: 'private' })}><Icona nome="user" /><span><b>Lezioni private</b><small>{d.privateInAttesa ? `${d.privateInAttesa} ${d.privateInAttesa === 1 ? 'richiesta in attesa' : 'richieste in attesa'}` : 'Nessuna richiesta'} · le tue disponibilità</small></span>{d.privateInAttesa > 0 && <i className="n">{d.privateInAttesa}</i>}<em>›</em></button>
          <button type="button" className="mrow" onClick={() => setVista({ tipo: 'avvisi' })}><Icona nome="bell" /><span><b>Avvisi a un gruppo</b><small>Notifiche a chi ha scelto un argomento o frequenta una lezione</small></span><em>›</em></button>
          {eResponsabile && <button type="button" className="mrow" onClick={() => setVista({ tipo: 'incassi' })}><Icona nome="card" /><span><b>Da incassare</b><small>{nIncassare ? `${nIncassare} ${nIncassare === 1 ? 'persona' : 'persone'} · ${euro(incassare)}` : 'Tutto incassato'}</small></span><em>›</em></button>}
          {eResponsabile && <button type="button" className="mrow" onClick={() => setVista({ tipo: 'disdette' })}><Icona nome="bell" /><span><b>Disdette last minute</b><small>{tardive.length ? `${tardive.length} con credito perso` : 'Nessuna da gestire'}</small></span>{tardive.length > 0 && <i className="n">{tardive.length}</i>}<em>›</em></button>}
          {eResponsabile && <button type="button" className="mrow" onClick={() => setVista({ tipo: 'lezioni' })}><Icona nome="doc" /><span><b>Richieste di lezioni</b><small>{d.lezioniInAttesa ? `${d.lezioniInAttesa} in attesa di una risposta` : 'Nessuna in attesa'}</small></span>{d.lezioniInAttesa > 0 && <i className="n">{d.lezioniInAttesa}</i>}<em>›</em></button>}
          {eResponsabile && <button type="button" className="mrow" onClick={() => setVista({ tipo: 'richieste' })}><Icona nome="help" /><span><b>Richieste degli allievi</b><small>{d.richiesteSenzaRisposta ? `${d.richiesteSenzaRisposta} senza risposta` : 'Nessuna in attesa'}</small></span><em>›</em></button>}
          {onProfilo && <button type="button" className="mrow" onClick={onProfilo}><Icona nome="user" /><span><b>Il mio profilo</b><small>Nome, cognome e telefono</small></span><em>›</em></button>}
          {onEsci && <button type="button" className="mrow" onClick={onEsci}><Icona nome="user" /><span><b>Esci</b><small>Chiudi l'accesso su questo dispositivo</small></span><em>›</em></button>}
          {eResponsabile && <button type="button" className="mrow" onClick={() => setVista({ tipo: 'emergenza' })}><Icona nome="heart" /><span><b>Emergenza</b><small>Se l'app sbaglia prima di una lezione</small></span><em>›</em></button>}
        </div>
      </section>
    </>
  );
}

