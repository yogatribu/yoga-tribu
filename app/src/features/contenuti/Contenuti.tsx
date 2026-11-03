import { useState } from 'react';
import type { StudioId } from '@/config/tema';
import * as realeEventi from '@/data/eventi';
import * as realePlanner from '@/data/planner';
import type { Riga } from '@/domain/planner';
import { Generatore, type ApiGeneratore, type DaPlanner } from '@/features/contenuti/Generatore';
import { Planner, type ApiPlanner } from '@/features/contenuti/Planner';

// Contenuti: a Yoga Tribù il Planner (cosa pubblicare e quando) e il Generatore (post, storie, caroselli, fogli A4);
// al Pozzo solo il Generatore. "Apri e crea" nel Planner porta nel Generatore già impostato (studioContenuti() del prototipo).
export type ApiContenuti = { planner: ApiPlanner; generatore: ApiGeneratore };
const reale: ApiContenuti = { planner: { planner: realePlanner, eventi: realeEventi }, generatore: { eventi: realeEventi } };

export function Contenuti({ studio, eResponsabile, api = reale }: { studio: StudioId; eResponsabile: boolean; api?: ApiContenuti }) {
  const [vista, setVista] = useState<'planner' | 'gen'>(studio === 'tribu' ? 'planner' : 'gen');
  const [daPlanner, setDaPlanner] = useState<DaPlanner | null>(null);

  const segnaCreato = (r: Riga) => { void api.planner.planner.salvaPost(studio, r.id, { stato: 'creato' }, r.s ?? {}); };

  return (
    <>
      {studio === 'tribu' && (
        <div className="seg" style={{ maxWidth: 320, marginBottom: 22 }}>
          <button type="button" className={vista === 'planner' ? 'on' : ''} onClick={() => setVista('planner')}>Planner</button>
          <button type="button" className={vista === 'gen' ? 'on' : ''} onClick={() => { setDaPlanner(null); setVista('gen'); }}>Generatore</button>
        </div>
      )}
      {vista === 'planner' && studio === 'tribu'
        ? <Planner studio={studio} eResponsabile={eResponsabile} api={api.planner} onApri={(riga, didascalia) => { setDaPlanner({ riga, didascalia }); setVista('gen'); }} />
        : <Generatore key={daPlanner?.riga.id ?? 'libero'} studio={studio} api={api.generatore} daPlanner={daPlanner} onCreato={segnaCreato} />}
    </>
  );
}
