import { useCallback, useEffect, useMemo, useState } from 'react';
import { Modale } from '@/design/Modale';
import type { StudioId } from '@/config/tema';
import * as realeEventi from '@/data/eventi';
import * as realePlanner from '@/data/planner';
import type { Esito, Extra } from '@/data/planner';
import { aggiungiGiorni, giornoDellaSettimana, oggi } from '@/domain/date';
import { NOME_GIORNO } from '@/domain/programma';
import {
  breve, descrizioneRiga, didascalia, eConversione, piano, PL_FMT, PL_ORA, PL_STATI, PL_TIPI, prezzoRiga, righe, titoloRiga,
  type EventoPlanner, type Riga, type SalvataggioPost, type StatoPost, type TipoPlanner,
} from '@/domain/planner';

// Stesso markup e stesse classi di studioPlanner(), plLista(), plAzioni() e plFormEvento() del prototipo.
// "Apri e crea" porta al Generatore dei volantini (Contenuti.tsx); i Reel si girano a mano e hanno solo la didascalia.
export type ApiPlanner = { planner: typeof realePlanner; eventi: typeof realeEventi };

const TIPO_PL: Record<string, TipoPlanner> = { workshop: 'approfondimento', incontro: 'incontro', seminario: 'seminario', ritiro: 'ritiro', percorso: 'percorso' };
const TEL_STUDIO = '328 767 5966';
const TEL_SARA = '347 109 8694';

type Finestra = { tipo: 'didascalia'; r: Riga } | { tipo: 'risultati'; r: Riga } | { tipo: 'evento'; id: string | null } | null;

export function Planner({ studio, eResponsabile, api = { planner: realePlanner, eventi: realeEventi }, onApri }: { studio: StudioId; eResponsabile: boolean; api?: ApiPlanner; onApri?: (r: Riga, didascalia: string) => void }) {
  const [eventi, setEventi] = useState<EventoPlanner[] | null>(null);
  const [salvati, setSalvati] = useState<Record<string, Partial<SalvataggioPost>>>({});
  const [errore, setErrore] = useState(false);
  const [vista, setVista] = useState<'lista' | 'tabella'>('lista');
  const [filtri, setFiltri] = useState({ sett: 'm4', ev: '', stato: '', tipo: '' });
  const [finestra, setFinestra] = useState<Finestra>(null);
  const [msg, setMsg] = useState('');
  const giorno = oggi();

  const carica = useCallback(async () => {
      const [ev, post, man, ext] = await Promise.all([api.eventi.elencaEventi(), api.planner.elencaPost(studio), api.planner.elencaEventiManuali(studio), api.planner.elencaExtra(studio)]);
      if (ev === null || post === null || man === null || ext === null) return setErrore(true);
      setErrore(false);
      const dalPrg: EventoPlanner[] = [];
      for (const e of ev.filter((x) => !x.soloStudio || x.soloStudio === studio)) {
        const presi = await api.eventi.postiPresi(e.id);
        dalPrg.push({
          id: e.id, tipo: TIPO_PL[e.tipo] ?? 'incontro', titolo: e.titolo, data: e.da, fine: e.a, luogo: e.luogo, prezzoEuro: e.suRichiesta ? 0 : (e.prezzoCent ?? 0) / 100, posti: e.posti,
          con: e.insegnanti.join(' e ') || null, orario: e.orario, completo: e.chiuso || (presi !== null && presi >= e.posti), extra: ext[e.id] ?? {},
        });
      }
      setEventi([...dalPrg, ...man.map((m) => ({ ...m, extra: { ...m.extra, ...(ext[m.id] ?? {}) } }))]);
      setSalvati(post);
  }, [api, studio]);

  useEffect(() => {
    void carica();
  }, [carica]);

  const tutte = useMemo(() => (eventi ? piano(righe(eventi, giorno), salvati, giorno) : []), [eventi, salvati, giorno]);

  if (errore) return <p className="muted">Non riesco a caricare il planner. Riprova tra poco.</p>;
  if (eventi === null) return <p className="muted">Carico il planner…</p>;

  async function segna(r: Riga, stato: StatoPost) {
    const patch: Partial<SalvataggioPost> = { stato };
    if (stato === 'confermato') Object.assign(patch, { data: r.data, formato: r.f, dataEvento: r.ev?.data ?? null, sposta: null, istantanea: { titolo: r.titoloEv ?? '', tipoL: r.tipoL, fase: r.fase, ob: r.ob, span: r.span } });
    const esito = await api.planner.salvaPost(studio, r.id, patch, r.s ?? {});
    if (!esito.ok) return setMsg(esito.motivo);
    setMsg('');
    await carica();
  }

  async function applica(r: Riga) {
    const c = r.conf;
    if (!c) return;
    const patch: Partial<SalvataggioPost> = c.togli ? { stato: 'annullato' } : c.sposta ? { sposta: c.sposta } : { formato: c.fmt ?? 'storie' };
    const esito = await api.planner.salvaPost(studio, r.id, patch, r.s ?? {});
    if (!esito.ok) return setMsg(esito.motivo);
    await carica();
  }

  const lun = (n: number) => aggiungiGiorni(giorno, n * 7 - ((giornoDellaSettimana(giorno) + 6) % 7));
  const fineFiltro = ({ m4: aggiungiGiorni(giorno, 28), q: aggiungiGiorni(lun(0), 6), p: aggiungiGiorni(lun(1), 6), t: aggiungiGiorni(giorno, 400) } as Record<string, string>)[filtri.sett] ?? aggiungiGiorni(giorno, 28);
  const conf = tutte.filter((r) => r.conf && (r.st === 'proposto' || r.conf.togli));
  const visibili = tutte.filter((r) => (filtri.sett === 'p' ? (r.data as string) >= lun(1) : true) && (r.data as string) <= fineFiltro && (!filtri.ev || (r.ev ? r.ev.id : r.id) === filtri.ev)
    && (!filtri.stato || r.st === filtri.stato) && (!filtri.tipo || r.tipoL === filtri.tipo) && (filtri.stato === 'annullato' || r.st !== 'annullato' || filtri.stato === ''));
  const eventiLista = eventi.filter((e) => e.data >= aggiungiGiorni(giorno, -8)).sort((a, b) => a.data.localeCompare(b.data));
  const tipi = [...new Set(tutte.map((r) => r.tipoL))];
  const daFare = tutte.filter((r) => r.st !== 'annullato' && r.st !== 'pubblicato' && (r.data as string) <= aggiungiGiorni(giorno, 7)).length;
  const etichettaGiorno = (d: string) => {
    const n = Math.round((Date.parse(d) - Date.parse(giorno)) / 86_400_000);
    return `${n === 0 ? 'Oggi · ' : n === 1 ? 'Domani · ' : ''}${NOME_GIORNO[giornoDellaSettimana(d)]} ${Number(d.slice(8))} ${['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'][Number(d.slice(5, 7)) - 1]}`;
  };

  const azioni = (r: Riga) => {
    const b = (t: string, st: StatoPost, primo = false) => <button type="button" className={`btn sm ${primo ? '' : 'ghost'}`} onClick={() => void segna(r, st)}>{t}</button>;
    if (r.st === 'proposto') return eResponsabile ? <>{b('Va bene, conferma', 'confermato', true)}{b('Non lo faccio', 'annullato')}</> : <small className="muted">Lo conferma chi gestisce lo studio</small>;
    if (r.st === 'confermato') return b('Ho preparato il contenuto', 'creato', true);
    if (r.st === 'creato') return b("L'ho pubblicato", 'pubblicato', true);
    if (r.st === 'pubblicato') return <button type="button" className="btn sm ghost" onClick={() => setFinestra({ tipo: 'risultati', r })}>{r.s?.risultati ? 'Vedi i risultati' : "Com'è andato?"}</button>;
    return eResponsabile ? b('Rimettilo in elenco', 'proposto') : null;
  };

  const gruppi: { k: string; r: Riga[] }[] = [];
  for (const r of visibili) {
    const g = gruppi[gruppi.length - 1];
    if (g && g.k === r.data) g.r.push(r);
    else gruppi.push({ k: r.data as string, r: [r] });
  }
  const fmtRiga = (r: Riga) => PL_ORA[r.f as keyof typeof PL_ORA] === 'da stampare' ? 'Stampa' : PL_ORA[r.f as keyof typeof PL_ORA];

  return (
    <>
      <p className="eyebrow">Contenuti</p>
      <h1>Cosa pubblicare, <em>e quando.</em></h1>
      {conf.length > 0 && (
        <section className="card pl-conf">
          <p className="eyebrow">Da sistemare · {conf.length}</p>
          {conf.map((r) => (
            <div className="pl-cf" key={r.id}>
              <div><b>{titoloRiga(r)}</b><span>{r.conf?.txt}</span></div>
              {eResponsabile && (r.conf?.sposta || r.conf?.fmt || r.conf?.togli) && <button type="button" className="btn sm" onClick={() => void applica(r)}>{r.conf.togli ? 'Sì, toglilo' : r.conf.sposta ? 'Sì, sposta' : 'Sì, fai una storia'}</button>}
            </div>
          ))}
        </section>
      )}
      <div className="pl-bar">
        <div className="seg" style={{ maxWidth: 360 }}>
          <button type="button" className={vista === 'lista' ? 'on' : ''} onClick={() => setVista('lista')}>Giorno per giorno</button>
          <button type="button" className={vista === 'tabella' ? 'on' : ''} onClick={() => setVista('tabella')}>Tabella</button>
        </div>
        {eResponsabile && <button type="button" className="btn sm" style={{ margin: 0 }} onClick={() => setFinestra({ tipo: 'evento', id: null })}>+ Aggiungi evento</button>}
      </div>
      <details className="pl-evd">
        <summary>I tuoi eventi ({eventiLista.length}) e cosa c'è sempre</summary>
        <div className="pl-evl">
          {eventiLista.map((e) => {
            const x = e.extra;
            const nota = [x.scadenza ? `iscrizioni entro il ${breve(x.scadenza)}` : ['ritiro', 'corso'].includes(e.tipo) ? null : '', x.pubblico && x.pubblico !== 'tutti' ? (x.pubblico === 'principianti' ? 'per chi inizia' : 'per chi pratica già') : ''].filter(Boolean).join(' · ');
            return (
              <div className="pl-ev" key={e.id}>
                <div><b>{e.titolo}</b><span>{e.tipo === 'serie' ? '' : PL_TIPI[e.tipo].l} · {breve(e.data)}{nota ? ` · ${nota}` : ''}{!x.scadenza && ['ritiro', 'corso'].includes(e.tipo) ? <> · <b className="pl-w">manca la scadenza iscrizione</b></> : null}</span></div>
                {eResponsabile && <button type="button" className="btn sm ghost" onClick={() => setFinestra({ tipo: 'evento', id: e.id })}>Dettagli</button>}
              </div>
            );
          })}
        </div>
        <p className="muted small" style={{ marginTop: 10 }}>Ci sono sempre anche: la lezione di prova ogni due settimane e il Wrapped di fine anno. Gli eventi aggiunti dal Programma compaiono da soli.</p>
      </details>
      <section className="card pl-tab">
        <div className="pl-top"><p className="pl-n">{daFare ? <><b>{daFare}</b> {daFare === 1 ? 'cosa da fare' : 'cose da fare'} nei prossimi 7 giorni.</> : 'Niente da fare nei prossimi 7 giorni.'}</p></div>
        <div className="pl-f">
          <label>Quando
            <select value={filtri.sett} onChange={(e) => setFiltri({ ...filtri, sett: e.target.value })}>
              <option value="m4">Prossime 4 settimane</option><option value="q">Questa settimana</option><option value="p">Settimana prossima</option><option value="t">Tutto</option>
            </select>
          </label>
          <label>Evento
            <select value={filtri.ev} onChange={(e) => setFiltri({ ...filtri, ev: e.target.value })}>
              <option value="">Tutti</option>
              {eventiLista.map((e) => <option key={e.id} value={e.id}>{e.titolo} · {breve(e.data)}</option>)}
            </select>
          </label>
          <label>A che punto è
            <select value={filtri.stato} onChange={(e) => setFiltri({ ...filtri, stato: e.target.value })}>
              <option value="">Tutto</option>
              {Object.entries(PL_STATI).map(([k, v]) => <option key={k} value={k}>{v[0]}</option>)}
            </select>
          </label>
          <label>Che cosa
            <select value={filtri.tipo} onChange={(e) => setFiltri({ ...filtri, tipo: e.target.value })}>
              <option value="">Tutto</option>
              {tipi.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
        </div>
        {visibili.length === 0 && <p className="muted pad" style={{ padding: '14px 0' }}>Niente da pubblicare con questi filtri.</p>}
        {visibili.length > 0 && vista === 'lista' && gruppi.map((g) => (
          <div className="pl-dg" key={g.k}>
            <h3 className="pl-gd">{etichettaGiorno(g.k)}</h3>
            {g.r.map((r) => (
              <div className={`pl-it ${r.st} ${r.conf ? 'conf' : ''}`} key={r.id}>
                <div className="pl-w1"><b>{fmtRiga(r)}</b><span className="pl-fm">{PL_FMT[r.f as keyof typeof PL_FMT]}</span></div>
                <div className="pl-w2">
                  <b>{titoloRiga(r)}</b><span>{descrizioneRiga(r)}</span>
                  {r.opz && <small>Facoltativo: se hai tempo.</small>}
                  {eConversione(r) && (prezzoRiga(r) ? <small>Qui va il prezzo: {prezzoRiga(r)}. È preso dall'evento, non va scritto a mano.</small> : <small className="pl-w">Qui va il prezzo, ma nell'evento non c'è: aggiungilo dal Programma.</small>)}
                  {r.span > 1 && <small>Una storia al giorno fino al {breve(aggiungiGiorni(r.data as string, r.span - 1))}.</small>}
                  {r.ritardo && <small className="pl-w">Andava fatto prima: fallo oggi.</small>}
                  {r.conf && <small className="pl-w">{r.conf.togli ? 'È al completo: guarda "Da sistemare" in alto.' : "Quel giorno c'è già un altro post: guarda \"Da sistemare\" in alto."}</small>}
                  {r.avviso && <small className="pl-w">L'evento è cambiato dopo la conferma: ricontrolla.</small>}
                </div>
                <div className="pl-w3">
                  <em className="st" style={{ ['--c' as string]: PL_STATI[r.st as StatoPost][1] }}>{PL_STATI[r.st as StatoPost][0]}</em>
                  <div className="pl-az">
                    {azioni(r)}
                    {r.st !== 'annullato' && <button type="button" className="btn sm ghost" onClick={() => (r.f === 'reel' || !onApri ? setFinestra({ tipo: 'didascalia', r }) : onApri(r, didascalia(r, giorno, TEL_STUDIO, TEL_SARA)))}>{r.f === 'reel' ? 'Vedi la didascalia' : onApri ? 'Apri e crea' : 'Didascalia'}</button>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
        {visibili.length > 0 && vista === 'tabella' && (
          <div className="pl-sc">
            <table className="pl-t">
              <thead><tr><th>Data</th><th>Ora</th><th>Formato</th><th>Evento</th><th>Tipo</th><th>Fase</th><th>Obiettivo</th><th>Stato</th></tr></thead>
              <tbody>
                {visibili.map((r) => (
                  <tr className={`${r.st} ${r.conf ? 'conf' : ''}`} key={r.id}>
                    <td><b>{breve(r.data as string)}{r.span > 1 && <small> fino al {breve(aggiungiGiorni(r.data as string, r.span - 1))}</small>}</b>{r.ritardo && <small className="pl-w">in ritardo</small>}</td>
                    <td>{PL_ORA[r.f as keyof typeof PL_ORA]}</td><td>{PL_FMT[r.f as keyof typeof PL_FMT]}</td><td>{r.titoloEv}</td><td>{r.tipoL}</td><td>{titoloRiga(r).split(':')[0]}</td><td>{descrizioneRiga(r)}</td>
                    <td><em className="st" style={{ ['--c' as string]: PL_STATI[r.st as StatoPost][1] }}>{PL_STATI[r.st as StatoPost][0]}</em></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {visibili.length > 0 && <p className="muted small" style={{ marginTop: 12 }}>Un post nel feed al giorno al massimo, fino a 6 storie al giorno. Orari consigliati: pranzo per i Reel, sera per caroselli e post, mattina per le storie.</p>}
      </section>
      {msg && <p className="note" role="alert">{msg}</p>}

      {finestra?.tipo === 'didascalia' && <Didascalia r={finestra.r} onChiudi={() => setFinestra(null)} oggi={giorno} />}
      {finestra?.tipo === 'risultati' && (
        <Risultati r={finestra.r} onChiudi={() => setFinestra(null)} onSalva={async (ris) => {
          const esito: Esito = await api.planner.salvaPost(studio, finestra.r.id, { risultati: ris }, finestra.r.s ?? {});
          if (!esito.ok) return setMsg(esito.motivo);
          setFinestra(null);
          await carica();
        }} />
      )}
      {finestra?.tipo === 'evento' && (
        <FormEvento
          evento={finestra.id ? eventi.find((e) => e.id === finestra.id) ?? null : null}
          manuale={!finestra.id || !eventi.find((e) => e.id === finestra.id)?.id.match(/^[0-9a-f]{8}-/)}
          onChiudi={() => setFinestra(null)}
          onSalva={async (dati, extra, id) => {
            const e = await api.planner.salvaEventoManuale(studio, { ...dati, id: id ?? undefined, extra });
            if (!e.ok) return setMsg(e.motivo);
            setFinestra(null);
            await carica();
          }}
          onSalvaExtra={async (id, extra) => {
            const e = await api.planner.salvaExtra(studio, id, extra);
            if (!e.ok) return setMsg(e.motivo);
            setFinestra(null);
            await carica();
          }}
        />
      )}
    </>
  );
}

function Didascalia({ r, oggi: g, onChiudi }: { r: Riga; oggi: string; onChiudi: () => void }) {
  const [t, setT] = useState(didascalia(r, g, TEL_STUDIO, TEL_SARA));
  const [copiato, setCopiato] = useState(false);
  return (
    <Modale riga={r.f === 'reel' ? 'Reel' : PL_FMT[r.f as keyof typeof PL_FMT]} titolo={r.titoloEv ?? ''} onChiudi={onChiudi}>
      <p className="muted small">{r.f === 'reel' ? "Il Reel si gira a mano. Qui c'è la bozza della didascalia e che cosa deve dire." : 'Bozza della didascalia: rileggila prima di pubblicare e controlla il consenso di chi è in foto.'}</p>
      <p className="muted small"><b>Obiettivo:</b> {descrizioneRiga(r)}</p>
      <textarea id="pl-cap" rows={9} className="pl-cap" value={t} onChange={(e) => setT(e.target.value)}></textarea>
      <button type="button" className="btn wide" onClick={async () => { await navigator.clipboard?.writeText(t); setCopiato(true); }}>{copiato ? 'Copiata' : 'Copia la didascalia'}</button>
    </Modale>
  );
}

function Risultati({ r, onChiudi, onSalva }: { r: Riga; onChiudi: () => void; onSalva: (ris: Record<string, unknown>) => Promise<void> }) {
  const x = (r.s?.risultati ?? {}) as { reach?: number; saves?: number; dm?: number; note?: string };
  const [v, setV] = useState({ reach: x.reach ?? '', saves: x.saves ?? '', dm: x.dm ?? '', note: x.note ?? '' });
  return (
    <Modale riga="Risultati" titolo="Com'è andato il post?" onChiudi={onChiudi}>
      <p className="muted small">Si inseriscono a mano: Instagram non li dà in modo affidabile. Nel tempo servono a correggere gli schemi.</p>
      <label className="nl">Persone raggiunte o visualizzazioni<input type="number" min={0} value={v.reach} onChange={(e) => setV({ ...v, reach: e.target.value })} /></label>
      <label className="nl">Salvataggi<input type="number" min={0} value={v.saves} onChange={(e) => setV({ ...v, saves: e.target.value })} /></label>
      <label className="nl">Richieste o messaggi ricevuti<input type="number" min={0} value={v.dm} onChange={(e) => setV({ ...v, dm: e.target.value })} /></label>
      <label className="nl">Note<textarea rows={3} value={v.note} onChange={(e) => setV({ ...v, note: e.target.value })}></textarea></label>
      <button type="button" className="btn wide" style={{ marginTop: 16 }} onClick={() => void onSalva({ reach: Number(v.reach) || 0, saves: Number(v.saves) || 0, dm: Number(v.dm) || 0, note: v.note })}>Salva</button>
      <button type="button" className="btn ghost wide" style={{ marginTop: 10 }} onClick={onChiudi}>Annulla</button>
    </Modale>
  );
}

function FormEvento({
  evento, manuale, onChiudi, onSalva, onSalvaExtra,
}: {
  evento: EventoPlanner | null; manuale: boolean; onChiudi: () => void;
  onSalva: (d: { tipo: TipoPlanner; titolo: string; data: string; luogo: string; prezzoEuro: number; posti: number; con: string }, extra: Extra, id: string | null) => Promise<void>;
  onSalvaExtra: (id: string, extra: Extra) => Promise<void>;
}) {
  const x = evento?.extra ?? {};
  const [v, setV] = useState({ titolo: evento?.titolo ?? '', tipo: (evento?.tipo ?? 'incontro') as TipoPlanner, data: evento?.data ?? '', luogo: evento?.luogo ?? '', prezzo: evento?.prezzoEuro ?? '', posti: evento?.posti ?? '', con: evento?.con ?? '', scad: x.scadenza ?? '', pub: x.pubblico ?? 'tutti', link: x.link ?? '' });
  const [err, setErr] = useState('');
  const extra: Extra = { scadenza: v.scad || undefined, pubblico: v.pub, link: v.link.trim() || undefined };
  return (
    <Modale riga={evento ? "Dettagli dell'evento" : 'Nuovo evento'} titolo={evento ? evento.titolo : 'Cosa vuoi promuovere?'} onChiudi={onChiudi}>
      {manuale ? (
        <>
          <label className="nl">Titolo<input value={v.titolo} onChange={(e) => setV({ ...v, titolo: e.target.value })} placeholder="Per esempio: Pomeriggio sul respiro" /></label>
          <label className="nl">Che tipo è
            <select value={v.tipo} onChange={(e) => setV({ ...v, tipo: e.target.value as TipoPlanner })}>
              {Object.entries(PL_TIPI).map(([k, t]) => <option key={k} value={k}>{t.l}</option>)}
            </select>
          </label>
          <label className="nl">Data<input type="date" value={v.data} onChange={(e) => setV({ ...v, data: e.target.value })} /></label>
          <label className="nl">Luogo<input value={v.luogo} onChange={(e) => setV({ ...v, luogo: e.target.value })} placeholder="Studio Yoga Tribù" /></label>
          <label className="nl">Quota (€)<input type="number" min={0} value={v.prezzo} onChange={(e) => setV({ ...v, prezzo: e.target.value })} /></label>
          <label className="nl">Posti<input type="number" min={0} value={v.posti} onChange={(e) => setV({ ...v, posti: e.target.value })} /></label>
          <label className="nl">Insegnante<input value={v.con} onChange={(e) => setV({ ...v, con: e.target.value })} placeholder="Glenda e Mattia" /></label>
        </>
      ) : <p className="muted small">Titolo, data, luogo, quota e posti si cambiano dal Programma. Qui aggiungi quello che serve ai post.</p>}
      <label className="nl">Scadenza iscrizione o early bird<input type="date" value={v.scad} onChange={(e) => setV({ ...v, scad: e.target.value })} /></label>
      <label className="nl">Per chi è
        <select value={v.pub} onChange={(e) => setV({ ...v, pub: e.target.value })}>
          <option value="tutti">Tutti</option><option value="principianti">Principianti</option><option value="avanzati">Chi pratica già</option>
        </select>
      </label>
      <label className="nl">Link di prenotazione (solo se diverso dal link in bio)<input value={v.link} onChange={(e) => setV({ ...v, link: e.target.value })} placeholder="https://" /></label>
      {err && <p className="note" role="alert">{err}</p>}
      <button type="button" className="btn wide" style={{ marginTop: 16 }} onClick={() => {
        if (!manuale && evento) return void onSalvaExtra(evento.id, extra);
        if (v.titolo.trim() === '') return setErr('Scrivi il titolo.');
        if (!v.data) return setErr('Scegli la data.');
        void onSalva({ tipo: v.tipo, titolo: v.titolo.trim().charAt(0).toUpperCase() + v.titolo.trim().slice(1), data: v.data, luogo: v.luogo.trim(), prezzoEuro: Number(v.prezzo) || 0, posti: Number(v.posti) || 0, con: v.con.trim() }, extra, evento?.id ?? null);
      }}>{evento ? 'Salva' : 'Aggiungi al planner'}</button>
      <button type="button" className="btn ghost wide" style={{ marginTop: 10 }} onClick={onChiudi}>Annulla</button>
    </Modale>
  );
}

