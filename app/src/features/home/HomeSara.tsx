import { useEffect, useState } from 'react';
import { Icona } from '@/design/Icone';
import type { StudioId } from '@/config/tema';
import * as realeEventi from '@/data/eventi';
import * as realePersone from '@/data/persone';
import { oggi } from '@/domain/date';
import { coorti, fase, occupati, stato, type Evento, type Iscrizione } from '@/domain/eventi';
import { intervallo } from '@/domain/formati';
import type { Persona } from '@/domain/persone';

// La Home di Sara, che segue solo i percorsi (studioHomeSara del prototipo): cosa c'è da fare e i prossimi percorsi.
// Il resto dell'app per lei è come per gli altri insegnanti. Il profilo e "Esci" stanno qui in fondo, dato che l'intestazione non li ha.
export type ApiHomeSara = { eventi: typeof realeEventi; persone: typeof realePersone };

export function HomeSara({
  studio, nome, onVai, onProfilo, onEsci, api = { eventi: realeEventi, persone: realePersone },
}: {
  studio: StudioId; nome: string; onVai: (sezione: string) => void; onProfilo?: () => void; onEsci?: () => void; api?: ApiHomeSara;
}) {
  const [dati, setDati] = useState<{ eventi: Evento[]; iscr: Iscrizione[]; persone: Persona[] } | null>(null);
  const [errore, setErrore] = useState(false);

  useEffect(() => {
    void Promise.all([api.eventi.elencaEventi(), api.eventi.elencaIscrizioni(studio), api.persone.elencaPersone(studio)]).then(([e, i, p]) => {
      if (e === null || i === null || p === null) return setErrore(true);
      setDati({ eventi: e.filter((x) => x.tipo === 'percorso').sort((a, b) => a.da.localeCompare(b.da)), iscr: i, persone: p.map((s) => s.persona) });
    });
  }, [api, studio]);

  const altro = (
    <section className="ag" style={{ marginTop: 22 }}>
      <h3>Altro</h3>
      <div className="group">
        {onProfilo && <button type="button" className="mrow" onClick={onProfilo}><Icona nome="user" /><span><b>Il mio profilo</b><small>Nome, cognome e telefono</small></span><em>›</em></button>}
        {onEsci && <button type="button" className="mrow" onClick={onEsci}><Icona nome="user" /><span><b>Esci</b><small>Chiudi l'accesso su questo dispositivo</small></span><em>›</em></button>}
      </div>
    </section>
  );

  if (errore) return <><h1 className="hello">Ciao {nome}.</h1><p className="muted">Non riesco a caricare i percorsi. Riprova tra poco.</p>{altro}</>;
  if (dati === null) return <><h1 className="hello">Ciao {nome}.</h1><p className="muted">Carico i percorsi…</p></>;

  const giorno = oggi();
  const di = (e: Evento) => dati.iscr.filter((x) => x.eventoId === e.id);
  const ric = dati.eventi.filter((e) => fase(e, giorno) !== 'finito').reduce((s, e) => s + di(e).filter((x) => x.stato === 'in_attesa').length, 0);
  const persona = (i: Iscrizione) => dati.persone.find((p) => p.id === i.personId);
  const da = coorti(dati.eventi, giorno).reduce((s, e) => s + di(e).filter((x) => x.stato === 'confermata' && !x.messaggio && persona(x)?.consensoNovita).length, 0);
  const arrivo = dati.eventi.filter((e) => fase(e, giorno) !== 'finito').slice(0, 3);

  return (
    <>
      <h1 className="hello">Ciao {nome}.</h1>
      <section className="card">
        <p className="eyebrow">Da fare</p>
        {ric > 0 && <p style={{ margin: `0 0 ${da ? 6 : 12}px` }}><b>{ric}</b> {ric === 1 ? 'richiesta' : 'richieste'} di iscrizione da confermare.</p>}
        {da > 0 && <p style={{ margin: '0 0 12px' }}><b>{da}</b> {da === 1 ? 'persona a cui' : 'persone a cui'} proporre il passo dopo il percorso.</p>}
        {ric || da ? <button type="button" className="btn sm" onClick={() => onVai('percorsi')}>Apri i percorsi</button> : <p className="muted" style={{ margin: 0 }}>Niente da fare per ora.</p>}
      </section>
      <section className="card">
        <p className="eyebrow">I prossimi percorsi <button type="button" className="eb-link" onClick={() => onVai('percorsi')}>Tutti ›</button></p>
        {arrivo.map((e) => {
          const s = fase(e, giorno) === 'prossimo' ? stato(e, di(e)) : { testo: 'In corso', tono: 'ok' };
          const lista = di(e).filter((x) => x.stato === 'lista').length;
          return (
            <div className="pc-r" key={e.id}>
              <div className="pc-m"><b>{e.titolo}</b><small className="muted">{intervallo(e.da, e.a)} · {occupati(e, di(e))} su {e.posti} posti{lista ? ` · in lista ${lista}` : ''}</small></div>
              <span className={`pc-ch ${s.tono}`}>{s.testo}</span>
            </div>
          );
        })}
        {arrivo.length === 0 && <p className="muted" style={{ margin: 0 }}>Nessun percorso in programma.</p>}
      </section>
      {altro}
    </>
  );
}
