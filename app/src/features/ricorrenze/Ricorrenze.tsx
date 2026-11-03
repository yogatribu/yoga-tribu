import { useCallback, useEffect, useState } from 'react';
import { Compositore } from '@/design/Compositore';
import { COMUNITA, type StudioId } from '@/config/tema';
import * as reale from '@/data/persone';
import * as realeImpostazioni from '@/data/impostazioni';
import { aggiungiGiorni, giornoDellaSettimana, oggi } from '@/domain/date';
import { fdate, MESI_BREVI, MESI_LUNGHI } from '@/domain/formati';
import { numeroWhatsApp } from '@/domain/leads';
import { testoMessaggio } from '@/domain/messaggi';
import { nomeCompleto, ricorrenze, type Ricorrenza } from '@/domain/persone';

// Stesso markup e stesse classi di studioRicorrenze() del prototipo: calendario del mese a sinistra, elenco a destra.
// Il regalo automatico (migrazione 0013) lo fa il database ogni mattina se è acceso qui; in ogni caso la lezione in omaggio si può dare a mano.
export type ApiRicorrenze = typeof reale;
export type ApiRegalo = Pick<typeof realeImpostazioni, 'leggiRegaloAutomatico' | 'salvaRegaloAutomatico'>;

function meseDopo(primo: string, n: number): string {
  const [a, m] = primo.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1 + n, 1)).toISOString().slice(0, 10);
}

export function Ricorrenze({ studio, puoRegalare, faPercorsi = false, api = reale, apiRegalo = realeImpostazioni }: { studio: StudioId; puoRegalare: boolean; faPercorsi?: boolean; api?: ApiRicorrenze; apiRegalo?: ApiRegalo }) {
  const [diSara, setDiSara] = useState<Set<string>>(new Set());
  const [auto, setAuto] = useState<{ compleanni: boolean; anniversari: boolean } | null>(null);
  const [primo, setPrimo] = useState(() => `${oggi().slice(0, 7)}-01`);
  const [elenco, setElenco] = useState<Ricorrenza[] | null>(null);
  const [errore, setErrore] = useState(false);
  const [giornoSel, setGiornoSel] = useState<string | null>(null);
  const [fatti, setFatti] = useState<Set<string>>(new Set());
  const [dati, setDati] = useState<Set<string>>(new Set());
  const [msg, setMsg] = useState('');
  const [scrivendo, setScrivendo] = useState<Ricorrenza | null>(null);

  const carica = useCallback(async () => {
    const persone = await api.elencaPersone(studio);
    if (persone === null) return setErrore(true);
    setErrore(false);
    setElenco(ricorrenze(persone.map((s) => s.persona), primo, aggiungiGiorni(meseDopo(primo, 1), -1)));
  }, [api, studio, primo]);

  useEffect(() => {
    void carica();
  }, [carica]);
  useEffect(() => {
    void apiRegalo.leggiRegaloAutomatico(studio).then(setAuto);
    void api.regaliFatti(studio).then((x) => setDati(x));
    if (!faPercorsi) void api.personeDiSara(studio).then(setDiSara);
  }, [apiRegalo, api, studio, faPercorsi]);

  if (errore) return <p className="muted">Non riesco a caricare le ricorrenze. Riprova tra poco.</p>;
  if (elenco === null) return <p className="muted">Carico le ricorrenze…</p>;

  const giorno = oggi();
  const [anno, mese] = primo.split('-').map(Number);
  const giorniMese = new Date(anno, mese, 0).getDate();
  const vuote = (giornoDellaSettimana(primo) + 6) % 7;
  const lista = giornoSel ? elenco.filter((r) => r.data === giornoSel) : elenco;
  const titolo = giornoSel ? fdate(giornoSel) : `${MESI_LUNGHI[mese - 1]} ${anno}`;

  return (
    <>
      <p className="eyebrow">Ricorrenze</p>
      <h1>Compleanni e <em>anniversari</em> della {COMUNITA[studio]}.</h1>
      <div className="two" style={{ marginTop: 8 }}>
        <section>
          <div className="cal-h">
            <button type="button" aria-label="Mese precedente" onClick={() => { setPrimo(meseDopo(primo, -1)); setGiornoSel(null); }}>‹</button>
            <h3>{MESI_LUNGHI[mese - 1]} {anno}</h3>
            <button type="button" aria-label="Mese successivo" onClick={() => { setPrimo(meseDopo(primo, 1)); setGiornoSel(null); }}>›</button>
          </div>
          <div className="cal">
            <div className="cal-w">{['L', 'M', 'M', 'G', 'V', 'S', 'D'].map((x, i) => <small key={i}>{x}</small>)}</div>
            <div className="cal-g">
              {Array.from({ length: vuote }, (_, i) => <span key={`v${i}`}></span>)}
              {Array.from({ length: giorniMese }, (_, i) => {
                const data = `${primo.slice(0, 7)}-${String(i + 1).padStart(2, '0')}`;
                const k = elenco.filter((r) => r.data === data);
                return (
                  <button type="button" key={data} className={`cd ${data === giorno ? 'today' : ''} ${giornoSel === data ? 'sel' : ''}`} onClick={() => setGiornoSel(data)}>
                    <b>{i + 1}</b>
                    <span>{k.some((r) => r.tipo === 'compleanno') && <i className="b"></i>}{k.some((r) => r.tipo === 'anniversario') && <i className="a"></i>}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="chips" style={{ marginTop: 12 }}>
            <span className="lg"><i className="b"></i>Compleanno</span>
            <span className="lg"><i className="a"></i>Anniversario di iscrizione</span>
          </div>
          {puoRegalare && auto && (
            <div className="auto">
              <p className="eyebrow">Regalo automatico</p>
              <p className="muted small" style={{ marginBottom: 6 }}>Invia da solo una lezione in omaggio, il giorno della ricorrenza.</p>
              {([['compleanni', 'Compleanni'], ['anniversari', 'Anniversari']] as const).map(([k, nome]) => (
                <div className="set" key={k}>
                  <div><b>{nome}</b></div>
                  <button type="button" className={`sw ${auto[k] ? 'on' : ''}`} role="switch" aria-checked={auto[k]} onClick={async () => {
                    const esito = await apiRegalo.salvaRegaloAutomatico(studio, k, !auto[k]);
                    if (!esito.ok) return setMsg(esito.motivo);
                    setMsg('');
                    setAuto({ ...auto, [k]: !auto[k] });
                  }}><i></i></button>
                </div>
              ))}
            </div>
          )}
        </section>
        <section>
          <h3>{titolo} {giornoSel && <button type="button" className="chip" onClick={() => setGiornoSel(null)}>Mostra tutto il mese</button>}</h3>
          {lista.length === 0 && <p className="muted">Nessuna ricorrenza.</p>}
          {lista.map((r) => {
            const chiave = `${r.tipo}|${r.persona.id}|${r.data}`;
            const numero = r.persona.telefono ? numeroWhatsApp(r.persona.telefono) : '';
            const motivoRegalo = `Omaggio ${r.tipo} ${r.data.slice(0, 4)}`;
            const [, m, g] = r.data.split('-').map(Number);
            return (
              <div className="cash-r" key={chiave}>
                <div className="al-m">
                  <b>{nomeCompleto(r.persona)}</b>
                  <small>{r.tipo === 'compleanno' ? 'Compleanno' : `${r.anni} ${r.anni === 1 ? 'anno' : 'anni'} dall'iscrizione`} · {g} {MESI_BREVI[m - 1]}{r.tipo === 'anniversario' ? ` · iscrizione del ${fdate(r.persona.iscrittoIl)}` : ''}</small>
                </div>
                <div className="chips">
                  {diSara.has(r.persona.id) && <span className="given">La segue Sara: scrive lei</span>}
                  {!diSara.has(r.persona.id) && (numero || r.persona.email) && <button type="button" className="btn sm ghost" onClick={() => setScrivendo(r)}>Auguri</button>}
                  {puoRegalare && !r.persona.creditiIllimitati && (r.persona.creditiIllimitati ? null : fatti.has(chiave) || dati.has(`${motivoRegalo}|${r.persona.id}`)
                    ? <span className="given">Lezione regalata</span>
                    : auto?.[r.tipo === 'compleanno' ? 'compleanni' : 'anniversari'] && r.data >= giorno
                    ? <span className="given">Regalo automatico</span>
                    : <button type="button" className="btn sm ghost" onClick={async () => {
                        const esito = await api.regalaLezione(studio, r.persona.id, motivoRegalo);
                        if (!esito.ok) return setMsg(esito.motivo);
                        setMsg('');
                        setFatti(new Set(fatti).add(chiave));
                      }}>Regala una lezione</button>)}
                  {r.persona.creditiIllimitati && <span className="given">Crediti illimitati</span>}
                </div>
              </div>
            );
          })}
          {msg && <p className="note" role="alert">{msg}</p>}
        </section>
      </div>
      {scrivendo && (
        <Compositore
          nome={nomeCompleto(scrivendo.persona)}
          whatsapp={scrivendo.persona.telefono ? numeroWhatsApp(scrivendo.persona.telefono) : ''}
          email={scrivendo.persona.email}
          testo={testoMessaggio(scrivendo.tipo, { nome: nomeCompleto(scrivendo.persona), comunita: studio === 'tribu' ? 'tribù' : 'Pozzo', anni: scrivendo.anni })}
          onChiudi={() => setScrivendo(null)}
          onInviato={() => setScrivendo(null)}
        />
      )}
    </>
  );
}
