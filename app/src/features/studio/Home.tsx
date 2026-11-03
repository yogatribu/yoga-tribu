import { useEffect, useState } from 'react';
import { esci, mioInsegnante, nomeProfilo, vedoIPercorsi } from '@/data/sessione';
import * as leads from '@/data/leads';
import type { Contatto } from '@/data/leads';
import { puo, vedePercorsi, type Funzione, type Ruolo } from '@/domain/ruoli';
import type { StudioId } from '@/config/tema';
import { Profilo } from '@/features/profilo/Profilo';
import { Allievi, type DaContatto } from '@/features/allievi/Allievi';
import { DaContattare } from '@/features/contattare/DaContattare';
import { Impostazioni } from '@/features/impostazioni/Impostazioni';
import { Interessati } from '@/features/leads/Interessati';
import { HomeStudio } from '@/features/home/HomeStudio';
import { HomeSara } from '@/features/home/HomeSara';
import { Statistiche } from '@/features/statistiche/Statistiche';
import { Contenuti } from '@/features/contenuti/Contenuti';
import { Percorsi } from '@/features/percorsi/Percorsi';
import { Programma } from '@/features/programma/Programma';
import { Ricorrenze } from '@/features/ricorrenze/Ricorrenze';
import { Struttura, type VoceMenu } from '@/features/studio/Struttura';


// Stesso ordine e stessi nomi del menù del prototipo (NAVI): Allievi, Interessati, Ricorrenze, Programma, Da contattare.
const VOCI: (VoceMenu & { funzione: Funzione })[] = [
  { chiave: 'oggi', funzione: 'programma', nome: 'Home', corto: 'Home', icona: 'home' },
  { chiave: 'allievi', funzione: 'allievi', nome: 'Allievi', corto: 'Allievi', icona: 'user' },
  { chiave: 'percorsi', funzione: 'percorsi', nome: 'Percorsi', corto: 'Percorsi', icona: 'cal' },
  { chiave: 'interessati', funzione: 'interessati', nome: 'Interessati', corto: 'Nuovi', icona: 'heart' },
  { chiave: 'ricorrenze', funzione: 'ricorrenze', nome: 'Ricorrenze', corto: 'Date', icona: 'cal', soloComputer: true },
  { chiave: 'programma', funzione: 'programma', nome: 'Programma', corto: 'Programma', icona: 'doc' },
  { chiave: 'stat', funzione: 'statistiche', nome: 'Statistiche', corto: 'Dati', icona: 'chart' },
  { chiave: 'contenuti', funzione: 'contenuti', nome: 'Contenuti', corto: 'Post', icona: 'img', soloComputer: true },
  { chiave: 'impostazioni', funzione: 'impostazioni', nome: 'Impostazioni', corto: 'Impost.', icona: 'gear', soloComputer: true },
  { chiave: 'contattare', funzione: 'contattare', nome: 'Da contattare', corto: 'Contatta', icona: 'bell' },
];

/** Le voci del menù che spettano a un ruolo (usata anche dalla galleria di prova, che fa vedere lo studio "come" ognuno). */
export function vociPerRuolo(studio: StudioId, ruolo: Ruolo, faPercorsi: boolean) {
  // I percorsi di Sara ci sono solo a Yoga Tribù, a chi li gestisce. Contenuti c'è in entrambi gli studi (al Pozzo senza il planner).
  return VOCI.filter((v) => (v.chiave === 'percorsi' ? vedePercorsi(ruolo, faPercorsi) : puo(ruolo, v.funzione)) && (v.chiave !== 'percorsi' || studio === 'tribu'));
}

// Vista studio: a ogni ruolo solo le sezioni che gli spettano.
export function Home({ studio, ruolo }: { studio: StudioId; ruolo: Ruolo }) {
  const [faPercorsi, setFaPercorsi] = useState(false);
  const [mioId, setMioId] = useState<string | null>(null);
  const [nomeInsegnante, setNomeInsegnante] = useState('');
  useEffect(() => {
    void mioInsegnante(studio).then((m) => { setMioId(m?.id ?? null); setNomeInsegnante(m?.nome ?? ''); });
  }, [studio]);
  useEffect(() => {
    if (ruolo === 'insegnante') void vedoIPercorsi(studio).then(setFaPercorsi);
  }, [ruolo, studio]);
  const voci = vociPerRuolo(studio, ruolo, faPercorsi);
  const [corrente, setCorrente] = useState<string | null>(voci[0]?.chiave ?? null);
  const [nome, setNome] = useState('');
  const [persona, setPersona] = useState<string | null>(null);
  const [daIscrivere, setDaIscrivere] = useState<Contatto | null>(null);
  useEffect(() => {
    void nomeProfilo().then(setNome);
  }, []);
  const vai = (sezione: string, id?: string) => { setPersona(id ?? null); setDaIscrivere(null); setCorrente(sezione); };
  const iscrivi = (c: Contatto) => { setPersona(null); setDaIscrivere(c); setCorrente('allievi'); };
  const datiContatto = (c: Contatto): DaContatto => { const [n, ...r] = c.nome.split(' '); return { nome: n, cognome: r.join(' '), telefono: c.telefono ?? '', fonte: c.fonte ?? '' }; };
  return (
    <Struttura studio={studio} voci={voci} corrente={corrente} onScegli={(c) => vai(c)}>
      {corrente === 'oggi' && ruolo === 'insegnante' && faPercorsi && <HomeSara studio={studio} nome={nome || nomeInsegnante} onVai={vai} onProfilo={() => vai('profilo')} onEsci={() => void esci()} />}
      {corrente === 'oggi' && !(ruolo === 'insegnante' && faPercorsi) && <HomeStudio studio={studio} nome={nome || nomeInsegnante} eResponsabile={puo(ruolo, 'modificaProgramma')} mioInsegnanteId={mioId} onVai={vai} onEsci={() => void esci()} onProfilo={() => vai('profilo')} />}
      {corrente === 'allievi' && <Allievi key={persona ?? daIscrivere?.id ?? 'tutti'} studio={studio} puoIncassare={puo(ruolo, 'crediti')} selezioneIniziale={persona} daContatto={daIscrivere ? datiContatto(daIscrivere) : null} onIscritto={daIscrivere ? (id) => void leads.collegaPersona(daIscrivere, id) : undefined} />}
      {corrente === 'profilo' && (
        <>
          <div className="nav"><button type="button" aria-label="Indietro" onClick={() => vai('oggi')}>‹</button><b>Il mio profilo</b><span></span></div>
          <Profilo iniziale={false} onSalvato={(p) => setNome(p.nome)} />
        </>
      )}
      {corrente === 'percorsi' && <Percorsi studio={studio} />}
      {corrente === 'interessati' && <Interessati studio={studio} eResponsabile={puo(ruolo, 'impostazioni')} onIscrivi={iscrivi} onApriProfilo={(id) => vai('allievi', id)} />}
      {corrente === 'ricorrenze' && <Ricorrenze studio={studio} puoRegalare={puo(ruolo, 'crediti')} faPercorsi={faPercorsi} />}
      {corrente === 'programma' && <Programma studio={studio} puoModificare={puo(ruolo, 'modificaProgramma')} mioNome={nomeInsegnante || null} />}
      {corrente === 'stat' && <Statistiche studio={studio} onApriPersona={(id) => vai('allievi', id)} />}
      {corrente === 'contenuti' && <Contenuti studio={studio} eResponsabile={puo(ruolo, 'modificaProgramma')} />}
      {corrente === 'impostazioni' && <Impostazioni studio={studio} eTitolare={ruolo === 'gestione'} />}
      {corrente === 'contattare' && <DaContattare studio={studio} faPercorsi={faPercorsi} />}
    </Struttura>
  );
}
