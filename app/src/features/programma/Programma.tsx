import { useCallback, useEffect, useState } from 'react';
import { Chip } from '@/design/Chip';
import { Modale } from '@/design/Modale';
import { Ciclo } from '@/features/programma/Ciclo';
import type { StudioId } from '@/config/tema';
import * as realeCiclo from '@/data/ciclo';
import * as realeEventi from '@/data/eventi';
import * as reale from '@/data/programma';
import * as realeRichieste from '@/data/richieste-lezioni';
import { aggiungiGiorni, giorniDellaSettimana, lunedi, oggi } from '@/domain/date';
import { fdate, intervallo } from '@/domain/formati';
import { NOME_TIPO, TIPI_EVENTO, validaNuovoEvento, type Evento, type TipoEvento } from '@/domain/eventi';
import {
  insegnantiDegliOrari, lezioniDaFermare, NOME_GIORNO, NOME_STILE, validaBlocco, validaNuovaLezione,
  type GruppoBlocco, type Modello,
} from '@/domain/programma';

// Stesso markup e stesse classi di studioProgramma() e studioBlocchi() del prototipo: due schede, "Aggiungi" e "Blocca".
export type ApiProgramma = typeof reale;

const STILI: Record<StudioId, string[]> = {
  tribu: ['iyengar', 'ashtanga', 'flow', 'kundalini', 'teen'],
  pozzo: ['livello-1', 'livello-2', 'restorative'],
};
const GG = [1, 2, 3, 4, 5, 6, 0];
const MOTIVI = ['Ritiro', 'Malattia', 'Impegno'];

// Un responsabile (puoModificare) aggiunge e ferma le lezioni di tutti. Un insegnante (mioNome) ferma le sue e, per aggiungerne una, manda una richiesta
// che decide un responsabile (Andrea o Glenda): le regole stanno nel database (migrazione 0015).
export function Programma({
  studio, puoModificare, mioNome = null, api = reale, apiEventi = realeEventi, apiCiclo = realeCiclo, apiRichieste = realeRichieste,
}: { studio: StudioId; puoModificare: boolean; mioNome?: string | null; api?: ApiProgramma; apiEventi?: typeof realeEventi; apiCiclo?: typeof realeCiclo; apiRichieste?: typeof realeRichieste }) {
  const insegnante = !puoModificare && mioNome !== null;
  const [pagina, setPagina] = useState<'aggiungi' | 'blocca' | 'ciclo' | 'richiedi'>(puoModificare ? 'aggiungi' : 'blocca');
  const [modelli, setModelli] = useState<Modello[] | null>(null);
  const [gruppi, setGruppi] = useState<GruppoBlocco[]>([]);
  const [errore, setErrore] = useState(false);

  const carica = useCallback(async () => {
    const [m, g] = await Promise.all([api.elencaModelli(studio), api.elencaGruppiBlocco(studio, oggi())]);
    if (m === null || g === null) return setErrore(true);
    setErrore(false);
    setModelli(m);
    setGruppi(g);
  }, [api, studio]);

  useEffect(() => {
    void carica();
  }, [carica]);

  if (errore) return <p className="muted">Non riesco a caricare il programma. Riprova tra poco.</p>;
  if (modelli === null) return <p className="muted">Carico il programma…</p>;

  return (
    <>
      <p className="eyebrow">Programma</p>
      {pagina === 'ciclo' ? <h1>Il ciclo delle <em>stagioni</em>.</h1> : <h1>Cosa si fa, e cosa si <em>ferma</em>.</h1>}
      {puoModificare && (
        <div className={`seg ${studio === 'tribu' ? 'seg3' : ''}`} style={{ maxWidth: 420, marginBottom: 24 }}>
          <button type="button" className={pagina === 'aggiungi' ? 'on' : ''} onClick={() => setPagina('aggiungi')}>Aggiungi</button>
          <button type="button" className={pagina === 'blocca' ? 'on' : ''} onClick={() => setPagina('blocca')}>Blocca</button>
          {studio === 'tribu' && <button type="button" className={`${pagina === 'ciclo' ? 'on' : ''} desk`.trim()} onClick={() => setPagina('ciclo')}>Ciclo</button>}
        </div>
      )}
      {insegnante && (
        <div className="seg" style={{ maxWidth: 420, marginBottom: 24 }}>
          <button type="button" className={pagina === 'blocca' ? 'on' : ''} onClick={() => setPagina('blocca')}>Blocca</button>
          <button type="button" className={pagina === 'richiedi' ? 'on' : ''} onClick={() => setPagina('richiedi')}>Chiedi una lezione</button>
        </div>
      )}
      {pagina === 'ciclo' && puoModificare
        ? <Ciclo studio={studio} api={apiCiclo} apiEventi={apiEventi} />
        : pagina === 'richiedi' && insegnante
        ? <RichiediLezione studio={studio} nome={mioNome as string} modelli={modelli} api={apiRichieste} />
        : pagina === 'aggiungi' && puoModificare
        ? <Aggiungi studio={studio} api={api} apiEventi={apiEventi} modelli={modelli} onCambiato={carica} />
        : <Blocca studio={studio} api={api} modelli={modelli} gruppi={gruppi} puoModificare={puoModificare} mioNome={insegnante ? mioNome : null} onCambiato={carica} />}
    </>
  );
}

const LUOGHI: Record<StudioId, string> = { tribu: 'Studio Yoga Tribù · San Giuseppe di Cassola', pozzo: "Studio Pozzo dell'Eternità · Colico (LC)" };

function Aggiungi({ studio, api, apiEventi, modelli, onCambiato }: { studio: StudioId; api: ApiProgramma; apiEventi: typeof realeEventi; modelli: Modello[]; onCambiato: () => Promise<void> }) {
  const stili = STILI[studio];
  const insegnanti = insegnantiDegliOrari(modelli);
  const [tipo, setTipo] = useState<'lezione' | TipoEvento>('lezione');
  const [f, setF] = useState({ tipo: '', stile: stili[0], insegnante: '', giorno: 1, ora: '18:00', posti: 15, durataMin: null as number | null });
  const [ev, setEv] = useState({ titolo: '', da: '', a: '', ora: '9:00', luogo: LUOGHI[studio], altroLuogo: '', prezzo: 30, posti: 15, insegnanti: [] as string[], descrizione: '' });
  const [eventi, setEventi] = useState<Evento[]>([]);
  const [msg, setMsg] = useState('');
  const mie = modelli.filter((m) => m.aggiuntoAMano);
  const eventiMiei = eventi.filter((e) => e.studioOrigine === studio && e.tipo !== 'percorso');
  const evento = tipo !== 'lezione';

  const caricaEventi = useCallback(async () => setEventi((await apiEventi.elencaEventi()) ?? []), [apiEventi]);
  useEffect(() => {
    void caricaEventi();
  }, [caricaEventi]);

  async function aggiungi() {
    if (evento) {
      const v = validaNuovoEvento(ev.titolo, tipo, ev.da, ev.a, ev.posti);
      if (!v.ok) return setMsg(v.motivo);
      const luogo = ev.luogo === 'altro' ? ev.altroLuogo.trim() || 'Da definire' : ev.luogo;
      const esito = await apiEventi.creaEvento(studio, { tipo, titolo: ev.titolo, descrizione: ev.descrizione, da: ev.da, a: ev.a, ora: ev.ora, luogo, prezzoEuro: ev.prezzo, posti: ev.posti, insegnanti: ev.insegnanti });
      if (!esito.ok) return setMsg(esito.motivo);
      setMsg(`${NOME_TIPO[tipo]} pubblicato.`);
      setEv({ ...ev, titolo: '', descrizione: '' });
      return caricaEventi();
    }
    const v = validaNuovaLezione(f, modelli);
    if (!v.ok) return setMsg(v.motivo);
    const esito = await api.aggiungiModello(studio, f);
    if (!esito.ok) return setMsg(esito.motivo);
    setMsg(`Lezione aggiunta: ogni ${NOME_GIORNO[f.giorno].toLowerCase()} alle ${f.ora}.`);
    setF({ ...f, tipo: '' });
    await onCambiato();
  }

  async function rimuoviEvento(e: Evento) {
    const presi = await apiEventi.postiPresi(e.id);
    if (presi !== null && presi > 0) return setMsg(`${e.titolo} ha già ${presi} ${presi === 1 ? 'iscritto' : 'iscritti'}: non si può togliere.`);
    const esito = await apiEventi.eliminaEvento(e.id);
    if (!esito.ok) return setMsg(esito.motivo);
    await caricaEventi();
  }

  return (
    <div className="two">
      <section>
        <div className="bform">
          <p className="eyebrow">Cosa aggiungi</p>
          <div className="chips">
            <Chip acceso={tipo === 'lezione'} onClick={() => setTipo('lezione')}>Lezione</Chip>
            {TIPI_EVENTO.map((t) => <Chip key={t} acceso={tipo === t} onClick={() => setTipo(t)}>{NOME_TIPO[t]}</Chip>)}
          </div>
          {!evento ? (
            <>
              <label className="nl">Nome della lezione<input value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value })} placeholder="Per esempio: Flessibilità" /></label>
              <p className="eyebrow" style={{ marginTop: 16 }}>Stile</p>
              <div className="chips">{stili.map((x) => <Chip key={x} acceso={f.stile === x} onClick={() => setF({ ...f, stile: x })}>{NOME_STILE[x] ?? x}</Chip>)}</div>
              <p className="eyebrow" style={{ marginTop: 16 }}>Insegnante</p>
              <div className="chips">{insegnanti.map((x) => <Chip key={x} acceso={f.insegnante === x} onClick={() => setF({ ...f, insegnante: x })}>{x}</Chip>)}</div>
              <p className="eyebrow" style={{ marginTop: 16 }}>Quando (ogni settimana)</p>
              <div className="chips">{GG.map((g) => <Chip key={g} acceso={f.giorno === g} onClick={() => setF({ ...f, giorno: g })}>{NOME_GIORNO[g].slice(0, 3)}</Chip>)}</div>
              <div className="dates" style={{ marginTop: 12 }}>
                <label>Ora<input type="time" value={f.ora} onChange={(e) => setF({ ...f, ora: e.target.value })} /></label>
                <label>Posti<input type="number" min={1} value={f.posti} onChange={(e) => setF({ ...f, posti: Number(e.target.value) })} /></label>
              </div>
              <div className="chips" style={{ marginTop: 10 }}>
                {[[60, '60 min'], [75, '75 min'], [90, '60-90 min']].map(([n, t]) => <Chip key={t} acceso={f.durataMin === n} onClick={() => setF({ ...f, durataMin: f.durataMin === n ? null : (n as number) })}>{t}</Chip>)}
              </div>
              <p className="note">La lezione si ripete ogni settimana e compare subito nel calendario.</p>
            </>
          ) : (
            <>
              <label className="nl">Titolo<input value={ev.titolo} onChange={(e) => setEv({ ...ev, titolo: e.target.value })} placeholder={tipo === 'ritiro' ? 'Per esempio: Ritiro a Pantelleria' : 'Per esempio: Approfondimento sulle spalle'} /></label>
              <div className="dates">
                <label>{tipo === 'ritiro' ? 'Dal' : 'Data'}<input type="date" value={ev.da} onChange={(e) => setEv({ ...ev, da: e.target.value })} /></label>
                {tipo === 'ritiro'
                  ? <label>Al<input type="date" value={ev.a} onChange={(e) => setEv({ ...ev, a: e.target.value })} /></label>
                  : <label>Ora<input type="time" value={ev.ora} onChange={(e) => setEv({ ...ev, ora: e.target.value })} /></label>}
              </div>
              <p className="eyebrow" style={{ marginTop: 16 }}>Dove</p>
              <div className="chips">
                <Chip acceso={ev.luogo === LUOGHI.tribu} onClick={() => setEv({ ...ev, luogo: LUOGHI.tribu })}>Cassola</Chip>
                <Chip acceso={ev.luogo === LUOGHI.pozzo} onClick={() => setEv({ ...ev, luogo: LUOGHI.pozzo })}>Colico</Chip>
                <Chip acceso={ev.luogo === 'altro'} onClick={() => setEv({ ...ev, luogo: 'altro' })}>Altro</Chip>
              </div>
              {ev.luogo === 'altro' && <input className="sq" style={{ marginTop: 8, borderRadius: 16 }} placeholder="Dove si svolge" value={ev.altroLuogo} onChange={(e) => setEv({ ...ev, altroLuogo: e.target.value })} />}
              <div className="dates" style={{ marginTop: 14 }}>
                <label>Prezzo (€)<input type="number" min={0} value={ev.prezzo} onChange={(e) => setEv({ ...ev, prezzo: Number(e.target.value) })} /></label>
                <label>Posti<input type="number" min={1} value={ev.posti} onChange={(e) => setEv({ ...ev, posti: Number(e.target.value) })} /></label>
              </div>
              <p className="eyebrow" style={{ marginTop: 16 }}>Insegnanti</p>
              <div className="chips">
                {insegnanti.map((x) => <Chip key={x} acceso={ev.insegnanti.includes(x)} onClick={() => setEv({ ...ev, insegnanti: ev.insegnanti.includes(x) ? ev.insegnanti.filter((y) => y !== x) : [...ev.insegnanti, x] })}>{x}</Chip>)}
              </div>
              <label className="nl">Descrizione breve<textarea rows={3} value={ev.descrizione} onChange={(e) => setEv({ ...ev, descrizione: e.target.value })} placeholder="Due righe per presentarlo agli allievi"></textarea></label>
              <p className="note">Compare subito per gli allievi di entrambi gli studi, con un solo numero di posti.</p>
            </>
          )}
          <button type="button" className="btn" onClick={() => void aggiungi()}>{evento ? `Pubblica ${NOME_TIPO[tipo].toLowerCase()}` : 'Aggiungi la lezione'}</button>
          {msg && <p className="note" role="status">{msg}</p>}
        </div>
      </section>
      <section>
        <h3>Aggiunti da voi {mie.length + eventiMiei.length > 0 && <em className="n">{mie.length + eventiMiei.length}</em>}</h3>
        {mie.length + eventiMiei.length === 0 && <p className="muted">Ancora niente.</p>}
        {mie.map((m) => (
          <div className="cash-r" key={m.id}>
            <div className="al-m"><b>{m.tipo}</b><small>Ogni {NOME_GIORNO[m.giorno].toLowerCase()} {m.ora} · {m.insegnante}</small></div>
            <div className="chips"><button type="button" className="chip" onClick={async () => { await api.togliModello(m.id); await onCambiato(); }}>Rimuovi</button></div>
          </div>
        ))}
        {eventiMiei.map((e) => (
          <div className="cash-r" key={e.id}>
            <div className="al-m"><b>{e.titolo}</b><small>{NOME_TIPO[e.tipo]} · {intervallo(e.da, e.a)} · {e.luogo.split(' · ')[1] ?? e.luogo}</small></div>
            <div className="chips"><button type="button" className="chip" onClick={() => void rimuoviEvento(e)}>Rimuovi</button></div>
          </div>
        ))}
        <p className="muted small" style={{ marginTop: 14 }}>Per fermare una lezione che c'è già usa "Blocca": gli iscritti vengono avvisati e il credito torna.</p>
      </section>
    </div>
  );
}

const nomiDi = (m: Modello) => m.insegnante.split(/\s+e\s+|,\s*/).map((x) => x.trim().toLowerCase());

function Blocca({
  studio, api, modelli: tutti, gruppi: tuttiGruppi, puoModificare, mioNome, onCambiato,
}: { studio: StudioId; api: ApiProgramma; modelli: Modello[]; gruppi: GruppoBlocco[]; puoModificare: boolean; mioNome: string | null; onCambiato: () => Promise<void> }) {
  const giorno = oggi();
  // Un insegnante ferma solo le sue lezioni: vede e usa solo quelle.
  const modelli = mioNome ? tutti.filter((m) => nomiDi(m).includes(mioNome.toLowerCase())) : tutti;
  const gruppi = mioNome ? tuttiGruppi.filter((g) => g.scope.toLowerCase() === mioNome.toLowerCase()) : tuttiGruppi;
  const puoFermare = puoModificare || mioNome !== null;
  const insegnanti = insegnantiDegliOrari(modelli);
  const [scope, setScope] = useState(mioNome ?? 'tutti');
  const [da, setDa] = useState(giorno);
  const [a, setA] = useState(giorno);
  const [motivo, setMotivo] = useState('');
  const [conferma, setConferma] = useState(false);
  const [msg, setMsg] = useState('');

  const periodo = (k: 'oggi' | 'sett' | '7' | '30') => {
    setDa(giorno);
    setA(k === 'oggi' ? giorno : k === 'sett' ? giorniDellaSettimana(lunedi(giorno))[6] : aggiungiGiorni(giorno, k === '7' ? 6 : 29));
  };
  const daFermare = lezioniDaFermare(modelli, da, a, scope).length;

  async function applica() {
    const esito = await api.bloccaPeriodo(studio, modelli, scope, da, a, motivo);
    setConferma(false);
    if (!esito.ok) return setMsg(esito.motivo);
    setMsg(`${esito.fermate} lezioni bloccate.`);
    setMotivo('');
    await onCambiato();
  }

  return (
    <>
      <p className="studio-date">{puoModificare ? 'Come amministrazione puoi bloccare le lezioni di tutti.' : mioNome ? 'Puoi fermare le tue lezioni. Per aggiungerne una nuova mandi una richiesta.' : 'Gli orari li modificano amministrazione e gestione.'}</p>
      <div className="two">
        {puoFermare && (
          <section>
            <div className="bform">
              {puoModificare && <><p className="eyebrow">Di chi</p>
              <div className="chips">
                {['tutti', ...insegnanti].map((x) => <Chip key={x} acceso={scope === x} onClick={() => setScope(x)}>{x === 'tutti' ? 'Tutte le lezioni' : x}</Chip>)}
              </div></>}
              {mioNome && modelli.length === 0 && <p className="muted">Non hai ancora lezioni fisse nell'orario.</p>}
              <p className="eyebrow" style={{ marginTop: puoModificare ? 18 : 0 }}>Quando</p>
              <div className="dates">
                <label>Dal<input type="date" value={da} onChange={(e) => setDa(e.target.value)} /></label>
                <label>Al<input type="date" value={a} onChange={(e) => setA(e.target.value)} /></label>
              </div>
              <div className="chips" style={{ marginTop: 8 }}>
                <Chip onClick={() => periodo('oggi')}>Solo oggi</Chip>
                <Chip onClick={() => periodo('sett')}>Questa settimana</Chip>
                <Chip onClick={() => periodo('7')}>Prossimi 7 giorni</Chip>
                <Chip onClick={() => periodo('30')}>Prossimi 30 giorni</Chip>
              </div>
              <p className="eyebrow" style={{ marginTop: 18 }}>Perché (lo vedranno gli allievi)</p>
              <div className="chips">{MOTIVI.map((x) => <Chip key={x} onClick={() => setMotivo(x)}>{x}</Chip>)}</div>
              <input className="sq" style={{ marginTop: 8, borderRadius: 16 }} placeholder={`Per esempio: ${scope === 'tutti' ? 'Lo studio è chiuso per un ritiro' : `${scope} è a un ritiro`}`} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
              <p className="note">Le lezioni bloccate non si possono prenotare.</p>
              <button type="button" className="btn" onClick={() => { const v = validaBlocco(da, a); if (!v.ok) return setMsg(v.motivo); setMsg(''); setConferma(true); }}>Blocca le lezioni</button>
              {msg && <p className="note" role="status">{msg}</p>}
            </div>
          </section>
        )}
        <section>
          <h3>Blocchi attivi {gruppi.length > 0 && <em className="n">{gruppi.length}</em>}</h3>
          {gruppi.length === 0 && <p className="muted">Nessun blocco attivo. Tutte le lezioni sono prenotabili.</p>}
          {gruppi.map((g) => (
            <div className="cash-r" key={g.gruppoId}>
              <div className="al-m">
                <b>{g.scope === 'tutti' ? 'Tutte le lezioni' : `Lezioni di ${g.scope}`}</b>
                <small>{fdate(g.da)}{g.da !== g.a ? ` → ${fdate(g.a)}` : ''}{g.motivo ? ` · ${g.motivo}` : ''}</small>
                <small>{g.lezioni} {g.lezioni === 1 ? 'lezione ferma' : 'lezioni ferme'}</small>
              </div>
              {puoFermare
                ? <div className="chips"><button type="button" className="btn sm ghost" onClick={async () => { await api.riattivaGruppo(g.gruppoId); await onCambiato(); }}>Riattiva</button></div>
                : <span className="muted small">Lo riattiva l'amministrazione</span>}
            </div>
          ))}
        </section>
      </div>
      {conferma && (
        <Modale riga="Conferma il blocco" titolo={scope === 'tutti' ? 'Tutte le lezioni' : `Lezioni di ${scope}`} onChiudi={() => setConferma(false)}>
          <p className="muted">{fdate(da)}{da !== a ? ` → ${fdate(a)}` : ''}{motivo ? ` · ${motivo}` : ''}</p>
          <div className="impact"><div><b>{daFermare}</b><small>lezioni ferme</small></div></div>
          <p className="note">{daFermare === 0 ? 'Nel periodo scelto non ci sono lezioni da bloccare.' : 'Le lezioni restano nell\'orario ma non si possono prenotare.'}</p>
          <div className="two-btn" style={{ gridTemplateColumns: 'auto auto', justifyContent: 'start' }}>
            <button type="button" className="btn" disabled={daFermare === 0} onClick={() => void applica()}>Conferma</button>
            <button type="button" className="btn ghost" onClick={() => setConferma(false)}>Annulla</button>
          </div>
        </Modale>
      )}
    </>
  );
}

const STATO_RICHIESTA = { attesa: ['In attesa', '#b8841f'], approvata: ['Approvata', '#7a9d6e'], rifiutata: ['Non approvata', '#9b9b9b'] } as const;

// Un insegnante non aggiunge lezioni da solo: manda una richiesta, la decide Andrea o Glenda e, se approvata, entra nell'orario a suo nome.
function RichiediLezione({ studio, nome, modelli, api }: { studio: StudioId; nome: string; modelli: Modello[]; api: typeof realeRichieste }) {
  const stili = STILI[studio];
  const [f, setF] = useState({ tipo: '', stile: stili[0], giorno: 1, ora: '18:00', posti: 15, durataMin: null as number | null, nota: '' });
  const [lista, setLista] = useState<realeRichieste.RichiestaLezione[]>([]);
  const [msg, setMsg] = useState('');
  const carica = useCallback(async () => setLista((await api.elencaRichiesteLezioni(studio)) ?? []), [api, studio]);
  useEffect(() => {
    void carica();
  }, [carica]);

  async function invia() {
    const v = validaNuovaLezione({ giorno: f.giorno, ora: f.ora, stile: f.stile, tipo: f.tipo, insegnante: nome, posti: f.posti }, modelli);
    if (!v.ok) return setMsg(v.motivo);
    const esito = await api.chiediLezione(studio, nome, f);
    if (!esito.ok) return setMsg(esito.motivo);
    setMsg('Richiesta inviata. La decidono Andrea o Glenda.');
    setF({ ...f, tipo: '', nota: '' });
    await carica();
  }

  return (
    <div className="two">
      <section>
        <div className="bform">
          <p className="eyebrow">Che lezione vuoi aggiungere</p>
          <label className="nl">Nome della lezione<input value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value })} placeholder="Per esempio: Flessibilità" /></label>
          <p className="eyebrow" style={{ marginTop: 16 }}>Stile</p>
          <div className="chips">{stili.map((x) => <Chip key={x} acceso={f.stile === x} onClick={() => setF({ ...f, stile: x })}>{NOME_STILE[x] ?? x}</Chip>)}</div>
          <p className="eyebrow" style={{ marginTop: 16 }}>Quando (ogni settimana)</p>
          <div className="chips">{GG.map((g) => <Chip key={g} acceso={f.giorno === g} onClick={() => setF({ ...f, giorno: g })}>{NOME_GIORNO[g].slice(0, 3)}</Chip>)}</div>
          <div className="dates" style={{ marginTop: 12 }}>
            <label>Ora<input type="time" value={f.ora} onChange={(e) => setF({ ...f, ora: e.target.value })} /></label>
            <label>Posti<input type="number" min={1} value={f.posti} onChange={(e) => setF({ ...f, posti: Number(e.target.value) })} /></label>
          </div>
          <div className="chips" style={{ marginTop: 10 }}>
            {[[60, '60 min'], [75, '75 min'], [90, '60-90 min']].map(([n, t]) => <Chip key={t} acceso={f.durataMin === n} onClick={() => setF({ ...f, durataMin: f.durataMin === n ? null : (n as number) })}>{t}</Chip>)}
          </div>
          <label className="nl">Perché (facoltativo)<textarea rows={3} value={f.nota} onChange={(e) => setF({ ...f, nota: e.target.value })} placeholder="Due righe per spiegare a chi decide"></textarea></label>
          <p className="note">La richiesta arriva ad Andrea e a Glenda. Se la approvano, la lezione entra nell'orario a tuo nome.</p>
          <button type="button" className="btn" onClick={() => void invia()}>Invia la richiesta</button>
          {msg && <p className="note" role="status">{msg}</p>}
        </div>
      </section>
      <section>
        <h3>Le tue richieste {lista.length > 0 && <em className="n">{lista.length}</em>}</h3>
        {lista.length === 0 && <p className="muted">Ancora nessuna.</p>}
        {lista.map((r) => (
          <div className="cash-r" key={r.id}>
            <div className="al-m"><b>{r.tipo}</b><small>Ogni {NOME_GIORNO[r.giorno].toLowerCase()} {r.ora} · {r.posti} posti</small></div>
            <em className="st" style={{ ['--c' as string]: STATO_RICHIESTA[r.stato][1] }}>{STATO_RICHIESTA[r.stato][0]}</em>
          </div>
        ))}
      </section>
    </div>
  );
}
