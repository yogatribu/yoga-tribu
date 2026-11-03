import { useCallback, useEffect, useMemo, useState } from 'react';
import { Chip } from '@/design/Chip';
import { Icona } from '@/design/Icone';
import { COLORI_AVATAR, COMUNITA, type StudioId } from '@/config/tema';
import { maiuscoleScrivendo } from '@/domain/impostazioni';
import * as reale from '@/data/persone';
import * as realePren from '@/data/prenotazioni';
import type { DettaglioPersona, Esito, Pacchetto, Scheda } from '@/data/persone';
import { aggiungiGiorni, oggi } from '@/domain/date';
import { ago, COLORE_STATO, giorniDal, lezioniFatte, statoAllievo, ultimaLezione, type Prenotazione, type StatoAllievo } from '@/domain/prenotazioni';
import { fdate, iniziale, quandoRel } from '@/domain/formati';
import { telefonoValido } from '@/domain/leads';
import {
  datiMancanti, eta, euro, giorniAllaScadenza, inScadenza, nomeCompleto, prossimaScadenza, saldo,
  type Acquisto, type VoceRegistro,
} from '@/domain/persone';
import { linkWhatsApp, testoMessaggio, type MotivoMessaggio } from '@/domain/messaggi';
import { numeroWhatsApp } from '@/domain/leads';

// Stesso markup e stesse classi di studioAllievi() / schedaAllievo() / formNuova() del prototipo (src/pages/app-demo.astro).
// Mancano per ora i dati che arrivano dalle prenotazioni (ultima lezione, lezioni totali, stato "a rischio" o "in pausa").

export type ApiPersone = typeof reale;

const SEG = { tutti: 'Tutti', attivi: 'Regolari', rischio: 'A rischio', inattivi: 'In pausa', prova: 'In prova', scadenza: 'In scadenza', illim: 'Illimitati', pagare: 'Da pagare', dati: 'Dati da completare', nofoto: 'No foto' } as const;
type Segmento = keyof typeof SEG;
const FONTI = ['Instagram', 'Passaparola', 'Google', 'Volantino', 'Evento', 'Altro'];

const VUOTA = { nome: '', cognome: '', telefono: '', email: '', dataNascita: '', fonte: '', informativaPresa: false, consensoNovita: false, pacchetto: '', incassato: false };

export type DaContatto = { nome: string; cognome: string; telefono: string; fonte: string };

export function Allievi({ studio, puoIncassare, api = reale, apiPren = realePren, selezioneIniziale = null, daContatto = null, onIscritto }: { studio: StudioId; puoIncassare: boolean; api?: ApiPersone; apiPren?: typeof realePren; selezioneIniziale?: string | null; daContatto?: DaContatto | null; onIscritto?: (personaId: string) => void }) {
  const [elenco, setElenco] = useState<Scheda[] | null>(null);
  const [acquisti, setAcquisti] = useState<Map<string, Acquisto[]>>(new Map());
  const [registro, setRegistro] = useState<Map<string, VoceRegistro[]>>(new Map());
  const [pren, setPren] = useState<Prenotazione[]>([]);
  const [errore, setErrore] = useState(false);
  const [q, setQ] = useState('');
  const [seg, setSeg] = useState<Segmento>('tutti');
  const [sel, setSel] = useState<string | null>(selezioneIniziale ?? (daContatto ? 'nuova' : null)); // id, oppure 'nuova'

  const carica = useCallback(async () => {
    const [p, ar, pr] = await Promise.all([api.elencaPersone(studio), api.elencaAcquistiERegistro(studio), apiPren.elencaPrenotazioni(studio, aggiungiGiorni(oggi(), -400), aggiungiGiorni(oggi(), 14))]);
    if (p === null || ar === null || pr === null) return setErrore(true);
    setPren(pr);
    setErrore(false);
    setElenco(p);
    setAcquisti(ar.acquisti);
    setRegistro(ar.registro);
  }, [api, apiPren, studio]);

  useEffect(() => {
    void carica();
  }, [carica]);

  const giorno = oggi();
  const frequenza = useMemo(() => {
    const m = new Map<string, { fatte: number; ultima: string | null; stato: StatoAllievo }>();
    for (const s of elenco ?? []) {
      const sue = pren.filter((x) => x.personId === s.persona.id);
      const fatte = lezioniFatte(sue, giorno);
      const ultima = ultimaLezione(sue, giorno);
      m.set(s.persona.id, { fatte: fatte.length, ultima, stato: statoAllievo(fatte.length, s.persona.iscrittoIl, ultima, giorno) });
    }
    return m;
  }, [elenco, pren, giorno]);
  const segmenti = useMemo(() => {
    const tutti = elenco ?? [];
    const f: Record<Segmento, Scheda[]> = {
      tutti,
      attivi: tutti.filter((s) => ['Regolare', 'Nuovo ingresso'].includes(frequenza.get(s.persona.id)?.stato ?? '')),
      rischio: tutti.filter((s) => frequenza.get(s.persona.id)?.stato === 'A rischio'),
      inattivi: tutti.filter((s) => frequenza.get(s.persona.id)?.stato === 'In pausa'),
      prova: tutti.filter((s) => frequenza.get(s.persona.id)?.stato === 'In prova'),
      scadenza: tutti.filter((s) => inScadenza(s.persona, acquisti.get(s.persona.id) ?? [], registro.get(s.persona.id) ?? [], giorno)),
      illim: tutti.filter((s) => s.persona.creditiIllimitati),
      pagare: tutti.filter((s) => s.daIncassareCent > 0),
      dati: tutti.filter((s) => datiMancanti(s.persona).length > 0),
      nofoto: tutti.filter((s) => s.persona.consensoFoto !== 'si'),
    };
    return f;
  }, [elenco, acquisti, registro, giorno, frequenza]);

  if (errore) return <p className="muted">Non riesco a caricare gli allievi. Riprova tra poco.</p>;
  if (elenco === null) return <p className="muted">Carico gli allievi…</p>;

  const qq = q.trim().toLowerCase();
  const lista = segmenti[seg]
    .filter((s) => !qq || nomeCompleto(s.persona).toLowerCase().includes(qq))
    .sort((a, b) => nomeCompleto(a.persona).localeCompare(nomeCompleto(b.persona)));
  const selezionata = elenco.find((s) => s.persona.id === sel) ?? null;
  const indice = (id: string) => elenco.findIndex((s) => s.persona.id === id);
  const colori = COLORI_AVATAR[studio];

  return (
    <>
      <p className="eyebrow">Allievi</p>
      <h1>La vostra <em>{COMUNITA[studio]}</em>, {elenco.length} {elenco.length === 1 ? 'persona' : 'persone'}.</h1>
      <div className={`crm ${sel !== null ? 'has-sel' : ''}`}>
        <div className="crm-l">
          <button type="button" className="btn wide np-btn" onClick={() => setSel('nuova')}>+ Nuova persona</button>
          <input id="sq" className="sq" placeholder="Cerca per nome" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="chips seg-c">
            {(Object.keys(SEG) as Segmento[]).map((k) => (
              <Chip key={k} acceso={seg === k} onClick={() => setSeg(k)}>
                {SEG[k]} <small>{segmenti[k].length}</small>
              </Chip>
            ))}
          </div>
          <div id="crm-list" className="al-list">
            {lista.length === 0 && <p className="muted pad">{elenco.length === 0 ? 'Nessuna persona per ora. Aggiungi chi si iscrive con "Nuova persona".' : 'Nessun risultato.'}</p>}
            {lista.map((s) => {
              const p = s.persona;
              return (
                <button type="button" key={p.id} className={`al ${sel === p.id ? 'on' : ''}`} onClick={() => setSel(p.id)}>
                  <span className="av s" style={{ background: colori[indice(p.id) % colori.length] }}>{iniziale(p.nome)}</span>
                  <span className="al-m">
                    <b>{nomeCompleto(p)}</b>
                    <small>
                      {frequenza.get(p.id)?.ultima ? `Ultima lezione ${ago(giorniDal(frequenza.get(p.id)?.ultima as string, giorno))} · ` : ''}{p.creditiIllimitati ? '∞' : saldo(registro.get(p.id) ?? [])} crediti
                      {s.daIncassareCent > 0 && <> · <i className="due-b">{euro(s.daIncassareCent)} da pagare</i></>}
                    </small>
                  </span>
                  {frequenza.get(p.id) && <em className="st" style={{ ['--c' as string]: COLORE_STATO[frequenza.get(p.id)?.stato as StatoAllievo] }}>{frequenza.get(p.id)?.stato}</em>}
                </button>
              );
            })}
          </div>
        </div>
        <div className="crm-r" id="crm-r">
          {sel !== null && (
            <div className="subbar selback">
              <button type="button" className="roundback" aria-label="Torna agli allievi" onClick={() => setSel(null)}>‹</button>
              <span>Allievi</span>
            </div>
          )}
          {sel === null && (
            <div className="empty"><span className="sun"></span><p>Scegli una persona per vedere la sua scheda.</p></div>
          )}
          {sel === 'nuova' && (
            <FormNuova studio={studio} api={api} puoIncassare={puoIncassare} iniziale={daContatto} onFatto={async (id) => { onIscritto?.(id); await carica(); setSel(id); }} />
          )}
          {selezionata && (
            <SchedaPersona
              key={selezionata.persona.id}
              scheda={selezionata}
              colore={colori[indice(selezionata.persona.id) % colori.length]}
              frequenza={frequenza.get(selezionata.persona.id) ?? null}
              studio={studio}
              api={api}
              puoIncassare={puoIncassare}
              onCambiato={carica}
            />
          )}
        </div>
      </div>
    </>
  );
}

function FormNuova({ studio, api, puoIncassare, iniziale, onFatto }: { studio: StudioId; api: ApiPersone; puoIncassare: boolean; iniziale: DaContatto | null; onFatto: (id: string) => Promise<void> }) {
  const [f, setF] = useState({ ...VUOTA, ...(iniziale ?? {}) });
  const [pacchetti, setPacchetti] = useState<Pacchetto[]>([]);
  const [errore, setErrore] = useState('');
  const [occupato, setOccupato] = useState(false);
  useEffect(() => {
    void api.elencaPacchetti(studio).then(setPacchetti);
  }, [api, studio]);
  const pk = pacchetti.find((x) => x.id === f.pacchetto);

  async function salva() {
    if (f.nome.trim() === '') return setErrore('Scrivi almeno il nome.');
    if (f.telefono.trim() === '' || !telefonoValido(f.telefono)) return setErrore('Il telefono è obbligatorio e deve essere completo.');
    setErrore('');
    setOccupato(true);
    const esito = await api.creaPersona(studio, f);
    if (!esito.ok) {
      setOccupato(false);
      return setErrore(esito.motivo);
    }
    if (pk && puoIncassare) {
      await api.vendiPacchetto(studio, esito.id, pk);
      if (f.incassato) {
        const d = await api.dettaglioPersona(studio, esito.id);
        const a = d?.acquisti[0];
        if (a) await api.segnaIncassato(a.id);
      }
    }
    setOccupato(false);
    await onFatto(esito.id);
  }

  return (
    <>
      <h2 className="sc-t">Nuova persona</h2>
      <p className="muted">Crea il profilo della persona.</p>
      <label className="nl">Nome<input value={f.nome} onChange={(e) => setF({ ...f, nome: maiuscoleScrivendo(e.target.value) })} autoCapitalize="words" placeholder="Nome" /></label>
      <label className="nl">Cognome<input value={f.cognome} onChange={(e) => setF({ ...f, cognome: maiuscoleScrivendo(e.target.value) })} autoCapitalize="words" placeholder="Cognome" /></label>
      <label className="nl">Telefono (obbligatorio)<input type="tel" value={f.telefono} onChange={(e) => setF({ ...f, telefono: e.target.value })} placeholder="Per avvisi e per chiamarla" /></label>
      <label className="nl">Email (facoltativa)<input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="Se ce l'ha" /></label>
      <label className="nl">Data di nascita<input type="date" value={f.dataNascita} onChange={(e) => setF({ ...f, dataNascita: e.target.value })} /></label>
      <p className="eyebrow" style={{ marginTop: 14 }}>Come ci ha conosciuto</p>
      <div className="chips">{FONTI.map((x) => <Chip key={x} acceso={f.fonte === x} onClick={() => setF({ ...f, fonte: x })}>{x}</Chip>)}</div>
      <label className="chk-l" style={{ marginTop: 14 }}><input type="checkbox" checked={f.informativaPresa} onChange={(e) => setF({ ...f, informativaPresa: e.target.checked })} /><span>Ha letto l'informativa sulla privacy (la consegni tu in studio).</span></label>
      <label className="chk-l"><input type="checkbox" checked={f.consensoNovita} onChange={(e) => setF({ ...f, consensoNovita: e.target.checked })} /><span>Vuole ricevere novità ed eventi (facoltativo).</span></label>
      {puoIncassare && (
        <>
          <p className="eyebrow" style={{ marginTop: 18 }}>Pacchetto</p>
          <div className="chips">
            <Chip acceso={f.pacchetto === ''} onClick={() => setF({ ...f, pacchetto: '' })}>Nessun pacchetto</Chip>
            {pacchetti.map((x) => <Chip key={x.id} acceso={f.pacchetto === x.id} onClick={() => setF({ ...f, pacchetto: x.id })}>{x.nome}</Chip>)}
          </div>
          {pk && (
            <>
              <p className="eyebrow" style={{ marginTop: 14 }}>Pagamento · {euro(pk.prezzoCent)}</p>
              <div className="chips">
                <Chip acceso={f.incassato} onClick={() => setF({ ...f, incassato: true })}>Già incassato</Chip>
                <Chip acceso={!f.incassato} onClick={() => setF({ ...f, incassato: false })}>Da pagare in studio</Chip>
              </div>
            </>
          )}
        </>
      )}
      {errore && <p className="note" role="alert">{errore}</p>}
      <button type="button" className="btn wide" style={{ marginTop: 20 }} disabled={occupato} onClick={() => void salva()}>Crea persona</button>
    </>
  );
}

function SchedaPersona({
  scheda, colore, frequenza, studio, api, puoIncassare, onCambiato,
}: { scheda: Scheda; colore: string; frequenza: { fatte: number; ultima: string | null; stato: StatoAllievo } | null; studio: StudioId; api: ApiPersone; puoIncassare: boolean; onCambiato: () => Promise<void> }) {
  const p = scheda.persona;
  const [d, setD] = useState<DettaglioPersona | null>(null);
  const [pacchetti, setPacchetti] = useState<Pacchetto[]>([]);
  const [modifica, setModifica] = useState(false);
  const [dati, setDati] = useState({ nome: p.nome, cognome: p.cognome ?? '', telefono: p.telefono ?? '', email: p.email ?? '', dataNascita: p.dataNascita ?? '', fonte: p.fonte ?? '' });
  const [nota, setNota] = useState('');
  const [tag, setTag] = useState('');
  const [correzione, setCorrezione] = useState({ quanti: '', motivo: '' });
  const [msg, setMsg] = useState('');
  const [occupato, setOccupato] = useState(false);
  const giorno = oggi();

  const ricarica = useCallback(async () => setD(await api.dettaglioPersona(studio, p.id)), [api, studio, p.id]);
  useEffect(() => {
    void ricarica();
    void api.elencaPacchetti(studio).then(setPacchetti);
  }, [api, ricarica, studio]);

  async function esegui(azione: () => Promise<Esito>, dopo?: () => void) {
    setOccupato(true);
    const esito = await azione();
    setOccupato(false);
    if (!esito.ok) return setMsg(esito.motivo);
    setMsg('');
    dopo?.();
    await ricarica();
    await onCambiato();
  }

  const acquisti = d?.acquisti ?? [];
  const reg = d?.registro ?? [];
  const mancanti = datiMancanti(p);
  const numero = p.telefono ? numeroWhatsApp(p.telefono) : '';
  const messaggio = (motivo: MotivoMessaggio, extra: { mancanti?: string[] } = {}) => testoMessaggio(motivo, { nome: nomeCompleto(p), comunita: studio === 'tribu' ? 'tribù' : 'Pozzo', ...extra });
  const scad = d ? prossimaScadenza(acquisti, reg) : null;
  const crediti = d ? saldo(reg) : scheda.saldo;
  const daPagare = acquisti.filter((a) => !a.incassato);
  const salute = (d?.note ?? []).filter((n) => n.tipo === 'salute');
  const generiche = (d?.note ?? []).filter((n) => n.tipo !== 'salute');

  return (
    <>
      <div className="sc-h">
        <span className="av big" style={{ background: colore }}>{iniziale(p.nome)}</span>
        <div>
          <h2>{nomeCompleto(p)}</h2>
          <div className="chips">
            {frequenza && <em className="st" style={{ ['--c' as string]: COLORE_STATO[frequenza.stato] }}>{frequenza.stato}</em>}
            {p.tag.map((t) => (
              <span className="tg" key={t}>{t}<button type="button" aria-label="Togli" onClick={() => void esegui(() => api.aggiornaPersona(p.id, { tag: p.tag.filter((x) => x !== t) }))}>×</button></span>
            ))}
          </div>
        </div>
      </div>

      <div className="sc-act">
        {numero && <a className="btn sm" href={linkWhatsApp(numero, '')} target="_blank" rel="noreferrer">Scrivi su WhatsApp</a>}
        {p.email && <a className="btn sm ghost" href={`mailto:${p.email}`}>Email</a>}
      </div>

      <div className="sc-grid">
        <div className="tile"><b>{frequenza?.fatte ?? 0}</b><span>lezioni totali</span></div>
        <div className="tile"><b>{frequenza?.ultima ? (giorniDal(frequenza.ultima, giorno) <= 0 ? 'Oggi' : `${giorniDal(frequenza.ultima, giorno)}g`) : '–'}</b><span>ultima lezione</span></div>
        <div className="tile">
          {p.creditiIllimitati ? <b className="inf">∞</b> : (
            <div className="adj big">
              <button type="button" disabled={!puoIncassare || occupato} onClick={() => void esegui(() => api.correggiCrediti(studio, p.id, -1, 'Correzione dello studio: -1'))}>−</button>
              <b>{crediti}</b>
              <button type="button" disabled={!puoIncassare || occupato} onClick={() => void esegui(() => api.correggiCrediti(studio, p.id, 1, 'Correzione dello studio: +1'))}>+</button>
            </div>
          )}
          <span>crediti</span>
        </div>
        <div className="tile">
          <b>{p.creditiIllimitati ? '∞' : scad ? `${giorniAllaScadenza(scad, giorno)}g` : '–'}</b>
          <span>{p.creditiIllimitati ? 'nessuna scadenza' : scad ? 'alla scadenza' : 'senza scadenza'}</span>
        </div>
      </div>

      {mancanti.length > 0 && (
        <section className="card sc-miss">
          <p className="eyebrow">Dati da completare</p>
          <p>Mancano: <b>{mancanti.join(', ')}</b>.</p>
          <div className="pv-b" style={{ marginTop: 10 }}>
            {numero && <a className="btn sm ghost" href={linkWhatsApp(numero, messaggio('dati', { mancanti }))} target="_blank" rel="noreferrer">Chiedi alla persona</a>}
            <button type="button" className="btn sm ghost" onClick={() => setModifica(true)}>Inserisci ora</button>
          </div>
        </section>
      )}

      {puoIncassare && (
        <section className="card sc-imp">
          <p className="eyebrow">Impostazioni</p>
          <div className="set">
            <div><b>Crediti illimitati</b><small>Prenota senza scalare crediti e senza scadenza.</small></div>
            <button type="button" className={`sw ${p.creditiIllimitati ? 'on' : ''}`} role="switch" aria-checked={p.creditiIllimitati} onClick={() => void esegui(() => api.aggiornaPersona(p.id, { creditiIllimitati: !p.creditiIllimitati }))}><i></i></button>
          </div>
        </section>
      )}

      {daPagare.length > 0 && (
        <div className="sc-pay">
          <b>{euro(daPagare.reduce((s, a) => s + a.prezzoCent, 0))} da incassare</b>
          {daPagare.map((a) => (
            <div className="cash-r" key={a.id}>
              <div className="lez-main"><b>{a.nome}</b><span>{euro(a.prezzoCent)}</span></div>
              <div className="chips">
                {puoIncassare
                  ? <button type="button" className="btn sm ghost" disabled={occupato} onClick={() => void esegui(() => api.segnaIncassato(a.id))}>Segna incassato</button>
                  : <span className="muted small">Lo incassa l'amministrazione.</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="two sc-two">
        <div className="sc-col">
          <section className="card">
            <p className="eyebrow">Contatti</p>
            {!modifica ? (
              <>
                <dl className="kv">
                  <dt>Telefono</dt><dd>{p.telefono ?? <button type="button" className="kvb manca" onClick={() => setModifica(true)}>Manca</button>}</dd>
                  <dt>Email</dt><dd>{p.email ?? '–'}</dd>
                  <dt>Data di nascita</dt>
                  <dd>{p.dataNascita ? `${fdate(p.dataNascita)} · ${eta(p.dataNascita, giorno)} anni` : <button type="button" className="kvb manca" onClick={() => setModifica(true)}>Manca</button>}</dd>
                </dl>
                <button type="button" className="btn sm ghost" onClick={() => setModifica(true)} style={{ marginTop: 12 }}>Modifica dati</button>
              </>
            ) : (
              <>
                <label className="nl">Nome<input value={dati.nome} onChange={(e) => setDati({ ...dati, nome: maiuscoleScrivendo(e.target.value) })} /></label>
                <label className="nl">Cognome<input value={dati.cognome} onChange={(e) => setDati({ ...dati, cognome: maiuscoleScrivendo(e.target.value) })} /></label>
                <label className="nl">Telefono<input type="tel" value={dati.telefono} onChange={(e) => setDati({ ...dati, telefono: e.target.value })} /></label>
                <label className="nl">Email<input type="email" value={dati.email} onChange={(e) => setDati({ ...dati, email: e.target.value })} /></label>
                <label className="nl">Data di nascita<input type="date" value={dati.dataNascita} onChange={(e) => setDati({ ...dati, dataNascita: e.target.value })} /></label>
                <label className="nl">Ci ha conosciuto da<input value={dati.fonte} onChange={(e) => setDati({ ...dati, fonte: e.target.value })} /></label>
                <div className="nt-act" style={{ marginTop: 12 }}>
                  <button type="button" className="btn sm" disabled={occupato} onClick={() => {
                    if (dati.telefono.trim() !== '' && !telefonoValido(dati.telefono)) return setMsg('Il telefono sembra incompleto.');
                    void esegui(() => api.aggiornaPersona(p.id, dati), () => setModifica(false));
                  }}>Salva</button>
                  <button type="button" className="btn sm ghost" onClick={() => setModifica(false)}>Annulla</button>
                </div>
              </>
            )}
          </section>

          <section className="card">
            <p className="eyebrow">Iscrizione</p>
            <dl className="kv">
              <dt>Iscrizione</dt><dd>{fdate(p.iscrittoIl)}</dd>
              <dt>Foto e video</dt><dd>{p.consensoFoto === 'si' ? 'Va bene' : p.consensoFoto === 'no' ? 'No foto' : 'Da chiedere'}</dd>
              <dt>Ci ha conosciuto da</dt><dd>{p.fonte ?? <button type="button" className="kvb manca" onClick={() => setModifica(true)}>Manca</button>}</dd>
              <dt>Informativa privacy</dt>
              <dd>{p.informativaPresa ? 'Presa visione' : <button type="button" className="kvb manca" onClick={() => void esegui(() => api.aggiornaPersona(p.id, { informativaPresa: true }))}>Da far firmare</button>}</dd>
              <dt>Comunicazioni</dt><dd>{p.consensoNovita ? 'Sì' : 'No'}</dd>
            </dl>
            <div className="nt-act" style={{ marginTop: 12 }}>
              <button type="button" className="btn sm ghost" onClick={() => void esegui(() => api.aggiornaPersona(p.id, { consensoNovita: !p.consensoNovita }))}>{p.consensoNovita ? 'Non vuole più novità' : 'Accetta le novità'}</button>
              <button type="button" className="btn sm ghost" onClick={() => void esegui(() => api.aggiornaPersona(p.id, { consensoFoto: p.consensoFoto === 'si' ? 'no' : 'si' }))}>{p.consensoFoto === 'si' ? 'Ritira il consenso foto' : 'Consenso foto: va bene'}</button>
            </div>
          </section>

          {puoIncassare && (
            <section className="card">
              <p className="eyebrow">Pacchetti</p>
              {acquisti.length === 0 && <p className="muted small">Nessun pacchetto acquistato.</p>}
              {acquisti.map((a) => (
                <p key={a.id} className="muted small" style={{ margin: '0 0 6px' }}>
                  <b>{a.nome}</b> · {euro(a.prezzoCent)} · {a.scadeIl ? `scade il ${fdate(a.scadeIl)}` : 'senza scadenza'} · {a.incassato ? 'incassato' : 'da incassare'}
                </p>
              ))}
              <p className="eyebrow" style={{ marginTop: 14 }}>Aggiungi un pacchetto</p>
              <div className="chips">{pacchetti.map((k) => <button type="button" key={k.id} className="chip" disabled={occupato} onClick={() => void esegui(() => api.vendiPacchetto(studio, p.id, k))}>+ {k.nome} · {euro(k.prezzoCent)}</button>)}</div>
              <p className="eyebrow" style={{ marginTop: 14 }}>Correggi i crediti</p>
              <label className="nl">Quanti (per esempio 1 o -1)<input inputMode="numeric" value={correzione.quanti} onChange={(e) => setCorrezione({ ...correzione, quanti: e.target.value })} /></label>
              <label className="nl">Motivo<input value={correzione.motivo} onChange={(e) => setCorrezione({ ...correzione, motivo: e.target.value })} /></label>
              <button type="button" className="btn sm ghost" style={{ marginTop: 12 }} disabled={occupato} onClick={() => void esegui(() => api.correggiCrediti(studio, p.id, Number.parseInt(correzione.quanti, 10) || 0, correzione.motivo), () => setCorrezione({ quanti: '', motivo: '' }))}>Conferma</button>
            </section>
          )}

          <section className="card">
            <p className="eyebrow">Tag</p>
            <div className="chips">
              {['Infortunio', 'Gravidanza', 'Lezioni private', 'Over 60', 'Schiena', 'Cervicali'].filter((t) => !p.tag.includes(t)).map((t) => (
                <button type="button" key={t} className="chip" onClick={() => void esegui(() => api.aggiornaPersona(p.id, { tag: [...p.tag, t] }))}>+ {t}</button>
              ))}
            </div>
            <div className="nt-new">
              <input id="tg-new" className="sq" placeholder="Nuovo tag" value={tag} onChange={(e) => setTag(e.target.value)} />
              <button type="button" className="btn sm ghost" disabled={tag.trim() === '' || p.tag.includes(tag.trim())} onClick={() => void esegui(() => api.aggiornaPersona(p.id, { tag: [...p.tag, tag.trim()] }), () => setTag(''))}>Aggiungi</button>
            </div>
            <p className="muted small" style={{ marginTop: 8 }}>I tag servono anche per scegliere a chi mandare un avviso.</p>
          </section>
        </div>

        <div className="sc-col">
          <section className="card">
            <p className="eyebrow">Salute e note</p>
            <p className="muted small" style={{ margin: '0 0 10px' }}>Solo gli insegnanti vedono questa parte.</p>
            {salute.map((n) => <div className="nt salute" key={n.id}><small>Salute · {fdate(n.creatoIl)}</small><p>{n.testo}</p></div>)}
            {generiche.map((n) => <div className="nt" key={n.id}><small>Nota · {fdate(n.creatoIl)}</small><p>{n.testo}</p></div>)}
            <textarea id="nt-txt" rows={2} placeholder="Aggiungi una nota" value={nota} onChange={(e) => setNota(e.target.value)}></textarea>
            <div className="nt-act">
              <button type="button" className="btn sm" disabled={nota.trim() === '' || occupato} onClick={() => void esegui(() => api.aggiungiNota(studio, p.id, 'nota', nota), () => setNota(''))}>Aggiungi nota</button>
              <button type="button" className="btn sm ghost" disabled={nota.trim() === '' || occupato} onClick={() => void esegui(() => api.aggiungiNota(studio, p.id, 'salute', nota), () => setNota(''))}>Segna come salute</button>
            </div>
          </section>
        </div>
      </div>

      <section className="card sc-att">
        <p className="eyebrow">Attività</p>
        <div className="ai-l">
          <div className="ai"><span className="ai-i iscr"><Icona nome="user" /></span><b>Iscrizione</b><small>{quandoRel(p.iscrittoIl, giorno)}</small></div>
        </div>
      </section>
      {msg && <p className="note" role="alert">{msg}</p>}
    </>
  );
}
