import { useCallback, useEffect, useState } from 'react';
import type { StudioId } from '@/config/tema';
import * as realeCiclo from '@/data/ciclo';
import * as realeEventi from '@/data/eventi';
import { chiaveMese, mesiDelCiclo, nomeSeminario, STAGIONI, TEMA_VUOTO, validaTema, type TemaMese } from '@/domain/ciclo';
import { oggi } from '@/domain/date';
import type { Evento } from '@/domain/eventi';
import { intervallo, MESI_LUNGHI } from '@/domain/formati';

// Stesso markup di studioCiclo() del prototipo (.cy-g, .cy-h, .cy-m, .cy-s, .bform, anteprima .tema-pre).
export function Ciclo({ studio, api = realeCiclo, apiEventi = realeEventi }: { studio: StudioId; api?: typeof realeCiclo; apiEventi?: typeof realeEventi }) {
  const giorno = oggi();
  const gruppi = mesiDelCiclo(giorno);
  const [temi, setTemi] = useState<Map<string, TemaMese> | null>(null);
  const [eventi, setEventi] = useState<Evento[]>([]);
  const [sel, setSel] = useState(chiaveMese(giorno));
  const [f, setF] = useState<TemaMese>(TEMA_VUOTO);
  const [msg, setMsg] = useState('');

  const carica = useCallback(async () => {
    const [t, e] = await Promise.all([api.elencaTemi(studio), apiEventi.elencaEventi()]);
    setTemi(t ?? new Map());
    setEventi(e ?? []);
  }, [api, apiEventi, studio]);
  useEffect(() => {
    void carica();
  }, [carica]);
  useEffect(() => {
    setF(temi?.get(sel) ?? TEMA_VUOTO);
    setMsg('');
  }, [sel, temi]);

  if (temi === null) return <p className="muted">Carico il ciclo…</p>;

  const mesi = gruppi.flat();
  const m = mesi.find((x) => x.chiave === sel) ?? mesi[0];
  const st = STAGIONI[m.stagione];
  const salva = async (nuovo: TemaMese) => {
    setF(nuovo);
    const v = validaTema(nuovo);
    if (!v.ok) return setMsg(v.motivo);
    setMsg('');
    const e = await api.salvaTema(studio, sel, nuovo);
    if (!e.ok) return setMsg(e.motivo);
    setTemi(new Map(temi).set(sel, nuovo));
  };

  return (
    <>
      <p className="muted" style={{ maxWidth: 640, margin: '-8px 0 20px' }}>Ogni stagione ha tre temi mensili e un seminario di chiusura. Ogni mese: un tema, un articolo, quattro post, un approfondimento a metà mese e un libro. I testi qui sotto sono di esempio: scrivi i tuoi.</p>
      <div className="two">
        <section>
          {gruppi.map((g) => {
            const s = STAGIONI[g[0].stagione];
            const da = `${g[0].chiave}-01`;
            const a = `${g[2].chiave}-31`;
            const sem = eventi.find((e) => e.tipo === 'seminario' && e.da >= da && e.da <= a);
            return (
              <div className="cy-g" key={g[0].chiave}>
                <div className="cy-h" style={{ ['--c' as string]: s.colore }}><b>{s.etichetta}</b><small>{s.date}</small></div>
                {g.map((x) => {
                  const t = temi.get(x.chiave);
                  return (
                    <button type="button" key={x.chiave} className={`cy-m ${x.chiave === sel ? 'on' : ''}`} style={{ ['--c' as string]: s.colore }} onClick={() => setSel(x.chiave)}>
                      <span>{MESI_LUNGHI[x.mese]}{x.anno !== Number(giorno.slice(0, 4)) ? ` ${x.anno}` : ''}</span><b>{t?.tema ? t.tema : 'Da definire'}</b>
                    </button>
                  );
                })}
                <div className="cy-s"><b>{nomeSeminario(g[0].stagione)}</b> · {sem ? `${intervallo(sem.da, sem.a)} · ${sem.titolo}` : 'da programmare'}</div>
              </div>
            );
          })}
        </section>
        <section>
          <div className="bform">
            <p className="eyebrow">{MESI_LUNGHI[m.mese]} {m.anno} · <span style={{ color: st.colore }}>{st.etichetta}</span></p>
            <label className="nl">Tema (una parola)<input value={f.tema} onChange={(e) => setF({ ...f, tema: e.target.value })} onBlur={() => void salva(f)} placeholder="Per esempio: Osservare" /></label>
            <label className="nl">Spiegazione, due righe<textarea rows={3} value={f.testo} onChange={(e) => setF({ ...f, testo: e.target.value })} onBlur={() => void salva(f)} placeholder="Di cosa parliamo questo mese"></textarea></label>
            <div className="dates">
              <label>Libro consigliato<input value={f.libro} onChange={(e) => setF({ ...f, libro: e.target.value })} onBlur={() => void salva(f)} placeholder="Titolo" /></label>
              <label>Autore<input value={f.autore} onChange={(e) => setF({ ...f, autore: e.target.value })} onBlur={() => void salva(f)} placeholder="Autore" /></label>
            </div>
            <label className="nl">Articolo del blog (indirizzo breve, lo leggono nell'app)<input value={f.articolo} onChange={(e) => setF({ ...f, articolo: e.target.value })} onBlur={() => void salva(f)} placeholder="Vuoto: quello con lo stesso tema" /></label>
            <p className="eyebrow" style={{ marginTop: 18 }}>Come lo vedono gli allievi</p>
            {f.tema
              ? <div className="card tema tema-pre" style={{ ['--c' as string]: st.colore }}><p className="eyebrow">Tema del mese · {MESI_LUNGHI[m.mese]}</p><h3 className="tema-w">{f.tema}</h3><p className="tema-p">{f.testo || '…'}</p></div>
              : <p className="muted small">Scrivi il tema per vedere l'anteprima.</p>}
            {msg && <p className="note" role="alert">{msg}</p>}
            <p className="note">Appare nella Home dell'app, nel mese giusto, con il colore della stagione. L'approfondimento a metà mese lo prende da solo dagli eventi. Si salva da solo quando esci dal campo.</p>
          </div>
        </section>
      </div>
    </>
  );
}
