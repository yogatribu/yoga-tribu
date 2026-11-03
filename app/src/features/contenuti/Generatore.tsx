import { toPng } from 'html-to-image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Bottone } from '@/design/Bottone';
import { Chip } from '@/design/Chip';
import { FOTO } from '@/config/volantini-foto.generated';
import { TEMPLATE } from '@/config/volantini-template.generated';
import type { StudioId } from '@/config/tema';
import * as realeEventi from '@/data/eventi';
import { oggi } from '@/domain/date';
import type { Evento } from '@/domain/eventi';
import { MESI_BREVI } from '@/domain/formati';
import { prezzoRiga, type Riga } from '@/domain/planner';
import {
  caroselloDaEvento, caroselloHtml, costruisci, daEvento, DIMENSIONI, eSociale, lumN, MAX_SLIDE, MESI, meta, NOME_FORMATO, nomeSlide, nuovoCarosello, slideCarosello, slug,
  TELEFONI, TIPI, type Campo, type Carosello, type Dati, type Formato, type GruppoCampi, type SlideFinale,
} from '@/domain/volantini';

// Stesso markup e stesse classi di studioGeneratore() e studioCarosello() del prototipo (.ct, .ct-form, .ct-stage, .ct-cornice).
// I template sono quelli di volantini/template (scripts/sync-contenuti.mjs). Le immagini le crea il browser, in locale, a doppia risoluzione.
// Le bozze restano nel browser di chi le salva.
export type ApiGeneratore = { eventi: typeof realeEventi };
export type DaPlanner = { riga: Riga; didascalia: string };

type Risultato = { errore: string } | { formato: Formato; file: string; png: string; esito: string; etichetta?: string };

const PL_CT: Record<string, string> = {
  ritiro: 'ritiro', seminario: 'seminario', approfondimento: 'approfondimento', conferenza: 'conferenza', incontro: 'incontro', corso: 'corso', salute: 'salute-femminile',
  percorso: 'salute-femminile', lezione: 'lezione-speciale', avviso: 'avviso-a4', serie: 'incontro',
};
const PARTI_FISSE = ['ETICHETTA', 'CTA', 'LUOGO', 'TELEFONO', 'FIRMA'];
const BASE: Dati = { LUMINOSITA: 50, FOTO_X: 50, FOTO_Y: 40, FOTO: '/images/studio.webp' };
const CHIAVE_BOZZE = 'ct-bozze';

type Bozze = Record<string, { tipo: string; d: Dati; t: number }>;
const leggiBozze = (): Bozze => { try { return JSON.parse(localStorage.getItem(CHIAVE_BOZZE) ?? '{}') as Bozze; } catch { return {}; } };
function salvaBozza(nome: string, tipo: string, d: Dati): string {
  const n = slug(nome || (d._nome as string) || (d.TITOLO as string));
  const b = leggiBozze();
  b[n] = { tipo, d, t: Date.now() };
  try { localStorage.setItem(CHIAVE_BOZZE, JSON.stringify(b)); } catch { /* browser senza memoria: la bozza non si salva */ }
  return n;
}

async function creaPng(html: string, f: Formato): Promise<{ png: string; esito: string }> {
  const [W, H] = DIMENSIONI[f];
  const fr = document.createElement('iframe');
  fr.style.cssText = `position:fixed;left:-20000px;top:0;border:0;width:${W}px;height:${H}px`;
  fr.srcdoc = html;
  document.body.appendChild(fr);
  try {
    await new Promise<void>((r) => { fr.onload = () => r(); });
    const doc = fr.contentDocument as Document;
    await doc.fonts.ready;
    for (let i = 0; i < 40 && !doc.documentElement.getAttribute('data-esito'); i++) await new Promise((r) => setTimeout(r, 100));
    await Promise.all([...doc.images].map((im) => (im.complete ? 1 : new Promise((r) => { im.onload = im.onerror = r; }))));
    const esito = doc.documentElement.getAttribute('data-esito') ?? '?';
    const png = await toPng(doc.body, { width: W, height: H, pixelRatio: 2, cacheBust: true });
    return { png, esito };
  } finally {
    fr.remove();
  }
}

const eGruppo = (c: Campo | GruppoCampi): c is GruppoCampi => 'gruppo' in c;

export function Generatore({
  studio, api = { eventi: realeEventi }, daPlanner = null, onCreato,
}: { studio: StudioId; api?: ApiGeneratore; daPlanner?: DaPlanner | null; onCreato?: (r: Riga) => void }) {
  const [eventi, setEventi] = useState<Evento[]>([]);
  const [caricati, setCaricati] = useState(false);
  const [tipo, setTipo] = useState('approfondimento');
  const [fmt, setFmt] = useState<Formato>('post');
  const [ev, setEv] = useState<string | null>(null);
  const [d, setD] = useState<Dati>(BASE);
  const [car, setCar] = useState<Carosello>(() => nuovoCarosello(studio));
  const [ris, setRis] = useState<Risultato[]>([]);
  const [occupato, setOccupato] = useState(false);
  const [sceltaFoto, setSceltaFoto] = useState<null | 'aggiungi' | 'cambia' | 'cta' | 'singola'>(null);
  const [didascalia, setDidascalia] = useState('');
  const [riga, setRiga] = useState<Riga | null>(null);
  const [bozze, setBozze] = useState<Bozze>(leggiBozze);
  const [avviso, setAvviso] = useState('');
  const applicato = useRef(false);

  useEffect(() => {
    void api.eventi.elencaEventi().then((e) => { setEventi((e ?? []).filter((x) => !x.soloStudio || x.soloStudio === studio)); setCaricati(true); });
  }, [api, studio]);

  // Arrivando dal planner ("Apri e crea") parte già dall'evento giusto, come plApri() del prototipo.
  useEffect(() => {
    if (!daPlanner || !caricati || applicato.current) return;
    applicato.current = true;
    const r = daPlanner.riga;
    const e = r.ev;
    const inApp = e ? eventi.find((x) => x.id === e.id) : undefined;
    setRiga(r);
    setDidascalia(daPlanner.didascalia);
    let t = tipo;
    let dati = d;
    if (r.f === 'carosello') { t = 'carosello'; if (inApp) { setCar((k) => caroselloDaEvento(k, inApp)); setEv(inApp.id); } }
    else if (r.f === 'a4') { t = 'avviso-a4'; setEv(null); dati = { ...d, TITOLO: e ? e.titolo : r.titoloEv }; }
    else if (inApp) { const x = daEvento(inApp, d); t = x.tipo; setEv(inApp.id); dati = { ...x.d, QUOTA: prezzoRiga(r) }; }
    else {
      t = PL_CT[e ? e.tipo : 'serie'] ?? 'incontro';
      const senza = { ...d };
      for (const k of PARTI_FISSE) delete senza[k];
      setEv(null);
      const dt = e?.data ? e.data.split('-').map(Number) : null;
      dati = { ...senza, TITOLO: e ? e.titolo : r.titoloEv, DATA: dt ? `${dt[2]} ${MESI[dt[1] - 1]}` : '', QUOTA: prezzoRiga(r), CHI: e?.con ? `con ${e.con}` : '' };
    }
    setTipo(t);
    setD(dati);
    if (r.f !== 'carosello') {
      const mf = meta(TEMPLATE, t).formati;
      setFmt(r.f === 'storie' && mf.includes('storia') ? 'storia' : mf.includes('post') ? 'post' : mf[0]);
    }
  }, [daPlanner, caricati, eventi, d, tipo]);

  const eCarosello = tipo === 'carosello';
  const m = useMemo(() => meta(TEMPLATE, eCarosello ? 'approfondimento' : tipo), [tipo, eCarosello]);
  const social = eSociale(tipo);
  const formato: Formato = eCarosello ? 'post' : social ? (m.formati.includes(fmt) ? fmt : m.formati[0]) : 'a4';
  const slide = slideCarosello(car);
  const sel = Math.max(0, Math.min(car.sel, slide.length - 1));

  // Il volantino in anteprima: si ricalcola a ogni modifica, con una breve attesa per non rifarlo a ogni lettera.
  const [pronto, setPronto] = useState<{ html: string; avvisi: string[]; errore: string }>({ html: '', avvisi: [], errore: '' });
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        const r = eCarosello ? { html: caroselloHtml(TEMPLATE, car, sel), avvisi: [] } : costruisci(TEMPLATE, tipo, formato, d, true);
        setPronto({ html: r.html, avvisi: r.avvisi, errore: '' });
      } catch (err) {
        setPronto({ html: '', avvisi: [], errore: err instanceof Error ? err.message : 'Non riesco a preparare l\'anteprima.' });
      }
    }, 250);
    return () => clearTimeout(t);
  }, [tipo, formato, d, car, sel, eCarosello]);

  const [esito, setEsito] = useState<'' | 'OK' | 'OVERFLOW'>('');
  const fr = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    setEsito('');
    const ascolta = (e: MessageEvent) => {
      if (!e.data?.fit || e.source !== fr.current?.contentWindow) return;
      setEsito(e.data.esito === 'OVERFLOW' ? 'OVERFLOW' : 'OK');
    };
    window.addEventListener('message', ascolta);
    return () => window.removeEventListener('message', ascolta);
  }, [pronto.html]);

  // Scala dell'anteprima: sta dentro lo spazio a destra e dentro l'altezza della finestra.
  const stage = useRef<HTMLDivElement>(null);
  const [scala, setScala] = useState(0.4);
  const [W, H] = DIMENSIONI[formato];
  useEffect(() => {
    const calcola = () => setScala(Math.min((stage.current?.clientWidth ?? 400) / W, Math.max(420, window.innerHeight - 200) / H, 1));
    calcola();
    window.addEventListener('resize', calcola);
    return () => window.removeEventListener('resize', calcola);
  }, [W, H]);

  const imposta = (k: string, v: string | number) => setD((x) => ({ ...x, [k]: v }));
  const cambiaTipo = (t: string) => { setTipo(t); setD((x) => { const y = { ...x }; for (const k of PARTI_FISSE) delete y[k]; return y; }); setEv(null); };
  const daEv = (id: string) => {
    const e = eventi.find((x) => x.id === id);
    if (!e) return;
    setEv(id);
    if (eCarosello) return setCar((k) => caroselloDaEvento(k, e));
    const x = daEvento(e, d);
    setTipo(x.tipo);
    setD(x.d);
    if (!meta(TEMPLATE, x.tipo).formati.includes(fmt)) setFmt('post');
  };
  const scelta = (u: string) => {
    if (!eCarosello) return imposta('FOTO', u);
    if (sceltaFoto === 'cta') setCar((k) => ({ ...k, cta: { ...k.cta, foto: u } }));
    else if (sceltaFoto === 'cambia' && car.sel < car.slides.length) setCar((k) => ({ ...k, slides: k.slides.map((s, i) => (i === k.sel ? { ...s, foto: u } : s)) }));
    else if (car.slides.length + (car.cta.on ? 1 : 0) < MAX_SLIDE) setCar((k) => ({ ...k, slides: [...k.slides, { foto: u, x: 50, y: 50 }], sel: k.slides.length }));
  };

  async function esporta(formati: Formato[]) {
    if (occupato) return;
    let costr: [Formato, string][];
    try {
      costr = formati.map((f) => [f, costruisci(TEMPLATE, tipo, f, d, false).html]);
    } catch (err) {
      return setRis((x) => [{ errore: err instanceof Error ? err.message : 'Non riesco a preparare il volantino.' }, ...x]);
    }
    setOccupato(true);
    try {
      const nome = slug((d._nome as string) || (d.TITOLO as string));
      const nuovi: Risultato[] = [];
      for (const [f, html] of costr) {
        const x = await creaPng(html, f);
        nuovi.push({ formato: f, file: `${nome}${tipo === 'avviso-a4' ? '' : `-${f}`}.png`, png: x.png, esito: x.esito });
      }
      setRis((x) => [...nuovi, ...x]);
      if (riga?.st === 'confermato') onCreato?.(riga);
      salvaBozza('', tipo, d);
      setBozze(leggiBozze());
    } catch {
      setRis((x) => [{ errore: 'Non riesco a creare le immagini. Riprova tra poco.' }, ...x]);
    }
    setOccupato(false);
  }

  async function esportaCarosello() {
    if (occupato) return;
    if (!slide.length) return setRis((x) => [{ errore: 'Aggiungi almeno una foto.' }, ...x]);
    setOccupato(true);
    try {
      const nome = slug((d._nome as string) || car.titolo);
      const nuovi: Risultato[] = [];
      for (let i = 0; i < slide.length; i++) {
        const x = await creaPng(caroselloHtml(TEMPLATE, car, i), 'post');
        nuovi.push({ formato: 'post', file: `${nome}-${String(i + 1).padStart(2, '0')}${slide[i].tipo === 'cover' ? '-cover' : slide[i].tipo === 'cta' ? '-cta' : ''}.png`, png: x.png, esito: 'OK', etichetta: `Slide ${i + 1}` });
      }
      setRis((x) => [...nuovi, ...x]);
      if (riga?.st === 'confermato') onCreato?.(riga);
    } catch {
      setRis((x) => [{ errore: 'Non riesco a creare le immagini. Riprova tra poco.' }, ...x]);
    }
    setOccupato(false);
  }

  const lista = [...eventi]
    .filter((e) => e.da >= oggi() && ['workshop', 'incontro', 'seminario', 'ritiro'].includes(e.tipo))
    .sort((a, b) => a.da.localeCompare(b.da));
  const chipEventi = (
    <div className="chips">
      {lista.map((e) => {
        const [, mm, gg] = e.da.split('-').map(Number);
        return <Chip key={e.id} acceso={ev === e.id} onClick={() => daEv(e.id)}>{gg} {MESI_BREVI[mm - 1]} · {e.tipo === 'workshop' ? 'Approfondimento' : e.titolo.length > 24 ? `${e.titolo.slice(0, 23)}…` : e.titolo}</Chip>;
      })}
    </div>
  );
  const nomiBozze = Object.entries(bozze).sort((a, b) => b[1].t - a[1].t).map(([n]) => n);

  const campo = (cp: Campo) => {
    const v = String(d[cp.slot] ?? '');
    return (
      <label className="ct-f" key={cp.slot}>
        <span>{cp.label}{cp.slot === 'TITOLO' ? ' (Invio per andare a capo)' : ''}</span>
        {cp.tipo === 'riga'
          ? <input type="text" value={v} placeholder={cp.ph} onChange={(e) => imposta(cp.slot, e.target.value)} />
          : <textarea rows={cp.tipo === 'area2' ? 2 : 3} value={v} placeholder={cp.ph} onChange={(e) => imposta(cp.slot, e.target.value)} />}
      </label>
    );
  };
  const fisso = (k: string, etichetta: string, predefinito: string) => (
    <label className="ct-f"><span>{etichetta}</span><input type="text" value={String(d[k] ?? predefinito)} onChange={(e) => imposta(k, e.target.value)} /></label>
  );
  const risultati = (
    <div className="ct-ris">
      {ris.map((x, i) => ('errore' in x
        ? <div className="ct-err small" key={i}>{x.errore}</div>
        : (
          <div className="ct-rr" key={`${x.file}${i}`}>
            <img src={x.png} alt="" />
            <div>
              <b>{x.etichetta || NOME_FORMATO[x.formato]} pronto</b><small>{x.file}</small>
              {x.esito === 'OVERFLOW' && <div className="ct-w">Attenzione: il testo non entra, accorcialo e riesporta.</div>}
              <a className="btn sm ghost" href={x.png} download={x.file}>Scarica PNG</a>
            </div>
          </div>
        )))}
    </div>
  );
  const carteDidascalia = riga && (
    <section className="card">
      <p className="eyebrow">Didascalia (bozza)</p>
      <p className="muted small" style={{ margin: '0 0 8px' }}>Preparata dal planner. Rifiniscila prima di pubblicare. Se nelle foto ci sono persone, controlla che abbiano dato il consenso (Allievi, filtro "No foto").</p>
      <textarea rows={9} className="pl-cap" value={didascalia} onChange={(e) => setDidascalia(e.target.value)} />
      <Bottone variante="secondario" piccolo onClick={() => void navigator.clipboard?.writeText(didascalia)}>Copia la didascalia</Bottone>
    </section>
  );
  const luminosita = (valore: number, al: (n: number) => void, plurale: boolean) => (
    <>
      <p className="ct-lbl">Quanto {plurale ? 'scure devono essere le foto' : 'scura deve essere la foto'} · <b>{Math.round(valore)}%</b></p>
      <input className="ct-slider" type="range" min={0} max={100} value={valore} aria-label={`Quanto ${plurale ? 'scure devono essere le foto' : 'scura deve essere la foto'}`} onChange={(e) => al(Number(e.target.value))} />
      <div className="ct-scala"><small>{plurale ? 'Più chiare' : 'Più chiara'}</small><small>{plurale ? 'Più scure' : 'Più scura'}</small></div>
    </>
  );
  const cursore = (etichetta: string, valore: number, al: (n: number) => void) => (
    <label className="ct-r2"><span>{etichetta}</span><input type="range" min={0} max={100} value={valore} onChange={(e) => al(Number(e.target.value))} /></label>
  );

  const stato = pronto.errore ? '' : pronto.avvisi.join(' ');
  const statoEsito = !pronto.errore && !eCarosello && esito === 'OVERFLOW' ? { c: 'warn', t: 'Troppo testo: non entra. Accorcia la descrizione o togli qualche riga.' } : !pronto.errore && !eCarosello && esito === 'OK' ? { c: 'ok', t: 'Il testo entra bene.' } : { c: '', t: stato };

  const anteprima = (
    <div className="ct-stage" ref={stage}>
      {eCarosello
        ? <div className="ct-tabs">{slide.map((x, i) => <button type="button" key={i} aria-pressed={i === sel} onClick={() => setCar({ ...car, sel: i })}>{nomeSlide(x, i)}</button>)}</div>
        : social && <div className="ct-tabs">{m.formati.map((x) => <button type="button" key={x} aria-pressed={x === formato} onClick={() => setFmt(x)}>{NOME_FORMATO[x]}</button>)}</div>}
      <div className={`ct-stato ${statoEsito.c}`}>{statoEsito.t}</div>
      <div className="ct-cornice" style={{ width: W * scala, height: H * scala }}>
        {pronto.errore
          ? <div className="ct-err">{pronto.errore}</div>
          : <iframe ref={fr} title="Anteprima" scrolling="no" srcDoc={pronto.html} style={{ width: W, height: H, transform: `scale(${scala})` }} />}
      </div>
    </div>
  );

  const parteTipi = (
    <section className="card"><p className="eyebrow">Che volantino?</p>
      <div className="ct-tipi">{TIPI.map(([k, l]) => <button type="button" className="ct-tipo" key={k} aria-pressed={tipo === k} onClick={() => cambiaTipo(k)}>{l}</button>)}</div>
    </section>
  );

  const finestraFoto = sceltaFoto && <FinestraFoto onScegli={(u) => { scelta(u); setSceltaFoto(null); }} onChiudi={() => setSceltaFoto(null)} />;

  if (eCarosello) {
    const cur: SlideFinale = slide[sel] ?? slide[0];
    const eCta = cur?.tipo === 'cta';
    const rif = eCta ? car.cta : car.slides[sel] ?? car.slides[0];
    const agSlide = (patch: Partial<{ titolo: string; testo: string; x: number; y: number }>) => setCar((k) => (eCta ? { ...k, cta: { ...k.cta, ...patch } } : { ...k, slides: k.slides.map((s, i) => (i === sel ? { ...s, ...patch } : s)) }));
    const testo = (etichetta: string, valore: string, al: (v: string) => void, righe?: number) => (
      <label className="ct-f"><span>{etichetta}</span>{righe ? <textarea rows={righe} value={valore} onChange={(e) => al(e.target.value)} /> : <input type="text" value={valore} onChange={(e) => al(e.target.value)} />}</label>
    );
    const testi = cur.tipo === 'cover'
      ? <>{testo('Etichetta in alto', car.kicker, (v) => setCar({ ...car, kicker: v }))}{testo('Titolo (Invio per andare a capo)', car.titolo, (v) => setCar({ ...car, titolo: v }), 2)}{testo('Sottotitolo (facoltativo)', car.sub, (v) => setCar({ ...car, sub: v }))}</>
      : cur.tipo === 'interna'
        ? <>{testo('Titolo (facoltativo)', (rif as { titolo?: string }).titolo ?? '', (v) => agSlide({ titolo: v }), 2)}{testo('Testo (facoltativo)', (rif as { testo?: string }).testo ?? '', (v) => agSlide({ testo: v }), 3)}</>
        : (
          <>
            {testo('Titolo', car.cta.titolo, (v) => setCar({ ...car, cta: { ...car.cta, titolo: v } }), 2)}{testo('Testo', car.cta.testo, (v) => setCar({ ...car, cta: { ...car.cta, testo: v } }), 2)}{testo('Testo del bottone', car.cta.bottone, (v) => setCar({ ...car, cta: { ...car.cta, bottone: v } }))}
            <p className="ct-lbl">Dove si svolge</p>
            <div className="chips"><Chip acceso={car.luogo === 'tribu'} onClick={() => setCar({ ...car, luogo: 'tribu' })}>Cassola</Chip><Chip acceso={car.luogo === 'pozzo'} onClick={() => setCar({ ...car, luogo: 'pozzo' })}>Colico</Chip></div>
          </>
        );
    const sposta = (verso: number) => {
      const j = sel + verso;
      if (sel >= car.slides.length || j < 0 || j >= car.slides.length) return;
      const s = [...car.slides];
      [s[sel], s[j]] = [s[j], s[sel]];
      setCar({ ...car, slides: s, sel: j });
    };
    const togli = () => { if (sel < car.slides.length && car.slides.length > 1) setCar({ ...car, slides: car.slides.filter((_, i) => i !== sel), sel: Math.max(0, sel - 1) }); };
    const n = slide.length;
    return (
      <>
        <p className="eyebrow">Contenuti</p>
        <h1>Post e storie, <em>già impaginati.</em></h1>
        <div className="ct">
          <div className="ct-form">
            <section className="card"><p className="eyebrow">Parti da un evento</p>{chipEventi}</section>
            {parteTipi}
            <section className="card"><p className="eyebrow">Foto del carosello · {n} di {MAX_SLIDE}</p>
              <div className="ct-strip">
                {slide.map((x, i) => <button type="button" className={`ct-sl ${i === sel ? 'on' : ''}`} key={i} onClick={() => setCar({ ...car, sel: i })} style={{ backgroundImage: `url('${x.foto}')` }}><i>{nomeSlide(x, i)}</i></button>)}
                {n < MAX_SLIDE && <button type="button" className="ct-sl add" onClick={() => setSceltaFoto('aggiungi')}><i>+ Foto</i></button>}
              </div>
              <p className="ct-lbl">Slide selezionata: {nomeSlide(cur, sel)}</p>
              <div className="ct-azioni">
                <Bottone variante="secondario" piccolo onClick={() => setSceltaFoto(car.cta.on && sel === car.slides.length ? 'cta' : 'cambia')}>Cambia foto</Bottone>
                {!eCta && (
                  <>
                    <Bottone variante="secondario" piccolo disabled={sel === 0} onClick={() => sposta(-1)}>← Prima</Bottone>
                    <Bottone variante="secondario" piccolo disabled={sel >= car.slides.length - 1} onClick={() => sposta(1)}>Dopo →</Bottone>
                    <Bottone variante="secondario" piccolo disabled={car.slides.length <= 1} onClick={togli}>Togli</Bottone>
                  </>
                )}
              </div>
              <p className="ct-lbl">Testo della slide · {nomeSlide(cur, sel)}</p>{testi}
              <div style={{ marginTop: 12 }}>{cursore('Orizzontale', rif.x, (v) => agSlide({ x: v }))}{cursore('Verticale', rif.y, (v) => agSlide({ y: v }))}</div>
              {luminosita(lumN(car.lum), (v) => setCar({ ...car, lum: v }), true)}
              <p className="muted small" style={{ marginTop: 10 }}>Se lasci vuoti titolo e testo, la slide ha solo il logo e la foto.</p>
            </section>
            <section className="card"><p className="eyebrow">Ultima slide con bottone</p>
              <div className="chips"><Chip acceso={car.cta.on} onClick={() => setCar({ ...car, cta: { ...car.cta, on: !car.cta.on }, sel: !car.cta.on ? car.slides.length : Math.min(car.sel, car.slides.length - 1) })}>{car.cta.on ? 'Inclusa' : 'Aggiungila'}</Chip></div>
              <p className="muted small" style={{ margin: `8px 0 ${car.cta.on ? 14 : 0}px` }}>Mettila solo se c'è un prossimo appuntamento o un'offerta vera. Altrimenti chiudi con una foto.</p>
              {car.cta.on && <p className="muted small">Il testo di questa slide lo scrivi selezionandola qui sopra.</p>}
            </section>
            {carteDidascalia}
            <section className="card"><p className="eyebrow">Salva</p>
              <label className="ct-f"><span>Nome dei file (se vuoto uso il titolo)</span><input type="text" value={String(d._nome ?? '')} placeholder="es. torsioni-25-ottobre" onChange={(e) => imposta('_nome', e.target.value)} /></label>
              <div className="ct-azioni"><Bottone disabled={occupato} onClick={() => void esportaCarosello()}>{occupato ? 'Sto creando le immagini…' : `Esporta le ${n} slide`}</Bottone></div>
              {risultati}
            </section>
          </div>
          {anteprima}
        </div>
        {finestraFoto}
      </>
    );
  }

  return (
    <>
      <p className="eyebrow">Contenuti</p>
      <h1>Post e storie, <em>già impaginati.</em></h1>
      <div className="ct">
        <div className="ct-form">
          <section className="card"><p className="eyebrow">Parti da un evento</p>
            {chipEventi}
            <p className="muted small" style={{ marginTop: 8 }}>Compila titolo, data, orario, quota e luogo dall'evento. Poi ritocchi quello che vuoi.</p>
            {nomiBozze.length > 0 && (
              <label className="ct-f" style={{ marginTop: 12 }}><span>Oppure apri una bozza</span>
                <select value="" onChange={(e) => { const b = bozze[e.target.value]; if (b) { setTipo(b.tipo); setD(b.d); setEv(null); } }}>
                  <option value="">Apri una bozza…</option>{nomiBozze.map((n) => <option key={n}>{n}</option>)}
                </select>
              </label>
            )}
          </section>
          {parteTipi}
          {social && (
            <section className="card"><p className="eyebrow">Foto</p>
              <div className="ct-fotobox">
                <img src={String(d.FOTO ?? '')} alt="" />
                <div>
                  <Bottone variante="secondario" piccolo style={{ margin: 0 }} onClick={() => setSceltaFoto('singola')}>{d.FOTO ? 'Cambia foto' : 'Scegli una foto'}</Bottone>
                  <small>{String(d.FOTO ?? '').startsWith('data:') ? 'Foto caricata da te' : String(d.FOTO ?? '') || 'Nessuna foto scelta'}</small>
                </div>
              </div>
              {cursore('Orizzontale', Number(d.FOTO_X ?? 50), (v) => imposta('FOTO_X', v))}
              {cursore('Verticale', Number(d.FOTO_Y ?? 40), (v) => imposta('FOTO_Y', v))}
              {luminosita(lumN(d.LUMINOSITA), (v) => imposta('LUMINOSITA', v), false)}
            </section>
          )}
          <section className="card"><p className="eyebrow">Testi</p>
            {m.campi.map((cp) => (eGruppo(cp)
              ? <div className="ct-gruppo" key={cp.gruppo}><b>{cp.gruppo} (facoltativa)</b><div className="ct-riga3">{cp.campi.map(campo)}</div></div>
              : campo(cp)))}
            <p className="muted small">Per il grassetto scrivi la parola tra due asterischi doppi: **così**. Le righe che lasci vuote spariscono dal volantino.</p>
            <details className="ct-det"><summary>Cambia le parti fisse (di solito no)</summary>
              {fisso('ETICHETTA', 'Etichetta in alto', m.etichetta)}
              {social
                ? (
                  <>
                    {fisso('CTA', 'Testo del bottone', m.cta)}{fisso('LUOGO', 'Indirizzo (solo se fuori sede)', m.luogo)}
                    <label className="ct-f"><span>Telefono (di solito 328 767 5966)</span>
                      <input type="text" list="ct-tel" value={String(d.TELEFONO ?? m.telefono)} onChange={(e) => imposta('TELEFONO', e.target.value)} />
                      <datalist id="ct-tel">{TELEFONI.map(([n, x]) => <option key={n} value={n}>{x}</option>)}</datalist>
                    </label>
                  </>
                )
                : fisso('FIRMA', 'Firma in fondo', m.firma)}
            </details>
          </section>
          {carteDidascalia}
          <section className="card"><p className="eyebrow">Salva</p>
            <label className="ct-f"><span>Nome del file (se vuoto uso il titolo)</span><input type="text" value={String(d._nome ?? '')} placeholder="es. torsioni-18-ottobre" onChange={(e) => imposta('_nome', e.target.value)} /></label>
            <div className="ct-azioni">
              <Bottone disabled={occupato} onClick={() => void esporta(m.formati)}>{occupato ? 'Sto creando le immagini…' : social ? 'Esporta post e storia' : 'Esporta il foglio'}</Bottone>
              {social && <Bottone variante="secondario" disabled={occupato} onClick={() => void esporta(['post'])}>Solo post</Bottone>}
              {social && <Bottone variante="secondario" disabled={occupato} onClick={() => void esporta(['storia'])}>Solo storia</Bottone>}
              <Bottone variante="secondario" onClick={() => { setAvviso(`Bozza salvata: ${salvaBozza('', tipo, d)}`); setBozze(leggiBozze()); }}>Salva bozza</Bottone>
            </div>
            {avviso && <p className="muted small" role="status" style={{ marginTop: 8 }}>{avviso}</p>}
            {risultati}
          </section>
        </div>
        {anteprima}
      </div>
      {finestraFoto}
    </>
  );
}

// Scelta della foto: quelle del sito, oppure una caricata dal telefono o dal computer (resta nel browser, non viene salvata).
function FinestraFoto({ onScegli, onChiudi }: { onScegli: (url: string) => void; onChiudi: () => void }) {
  const [q, setQ] = useState('');
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onChiudi(); };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [onChiudi]);
  const trovate = FOTO.filter((p) => p.toLowerCase().includes(q.toLowerCase())).slice(0, 300);
  return (
    <div className="ct-modal" onClick={(e) => { if (e.target === e.currentTarget) onChiudi(); }}>
      <div className="ct-box">
        <div className="ct-mt">
          <input type="text" placeholder="Cerca una foto per nome o cartella" aria-label="Cerca una foto" autoFocus value={q} onChange={(e) => setQ(e.target.value)} />
          <label className="btn sm ghost">Carica una foto nuova
            <input type="file" accept="image/*" multiple hidden onChange={async (e) => {
              const fl = [...(e.target.files ?? [])];
              e.target.value = '';
              if (!fl.length) return;
              const urls = await Promise.all(fl.map((f) => new Promise<string>((r) => { const rd = new FileReader(); rd.onload = () => r(String(rd.result)); rd.readAsDataURL(f); })));
              urls.forEach(onScegli);
            }} />
          </label>
          <Bottone piccolo onClick={onChiudi}>Chiudi</Bottone>
        </div>
        <div className="ct-gr">
          {trovate.map((p) => <button type="button" key={p} title={p} onClick={() => onScegli(p)}><img loading="lazy" src={p} alt="" /><small>{p.split('/').slice(-2).join('/')}</small></button>)}
          {trovate.length === 0 && <p className="muted">Nessuna foto trovata.</p>}
        </div>
      </div>
    </div>
  );
}
