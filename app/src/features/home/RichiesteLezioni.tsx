import { useCallback, useEffect, useState } from 'react';
import type { StudioId } from '@/config/tema';
import * as reale from '@/data/richieste-lezioni';
import { NOME_GIORNO, NOME_STILE } from '@/domain/programma';

// Le richieste di nuove lezioni mandate dagli insegnanti: le decide un responsabile (Andrea o Glenda). Approvata, la lezione entra nell'orario.
export function RichiesteLezioni({ studio, api = reale, onCambiato }: { studio: StudioId; api?: typeof reale; onCambiato?: () => void }) {
  const [lista, setLista] = useState<reale.RichiestaLezione[] | null>(null);
  const [msg, setMsg] = useState('');
  const carica = useCallback(async () => setLista(await api.elencaRichiesteLezioni(studio)), [api, studio]);
  useEffect(() => {
    void carica();
  }, [carica]);
  if (lista === null) return <p className="muted">Carico le richieste…</p>;
  const attesa = lista.filter((r) => r.stato === 'attesa');
  const decise = lista.filter((r) => r.stato !== 'attesa').slice(0, 10);

  async function decidi(id: string, approva: boolean) {
    const esito = await api.decidiRichiestaLezione(id, approva);
    if (!esito.ok) return setMsg(esito.motivo);
    setMsg('');
    await carica();
    onCambiato?.();
  }

  return (
    <section>
      <h3>Richieste di lezioni {attesa.length > 0 && <em className="n">{attesa.length}</em>}</h3>
      <p className="muted" style={{ margin: '-6px 0 8px' }}>Gli insegnanti chiedono di aggiungere una lezione all'orario. Se approvi, entra subito a loro nome.</p>
      {attesa.map((r) => (
        <div className="req" key={r.id}>
          <b>{r.richiedente} · {r.tipo}</b>
          <p className="muted">Ogni {NOME_GIORNO[r.giorno].toLowerCase()} alle {r.ora} · {NOME_STILE[r.stile] ?? r.stile} · {r.posti} posti{r.durataMin ? ` · ${r.durataMin} min` : ''}</p>
          {r.nota && <p className="muted">{r.nota}</p>}
          <div className="chips">
            <button type="button" className="btn sm" onClick={() => void decidi(r.id, true)}>Approva</button>
            <button type="button" className="btn sm ghost" onClick={() => void decidi(r.id, false)}>Non approvare</button>
          </div>
        </div>
      ))}
      {attesa.length === 0 && <p className="muted">Nessuna richiesta in attesa.</p>}
      {decise.length > 0 && (
        <details className="pl-evd">
          <summary>Già decise ({decise.length})</summary>
          <div className="pc-rl">
            {decise.map((r) => (
              <div className="pc-r" key={r.id}><div className="pc-m"><b>{r.richiedente} · {r.tipo}</b><small className="muted">Ogni {NOME_GIORNO[r.giorno].toLowerCase()} {r.ora}</small></div><span className={`pc-ch ${r.stato === 'approvata' ? 'ok' : 'w'}`}>{r.stato === 'approvata' ? 'Approvata' : 'Non approvata'}</span></div>
            ))}
          </div>
        </details>
      )}
      {msg && <p className="note" role="alert">{msg}</p>}
    </section>
  );
}
