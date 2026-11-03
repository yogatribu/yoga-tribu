import { useCallback, useEffect, useMemo, useState } from 'react';
import { Chip } from '@/design/Chip';
import { Conferma } from '@/design/Conferma';
import { PREZZI_PRIVATE, type StudioId } from '@/config/tema';
import * as realeImpostazioni from '@/data/impostazioni';
import * as realePersone from '@/data/persone';
import * as realeProgramma from '@/data/programma';
import * as realePrivate from '@/data/private';
import { aggiungiGiorni, giornoDellaSettimana, oggi } from '@/domain/date';
import { fdate } from '@/domain/formati';
import type { Insegnante } from '@/domain/impostazioni';
import { nomeCompleto } from '@/domain/persone';
import {
  alternaOra, copiaSuFeriali, NOME_PRIVATA, ORE_PRIVATE, oreDelGiorno, orePrese, prezzoDaConcordare, puoConfermare, puoDisdire, faPrivate,
  type Disponibilita,
} from '@/domain/private';
import { NOME_GIORNO, NOME_STILE, type Modello } from '@/domain/programma';

// Stesso markup di studioPrivate() e dispEditor() del prototipo (sezione .pv, .pv-c, .days, .chips, .set).
export type ApiPrivate = {
  private: typeof realePrivate; impostazioni: typeof realeImpostazioni; persone: typeof realePersone; programma: typeof realeProgramma;
};
export const apiPrivateReali: ApiPrivate = { private: realePrivate, impostazioni: realeImpostazioni, persone: realePersone, programma: realeProgramma };

const GIORNI_ABBR = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];

type Dati = { insegnanti: Insegnante[]; disp: Disponibilita[]; private: realePrivate.Privata[]; modelli: Modello[]; persone: Map<string, string> };

export function Private({ studio, eResponsabile, mioId, api = apiPrivateReali, soloElenco = false }: {
  studio: StudioId; eResponsabile: boolean; mioId: string | null; api?: ApiPrivate; soloElenco?: boolean;
}) {
  const [d, setD] = useState<Dati | null>(null);
  const [errore, setErrore] = useState(false);
  const [msg, setMsg] = useState('');
  const [chiedi, setChiedi] = useState<{ id: string } | null>(null);
  const [nuova, setNuova] = useState(false);
  const giorno = oggi();

  const carica = useCallback(async () => {
    const [insegnanti, disp, priv, modelli, persone] = await Promise.all([
      api.impostazioni.elencaInsegnanti(studio), api.private.elencaDisponibilita(studio), api.private.elencaPrivate(studio),
      api.programma.elencaModelli(studio), api.persone.elencaPersone(studio),
    ]);
    if (!insegnanti || !disp || !priv || !modelli || !persone) return setErrore(true);
    setErrore(false);
    setD({ insegnanti, disp, private: priv, modelli, persone: new Map(persone.map((s) => [s.persona.id, nomeCompleto(s.persona)])) });
  }, [api, studio]);

  useEffect(() => {
    void carica();
  }, [carica]);

  async function esegui(azione: Promise<{ ok: true } | { ok: false; motivo: string }>) {
    const esito = await azione;
    setMsg(esito.ok ? '' : esito.motivo);
    if (esito.ok) await carica();
  }

  if (errore) return <p className="muted">Non riesco a caricare le lezioni private. Riprova tra poco.</p>;
  if (d === null) return <p className="muted">Carico le lezioni private…</p>;

  const nomeIns = (id: string) => d.insegnanti.find((x) => x.id === id)?.nome ?? '';
  const puoGestire = (insegnanteId: string) => eResponsabile || insegnanteId === mioId;
  const attesa = d.private.filter((r) => r.stato === 'attesa');
  const confermate = d.private.filter((r) => r.stato === 'confermata' && r.data >= giorno);
  const visibili = (r: realePrivate.Privata) => eResponsabile || r.insegnanteId === mioId;
  const stile = (k: string) => NOME_STILE[k as keyof typeof NOME_STILE] ?? k;

  const elenco = (
    <section className="pv">
      <h3>Lezioni private {attesa.filter(visibili).length > 0 && <em className="n">{attesa.filter(visibili).length}</em>}</h3>
      {attesa.filter(visibili).map((r) => (
        <div className="pv-c" key={r.id}>
          <div className="al-m">
            <b>{d.persone.get(r.personaId) ?? 'Persona'} · {NOME_PRIVATA[r.n]}</b>
            <small>{stile(r.stile)} con {nomeIns(r.insegnanteId)} · {fdate(r.data)} {r.ora} · {prezzoDaConcordare(r.prezzoCent)} · pagamento in studio</small>
            {r.note && <small className="pv-n">“{r.note}”</small>}
          </div>
          {puoGestire(r.insegnanteId) && puoConfermare(r)
            ? <div className="pv-b"><button type="button" className="btn sm" onClick={() => void esegui(api.private.cambiaStatoPrivata(r.id, 'confermata'))}>Conferma</button><button type="button" className="btn sm ghost" onClick={() => void esegui(api.private.cambiaStatoPrivata(r.id, 'rifiutata'))}>Non disponibile</button></div>
            : <span className="muted small">La gestisce {nomeIns(r.insegnanteId)}</span>}
        </div>
      ))}
      {attesa.filter(visibili).length === 0 && <p className="muted" style={{ marginBottom: 12 }}>Nessuna richiesta in attesa.</p>}
      {confermate.filter(visibili).map((r) => (
        <div className="pv-c ok" key={r.id}>
          <div className="al-m"><b>{d.persone.get(r.personaId) ?? 'Persona'} · {NOME_PRIVATA[r.n]}</b><small>{stile(r.stile)} con {nomeIns(r.insegnanteId)} · {fdate(r.data)} {r.ora}</small></div>
          <div className="pv-b">
            <em className="st" style={{ ['--c' as string]: '#7a9d6e' }}>Confermata</em>
            {puoGestire(r.insegnanteId) && puoDisdire(r) && <button type="button" className="btn-del" style={{ margin: 0 }} onClick={() => setChiedi({ id: r.id })}>Disdici</button>}
          </div>
        </div>
      ))}
      {msg && <p className="note" role="alert">{msg}</p>}
      {chiedi && (
        <Conferma riga="Lezione privata" titolo="Vuoi disdire questa lezione?" testo="Nessun credito in gioco: si paga in studio. L'orario torna libero." ok="Disdici" pericolo onAnnulla={() => setChiedi(null)}
          onOk={() => { const id = chiedi.id; setChiedi(null); void esegui(api.private.cambiaStatoPrivata(id, 'annullata')); }} />
      )}
    </section>
  );
  if (soloElenco) return elenco;

  return (
    <>
      {elenco}
      {puoGestire(mioId ?? '') || eResponsabile ? (
        <>
          <button type="button" className="btn sm" style={{ marginTop: 14 }} onClick={() => setNuova(!nuova)}>{nuova ? 'Chiudi' : '+ Aggiungi una privata'}</button>
          {nuova && <NuovaPrivata studio={studio} d={d} api={api} giorno={giorno} onFatto={async () => { setNuova(false); await carica(); }} />}
        </>
      ) : null}
      <Orari studio={studio} d={d} eResponsabile={eResponsabile} mioId={mioId} api={api} giorno={giorno} esegui={esegui} />
    </>
  );
}

// "Quando sei disponibile": ogni insegnante decide gli orari, gli allievi scelgono solo tra questi.
function Orari({ studio, d, eResponsabile, mioId, api, giorno, esegui }: {
  studio: StudioId; d: Dati; eResponsabile: boolean; mioId: string | null; api: ApiPrivate; giorno: string; esegui: (a: Promise<{ ok: true } | { ok: false; motivo: string }>) => Promise<void>;
}) {
  const scelta = eResponsabile ? d.insegnanti : d.insegnanti.filter((x) => x.id === mioId);
  const [insId, setInsId] = useState(scelta[0]?.id ?? '');
  const [modo, setModo] = useState<'sett' | 'data'>('sett');
  const [g, setG] = useState(1);
  const [dataSel, setDataSel] = useState(giorno);
  const ins = scelta.find((x) => x.id === insId) ?? scelta[0];
  if (!ins) return null;
  const giorni14 = Array.from({ length: 14 }, (_, i) => aggiungiGiorni(giorno, i));
  const eccezione = d.disp.some((x) => x.insegnanteId === ins.id && x.data === dataSel);
  const settimanali = (n: number) => d.disp.find((x) => x.insegnanteId === ins.id && x.giorno === n)?.ore ?? [];
  const giornoNum = modo === 'data' ? giornoDellaSettimana(dataSel) : g;
  const ore = modo === 'data' ? oreDelGiorno(d.disp, ins.id, dataSel) : settimanali(g);
  const lezioneAlle = (h: number) => d.modelli.some((m) => m.attivo && m.giorno === giornoNum && parseInt(m.ora, 10) === h && m.insegnante.split(' e ').includes(ins.nome));
  const titolo = modo === 'data' ? `${NOME_GIORNO[giornoNum]} ${Number(dataSel.slice(8))}` : NOME_GIORNO[giornoNum];
  const salva = (nuoveOre: number[]) => esegui(api.private.salvaOre(studio, ins.id, modo === 'data' ? { data: dataSel } : { giorno: g }, nuoveOre));
  const auto = ins.privateAuto;
  const [chiediAuto, setChiediAuto] = useState(false);
  return (
    <section className="pv" style={{ marginTop: 22 }}>
      <h3>Quando sei disponibile</h3>
      <p className="muted" style={{ marginBottom: 12 }}>Gli allievi prenotano una privata solo negli orari che scegli qui, così non ricevi richieste per momenti in cui non puoi. Puoi cambiarli quando vuoi.</p>
      {scelta.length > 1 && <div className="chips" style={{ marginBottom: 12 }}>{scelta.map((t) => <Chip key={t.id} acceso={t.id === ins.id} onClick={() => setInsId(t.id)}>{t.nome}</Chip>)}</div>}
      <div className="seg" style={{ maxWidth: 360, marginBottom: 14 }}>
        <button type="button" className={modo === 'sett' ? 'on' : ''} onClick={() => setModo('sett')}>Ogni settimana</button>
        <button type="button" className={modo === 'data' ? 'on' : ''} onClick={() => setModo('data')}>Solo una data</button>
      </div>
      {modo === 'data'
        ? <div className="chips">{giorni14.map((x) => <button type="button" key={x} className={`chip ${x === dataSel ? 'on' : ''}`} style={d.disp.some((y) => y.insegnanteId === ins.id && y.data === x) && x !== dataSel ? { borderColor: 'var(--t-p)' } : undefined} onClick={() => setDataSel(x)}>{GIORNI_ABBR[giornoDellaSettimana(x)]} {Number(x.slice(8))}</button>)}</div>
        : <div className="days dsm">{[1, 2, 3, 4, 5, 6, 0].map((x) => <button type="button" key={x} className={`day ${x === g ? 'on' : ''}`} onClick={() => setG(x)}><small>{GIORNI_ABBR[x]}</small><b>{settimanali(x).length || '·'}</b></button>)}</div>}
      <p className="eyebrow" style={{ marginTop: 14 }}>{titolo}: ogni orario è un'ora, a partire da</p>
      <div className="chips">
        {ORE_PRIVATE.map((h) => {
          const occ = lezioneAlle(h);
          return <button type="button" key={h} className={`chip ${ore.includes(h) && !occ ? 'on' : ''}`} disabled={occ} title={occ ? 'Hai lezione' : undefined} onClick={() => void salva(alternaOra(ore, h))}>{h}:00</button>;
        })}
      </div>
      <div className="chips" style={{ marginTop: 12 }}>
        {modo === 'data'
          ? <>
              <button type="button" className="btn sm ghost" onClick={() => void salva([])}>Non disponibile questo giorno</button>
              {eccezione && <button type="button" className="btn sm ghost" onClick={() => void esegui(api.private.ripristinaData(ins.id, dataSel))}>Torna agli orari settimanali</button>}
            </>
          : <>
              <button type="button" className="btn sm ghost" onClick={() => void Promise.all(Object.entries(copiaSuFeriali(ore)).map(([x, o]) => api.private.salvaOre(studio, ins.id, { giorno: Number(x) }, o))).then(() => esegui(Promise.resolve({ ok: true } as const)))}>Copia su lunedì-venerdì</button>
              <button type="button" className="btn sm ghost" onClick={() => void salva([])}>Svuota questo giorno</button>
            </>}
      </div>
      <p className="muted small" style={{ marginTop: 10 }}>
        {modo === 'data'
          ? (eccezione ? 'Per questa data valgono gli orari qui sopra, non quelli settimanali.' : 'Se cambi qualcosa vale solo per questa data. Gli altri giorni restano come sono.')
          : (ore.length ? `${ore.length} ${ore.length === 1 ? 'orario scelto' : 'orari scelti'} per ogni ${NOME_GIORNO[g].toLowerCase()}.` : `Nessun orario: ${NOME_GIORNO[g].toLowerCase()} non ricevi richieste.`)}
      </p>
      <div className="set" style={{ marginTop: 14 }}>
        <div><b>Conferma automatica</b><small>{auto ? 'Chi sceglie un tuo orario è già prenotato, senza aspettare te.' : "Devi confermare a mano ogni richiesta, ma l'orario resta bloccato finché non rispondi."}</small></div>
        <button type="button" className={`sw ${auto ? 'on' : ''}`} role="switch" aria-checked={auto} onClick={() => setChiediAuto(true)}><i></i></button>
      </div>
      {chiediAuto && (
        <Conferma riga="Lezioni private" titolo={auto ? 'Spegnere la conferma automatica?' : 'Attivare la conferma automatica?'}
          testo={auto ? 'Dovrai confermare a mano ogni richiesta. Gli orari restano bloccati finché non rispondi.' : "Chi sceglie un tuo orario è già prenotato, senza aspettare la tua risposta. Controlla che gli orari che hai dato siano quelli giusti."}
          ok={auto ? 'Spegni' : 'Attiva'} onAnnulla={() => setChiediAuto(false)}
          onOk={() => { setChiediAuto(false); void esegui(api.impostazioni.impostaConfermaAutomatica(ins.id, !auto)); }} />
      )}
    </section>
  );
}

// Per ora le private le registra lo studio per conto della persona: giorno e orario tra quelli dati dall'insegnante.
function NuovaPrivata({ studio, d, api, giorno, onFatto }: { studio: StudioId; d: Dati; api: ApiPrivate; giorno: string; onFatto: () => Promise<void> }) {
  const candidati = useMemo(() => d.insegnanti.filter((t) => faPrivate(d.disp, t.id, giorno)), [d, giorno]);
  const [persona, setPersona] = useState('');
  const [n, setN] = useState<1 | 2 | 3 | 4>(1);
  const [insId, setInsId] = useState(candidati[0]?.id ?? '');
  const ins = candidati.find((t) => t.id === insId);
  const [stileSel, setStileSel] = useState('');
  const [data, setData] = useState('');
  const [ora, setOra] = useState('');
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');
  const prezzo = PREZZI_PRIVATE[studio][n];
  const stili = ins?.stili ?? [];
  const giorni = Array.from({ length: 14 }, (_, i) => aggiungiGiorni(giorno, i)).filter((x) => ins && oreDelGiorno(d.disp, ins.id, x).length > 0);
  const lezioneAlle = (x: string, h: number) => d.modelli.some((m) => m.attivo && m.giorno === giornoDellaSettimana(x) && parseInt(m.ora, 10) === h && ins && m.insegnante.split(' e ').includes(ins.nome));
  const libere = data && ins ? oreDelGiorno(d.disp, ins.id, data).filter((h) => !lezioneAlle(data, h) && !orePrese(d.private.map((r) => ({ insegnanteId: r.insegnanteId, data: r.data, ora: r.ora, stato: r.stato })), ins.id, data).includes(h)) : [];
  if (candidati.length === 0) return <p className="muted small" style={{ marginTop: 10 }}>Nessun insegnante ha ancora dato degli orari per le private. Aggiungili qui sotto, in "Quando sei disponibile".</p>;
  async function salva() {
    if (!persona) return setErr('Scegli la persona.');
    if (!ins || !stileSel) return setErr('Scegli lo stile.');
    if (!data || !ora) return setErr('Scegli giorno e orario.');
    const esito = await api.private.creaPrivata(studio, { personaId: persona, insegnanteId: ins.id, n, stile: stileSel, data, ora, note, prezzoCent: prezzo == null ? null : prezzo * 100 }, ins.privateAuto);
    if (!esito.ok) return setErr(esito.motivo);
    await onFatto();
  }
  return (
    <section className="card" style={{ marginTop: 14 }}>
      <p className="eyebrow">Nuova lezione privata</p>
      <label className="nl">Per chi<select value={persona} onChange={(e) => setPersona(e.target.value)}><option value="">Scegli una persona</option>{[...d.persone.entries()].sort((a, b) => a[1].localeCompare(b[1])).map(([id, nome]) => <option key={id} value={id}>{nome}</option>)}</select></label>
      <p className="eyebrow" style={{ marginTop: 14 }}>Quante persone</p>
      <div className="chips">{([1, 2, 3, 4] as const).map((x) => <Chip key={x} acceso={n === x} onClick={() => setN(x)}>{NOME_PRIVATA[x]}</Chip>)}</div>
      <p className="eyebrow" style={{ marginTop: 14 }}>Con chi</p>
      <div className="chips">{candidati.map((t) => <Chip key={t.id} acceso={t.id === insId} onClick={() => { setInsId(t.id); setStileSel(''); setData(''); setOra(''); }}>{t.nome}</Chip>)}</div>
      <p className="eyebrow" style={{ marginTop: 14 }}>Stile</p>
      <div className="chips">{stili.map((s) => <Chip key={s} acceso={stileSel === s} onClick={() => setStileSel(s)}>{NOME_STILE[s as keyof typeof NOME_STILE] ?? s}</Chip>)}{stili.length === 0 && <small className="muted">Segna gli stili che insegna in Impostazioni.</small>}</div>
      <p className="eyebrow" style={{ marginTop: 14 }}>Giorno</p>
      <div className="chips">{giorni.map((x) => <Chip key={x} acceso={data === x} onClick={() => { setData(x); setOra(''); }}>{GIORNI_ABBR[giornoDellaSettimana(x)]} {Number(x.slice(8))}</Chip>)}</div>
      {data && <><p className="eyebrow" style={{ marginTop: 14 }}>Orario</p><div className="chips">{libere.map((h) => <Chip key={h} acceso={ora === `${h}:00`} onClick={() => setOra(`${h}:00`)}>{h}:00</Chip>)}{libere.length === 0 && <small className="muted">Nessun orario libero quel giorno.</small>}</div></>}
      <label className="nl" style={{ marginTop: 14 }}>Nota<input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Per esempio: ha male a una spalla" /></label>
      <p className="muted small" style={{ marginTop: 10 }}>Prezzo: {prezzoDaConcordare(prezzo == null ? null : prezzo * 100)} · pagamento in studio. {ins?.privateAuto ? "Con la conferma automatica attiva è subito confermata." : 'Resta in attesa finché l’insegnante non conferma.'}</p>
      {err && <p className="note" role="alert">{err}</p>}
      <button type="button" className="btn wide" style={{ marginTop: 14 }} onClick={() => void salva()}>Aggiungi la lezione</button>
    </section>
  );
}
