import { lazy, Suspense, useEffect, useState } from 'react';
import { supabaseConfigurato } from '@/services/supabase';
import { applicaTema, NOMI_STUDI, type StudioId } from '@/config/tema';
import { Accesso } from '@/features/auth/Accesso';
import { Home } from '@/features/studio/Home';
import { ascoltaSessione, esci, leggiAppartenenze, leggiProfilo, type Appartenenza } from '@/data/sessione';
import { Profilo } from '@/features/profilo/Profilo';

// La galleria di prova (dati finti) si carica solo in sviluppo: nella versione pubblicata non esiste.
const Galleria = import.meta.env.DEV ? lazy(() => import('@/features/galleria/Galleria').then((m) => ({ default: m.Galleria }))) : null;

// Schermate di servizio con lo stesso aspetto dell'accesso del prototipo (.auth, .au-h, .btn).
function Servizio({ titolo, em, testo, children }: { titolo: string; em: string; testo: string; children?: React.ReactNode }) {
  return (
    <div className="demo" style={{ position: 'relative', minHeight: '100vh' }}>
      <div className="auth">
        <div style={{ width: '100%', maxWidth: 420, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h2 className="au-h">{titolo} <em>{em}</em></h2>
          <p className="muted au-p">{testo}</p>
          {children}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  // Solo in sviluppo: le stesse schermate con una base dati finta, per confrontarle con il prototipo.
  if (Galleria && location.hash.startsWith('#galleria')) {
    return <Suspense fallback={null}><Galleria studio={location.hash.includes('pozzo') ? 'pozzo' : 'tribu'} /></Suspense>;
  }
  if (!supabaseConfigurato) {
    return <Servizio titolo="Manca il" em="collegamento." testo="Copia il file .env.example in .env.local e inserisci l'indirizzo e la chiave pubblica del progetto Supabase." />;
  }
  return <Collegata />;
}

function Collegata() {
  const [connesso, setConnesso] = useState<boolean | null>(null);
  const [appartenenze, setAppartenenze] = useState<Appartenenza[] | null>(null);
  const [scelto, setScelto] = useState<StudioId | null>(null);
  const [completo, setCompleto] = useState<boolean | null>(null);

  useEffect(() => ascoltaSessione(setConnesso), []);

  useEffect(() => {
    if (!connesso) {
      setAppartenenze(null);
      setScelto(null);
      setCompleto(null);
      return;
    }
    void leggiProfilo().then((p) => setCompleto(Boolean(p && p.nome.trim() && p.telefono.trim())));
    void leggiAppartenenze().then((a) => {
      setAppartenenze(a);
      if (a.length === 1) setScelto(a[0].studio);
    });
  }, [connesso]);

  useEffect(() => {
    applicaTema(scelto ?? 'tribu');
  }, [scelto]);

  if (connesso === null) return null;
  if (!connesso) return <Accesso />;
  if (appartenenze === null) return null;

  if (appartenenze.length === 0) {
    return (
      <Servizio titolo="Accesso non ancora" em="abilitato." testo="Hai fatto l'accesso, ma nessuno studio ti ha ancora assegnato un ruolo. Scrivi allo studio e ti abilitiamo.">
        <button type="button" className="btn wide ghost" onClick={() => void esci()}>Esci</button>
      </Servizio>
    );
  }

  if (completo === null) return null;
  if (!completo) {
    return (
      <Servizio titolo="È ora di" em="presentarci." testo="Ci servono il tuo nome e il tuo telefono: il nome per salutarti, il numero per avvisarti se cambia qualcosa. Lo scrivi una volta sola, poi puoi cambiarlo dal tuo profilo.">
        <Profilo iniziale onSalvato={() => setCompleto(true)} />
      </Servizio>
    );
  }

  const attiva = appartenenze.find((a) => a.studio === scelto);
  if (!attiva) {
    return (
      <Servizio titolo="Che studio vuoi" em="aprire?" testo="Hai accesso a più di uno studio.">
        {appartenenze.map((a) => (
          <button type="button" key={a.studio} className="btn wide" onClick={() => setScelto(a.studio)}>{NOMI_STUDI[a.studio]}</button>
        ))}
      </Servizio>
    );
  }

  return <Home studio={attiva.studio} ruolo={attiva.ruolo} />;
}
