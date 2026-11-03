import { useState } from 'react';
import { Allievi } from '@/features/allievi/Allievi';
import { DaContattare } from '@/features/contattare/DaContattare';
import { Impostazioni } from '@/features/impostazioni/Impostazioni';
import { Interessati } from '@/features/leads/Interessati';
import { HomeSara } from '@/features/home/HomeSara';
import { HomeStudio } from '@/features/home/HomeStudio';
import { Statistiche } from '@/features/statistiche/Statistiche';
import { Contenuti } from '@/features/contenuti/Contenuti';
import { Percorsi } from '@/features/percorsi/Percorsi';
import { Programma } from '@/features/programma/Programma';
import { Ricorrenze } from '@/features/ricorrenze/Ricorrenze';
import { Struttura } from '@/features/studio/Struttura';
import { vociPerRuolo } from '@/features/studio/Home';
import { Chip } from '@/design/Chip';
import { puo, type Ruolo } from '@/domain/ruoli';
import type { StudioId } from '@/config/tema';
import * as fintoEventi from '@/data/finto-eventi';
import * as fintoImpostazioni from '@/data/finto-impostazioni';
import * as fintoCiclo from '@/data/finto-ciclo';
import * as fintoComunicazioni from '@/data/finto-comunicazioni';
import * as fintoLeads from '@/data/finto-leads';
import * as fintoPrivate from '@/data/finto-private';
import * as fintoRichiesteLezioni from '@/data/finto-richieste-lezioni';
import * as fintoPlanner from '@/data/finto-planner';
import * as fintoPrenotazioni from '@/data/finto-prenotazioni';
import * as fintoPersone from '@/data/finto-persone';
import * as fintoProgramma from '@/data/finto-programma';

// Pagina di prova con dati finti: solo in sviluppo, http://localhost:4324/#galleria (oppure #galleria-pozzo).
// Mostra le stesse schermate dell'app vera, ma con una base dati in memoria: serve a confrontarle con il prototipo.
// "Vedi come" cambia ruolo: il menù e i pulsanti sono quelli veri di quel ruolo. I dati finti non sono filtrati per insegnante
// (gli allievi "suoi" li decide il database, si vede solo con un accesso vero).
const PROVE: Record<string, { nome: string; ruolo: Ruolo; faPercorsi: boolean; etichetta: string }> = {
  andrea: { nome: 'Andrea', ruolo: 'gestione', faPercorsi: false, etichetta: 'Andrea (titolare)' },
  glenda: { nome: 'Glenda', ruolo: 'amministrazione', faPercorsi: false, etichetta: 'Glenda (responsabile)' },
  victor: { nome: 'Victor', ruolo: 'insegnante', faPercorsi: false, etichetta: 'Victor (insegnante)' },
  sara: { nome: 'Sara', ruolo: 'insegnante', faPercorsi: true, etichetta: 'Sara (percorsi)' },
};

export function Galleria({ studio }: { studio: StudioId }) {
  const [chi, setChi] = useState(sessionStorage.getItem('galleria-ruolo') ?? 'andrea');
  const [richiesta, setRichiesta] = useState(sessionStorage.getItem('galleria') ?? 'oggi');
  const [persona, setPersona] = useState<string | null>(null);
  const prova = PROVE[chi] ?? PROVE.andrea;
  const { nome, ruolo, faPercorsi } = prova;
  const voci = vociPerRuolo(studio, ruolo, faPercorsi);
  const corrente = voci.some((v) => v.chiave === richiesta) ? richiesta : 'oggi';
  const scegli = (c: string, id?: string) => { sessionStorage.setItem('galleria', c); setPersona(id ?? null); setRichiesta(c); };
  const cambia = (k: string) => { sessionStorage.setItem('galleria-ruolo', k); setChi(k); };
  const eResp = puo(ruolo, 'modificaProgramma');
  const apiHome = { persone: fintoPersone, prenotazioni: fintoPrenotazioni, programma: fintoProgramma, leads: fintoLeads, eventi: fintoEventi, impostazioni: fintoImpostazioni, private: fintoPrivate, comunicazioni: fintoComunicazioni, richiesteLezioni: fintoRichiesteLezioni };
  return (
    <Struttura studio={studio} voci={voci} corrente={corrente} onScegli={(c) => scegli(c)}>
      <div className="chips" style={{ marginBottom: 18, alignItems: 'center' }}>
        <small className="muted">Vedi come:</small>
        {Object.entries(PROVE).map(([k, v]) => <Chip key={k} acceso={chi === k} onClick={() => cambia(k)}>{v.etichetta}</Chip>)}
      </div>
      {corrente === 'oggi' && (ruolo === 'insegnante' && faPercorsi
        ? <HomeSara studio={studio} nome={nome} onVai={scegli} onProfilo={() => undefined} onEsci={() => undefined} api={{ eventi: fintoEventi, persone: fintoPersone }} />
        : <HomeStudio studio={studio} nome={nome} eResponsabile={eResp} onVai={scegli} api={apiHome} />)}
      {corrente === 'allievi' && <Allievi key={persona ?? 'tutti'} studio={studio} puoIncassare={puo(ruolo, 'crediti')} api={fintoPersone} apiPren={fintoPrenotazioni} selezioneIniziale={persona} />}
      {corrente === 'percorsi' && <Percorsi studio={studio} api={{ eventi: fintoEventi, persone: fintoPersone }} />}
      {corrente === 'interessati' && <Interessati studio={studio} eResponsabile={puo(ruolo, 'impostazioni')} api={fintoLeads} apiCampi={fintoImpostazioni} apiProgramma={fintoProgramma} apiPersone={fintoPersone} />}
      {corrente === 'ricorrenze' && <Ricorrenze studio={studio} puoRegalare={puo(ruolo, 'crediti')} faPercorsi={faPercorsi} api={fintoPersone} apiRegalo={fintoImpostazioni} />}
      {corrente === 'programma' && <Programma studio={studio} puoModificare={eResp} mioNome={ruolo === 'insegnante' ? nome : null} api={fintoProgramma} apiEventi={fintoEventi} apiCiclo={fintoCiclo} apiRichieste={fintoRichiesteLezioni} />}
      {corrente === 'stat' && <Statistiche studio={studio} api={{ persone: fintoPersone, prenotazioni: fintoPrenotazioni, programma: fintoProgramma, leads: fintoLeads, eventi: fintoEventi }} onApriPersona={() => undefined} />}
      {corrente === 'contenuti' && <Contenuti studio={studio} eResponsabile={eResp} api={{ planner: { planner: fintoPlanner, eventi: fintoEventi }, generatore: { eventi: fintoEventi } }} />}
      {corrente === 'impostazioni' && <Impostazioni studio={studio} eTitolare={ruolo === 'gestione'} api={fintoImpostazioni} />}
      {corrente === 'contattare' && <DaContattare studio={studio} faPercorsi={faPercorsi} api={{ leads: fintoLeads, persone: fintoPersone, prenotazioni: fintoPrenotazioni }} />}
    </Struttura>
  );
}
