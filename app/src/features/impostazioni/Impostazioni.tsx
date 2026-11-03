import { useCallback, useEffect, useState } from 'react';
import { Chip } from '@/design/Chip';
import { Conferma } from '@/design/Conferma';
import { FOTO_INSEGNANTI, STILI_INSEGNANTI, type StudioId } from '@/config/tema';
import * as reale from '@/data/impostazioni';
import { emailValida } from '@/domain/accesso';
import type { Esito } from '@/data/impostazioni';
import {
  leggiOpzioni, maiuscole, maiuscoleScrivendo, puoTogliere, validaCampo, validaNuovoInsegnante, type CampoContatto, type Insegnante,
} from '@/domain/impostazioni';

// Stesso markup e stesse classi di studioImpostazioni(), impInsCard(), impNuovo() e impCampi() del prototipo.
// Aggiungere un insegnante lo mette nell'elenco dello studio; chi entra con la sua email riceve da solo il ruolo (migrazioni 0008 e 0012).
export type ApiImpostazioni = typeof reale;

type Chiedi = { titolo: string; testo: string; ok: string; pericolo?: boolean; fn: () => Promise<Esito> } | null;

export function Impostazioni({ studio, eTitolare, api = reale }: { studio: StudioId; eTitolare: boolean; api?: ApiImpostazioni }) {
  const [sez, setSez] = useState<'insegnanti' | 'campi'>('insegnanti');
  const [ins, setIns] = useState<Insegnante[] | null>(null);
  const [campi, setCampi] = useState<CampoContatto[] | null>(null);
  const [fisse, setFisse] = useState<Record<string, { stili: string[]; quante: number }>>({});
  const [errore, setErrore] = useState(false);
  const [msg, setMsg] = useState('');
  // Il motivo per cui un insegnante non si può togliere compare sotto il suo pulsante, non in fondo alla pagina dove non si vede.
  const [msgIns, setMsgIns] = useState<{ id: string; testo: string } | null>(null);
  const [chiedi, setChiedi] = useState<Chiedi>(null);
  const [nuovo, setNuovo] = useState<{ nome: string; email: string; stili: string[]; priv: boolean; resp: boolean } | null>(null);
  const [nuovoCampo, setNuovoCampo] = useState<{ nome: string; tipo: CampoContatto['tipo']; opzioni: string } | null>(null);

  const carica = useCallback(async () => {
    const [i, c] = await Promise.all([api.elencaInsegnanti(studio), api.elencaCampi(studio)]);
    if (i === null || c === null) return setErrore(true);
    setErrore(false);
    setIns(i);
    setCampi(c);
    const f: Record<string, { stili: string[]; quante: number }> = {};
    for (const x of i) f[x.nome] = (await api.lezioniFisse(studio, x.nome)) ?? { stili: [], quante: 0 };
    setFisse(f);
  }, [api, studio]);

  useEffect(() => {
    void carica();
  }, [carica]);

  async function esegui(azione: () => Promise<Esito>, dopo?: () => void) {
    const esito = await azione();
    if (!esito.ok) return setMsg(esito.motivo);
    setMsg('');
    dopo?.();
    await carica();
  }

  if (errore) return <p className="muted">Non riesco a caricare le impostazioni. Riprova tra poco.</p>;
  if (ins === null || campi === null) return <p className="muted">Carico le impostazioni…</p>;

  const stili = STILI_INSEGNANTI[studio];
  const foto = FOTO_INSEGNANTI[studio];
  const avatar = (n: string) => (foto[n] ? <img src={foto[n]} alt={n} title={n} /> : <span className="tch-i" title={n}>{n.charAt(0)}</span>);
  const stiliChips = (sel: string[], blocca: string[], onClick: (k: string) => void) => (
    <div className="chips">
      {stili.map(([k, t]) => blocca.includes(k)
        ? <span key={k} className="chip on lock" title="Insegna già lezioni di questo stile">{t}</span>
        : <Chip key={k} acceso={sel.includes(k)} onClick={() => onClick(k)}>{t}</Chip>)}
    </div>
  );
  const interruttore = (acceso: boolean, onClick: () => void, disabilitato = false) => (
    <button type="button" className={`sw ${acceso ? 'on' : ''}`} role="switch" aria-checked={acceso} disabled={disabilitato} onClick={onClick}><i></i></button>
  );

  function aggiungi() {
    if (!nuovo) return;
    const v = validaNuovoInsegnante(nuovo.nome, nuovo.email, ins ?? []);
    if (!v.ok) return setMsg(v.motivo);
    const nome = maiuscole(nuovo.nome).slice(0, 24);
    setChiedi({
      titolo: `Aggiungere ${nome}?`,
      testo: `Compare subito tra gli insegnanti da scegliere nel programma${nuovo.priv ? ' e nelle lezioni private' : ''}.${nuovo.resp && eTitolare ? ' Sarà indicato come responsabile.' : ''}${nuovo.email.trim() ? ' Per entrare nell\'app basta che usi questa email: il ruolo lo riceve da solo.' : ' Senza email non può ancora entrare nell\'app.'}`,
      ok: 'Aggiungi',
      fn: () => api.aggiungiInsegnante(studio, { nome, email: nuovo.email, stili: nuovo.stili, faPrivate: nuovo.priv, responsabile: nuovo.resp && eTitolare }),
    });
  }

  return (
    <>
      <div className="seg" style={{ maxWidth: 380, marginBottom: 22 }}>
        <button type="button" className={sez === 'insegnanti' ? 'on' : ''} onClick={() => setSez('insegnanti')}>Insegnanti</button>
        <button type="button" className={sez === 'campi' ? 'on' : ''} onClick={() => setSez('campi')}>Campi dei contatti</button>
      </div>

      {sez === 'insegnanti' && (
        <>
          <p className="eyebrow">Impostazioni</p>
          <h1>Chi <em>insegna</em> da voi.</h1>
          <p className="muted" style={{ marginBottom: 18 }}>Le cose che non cambiano quasi mai. Si cambiano dal computer, e solo i responsabili possono farlo.</p>
          <div className="imp-g">
            <section className="card imp-i">
              <div className="imp-h"><span className="tch"><span className="tch-i">A</span></span><div><b>Andrea</b><small>Titolare</small></div><em className="st" style={{ ['--c' as string]: '#7a9d6e' }}>Responsabile</em></div>
              <p className="muted small">Il titolare è sempre responsabile e non si può togliere.</p>
            </section>
            {ins.map((t) => {
              const f = fisse[t.nome] ?? { stili: [], quante: 0 };
              return (
                <section className="card imp-i" key={t.id}>
                  <div className="imp-h">
                    <span className="tch">{avatar(t.nome)}</span>
                    <div><b>{t.nome}</b><small>{f.quante ? `${f.quante} ${f.quante === 1 ? 'lezione' : 'lezioni'} fisse a settimana` : 'Nessuna lezione fissa'}{t.email ? ` · ${t.email}` : ''}</small></div>
                    {t.responsabile && <em className="st" style={{ ['--c' as string]: '#7a9d6e' }}>Responsabile</em>}
                  </div>
                  <EmailInsegnante key={`${t.id}${t.email ?? ''}`} email={t.email} onSalva={(v) => void esegui(() => api.aggiornaInsegnante(t.id, { email: v }))} />
                  <p className="eyebrow">Stili che insegna</p>
                  {stiliChips(t.stili, f.stili, (k) => void esegui(() => api.aggiornaInsegnante(t.id, { stili: t.stili.includes(k) ? t.stili.filter((x) => x !== k) : [...t.stili, k] })))}
                  <div className="set">
                    <div><b>Fa lezioni private</b><small>{t.faPrivate ? 'Gli allievi possono sceglierlo. Gli orari li imposta da Lezioni private.' : 'Non compare tra gli insegnanti delle private perché non ha dato nessun orario.'}</small></div>
                    {interruttore(t.faPrivate, () => void esegui(() => api.aggiornaInsegnante(t.id, { faPrivate: !t.faPrivate })))}
                  </div>
                  <div className="set">
                    <div><b>Responsabile</b><small>{eTitolare ? 'Gestisce programma, insegnanti e prezzi, e vede le statistiche.' : 'Lo cambia solo il titolare.'}</small></div>
                    {interruttore(t.responsabile, () => setChiedi({
                      titolo: t.responsabile ? `Togliere ${t.nome} dai responsabili?` : `Rendere ${t.nome} responsabile?`,
                      testo: t.responsabile ? 'Non potrà più cambiare programma, insegnanti e prezzi, né vedere le statistiche. Resta tra gli insegnanti.' : 'Potrà cambiare programma, insegnanti e prezzi e vedere le statistiche.',
                      ok: t.responsabile ? 'Sì, toglilo' : 'Sì, rendilo responsabile', pericolo: t.responsabile,
                      fn: () => api.aggiornaInsegnante(t.id, { responsabile: !t.responsabile }),
                    }), !eTitolare)}
                  </div>
                  <button type="button" className="btn-del" onClick={() => {
                    const v = puoTogliere(f.quante);
                    if (!v.ok) return setMsgIns({ id: t.id, testo: `${t.nome}: ${v.motivo.charAt(0).toLowerCase()}${v.motivo.slice(1)}` });
                    setMsgIns(null);
                    setChiedi({ titolo: `Togliere ${t.nome} dagli insegnanti?`, testo: 'Non compare più tra gli insegnanti da scegliere e non riceve più richieste di lezioni private.', ok: 'Sì, toglilo', pericolo: true, fn: () => api.togliInsegnante(t.id) });
                  }}>Togli dagli insegnanti</button>
                  {msgIns?.id === t.id && <p className="note" role="alert">{msgIns.testo}</p>}
                </section>
              );
            })}
          </div>
          {nuovo ? (
            <section className="card imp-i imp-n">
              <p className="eyebrow">Nuovo insegnante</p>
              <label className="nl">Nome<input value={nuovo.nome} onChange={(e) => setNuovo({ ...nuovo, nome: maiuscoleScrivendo(e.target.value) })} placeholder="Per esempio: Marta" /></label>
              <label className="nl">Email<input type="email" value={nuovo.email} onChange={(e) => setNuovo({ ...nuovo, email: e.target.value })} placeholder="marta@esempio.it" /><small style={{ display: 'block', marginTop: 6, fontSize: 12, color: 'var(--t-mut)' }}>Con questa email entra nell'app. Senza email non può entrare.</small></label>
              <p className="eyebrow" style={{ marginTop: 14 }}>Stili che insegna</p>
              {stiliChips(nuovo.stili, [], (k) => setNuovo({ ...nuovo, stili: nuovo.stili.includes(k) ? nuovo.stili.filter((x) => x !== k) : [...nuovo.stili, k] }))}
              <div className="set">
                <div><b>Fa lezioni private</b><small>Poi gli orari li cambia l'insegnante da Lezioni private.</small></div>
                {interruttore(nuovo.priv, () => setNuovo({ ...nuovo, priv: !nuovo.priv }))}
              </div>
              {eTitolare && (
                <div className="set">
                  <div><b>Responsabile</b><small>Gestisce programma, insegnanti e prezzi, e vede le statistiche.</small></div>
                  {interruttore(nuovo.resp, () => setNuovo({ ...nuovo, resp: !nuovo.resp }))}
                </div>
              )}
              <button type="button" className="btn wide" onClick={aggiungi}>Aggiungi l'insegnante</button>
              <button type="button" className="btn ghost wide" style={{ marginTop: 10 }} onClick={() => setNuovo(null)}>Annulla</button>
            </section>
          ) : (
            <button type="button" className="btn" style={{ marginTop: 14 }} onClick={() => setNuovo({ nome: '', email: '', stili: [], priv: false, resp: false })}>+ Aggiungi un insegnante</button>
          )}
        </>
      )}

      {sez === 'campi' && (
        <>
          <p className="eyebrow">Impostazioni</p>
          <h1>Cosa vuoi sapere dei <em>contatti.</em></h1>
          <p className="muted" style={{ marginBottom: 18 }}>Aggiungi le domande che ti servono (per esempio: che obiettivo ha, che esperienza). Compaiono nella scheda di ogni contatto, e finiscono anche nel rapporto per l'AI.</p>
          <div className="imp-g">
            {campi.length === 0 && <p className="muted">Nessun campo.</p>}
            {campi.map((c) => (
              <section className="card imp-i" key={c.id}>
                <div className="imp-h"><div><b>{c.nome}</b><small>{c.tipo === 'scelta' ? `Si sceglie tra: ${c.opzioni.join(', ')}` : c.tipo === 'si' ? 'Sì o no' : 'Testo libero'}</small></div></div>
                <button type="button" className="btn-del" style={{ marginTop: 0 }} onClick={() => setChiedi({ titolo: `Togliere il campo "${c.nome}"?`, testo: 'Quello che hai già scritto resta salvato ma non si vede più nelle schede.', ok: 'Sì, toglilo', pericolo: true, fn: () => api.togliCampo(c.id) })}>Togli il campo</button>
              </section>
            ))}
          </div>
          {nuovoCampo ? (
            <section className="card imp-i imp-n">
              <p className="eyebrow">Nuovo campo</p>
              <label className="nl">Cosa vuoi chiedere<input value={nuovoCampo.nome} onChange={(e) => setNuovoCampo({ ...nuovoCampo, nome: e.target.value })} placeholder="Per esempio: Obiettivo" /></label>
              <p className="eyebrow" style={{ marginTop: 14 }}>Che tipo di risposta</p>
              <div className="chips">
                {([['scelta', 'Si sceglie tra alcune risposte'], ['testo', 'Testo libero'], ['si', 'Sì o no']] as const).map(([k, t]) => (
                  <Chip key={k} acceso={nuovoCampo.tipo === k} onClick={() => setNuovoCampo({ ...nuovoCampo, tipo: k })}>{t}</Chip>
                ))}
              </div>
              {nuovoCampo.tipo === 'scelta' && <label className="nl">Le risposte, separate da una virgola<input value={nuovoCampo.opzioni} onChange={(e) => setNuovoCampo({ ...nuovoCampo, opzioni: e.target.value })} placeholder="Schiena, Stress, Forza" /></label>}
              <button type="button" className="btn wide" style={{ marginTop: 16 }} onClick={() => {
                const v = validaCampo(nuovoCampo.nome, nuovoCampo.tipo, nuovoCampo.opzioni, campi);
                if (!v.ok) return setMsg(v.motivo);
                void esegui(() => api.aggiungiCampo(studio, nuovoCampo.nome, nuovoCampo.tipo, leggiOpzioni(nuovoCampo.opzioni)), () => setNuovoCampo(null));
              }}>Aggiungi il campo</button>
              <button type="button" className="btn ghost wide" style={{ marginTop: 10 }} onClick={() => setNuovoCampo(null)}>Annulla</button>
            </section>
          ) : (
            <button type="button" className="btn" style={{ marginTop: 14 }} onClick={() => setNuovoCampo({ nome: '', tipo: 'scelta', opzioni: '' })}>+ Aggiungi un campo</button>
          )}
        </>
      )}

      {msg && <p className="note" role="alert">{msg}</p>}
      {chiedi && (
        <Conferma
          riga="Impostazioni"
          titolo={chiedi.titolo}
          testo={chiedi.testo}
          ok={chiedi.ok}
          pericolo={chiedi.pericolo}
          onAnnulla={() => setChiedi(null)}
          onOk={() => { const f = chiedi.fn; setChiedi(null); void esegui(f, () => setNuovo(null)); }}
        />
      )}
    </>
  );
}

// L'email è quella con cui l'insegnante entra nell'app: riceve il codice lì. Cambiandola, la vecchia perde l'accesso.
function EmailInsegnante({ email, onSalva }: { email: string | null; onSalva: (email: string | null) => void }) {
  const [v, setV] = useState(email ?? '');
  const [errore, setErrore] = useState('');
  const cambiata = v.trim().toLowerCase() !== (email ?? '');
  return (
    <div style={{ margin: '4px 0 14px' }}>
      <label className="nl">Email per entrare nell'app
        <input type="email" inputMode="email" autoCapitalize="none" value={v} placeholder="nome@esempio.it" onChange={(e) => { setV(e.target.value); setErrore(''); }} />
      </label>
      {!email && !cambiata && <p className="note">Senza email non può entrare nell'app.</p>}
      {cambiata && (
        <div className="chips" style={{ marginTop: 8 }}>
          <button type="button" className="btn sm" onClick={() => {
            if (v.trim() !== '' && !emailValida(v.trim())) return setErrore("L'email non sembra giusta.");
            onSalva(v.trim() === '' ? null : v.trim());
          }}>Salva l'email</button>
          <button type="button" className="btn sm ghost" onClick={() => { setV(email ?? ''); setErrore(''); }}>Annulla</button>
        </div>
      )}
      {errore && <p className="note" role="alert">{errore}</p>}
    </div>
  );
}
