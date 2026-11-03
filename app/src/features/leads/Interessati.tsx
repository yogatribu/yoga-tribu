import { useCallback, useEffect, useRef, useState } from 'react';
import { Chip } from '@/design/Chip';
import { Conferma } from '@/design/Conferma';
import { Modale } from '@/design/Modale';
import { TESTI_STUDIO, type StudioId } from '@/config/tema';
import * as realeImpostazioni from '@/data/impostazioni';
import * as reale from '@/data/leads';
import * as realePersone from '@/data/persone';
import * as realeProgramma from '@/data/programma';
import type { Contatto, EventoContatto, NuovoContatto } from '@/data/leads';
import { aggiungiGiorni, giornoDellaSettimana, oggi } from '@/domain/date';
import { fdate, quandoRel } from '@/domain/formati';
import { leggiElenco, type Esistente, type RigaImportata } from '@/domain/importa';
import { maiuscoleScrivendo, type CampoContatto } from '@/domain/impostazioni';
import {
  daAvvisare, daRichiamare, MOTIVI_CHIUSURA, NOME_MOTIVO, NOME_RIMANDO, numeroWhatsApp, PROMEMORIA_PREDEFINITI, PROMEMORIA_TESTI,
  telefonoValido, testoMessaggioLead, tipoMessaggioLead, ultimoMessaggio,
  type Fase, type MessaggioLead, type MotivoChiusura, type Promemoria, type Rimando, type TipoMessaggioLead,
} from '@/domain/leads';
import { linkWhatsApp } from '@/domain/messaggi';
import { lezioniDelGiorno, NOME_GIORNO, type Blocco, type Modello } from '@/domain/programma';
import { nomeCompleto } from '@/domain/persone';

// Stesso markup e stesse classi di studioInteressati() / leadCard() / leadNuovo() / leadProva() / leadComposer() / leadImporta() del prototipo.
export type ApiLeads = typeof reale;

// Le fasi come le chiama il prototipo (LEAD_FASI).
const TAB: [Fase, string][] = [['interessato', 'Interessati'], ['prova_fissata', 'Prova fissata'], ['prova_fatta', 'Prova fatta'], ['iscritto', 'Iscritti'], ['non_prosegue', 'Non proseguono']];
const FONTI = ['Instagram', 'Passaparola', 'Google', 'Volantino', 'Evento', 'Altro'];
const STILI = ['Iyengar', 'Ashtanga', 'Vinyasa', 'Kundalini', 'Teen Yoga', 'Non lo so'];

type Finestra =
  | { tipo: 'nuovo' }
  | { tipo: 'importa' }
  | { tipo: 'scheda' | 'motivo' | 'rimanda' | 'prova' | 'assente' | 'risposta'; contatto: Contatto }
  | { tipo: 'compositore'; contatto: Contatto; messaggio: TipoMessaggioLead }
  | null;

export function Interessati({
  studio, onIscrivi, onApriProfilo, eResponsabile = false, api = reale, apiCampi = realeImpostazioni, apiProgramma = realeProgramma, apiPersone = realePersone,
}: {
  studio: StudioId;
  onIscrivi?: (c: Contatto) => void;
  onApriProfilo?: (personaId: string) => void;
  eResponsabile?: boolean;
  api?: ApiLeads;
  apiCampi?: typeof realeImpostazioni;
  apiProgramma?: typeof realeProgramma;
  apiPersone?: typeof realePersone;
}) {
  const [contatti, setContatti] = useState<Contatto[] | null>(null);
  const [messaggi, setMessaggi] = useState<Map<string, MessaggioLead[]>>(new Map());
  const [promemoria, setPromemoria] = useState<Promemoria>(PROMEMORIA_PREDEFINITI);
  const [errore, setErrore] = useState(false);
  const [fase, setFase] = useState<Fase>('interessato');
  const [finestra, setFinestra] = useState<Finestra>(null);
  const [msg, setMsg] = useState('');
  const ultimi = useRef<Contatto[]>([]);

  const carica = useCallback(async () => {
    const [elenco, m, p] = await Promise.all([api.elencaContatti(studio), api.elencaMessaggi(studio), apiCampi.leggiPromemoria(studio)]);
    setErrore(elenco === null);
    setContatti(elenco);
    ultimi.current = elenco ?? [];
    setMessaggi(m);
    setPromemoria(p);
  }, [api, apiCampi, studio]);

  useEffect(() => {
    void carica();
  }, [carica]);

  async function esegui(azione: () => Promise<{ ok: true } | { ok: false; motivo: string }>, dopo?: () => void) {
    const esito = await azione();
    if (!esito.ok) return setMsg(esito.motivo);
    setMsg('');
    dopo?.();
    await carica();
  }

  if (errore) return <p className="muted">Non riesco a caricare i contatti. Riprova tra poco.</p>;
  if (contatti === null) return <p className="muted">Carico i contatti…</p>;

  const giorno = oggi();
  const testi = TESTI_STUDIO[studio];
  const per = (f: Fase) => contatti.filter((c) => c.fase === f);
  const ordina: Record<Fase, (a: Contatto, b: Contatto) => number> = {
    interessato: (a, b) => Number(daRichiamare(b, giorno)) - Number(daRichiamare(a, giorno)) || b.creatoIl.localeCompare(a.creatoIl),
    prova_fissata: (a, b) => `${a.provaIl}${a.provaOra}`.localeCompare(`${b.provaIl}${b.provaOra}`),
    prova_fatta: (a, b) => (a.richiamoIl ?? '9').localeCompare(b.richiamoIl ?? '9'),
    iscritto: (a, b) => b.creatoIl.localeCompare(a.creatoIl),
    non_prosegue: (a, b) => b.creatoIl.localeCompare(a.creatoIl),
  };
  const lista = per(fase).sort(ordina[fase]);
  const messaggio = (c: Contatto): TipoMessaggioLead => tipoMessaggioLead(c, daAvvisare(c, giorno, promemoria), (messaggi.get(c.id) ?? []).some((m) => m.tipo === 'messaggio_inviato'));
  const scrivi = (c: Contatto, tipo?: TipoMessaggioLead) => setFinestra({ tipo: 'compositore', contatto: c, messaggio: tipo ?? messaggio(c) });

  return (
    <>
      <p className="eyebrow">Interessati</p>
      <h1>Chi ci ha <em>scritto</em>, prima di iscriversi.</h1>
      <p className="studio-date">Segna ogni contatto e ogni prova, anche se non ha ancora l'app. Ti ricordiamo chi richiamare.</p>
      <div className="lf">
        {TAB.map(([k, t]) => (
          <button type="button" key={k} className={fase === k ? 'on' : ''} onClick={() => setFase(k)}>
            <b>{per(k).length}</b><span>{t}</span>
          </button>
        ))}
      </div>
      <div className="lf-act">
        <button type="button" className="btn" onClick={() => setFinestra({ tipo: 'nuovo' })}>+ Nuovo contatto</button>
        <button type="button" className="btn ghost" onClick={() => setFinestra({ tipo: 'importa' })}>Importa contatti</button>
      </div>
      <details className="pl-evd">
        <summary>Cosa ti ricordiamo in automatico</summary>
        <div style={{ marginTop: 6 }}>
          {PROMEMORIA_TESTI.map(([k, t, d]) => (
            <div className="set" key={k}>
              <div><b>{t}</b><small>{d}</small></div>
              <button type="button" className={`sw ${promemoria[k] ? 'on' : ''}`} role="switch" aria-checked={promemoria[k]} disabled={!eResponsabile}
                onClick={() => void esegui(() => apiCampi.salvaPromemoria(studio, { ...promemoria, [k]: !promemoria[k] }))}><i></i></button>
            </div>
          ))}
        </div>
        <p className="muted small" style={{ marginTop: 10 }}>I promemoria compaiono in Home e qui. Il messaggio è già scritto: lo controlli e lo invii con un tocco.{eResponsabile ? '' : ' Li cambia chi gestisce lo studio.'}</p>
      </details>
      <div className="lead-l">
        {lista.length === 0 && <p className="muted">Nessuno in questa fase.</p>}
        {lista.map((c) => {
          const due = daRichiamare(c, giorno) && (c.fase === 'interessato' || c.fase === 'prova_fatta');
          const avv = daAvvisare(c, giorno, promemoria);
          const sub = [c.fonte, c.cerca, `scritto ${quandoRel(c.creatoIl, giorno)}`].filter(Boolean).join(' · ');
          const prova = c.provaIl && c.fase === 'prova_fissata'
            ? <small>Prova: {fdate(c.provaIl)} · {c.provaOra} · {c.provaTipo}</small>
            : c.provaIl && c.fase === 'prova_fatta' ? <small>Prova fatta {quandoRel(c.provaIl, giorno)}</small> : null;
          const b = (testo: string, azione: () => void, primario = false) => (
            <button type="button" className={`btn sm ${primario ? '' : 'ghost'}`} onClick={azione}>{testo}</button>
          );
          const segue = ['interessato', 'prova_fissata', 'prova_fatta'].includes(c.fase);
          return (
            <div className="pv-c" key={c.id}>
              <div className="al-m">
                <b>{c.nome} {due && <em className="st" style={{ ['--c' as string]: '#c95a4a' }}>Da richiamare</em>}{avv && <em className="st" style={{ ['--c' as string]: '#b8841f' }}>Da avvisare</em>}</b>
                <small>{sub}</small>
                {prova}
                {c.fase === 'non_prosegue' && <small>Motivo: {c.motivoChiusura ? NOME_MOTIVO[c.motivoChiusura] : '–'}{c.assenze ? ' · assente alla prova' : ''}</small>}
                <small>{c.telefono ?? 'Senza numero'}</small>
                {segue && <small>{ultimoMessaggio(messaggi.get(c.id) ?? [], c.fase, (iso) => quandoRel(iso, giorno))}</small>}
                {c.nota && <small className="pv-n">“{c.nota}”</small>}
              </div>
              <div className="pv-b">
                {c.fase === 'interessato' && <>{b('Fissa la prova', () => setFinestra({ tipo: 'prova', contatto: c }))}{b('Scrivi', () => scrivi(c))}{due && b('Rimanda', () => setFinestra({ tipo: 'rimanda', contatto: c }))}{b('Non prosegue', () => setFinestra({ tipo: 'motivo', contatto: c }))}</>}
                {c.fase === 'prova_fissata' && <>{avv && b('Manda il promemoria', () => scrivi(c, 'promemoria'), true)}{b('Prova fatta', () => void esegui(() => api.cambiaFase(c, 'prova_fatta', undefined, promemoria), () => setFase('prova_fatta')))}{b('Assente', () => setFinestra({ tipo: 'assente', contatto: c }))}{b('Sposta', () => setFinestra({ tipo: 'prova', contatto: c }))}{b('Scrivi', () => scrivi(c))}</>}
                {c.fase === 'prova_fatta' && <>{b('Iscrivi', () => (onIscrivi ? onIscrivi(c) : void esegui(() => api.cambiaFase(c, 'iscritto'))))}{b('Scrivi', () => scrivi(c))}{due && b('Rimanda', () => setFinestra({ tipo: 'rimanda', contatto: c }))}{b('Non prosegue', () => setFinestra({ tipo: 'motivo', contatto: c }))}</>}
                {c.fase === 'iscritto' && (c.personaId && onApriProfilo ? b('Apri il profilo', () => onApriProfilo(c.personaId as string)) : <span className="muted small">Iscrizione registrata</span>)}
                {c.fase === 'non_prosegue' && b('Riapri', () => void esegui(() => api.cambiaFase(c, 'interessato', undefined, promemoria), () => setFase('interessato')))}
                {b('Scheda', () => setFinestra({ tipo: 'scheda', contatto: c }))}
              </div>
            </div>
          );
        })}
      </div>
      {msg && <p className="note" role="alert">{msg}</p>}

      {finestra?.tipo === 'nuovo' && (
        <FormNuovo studio={studio} api={api} promemoria={promemoria}
          onChiudi={() => setFinestra(null)}
          onFatto={async (c, poi) => {
            setFinestra(null);
            setFase('interessato');
            await carica();
            if (poi === 'prova') setFinestra({ tipo: 'prova', contatto: c });
          }} />
      )}
      {finestra?.tipo === 'motivo' && (
        <Motivo contatto={finestra.contatto} onChiudi={() => setFinestra(null)} onConferma={(m) => void esegui(() => api.cambiaFase((finestra as { contatto: Contatto }).contatto, 'non_prosegue', m, promemoria), () => setFinestra(null))} />
      )}
      {finestra?.tipo === 'rimanda' && (
        <Modale riga="Interessati" titolo={`Quando richiamare ${finestra.contatto.nome.split(' ')[0]}?`} onChiudi={() => setFinestra(null)}>
          <div className="chips">
            {(Object.keys(NOME_RIMANDO) as Rimando[]).map((r) => (
              <button type="button" key={r} className="chip" onClick={() => void esegui(() => api.rimandaRichiamo((finestra as { contatto: Contatto }).contatto, r), () => setFinestra(null))}>{NOME_RIMANDO[r]}</button>
            ))}
          </div>
        </Modale>
      )}
      {finestra?.tipo === 'assente' && (
        <Conferma riga={testi.provaEtichetta} titolo="Segnare l'assenza?" testo={`Alla prova di ${finestra.contatto.nome.split(' ')[0]} non c'era nessuno. La prova torna da fissare e ti ricordiamo di richiamare domani.`} ok="Conferma"
          onAnnulla={() => setFinestra(null)}
          onOk={() => { const x = finestra.contatto; setFinestra(null); void esegui(() => api.segnaAssente(x, promemoria), () => setFase('interessato')); }} />
      )}
      {finestra?.tipo === 'prova' && (
        <Prova studio={studio} contatto={finestra.contatto} apiProgramma={apiProgramma} onChiudi={() => setFinestra(null)}
          onSalva={async (prova, poi) => {
            const x = finestra.contatto;
            const esito = await api.fissaProva(x, prova);
            if (!esito.ok) return setMsg(esito.motivo);
            setMsg('');
            setFinestra(null);
            setFase('prova_fissata');
            await carica();
            const aggiornato = ultimi.current.find((y) => y.id === x.id);
            if (poi === 'scrivi' && aggiornato) scrivi(aggiornato, 'conferma');
          }} />
      )}
      {finestra?.tipo === 'compositore' && (
        <CompositoreLead studio={studio} contatto={finestra.contatto} tipo={finestra.messaggio} giorno={giorno} haRisposto={(messaggi.get(finestra.contatto.id) ?? []).some((m) => m.tipo === 'risposta')}
          onChiudi={() => setFinestra(null)}
          onInviato={async (testo, telefono) => {
            const x = finestra.contatto;
            if (telefono) await api.salvaTelefono(x, telefono);
            await api.registraMessaggio(x, testo, finestra.messaggio === 'promemoria', promemoria);
            setFinestra(null);
            await carica();
          }} />
      )}
      {finestra?.tipo === 'risposta' && (
        <Risposta contatto={finestra.contatto} onChiudi={() => setFinestra(null)} onSalva={(t) => void esegui(() => api.registraRisposta((finestra as { contatto: Contatto }).contatto, t), () => setFinestra(null))} />
      )}
      {finestra?.tipo === 'importa' && (
        <Importa studio={studio} contatti={contatti} api={api} apiPersone={apiPersone} promemoria={promemoria} onChiudi={() => setFinestra(null)}
          onFatto={async (quanti) => { setFinestra(null); setFase('interessato'); setMsg(quanti === 1 ? '1 contatto aggiunto.' : `${quanti} contatti aggiunti.`); await carica(); }} />
      )}
      {finestra?.tipo === 'scheda' && (
        <Scheda contatto={finestra.contatto} messaggi={messaggi.get(finestra.contatto.id) ?? []} api={api} apiCampi={apiCampi} onChiudi={() => setFinestra(null)} onCambiato={carica}
          onScrivi={() => scrivi(finestra.contatto)} onRisposta={() => setFinestra({ tipo: 'risposta', contatto: finestra.contatto })} />
      )}
    </>
  );
}

function FormNuovo({ studio, api, promemoria, onChiudi, onFatto }: { studio: StudioId; api: ApiLeads; promemoria: Promemoria; onChiudi: () => void; onFatto: (c: Contatto, poi: 'prova' | 'solo') => Promise<void> }) {
  const [f, setF] = useState<NuovoContatto>({ nome: '', telefono: '', fonte: '', cerca: '', nota: '' });
  const [err, setErr] = useState('');
  async function salva(poi: 'prova' | 'solo') {
    if (f.nome.trim() === '') return setErr('Scrivi almeno il nome.');
    if (f.telefono.trim() !== '' && !telefonoValido(f.telefono)) return setErr('Il telefono sembra incompleto.');
    const esito = await api.creaContatto(studio, { ...f, fonte: f.fonte || 'Altro' }, promemoria);
    if (!esito.ok) return setErr(esito.motivo);
    await onFatto(esito.contatto, poi);
  }
  return (
    <Modale riga="Interessati" titolo="Nuovo contatto" onChiudi={onChiudi}>
      <label className="nl">Nome e cognome<input value={f.nome} onChange={(e) => setF({ ...f, nome: maiuscoleScrivendo(e.target.value) })} autoCapitalize="words" placeholder="Nome e cognome" /></label>
      <label className="nl">Telefono<input type="tel" value={f.telefono} onChange={(e) => setF({ ...f, telefono: e.target.value })} placeholder="Se ce l'hai" /></label>
      <p className="eyebrow" style={{ marginTop: 14 }}>Come ci ha trovato</p>
      <div className="chips">{FONTI.map((x) => <Chip key={x} acceso={f.fonte === x} onClick={() => setF({ ...f, fonte: x })}>{x}</Chip>)}</div>
      <p className="eyebrow" style={{ marginTop: 14 }}>Cosa cerca</p>
      <div className="chips">{STILI.map((x) => <Chip key={x} acceso={f.cerca === x} onClick={() => setF({ ...f, cerca: x })}>{x}</Chip>)}</div>
      <label className="nl" style={{ marginTop: 14 }}>Nota<input value={f.nota} onChange={(e) => setF({ ...f, nota: e.target.value })} placeholder="Per esempio: ha mal di schiena" /></label>
      {err && <p className="note" role="alert">{err}</p>}
      <div className="two-btn" style={{ gridTemplateColumns: '1fr', marginTop: 18 }}>
        <button type="button" className="btn" onClick={() => void salva('prova')}>Salva e fissa la prova</button>
        <button type="button" className="btn ghost" onClick={() => void salva('solo')}>Salva</button>
      </div>
    </Modale>
  );
}

function Motivo({ contatto, onChiudi, onConferma }: { contatto: Contatto; onChiudi: () => void; onConferma: (m: MotivoChiusura) => void }) {
  const [m, setM] = useState<MotivoChiusura | ''>('');
  return (
    <Modale riga="Interessati" titolo={`Perché non prosegue ${contatto.nome.split(' ')[0]}?`} onChiudi={onChiudi}>
      <p className="muted small">Il motivo ci aiuta a capire cosa migliorare.</p>
      <div className="chips">{MOTIVI_CHIUSURA.map((x) => <Chip key={x} acceso={m === x} onClick={() => setM(x)}>{NOME_MOTIVO[x]}</Chip>)}</div>
      <button type="button" className="btn wide" style={{ marginTop: 18 }} disabled={m === ''} onClick={() => m && onConferma(m)}>Conferma</button>
      <button type="button" className="btn ghost wide" style={{ marginTop: 10 }} onClick={onChiudi}>Annulla</button>
    </Modale>
  );
}

// Fissare (o spostare) la prova: il giorno, poi una lezione di quel giorno oppure un altro orario.
function Prova({ studio, contatto, apiProgramma, onChiudi, onSalva }: {
  studio: StudioId; contatto: Contatto; apiProgramma: typeof realeProgramma; onChiudi: () => void; onSalva: (p: { data: string; ora: string; tipo: string }, poi: 'solo' | 'scrivi') => Promise<void>;
}) {
  const giorno = oggi();
  const [modelli, setModelli] = useState<Modello[]>([]);
  const [blocchi, setBlocchi] = useState<Blocco[]>([]);
  const inizio = contatto.provaIl ? Math.min(13, Math.max(0, Math.round((new Date(contatto.provaIl).getTime() - new Date(giorno).getTime()) / 864e5))) : 1;
  const [g, setG] = useState(inizio);
  const [scelta, setScelta] = useState<{ ora: string; tipo: string } | null>(contatto.provaIl && contatto.provaOra ? { ora: contatto.provaOra, tipo: contatto.provaTipo ?? '' } : null);
  const [libera, setLibera] = useState('');
  const [err, setErr] = useState('');
  useEffect(() => {
    void Promise.all([apiProgramma.elencaModelli(studio), apiProgramma.elencaBlocchi(studio, giorno, aggiungiGiorni(giorno, 13))]).then(([m, b]) => { setModelli(m ?? []); setBlocchi(b ?? []); });
  }, [apiProgramma, studio, giorno]);
  const giorni = Array.from({ length: 14 }, (_, i) => aggiungiGiorni(giorno, i));
  const lezioniDel = (d: string) => lezioniDelGiorno(d, modelli, blocchi).filter((l) => !l.fermata);
  const data = giorni[g];
  const lezioni = lezioniDel(data);
  const salva = (poi: 'solo' | 'scrivi') => {
    let ora = scelta?.ora ?? '';
    let tipo = scelta?.tipo ?? '';
    if (!ora && libera) { ora = libera.replace(/^0/, ''); tipo = ''; }
    if (!ora) return setErr('Scegli un orario.');
    void onSalva({ data, ora, tipo: tipo || TESTI_STUDIO[studio].provaEtichetta }, poi);
  };
  const nome = contatto.nome.split(' ')[0];
  return (
    <Modale riga={TESTI_STUDIO[studio].provaEtichetta} titolo={`Quando viene ${nome}?`} onChiudi={onChiudi}>
      <div className="days dsm">
        {giorni.map((d, i) => (
          <button type="button" key={d} className={`day ${i === g ? 'on' : ''}`} onClick={() => { setG(i); setScelta(null); }}>
            <small>{NOME_GIORNO[giornoDellaSettimana(d)].slice(0, 3)}</small><b>{Number(d.slice(8))}</b><i className={lezioniDel(d).length ? 'has' : ''}></i>
          </button>
        ))}
      </div>
      {lezioni.length > 0
        ? <div className="chips">{lezioni.map((l) => <Chip key={l.modello.id} acceso={scelta?.ora === l.modello.ora && scelta?.tipo === l.modello.tipo} onClick={() => { setScelta({ ora: l.modello.ora, tipo: l.modello.tipo }); setLibera(''); }}>{l.modello.ora} · {l.modello.tipo}</Chip>)}</div>
        : <p className="muted small">Quel giorno non ci sono lezioni. Scegli un orario qui sotto.</p>}
      <label className="nl" style={{ marginTop: 12 }}>Oppure un altro orario<input type="time" value={libera} onChange={(e) => { setLibera(e.target.value); setScelta(null); }} /></label>
      {err && <p className="note" role="alert">{err}</p>}
      <div className="two-btn" style={{ gridTemplateColumns: '1fr', marginTop: 16 }}>
        <button type="button" className="btn" onClick={() => salva('solo')}>Salva</button>
        <button type="button" className="btn ghost" onClick={() => salva('scrivi')}>Salva e scrivi su WhatsApp</button>
      </div>
    </Modale>
  );
}

// "Nuovo messaggio" del prototipo: testo già scritto da controllare, e "Invia" apre WhatsApp con quel testo.
function CompositoreLead({ studio, contatto: c, tipo, giorno, haRisposto, onChiudi, onInviato }: {
  studio: StudioId; contatto: Contatto; tipo: TipoMessaggioLead; giorno: string; haRisposto: boolean; onChiudi: () => void; onInviato: (testo: string, telefono: string | null) => Promise<void>;
}) {
  const t = TESTI_STUDIO[studio];
  const [testo, setTesto] = useState(testoMessaggioLead(tipo, { nome: c.nome, provaIl: c.provaIl, provaOra: c.provaOra, provaTipo: c.provaTipo, oggi: giorno, provaEtichetta: t.provaEtichetta, provaPrezzo: t.provaPrezzo, inStudio: t.inStudio }));
  const [telefono, setTelefono] = useState('');
  const numero = numeroWhatsApp(c.telefono ?? telefono);
  return (
    <Modale riga="Nuovo messaggio" titolo={`A ${c.nome}`} onChiudi={onChiudi}>
      {c.importato && !haRisposto && <div className="nf-b" style={{ margin: '0 0 12px' }}><b>Contatto importato da un elenco.</b> Scrivigli solo se ti ha già contattato o ti ha dato il permesso: le promozioni richiedono il suo consenso.</div>}
      {!c.telefono && <label className="nl">Telefono<input type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="Serve per scrivere" /></label>}
      <textarea rows={5} value={testo} onChange={(e) => setTesto(e.target.value)}></textarea>
      <p className="muted small">{c.telefono ?? (telefono || 'Senza numero')} · WhatsApp · si apre WhatsApp con il testo già scritto.</p>
      <div className="two-btn" style={{ gridTemplateColumns: 'auto auto', justifyContent: 'start' }}>
        {numero
          ? <a className="btn" href={linkWhatsApp(numero, testo)} target="_blank" rel="noreferrer" onClick={() => void onInviato(testo, c.telefono ? null : telefono)}>Invia</a>
          : <button type="button" className="btn" disabled>Invia</button>}
        <button type="button" className="btn ghost" onClick={onChiudi}>Annulla</button>
      </div>
    </Modale>
  );
}

function Risposta({ contatto, onChiudi, onSalva }: { contatto: Contatto; onChiudi: () => void; onSalva: (t: string) => void }) {
  const [t, setT] = useState('');
  return (
    <Modale riga="Messaggi" titolo={`Cosa ha scritto ${contatto.nome.split(' ')[0]}?`} onChiudi={onChiudi}>
      <p className="muted small">Anche solo una parola: serve a ricordare a che punto eravate.</p>
      <textarea rows={4} value={t} onChange={(e) => setT(e.target.value)} placeholder="Per esempio: giovedì sera va bene"></textarea>
      <div className="two-btn" style={{ gridTemplateColumns: 'auto auto', justifyContent: 'start', marginTop: 14 }}>
        <button type="button" className="btn" disabled={t.trim() === ''} onClick={() => onSalva(t)}>Salva</button>
        <button type="button" className="btn ghost" onClick={onChiudi}>Annulla</button>
      </div>
    </Modale>
  );
}

// Importazione: si incolla un elenco (da Excel, da Bookyway, dalla rubrica) e prima di aggiungere si controllano i doppioni.
function Importa({ studio, contatti, api, apiPersone, promemoria, onChiudi, onFatto }: {
  studio: StudioId; contatti: Contatto[]; api: ApiLeads; apiPersone: typeof realePersone; promemoria: Promemoria; onChiudi: () => void; onFatto: (quanti: number) => Promise<void>;
}) {
  const [testo, setTesto] = useState('');
  const [fonte, setFonte] = useState('Altro');
  const [righe, setRighe] = useState<RigaImportata[] | null>(null);
  const [err, setErr] = useState('');
  const controlla = async () => {
    const persone = (await apiPersone.elencaPersone(studio)) ?? [];
    const gia: Esistente[] = [
      ...contatti.map((c) => ({ nome: c.nome, telefono: c.telefono, dove: 'tra gli interessati' })),
      ...persone.map((s) => ({ nome: nomeCompleto(s.persona), telefono: s.persona.telefono, dove: 'tra gli allievi' })),
    ];
    const r = leggiElenco(testo, gia, FONTI);
    if (r.length === 0) return setErr('Incolla almeno una riga.');
    setErr('');
    setRighe(r);
  };
  const n = (s: RigaImportata['stato']) => (righe ?? []).filter((x) => x.stato === s).length;
  const daFile = (file: File | undefined) => {
    if (!file) return;
    const lettore = new FileReader();
    lettore.onload = () => setTesto(String(lettore.result ?? ''));
    lettore.readAsText(file);
  };
  return (
    <Modale riga="Interessati" titolo="Importa contatti" onChiudi={onChiudi}>
      {righe ? (
        <>
          <p className="muted small">Ho controllato <b>{righe.length}</b> righe. Da aggiungere: <b>{n('nuovo')}</b>. Già presenti: <b>{n('doppio')}</b>. Da controllare: <b>{n('controlla')}</b>. Aggiungo solo quelle nuove.</p>
          <div className="lst" style={{ maxHeight: 230, overflow: 'auto' }}>
            {righe.slice(0, 40).map((x, i) => (
              <div className="lst-r" key={i}><b>{x.nome || '(senza nome)'}</b><span>{x.telefono || 'senza numero'}{x.stato === 'nuovo' ? '' : <> · <i className="pl-w">{x.perche}</i></>}</span></div>
            ))}
          </div>
          {err && <p className="note" role="alert">{err}</p>}
          <button type="button" className="btn wide" style={{ marginTop: 14 }} disabled={n('nuovo') === 0}
            onClick={async () => { const e = await api.creaContatti(studio, righe, fonte, promemoria); if (!e.ok) return setErr(e.motivo); await onFatto(e.quanti); }}>
            Aggiungi {n('nuovo')} {n('nuovo') === 1 ? 'contatto' : 'contatti'}
          </button>
          <button type="button" className="btn ghost wide" style={{ marginTop: 10 }} onClick={() => setRighe(null)}>Torna all'elenco</button>
        </>
      ) : (
        <>
          <p className="muted small">Incolla un elenco, una persona per riga: nome e cognome, poi il telefono. Va bene copiato da Excel o da Bookyway. Controllo io i doppioni. Importa solo persone che ti hanno già scritto o che sono già tue allieve: per mandare promozioni serve il loro consenso.</p>
          <textarea rows={7} value={testo} onChange={(e) => setTesto(e.target.value)} placeholder={'Giada Moretto; 347 555 1234\nStefano Brusadin; 349 555 8800'}></textarea>
          <label className="nl">Oppure scegli un file .csv<input type="file" accept=".csv,.txt" onChange={(e) => daFile(e.target.files?.[0])} /></label>
          <p className="eyebrow" style={{ marginTop: 14 }}>Come ci hanno trovato (se non è scritto nell'elenco)</p>
          <div className="chips">{FONTI.map((x) => <Chip key={x} acceso={fonte === x} onClick={() => setFonte(x)}>{x}</Chip>)}</div>
          {err && <p className="note" role="alert">{err}</p>}
          <button type="button" className="btn wide" style={{ marginTop: 16 }} onClick={() => void controlla()}>Controlla l'elenco</button>
          <button type="button" className="btn ghost wide" style={{ marginTop: 10 }} onClick={onChiudi}>Annulla</button>
        </>
      )}
    </Modale>
  );
}

function Scheda({ contatto: c, messaggi, api, apiCampi, onChiudi, onCambiato, onScrivi, onRisposta }: {
  contatto: Contatto; messaggi: MessaggioLead[]; api: ApiLeads; apiCampi: typeof realeImpostazioni; onChiudi: () => void; onCambiato: () => Promise<void>; onScrivi: () => void; onRisposta: () => void;
}) {
  const [eventi, setEventi] = useState<EventoContatto[] | null>(null);
  const [campi, setCampi] = useState<CampoContatto[]>([]);
  const [risposte, setRisposte] = useState<Record<string, string>>(c.campi);
  useEffect(() => {
    void apiCampi.elencaCampi(c.studio).then((x) => setCampi(x ?? []));
  }, [apiCampi, c.studio]);
  const rispondi = async (id: string, valore: string) => {
    setRisposte({ ...risposte, [id]: valore });
    await api.salvaCampo({ ...c, campi: risposte }, id, valore);
    await onCambiato();
  };
  const [nota, setNota] = useState('');
  const giorno = oggi();
  const carica = useCallback(async () => setEventi(await api.elencaEventi(c.id)), [api, c.id]);
  useEffect(() => {
    void carica();
  }, [carica]);
  const nome = TAB.find(([k]) => k === c.fase)?.[1] ?? '';
  const aperto = ['interessato', 'prova_fissata', 'prova_fatta'].includes(c.fase);
  return (
    <Modale riga={`Contatto · ${nome}`} titolo={c.nome} onChiudi={onChiudi}>
      <dl className="kv" style={{ marginBottom: 14 }}>
        <dt>Telefono</dt><dd>{c.telefono ?? 'Senza numero'}</dd>
        <dt>Ci ha trovato da</dt><dd>{c.fonte ?? '–'}</dd>
        <dt>Cosa cerca</dt><dd>{c.cerca ?? 'Non indicato'}</dd>
        <dt>Scritto</dt><dd>{quandoRel(c.creatoIl, giorno)}</dd>
        {c.nota && <><dt>Nota</dt><dd>{c.nota}</dd></>}
      </dl>
      {campi.length > 0 && (
        <>
          <p className="eyebrow">Cosa sappiamo di questa persona</p>
          {campi.map((k) => (
            <div className="lc" key={k.id}>
              <span>{k.nome}</span>
              {k.tipo === 'scelta' && <div className="chips">{k.opzioni.map((o) => <Chip key={o} acceso={risposte[k.id] === o} onClick={() => void rispondi(k.id, o)}>{o}</Chip>)}</div>}
              {k.tipo === 'si' && <div className="chips">{['Sì', 'No'].map((o) => <Chip key={o} acceso={risposte[k.id] === o} onClick={() => void rispondi(k.id, o)}>{o}</Chip>)}</div>}
              {k.tipo === 'testo' && <input className="sq" defaultValue={risposte[k.id] ?? ''} placeholder="Scrivi qui" onBlur={(e) => { if (e.target.value !== (risposte[k.id] ?? '')) void rispondi(k.id, e.target.value); }} />}
            </div>
          ))}
        </>
      )}
      <p className="eyebrow" style={{ marginTop: 16 }}>{ultimoMessaggio(messaggi, c.fase, (iso) => quandoRel(iso, giorno))}</p>
      <div className="lst">
        {eventi?.length === 0 && <p className="muted small">Ancora niente.</p>}
        {(eventi ?? []).slice(0, 14).map((e) => (
          <div className="lst-r" key={e.id}>
            <b>{fdate(e.creatoIl)}</b>
            <span>{e.tipo === 'messaggio_inviato' ? `Tu: «${e.testo ?? ''}»` : e.tipo === 'risposta' ? `Ha risposto: «${e.testo ?? ''}»` : e.testo}</span>
          </div>
        ))}
      </div>
      <label className="nl">Aggiungi una nota<input value={nota} onChange={(e) => setNota(e.target.value)} /></label>
      <div className="two-btn" style={{ gridTemplateColumns: 'auto auto auto', justifyContent: 'start', marginTop: 16 }}>
        {aperto && <button type="button" className="btn" onClick={onScrivi}>Scrivi</button>}
        {aperto && <button type="button" className="btn ghost" onClick={onRisposta}>Ha risposto</button>}
        {nota.trim() !== '' && <button type="button" className="btn ghost" onClick={async () => { const esito = await api.aggiungiNota(c, nota); if (esito.ok) { setNota(''); await carica(); await onCambiato(); } }}>Salva nota</button>}
        <button type="button" className="btn ghost" onClick={onChiudi}>Chiudi</button>
      </div>
    </Modale>
  );
}
