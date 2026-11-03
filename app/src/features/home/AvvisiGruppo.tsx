import { useEffect, useMemo, useState } from 'react';
import { Chip } from '@/design/Chip';
import { Conferma } from '@/design/Conferma';
import { COLORI_AVATAR, type StudioId } from '@/config/tema';
import * as realeComunicazioni from '@/data/comunicazioni';
import * as realePersone from '@/data/persone';
import * as realePrenotazioni from '@/data/prenotazioni';
import * as realeProgramma from '@/data/programma';
import { aggiungiGiorni, oggi } from '@/domain/date';
import {
  descriviPersone, destinatari, eNotte, gruppoConsentito, MESSAGGI_PRONTI, SEGMENTI_AVVISO, TAG_SENSIBILI, type PersonaAvviso, type TipoAvviso,
} from '@/domain/avvisi';
import { fdate, iniziale } from '@/domain/formati';
import { datiMancanti, inScadenza, nomeCompleto } from '@/domain/persone';
import { lezioniFatte, statoAllievo } from '@/domain/prenotazioni';

// Stesso markup di studioAvviso() del prototipo (sezioni .card numerate, chip dei gruppi, anteprima di chi la riceve).
export type ApiAvvisi = { comunicazioni: typeof realeComunicazioni; persone: typeof realePersone; prenotazioni: typeof realePrenotazioni; programma: typeof realeProgramma };
export const apiAvvisiReali: ApiAvvisi = { comunicazioni: realeComunicazioni, persone: realePersone, prenotazioni: realePrenotazioni, programma: realeProgramma };

export function AvvisiGruppo({ studio, api = apiAvvisiReali, onApriPersona }: { studio: StudioId; api?: ApiAvvisi; onApriPersona?: (id: string) => void }) {
  const [persone, setPersone] = useState<PersonaAvviso[] | null>(null);
  const [lezioni, setLezioni] = useState<string[]>([]);
  const [inviati, setInviati] = useState<realeComunicazioni.AvvisoInviato[]>([]);
  const [sel, setSel] = useState<string[]>([]);
  const [tipo, setTipo] = useState<TipoAvviso>('novita');
  const [titolo, setTitolo] = useState('');
  const [testo, setTesto] = useState('');
  const [quando, setQuando] = useState<'ora' | 'domani'>('ora');
  const [nomi, setNomi] = useState(false);
  const [chiedi, setChiedi] = useState(false);
  const [msg, setMsg] = useState('');
  const giorno = oggi();
  const colori = COLORI_AVATAR[studio];

  const carica = async () => {
    const [p, ar, pr, modelli, avvisi] = await Promise.all([
      api.persone.elencaPersone(studio), api.persone.elencaAcquistiERegistro(studio), api.prenotazioni.elencaPrenotazioni(studio, aggiungiGiorni(giorno, -400), aggiungiGiorni(giorno, 14)),
      api.programma.elencaModelli(studio), api.comunicazioni.elencaAvvisi(studio),
    ]);
    setInviati(avvisi ?? []);
    if (!p || !ar || !pr || !modelli) return setPersone([]);
    const tipoDi = new Map(modelli.map((m) => [m.id, m.tipo]));
    const dal = aggiungiGiorni(giorno, -60);
    setLezioni([...new Set(modelli.filter((m) => m.attivo && m.stile !== 'workshop').map((m) => m.tipo))]);
    setPersone(p.map((s) => {
      const sue = pr.filter((x) => x.personId === s.persona.id);
      const fatte = lezioniFatte(sue, giorno) as typeof sue;
      const ultima = fatte.map((x) => x.data).sort().pop() ?? null;
      return {
        id: s.persona.id, nome: nomeCompleto(s.persona), tag: s.persona.tag, consensoNovita: s.persona.consensoNovita,
        stato: statoAllievo(fatte.length, s.persona.iscrittoIl, ultima, giorno),
        inScadenza: inScadenza(s.persona, ar.acquisti.get(s.persona.id) ?? [], ar.registro.get(s.persona.id) ?? [], giorno),
        datiMancanti: datiMancanti(s.persona).length > 0,
        lezioniRecenti: [...new Set(fatte.filter((x) => x.data >= dal).map((x) => tipoDi.get(x.modelloId) ?? ''))].filter(Boolean),
      };
    }));
  };
  useEffect(() => {
    void carica();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studio]);

  const tuttiTag = useMemo(() => [...new Set((persone ?? []).flatMap((p) => p.tag))].sort(), [persone]);
  if (persone === null) return <p className="muted">Carico le persone…</p>;

  const D = destinatari(sel, tipo, persone);
  const quanti = (g: string) => destinatari([g], 'importante', persone).tutti.length;
  const notte = eNotte(new Date().getHours());
  const pronto = titolo.trim() !== '' && testo.trim() !== '' && D.ricevono.length > 0;
  const gruppi: [string, { id: string; t: string }[]][] = [
    ['Tutti', [{ id: 'tutti', t: 'Tutti gli allievi' }]],
    ['Tag', tuttiTag.map((t) => ({ id: `tag|${t}`, t }))],
    ['Hanno frequentato di recente', lezioni.map((t) => ({ id: `lez|${t}`, t }))],
    ['Da come stanno andando', SEGMENTI_AVVISO.map(([k, t]) => ({ id: `seg|${k}`, t }))],
  ];
  const alterna = (id: string) => setSel(sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id]);
  const cambiaTipo = (t: TipoAvviso) => { setTipo(t); setSel(sel.filter((g) => gruppoConsentito(g, t))); };
  const riga = (p: PersonaAvviso, fuori: boolean, i: number) => (
    <button type="button" className="att rs-r att-b" key={p.id} onClick={() => onApriPersona?.(p.id)}>
      <span className="av s" style={{ background: colori[i % colori.length] }}>{iniziale(p.nome)}</span>
      <div className="lez-main"><b>{p.nome}</b><span>{fuori ? 'Non ha accettato le comunicazioni: resta fuori' : 'Riceve la notifica'}</span></div><em className="att-go">›</em>
    </button>
  );
  const nomiGruppi = () => sel.map((g) => gruppi.flatMap(([, l]) => l).find((x) => x.id === g)?.t ?? g).join(', ');

  return (
    <>
      <p className="muted" style={{ marginBottom: 14 }}>Scegli a chi arriva la notifica, scrivi poche parole e invia.</p>
      <section className="card">
        <p className="eyebrow">1 · A chi arriva</p>
        {gruppi.map(([s, g]) => g.length > 0 && (
          <div key={s}>
            <p className="ct-lbl">{s}</p>
            <div className="chips">{g.map((x) => {
              const vietato = !gruppoConsentito(x.id, tipo);
              return <button type="button" key={x.id} className={`chip ${sel.includes(x.id) ? 'on' : ''}`} disabled={vietato} title={vietato ? 'Un tag di salute non si usa per le novità' : undefined} onClick={() => alterna(x.id)}>{x.t} <small>{quanti(x.id)}</small></button>;
            })}</div>
          </div>
        ))}
        {sel.some((x) => x.startsWith('tag|') && TAG_SENSIBILI.includes(x.slice(4))) && <p className="note" style={{ marginTop: 12 }}>Questi tag riguardano la salute. Nel testo non scrivere la condizione della persona: parla della lezione, non di lei.</p>}
        <p className="muted small" style={{ marginTop: 12 }}>Una persona può avere più tag. Chi ha più tag tra quelli scelti riceve l'avviso una volta sola. I tag di salute si usano solo per avvisi importanti, mai per le novità.</p>
      </section>
      <section className="card">
        <p className="eyebrow">2 · Che messaggio è</p>
        <div className="chips">{([['novita', 'Novità e proposte'], ['importante', 'Avviso importante']] as const).map(([k, t]) => <Chip key={k} acceso={tipo === k} onClick={() => cambiaTipo(k)}>{t}</Chip>)}</div>
        <p className="muted small" style={{ marginTop: 8 }}>{tipo === 'novita' ? 'Arriva solo a chi ha accettato le comunicazioni dello studio.' : 'Cambi di orario e cose da sapere subito. Arriva a tutto il gruppo: non va usato per promuovere.'}</p>
      </section>
      <section className="card">
        <p className="eyebrow">3 · Cosa scrivi</p>
        <div className="chips" style={{ marginBottom: 10 }}>{Object.entries(MESSAGGI_PRONTI).map(([k, m]) => <button type="button" className="chip" key={k} onClick={() => { setTitolo(m[0]); setTesto(m[1]); cambiaTipo(m[2]); }}>{m[0]}</button>)}</div>
        <label className="nl">Titolo<input value={titolo} maxLength={60} onChange={(e) => setTitolo(e.target.value)} placeholder="Titolo breve" /></label>
        <label className="nl">Testo<textarea rows={3} value={testo} maxLength={160} onChange={(e) => setTesto(e.target.value)} placeholder="Poche parole: la notifica si legge in un colpo d'occhio"></textarea></label>
      </section>
      <section className="card">
        <p className="eyebrow">4 · Quando</p>
        <div className="chips">{([['ora', 'Adesso'], ['domani', 'Domani alle 9:00']] as const).map(([k, t]) => <Chip key={k} acceso={quando === k} onClick={() => setQuando(k)}>{t}</Chip>)}</div>
        {notte && quando === 'ora' && tipo === 'novita' && <p className="muted small" style={{ marginTop: 8 }}>È notte: le novità non partono tra le 21 e le 8, la notifica arriva domattina.</p>}
      </section>
      <section className="card">
        <p className="eyebrow">Chi la riceve</p>
        <p><b>{descriviPersone(D.ricevono.length)}</b>{D.esclusi.length > 0 && ` · ${D.esclusi.length} restano fuori perché non hanno accettato le comunicazioni`}</p>
        {D.tutti.length > 0 ? <button type="button" className="btn sm ghost" style={{ marginTop: 8 }} onClick={() => setNomi(!nomi)}>{nomi ? 'Nascondi i nomi' : 'Vedi i nomi'}</button> : <p className="muted small">Scegli almeno un gruppo.</p>}
        {nomi && D.tutti.length > 0 && <div className="group rs" style={{ marginTop: 10 }}>{D.ricevono.map((p, i) => riga(p, false, i))}{D.esclusi.map((p, i) => riga(p, true, i))}</div>}
        <button type="button" className="btn wide" disabled={!pronto} style={{ marginTop: 14 }} onClick={() => setChiedi(true)}>Invia a {descriviPersone(D.ricevono.length)}</button>
        <p className="muted small" style={{ marginTop: 8 }}>Gli allievi non hanno ancora l'app: l'avviso viene salvato e arriverà quando potranno entrare.</p>
        {msg && <p className="note" role="alert">{msg}</p>}
      </section>
      {inviati.length > 0 && (
        <>
          <p className="eyebrow" style={{ marginTop: 22 }}>Inviati</p>
          {inviati.map((x) => (
            <div className="pv-c" key={x.id}><div className="al-m"><b>{x.titolo}</b><small>{x.testo}</small><small>{fdate(x.creatoIl)} · {x.quando === 'ora' ? 'adesso' : 'domani alle 9:00'} · {descriviPersone(x.destinatari)} · {x.gruppi}</small>{x.esclusi > 0 && <small>{x.esclusi} fuori: senza consenso alle comunicazioni</small>}</div></div>
          ))}
        </>
      )}
      {chiedi && (
        <Conferma riga="Avvisi a un gruppo" titolo={`Inviare a ${descriviPersone(D.ricevono.length)}?`}
          testo={`«${titolo.trim()}» parte ${quando === 'ora' ? 'adesso' : 'domani alle 9:00'}.${D.esclusi.length > 0 ? ` ${D.esclusi.length} restano fuori perché non hanno accettato le comunicazioni.` : ''} Una volta inviata non si ritira.`}
          ok="Invia" onAnnulla={() => setChiedi(false)}
          onOk={async () => {
            setChiedi(false);
            const e = await api.comunicazioni.salvaAvviso(studio, { titolo: titolo.trim(), testo: testo.trim(), tipo, quando, gruppi: nomiGruppi(), esclusi: D.esclusi.length }, D.ricevono.map((p) => p.id));
            if (!e.ok) return setMsg(e.motivo);
            setMsg('');
            setSel([]); setTitolo(''); setTesto(''); setNomi(false);
            await carica();
          }} />
      )}
    </>
  );
}
