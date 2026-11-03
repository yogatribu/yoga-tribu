import { useCallback, useEffect, useState } from 'react';
import type { StudioId } from '@/config/tema';
import * as realeComunicazioni from '@/data/comunicazioni';
import * as realePersone from '@/data/persone';
import { nomeCompleto } from '@/domain/persone';

// Stesso markup di homeRichieste() del prototipo (.req, .reply, risposte pronte). Le richieste le scrivono gli allievi dalla loro app.
const RISPOSTE_PRONTE = ['Certo, ti scriviamo per trovare una soluzione.', "Ti aspettiamo, parlane con l'insegnante prima della lezione.", 'Rispondiamo a breve, grazie!'];

export function Richieste({ studio, api = realeComunicazioni, apiPersone = realePersone }: { studio: StudioId; api?: typeof realeComunicazioni; apiPersone?: typeof realePersone }) {
  const [richieste, setRichieste] = useState<realeComunicazioni.Richiesta[] | null>(null);
  const [nomi, setNomi] = useState<Map<string, string>>(new Map());
  const [msg, setMsg] = useState('');
  const carica = useCallback(async () => {
    const [r, p] = await Promise.all([api.elencaRichieste(studio), apiPersone.elencaPersone(studio)]);
    setRichieste(r);
    setNomi(new Map((p ?? []).map((s) => [s.persona.id, nomeCompleto(s.persona)])));
  }, [api, apiPersone, studio]);
  useEffect(() => {
    void carica();
  }, [carica]);
  if (richieste === null) return <p className="muted">Carico le richieste…</p>;
  const senza = richieste.filter((r) => !r.risposta).length;
  return (
    <section>
      <h3>Richieste {senza > 0 && <em className="n">{senza}</em>}</h3>
      {richieste.map((r) => (
        <div className="req" key={r.id}>
          <b>{nomi.get(r.personaId) ?? 'Persona'} · {r.categoria}{r.lezione ? ` · ${r.lezione}` : ''}</b>
          <p className="muted">{r.testo}</p>
          {r.risposta
            ? <div className="reply"><small>Risposta inviata</small><p>{r.risposta}</p></div>
            : <div className="chips">{RISPOSTE_PRONTE.map((t) => <button type="button" className="chip" key={t} onClick={async () => { const e = await api.rispondiRichiesta(r.id, t); if (!e.ok) return setMsg(e.motivo); setMsg(''); await carica(); }}>{t}</button>)}</div>}
        </div>
      ))}
      {richieste.length === 0 && <p className="muted">Nessuna richiesta. Quando gli allievi potranno scrivere dall'app, le trovi qui.</p>}
      {msg && <p className="note" role="alert">{msg}</p>}
    </section>
  );
}
