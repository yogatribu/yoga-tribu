import { useCallback, useEffect, useState } from 'react';
import { Compositore } from '@/design/Compositore';
import { Chip } from '@/design/Chip';
import type { StudioId } from '@/config/tema';
import * as realeEventi from '@/data/eventi';
import * as realePersone from '@/data/persone';
import { oggi } from '@/domain/date';
import {
  coorti, completo, fase, fine, liberi, occupati, ORDINE_PASSI, PASSI, prossimoIncontro, stato, testoPassoSuccessivo, validaNuovoPercorso,
  type Evento, type Iscrizione, type Passo,
} from '@/domain/eventi';
import { fdate, intervallo } from '@/domain/formati';
import { numeroWhatsApp } from '@/domain/leads';
import { nomeCompleto, type Persona } from '@/domain/persone';

// Stesso markup e stesse classi di studioPercorsi(), pcCardPasso(), pcCardRichieste(), pcCardEdizione() del prototipo.
// I percorsi di salute femminile li segue Sara: gli altri insegnanti (puoGestire falso) vedono solo i posti, non i nomi, e non scrivono.
// La richiesta di iscrizione dell'allievo dall'app arriva con la parte degli allievi: per ora le iscrizioni le inserisce lo studio.
export type ApiPercorsi = { eventi: typeof realeEventi; persone: typeof realePersone };

const iniziali = (n: string) => n.split(' ').map((x) => x[0]).slice(0, 2).join('').toUpperCase();

export function Percorsi({ studio, puoGestire = true, api = { eventi: realeEventi, persone: realePersone } }: { studio: StudioId; puoGestire?: boolean; api?: ApiPercorsi }) {
  const [eventi, setEventi] = useState<Evento[] | null>(null);
  const [iscr, setIscr] = useState<Iscrizione[]>([]);
  const [persone, setPersone] = useState<Persona[]>([]);
  const [errore, setErrore] = useState(false);
  const [msg, setMsg] = useState('');
  const [scrivendo, setScrivendo] = useState<{ e: Evento; i: Iscrizione } | null>(null);
  const [nuovo, setNuovo] = useState({ passo: 'gravidanza' as Passo, da: '', incontri: 4, posti: 15 });

  const carica = useCallback(async () => {
    const [e, i, p] = await Promise.all([api.eventi.elencaEventi(), api.eventi.elencaIscrizioni(studio), api.persone.elencaPersone(studio)]);
    if (e === null || i === null || p === null) return setErrore(true);
    setErrore(false);
    setEventi(e.filter((x) => x.tipo === 'percorso'));
    setIscr(i);
    setPersone(p.map((s) => s.persona));
  }, [api, studio]);

  useEffect(() => {
    void carica();
  }, [carica]);

  if (errore) return <p className="muted">Non riesco a caricare i percorsi. Riprova tra poco.</p>;
  if (eventi === null) return <p className="muted">Carico i percorsi…</p>;

  const giorno = oggi();
  const di = (e: Evento) => iscr.filter((x) => x.eventoId === e.id);
  const persona = (i: Iscrizione) => persone.find((p) => p.id === i.personId) ?? null;
  const ordinati = [...eventi].sort((a, b) => a.da.localeCompare(b.da));
  const richieste = ordinati.filter((e) => fase(e, giorno) !== 'finito').flatMap((e) => di(e).filter((x) => x.stato === 'in_attesa').map((x) => ({ e, i: x })));
  const passi = coorti(ordinati, giorno);
  const arrivo = ordinati.filter((e) => fase(e, giorno) !== 'finito');
  const passati = ordinati.filter((e) => fase(e, giorno) === 'finito' && !passi.includes(e)).reverse();
  const daProporre = passi.reduce((s, e) => s + di(e).filter((x) => x.stato === 'confermata' && !x.messaggio && persona(x)?.consensoNovita).length, 0);

  async function esegui(r: Promise<{ ok: boolean; motivo?: string }>) {
    const esito = await r;
    if (!esito.ok) return setMsg(esito.motivo ?? 'Non sono riuscito a salvare.');
    setMsg('');
    await carica();
  }

  const riga = (e: Evento, i: Iscrizione, conBottone: boolean) => {
    const p = persona(i);
    const accettato = Boolean(p?.consensoNovita);
    const chip = i.stato === 'in_attesa' ? <span className="pc-ch w">Da confermare</span>
      : !accettato ? <span className="pc-ch w">Non ha accettato gli avvisi: proponilo a voce</span>
      : i.messaggio === 'proposto' ? <span className="pc-ch">Proposto</span>
      : i.messaggio === 'rimandato' ? <span className="pc-ch">Rimandato</span>
      : <span className="pc-ch ok">Ha accettato gli avvisi</span>;
    return (
      <div className="pc-r" key={i.id}>
        <div className="pc-av">{iniziali(i.nome)}</div>
        <div className="pc-m"><b>{i.nome}</b>{chip}</div>
        {i.stato === 'in_attesa' && <button type="button" className="btn sm" onClick={() => void esegui(api.eventi.cambiaStatoIscrizione(i.id, 'confermata'))}>Conferma</button>}
        {conBottone && i.stato === 'confermata' && accettato && !i.messaggio && <button type="button" className="btn sm" onClick={() => setScrivendo({ e, i })}>Scrivi</button>}
      </div>
    );
  };

  return (
    <>
      <p className="eyebrow">Percorsi</p>
      <h1>I percorsi di <em>Salute femminile.</em></h1>
      <p className="muted" style={{ margin: '-6px 0 18px' }}>Qui vedi i posti, chi è in lista e a chi proporre il passo dopo. I messaggi li invii tu: non partono da soli.</p>

      {!puoGestire && <p className="muted small" style={{ margin: '-6px 0 18px' }}>I percorsi li segue Sara: qui vedi i posti. Le persone e i messaggi sono suoi.</p>}

      {puoGestire && richieste.length > 0 && (
        <section className="card pc-c">
          <p className="eyebrow">Richieste da confermare · {richieste.length}</p>
          <p className="muted small" style={{ margin: '0 0 6px' }}>Il posto è già tenuto. Conferma quando hai scritto alla persona e concordato il costo.</p>
          <div className="pc-rl">
            {richieste.map(({ e, i }) => (
              <div className="pc-r" key={i.id}>
                <div className="pc-av">{iniziali(i.nome)}</div>
                <div className="pc-m"><b>{i.nome}</b><small className="muted">{e.titolo} · dal {fdate(e.da)}</small></div>
                <button type="button" className="btn sm" onClick={() => void esegui(api.eventi.cambiaStatoIscrizione(i.id, 'confermata'))}>Conferma</button>
              </div>
            ))}
          </div>
        </section>
      )}

      {puoGestire && passi.length > 0 && (
        <>
          <p className="eyebrow gap">Il passo successivo{daProporre ? ` · ${daProporre}` : ''}</p>
          {passi.map((e) => {
            const gente = di(e).filter((x) => x.stato === 'confermata');
            const prox = PASSI[e.passo as Passo].dopo.map((x) => PASSI[x].nome);
            return (
              <section className="card pc-c" key={e.id}>
                <p className="eyebrow">{fase(e, giorno) === 'finito' ? `Hanno finito il ${fdate(fine(e))}` : `Finisce il ${fdate(fine(e))}`}</p>
                <h3 className="pc-ti">{e.titolo}</h3>
                <p className="muted small" style={{ margin: '0 0 6px' }}>Da proporre: {prox.length ? prox.join(' e ') : 'una lezione di yoga in studio'}.{daProporre ? '' : ' Le hai già contattate tutte.'}</p>
                <div className="pc-rl">{gente.map((i) => riga(e, i, true))}</div>
              </section>
            );
          })}
        </>
      )}

      <p className="eyebrow gap">In corso e in arrivo</p>
      {arrivo.length === 0 && <p className="muted">Nessun percorso in programma.</p>}
      {arrivo.map((e) => {
        const f = fase(e, giorno);
        const gente = di(e).filter((x) => x.stato !== 'lista');
        const lista = di(e).filter((x) => x.stato === 'lista');
        const n = occupati(e, di(e));
        const s = f === 'prossimo' ? stato(e, di(e)) : { testo: 'In corso', tono: 'ok' };
        const pr = prossimoIncontro(e, giorno);
        const liberiOra = liberi(e, di(e));
        const senzaIscritti = n === 0;
        const iscrivibili = persone.filter((p) => !di(e).some((x) => x.personId === p.id));
        return (
          <section className="card pc-c" key={e.id}>
            <div className="pc-h">
              <div><p className="eyebrow">{intervallo(e.da, e.a)}</p><h3 className="pc-ti">{e.titolo}</h3><small>{e.orario}</small></div>
              <span className={`pc-ch ${s.tono}`}>{s.testo}</span>
            </div>
            <div className="occ2"><i style={{ width: `${Math.min(100, (n / e.posti) * 100)}%` }}></i></div>
            <p className="muted small" style={{ margin: '6px 0 12px' }}>{n} su {e.posti} posti{lista.length ? ` · in lista ${lista.length}` : ''}{f === 'incorso' && pr ? ` · prossimo incontro ${fdate(pr.data)}` : ''}</p>
            {puoGestire && f === 'prossimo' && (e.chiuso || liberiOra > 0) && (
              <button type="button" className="btn sm ghost" style={{ marginBottom: 12 }} onClick={() => void esegui(api.eventi.impostaChiuso(e.id, !e.chiuso))}>{e.chiuso ? 'Riapri le iscrizioni' : 'Chiudi le iscrizioni'}</button>
            )}
            {puoGestire && <details className="pl-evd">
              <summary>Le persone ({n})</summary>
              <div className="pc-rl">
                {gente.map((i) => riga(e, i, false))}
                {e.iscrittiFissi > 0 && <p className="muted small">Più {e.iscrittiFissi} {e.iscrittiFissi === 1 ? 'persona iscritta' : 'persone iscritte'} fuori dall'app.</p>}
                {gente.length === 0 && e.iscrittiFissi === 0 && <p className="muted small">Nessuna per ora.</p>}
              </div>
              {iscrivibili.length > 0 && (
                <select className="sq" style={{ marginTop: 10 }} aria-label="Iscrivi una persona" value="" onChange={(ev) => {
                  const p = persone.find((x) => x.id === ev.target.value);
                  if (p) void esegui(api.eventi.iscriviPersona(studio, e.id, { id: p.id, nome: nomeCompleto(p) }, completo(e, di(e)) ? 'lista' : 'confermata'));
                }}>
                  <option value="">+ Iscrivi una persona</option>
                  {iscrivibili.map((p) => <option key={p.id} value={p.id}>{nomeCompleto(p)}</option>)}
                </select>
              )}
            </details>}
            {puoGestire && lista.length > 0 && (
              <details className="pl-evd">
                <summary>In lista ({lista.length})</summary>
                <div className="pc-rl">
                  {lista.map((x) => (
                    <div className="pc-r" key={x.id}>
                      <div className="pc-av">{iniziali(x.nome)}</div>
                      <div className="pc-m"><b>{x.nome}</b></div>
                      {liberiOra > 0 && <button type="button" className="btn sm ghost" onClick={() => void esegui(api.eventi.cambiaStatoIscrizione(x.id, 'confermata'))}>Dai il posto</button>}
                    </div>
                  ))}
                </div>
              </details>
            )}
            {puoGestire && senzaIscritti && <button type="button" className="btn sm ghost" onClick={() => void esegui(api.eventi.eliminaEvento(e.id))}>Togli il percorso</button>}
          </section>
        );
      })}

      {passati.length > 0 && (
        <details className="pl-evd">
          <summary>Già conclusi ({passati.length})</summary>
          <div className="pc-rl">
            {passati.map((e) => (
              <div className="pc-r" key={e.id}><div className="pc-m"><b>{e.titolo}</b><small className="muted">{intervallo(e.da, e.a)} · {occupati(e, di(e))} persone</small></div></div>
            ))}
          </div>
        </details>
      )}

      {puoGestire && <section className="card desk pc-new">
        <p className="eyebrow">Nuovo percorso</p>
        <div className="chips">{ORDINE_PASSI.map((k) => <Chip key={k} acceso={nuovo.passo === k} onClick={() => setNuovo({ ...nuovo, passo: k })}>{PASSI[k].nome}</Chip>)}</div>
        <div className="dates" style={{ marginTop: 14 }}>
          <label>Primo incontro<input type="date" value={nuovo.da} onChange={(e) => setNuovo({ ...nuovo, da: e.target.value })} /></label>
          <label>Incontri<input type="number" min={1} max={12} value={nuovo.incontri} onChange={(e) => setNuovo({ ...nuovo, incontri: Number(e.target.value) })} /></label>
          <label>Posti<input type="number" min={1} value={nuovo.posti} onChange={(e) => setNuovo({ ...nuovo, posti: Number(e.target.value) })} /></label>
        </div>
        <p className="note">Gli incontri sono una volta a settimana, alla stessa ora. Chi ha scelto questo tema in "Cosa ti interessa" lo vedrà nella Home dell'app.</p>
        <button type="button" className="btn" onClick={() => {
          const v = validaNuovoPercorso(nuovo.da, nuovo.incontri, nuovo.posti, giorno);
          if (!v.ok) return setMsg(v.motivo);
          void esegui(api.eventi.creaPercorso(studio, nuovo.passo, nuovo.da, nuovo.incontri, nuovo.posti, 'Studio Yoga Tribù · San Giuseppe di Cassola'));
        }}>Pubblica il percorso</button>
      </section>}
      {msg && <p className="note" role="alert">{msg}</p>}

      {scrivendo && (() => {
        const p = persona(scrivendo.i);
        return (
          <Compositore
            nome={scrivendo.i.nome}
            whatsapp={p?.telefono ? numeroWhatsApp(p.telefono) : ''}
            email={p?.email ?? null}
            testo={testoPassoSuccessivo(scrivendo.e.passo as Passo, scrivendo.i.nome)}
            onChiudi={() => setScrivendo(null)}
            onInviato={() => { const i = scrivendo.i; setScrivendo(null); void esegui(api.eventi.segnaMessaggio(i.id, 'proposto')); }}
          />
        );
      })()}
    </>
  );
}
