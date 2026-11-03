import { useCallback, useEffect, useState } from 'react';
import { Compositore } from '@/design/Compositore';
import type { StudioId } from '@/config/tema';
import { COMUNITA } from '@/config/tema';
import * as realeLeads from '@/data/leads';
import * as realePersone from '@/data/persone';
import * as realePrenotazioni from '@/data/prenotazioni';
import { aggiungiGiorni, oggi } from '@/domain/date';
import { daRichiamare, numeroWhatsApp } from '@/domain/leads';
import { testoMessaggio, type MotivoMessaggio } from '@/domain/messaggi';
import { quandoRel } from '@/domain/formati';
import { datiMancanti, euro, inScadenza, nomeCompleto, ricorrenze, type Acquisto, type VoceRegistro } from '@/domain/persone';
import { lezioniFatte, statoAllievo, ultimaLezione } from '@/domain/prenotazioni';

// Stesso markup e stesse classi di studioContattare() del prototipo (.cg, .pv-c, .al-m, .pv-b).
// Chi è iscritto a un percorso di salute femminile è di Sara: gli altri non hanno il pulsante per scrivere (scrive lei).
// "Prove da seguire" non c'è: le prove passano da Interessati (regole di business). A rischio e da recuperare vengono dalle prenotazioni.
export type ApiContattare = { leads: typeof realeLeads; persone: typeof realePersone; prenotazioni?: Pick<typeof realePrenotazioni, 'elencaPrenotazioni'> };

type Riga = { chiave: string; nome: string; perche: string; telefono: string | null; email: string | null; motivo: MotivoMessaggio | null; testo: string; idPersona: string | null; bottone: string };
type Gruppo = { chiave: string; titolo: string; sotto: string; righe: Riga[] };

export function DaContattare({ studio, faPercorsi = false, api = { leads: realeLeads, persone: realePersone, prenotazioni: realePrenotazioni } }: { studio: StudioId; faPercorsi?: boolean; api?: ApiContattare }) {
  const [gruppi, setGruppi] = useState<Gruppo[] | null>(null);
  const [diSara, setDiSara] = useState<Set<string>>(new Set());
  const [errore, setErrore] = useState(false);
  const [scrivendo, setScrivendo] = useState<Riga | null>(null);
  const comunita = COMUNITA[studio] === 'tribù' ? 'tribù' : 'Pozzo';

  const carica = useCallback(async () => {
    const [persone, ar, recenti, leads, pren] = await Promise.all([api.persone.elencaPersone(studio), api.persone.elencaAcquistiERegistro(studio), api.persone.richiamiRecenti(studio), api.leads.elencaContatti(studio), api.prenotazioni?.elencaPrenotazioni(studio, aggiungiGiorni(oggi(), -400), oggi()) ?? Promise.resolve([])]);
    if (persone === null || ar === null || leads === null || pren === null) return setErrore(true);
    setErrore(false);
    setDiSara(faPercorsi ? new Set() : await api.persone.personeDiSara(studio));
    const giorno = oggi();
    const acq = (id: string): Acquisto[] => ar.acquisti.get(id) ?? [];
    const reg = (id: string): VoceRegistro[] => ar.registro.get(id) ?? [];
    const fatto = (motivo: MotivoMessaggio, id: string) => recenti.has(`${motivo}|${id}`);
    const riga = (p: (typeof persone)[number]['persona'], motivo: MotivoMessaggio, perche: string, extra: { importo?: string; mancanti?: string[]; anni?: number } = {}, bottone = 'Scrivi'): Riga => ({
      chiave: `${motivo}|${p.id}`, nome: nomeCompleto(p), perche, telefono: p.telefono, email: p.email, motivo, idPersona: p.id, bottone,
      testo: testoMessaggio(motivo, { nome: nomeCompleto(p), comunita, ...extra }),
    });
    // Lo stato di ogni persona dalle lezioni fatte: "A rischio" non viene da più di due settimane, "In pausa" da oltre cinque.
    const statoDi = (s: (typeof persone)[number]) => {
      const sue = pren.filter((x) => x.personId === s.persona.id);
      const ultima = ultimaLezione(sue, giorno);
      return { stato: statoAllievo(lezioniFatte(sue, giorno).length, s.persona.iscrittoIl, ultima, giorno), ultima };
    };
    const conStato = persone.map((s) => ({ s, ...statoDi(s) }));
    const rischio = conStato.filter((x) => x.stato === 'A rischio' && !fatto('rischio', x.s.persona.id)).map((x) => riga(x.s.persona, 'rischio', `Ultima lezione ${x.ultima ? quandoRel(x.ultima, giorno) : 'tempo fa'}`));
    const recupero = conStato.filter((x) => x.stato === 'In pausa' && !fatto('recupero', x.s.persona.id)).map((x) => riga(x.s.persona, 'recupero', `Ultima lezione ${x.ultima ? quandoRel(x.ultima, giorno) : 'tempo fa'}`));
    const scadenza = persone.filter((s) => inScadenza(s.persona, acq(s.persona.id), reg(s.persona.id), giorno) && !fatto('scadenza', s.persona.id)).map((s) => riga(s.persona, 'scadenza', 'Il pacchetto sta per finire'));
    const pagare = persone.filter((s) => s.daIncassareCent > 0 && !fatto('pagamento', s.persona.id)).map((s) => riga(s.persona, 'pagamento', `${euro(s.daIncassareCent)} da incassare`, { importo: euro(s.daIncassareCent) }));
    const dati = persone.filter((s) => datiMancanti(s.persona).length > 0 && !fatto('dati', s.persona.id)).map((s) => riga(s.persona, 'dati', `Mancano: ${datiMancanti(s.persona).join(', ')}`, { mancanti: datiMancanti(s.persona) }));
    const sett = ricorrenze(persone.map((s) => s.persona), giorno, aggiungiGiorni(giorno, 7)).filter((r) => !fatto(r.tipo, r.persona.id));
    const compl = sett.filter((r) => r.tipo === 'compleanno').map((r) => riga(r.persona, 'compleanno', `Compleanno il ${Number(r.data.slice(8))}/${r.data.slice(5, 7)}`, {}, 'Auguri'));
    const anniv = sett.filter((r) => r.tipo === 'anniversario').map((r) => riga(r.persona, 'anniversario', `${r.anni} ${r.anni === 1 ? 'anno' : 'anni'} con noi`, { anni: r.anni }, 'Auguri'));
    const richiami: Riga[] = leads.filter((c) => daRichiamare(c, giorno)).map((c) => ({ chiave: `lead|${c.id}`, nome: c.nome, perche: 'Da richiamare', telefono: c.telefono, email: null, motivo: null, idPersona: null, testo: '', bottone: 'Scrivi' }));
    setGruppi([
      { chiave: 'scadenza', titolo: 'Pacchetto in scadenza', sotto: 'Pochi giorni o un solo credito rimasto', righe: scadenza },
      { chiave: 'rischio', titolo: 'A rischio abbandono', sotto: 'Non vengono da più di due settimane', righe: rischio },
      { chiave: 'recupero', titolo: 'Da recuperare', sotto: 'Non vengono da oltre cinque settimane', righe: recupero },
      { chiave: 'compleanno', titolo: 'Compleanni questa settimana', sotto: 'Un augurio, e se vuoi una lezione in omaggio', righe: compl },
      { chiave: 'anniversario', titolo: 'Anniversari questa settimana', sotto: `Da quanto tempo sono nella ${COMUNITA[studio]}`, righe: anniv },
      { chiave: 'interessati', titolo: 'Interessati da richiamare', sotto: 'Il richiamo è per oggi o è in ritardo', righe: richiami },
      { chiave: 'pagamento', titolo: 'Da incassare', sotto: 'Hanno un pacchetto ancora da pagare in studio', righe: pagare },
      { chiave: 'dati', titolo: 'Dati da completare', sotto: 'Manca il telefono o la data di nascita', righe: dati },
    ].filter((g) => g.righe.length > 0));
  }, [api, studio, comunita, faPercorsi]);

  useEffect(() => {
    void carica();
  }, [carica]);

  if (errore) return <p className="muted">Non riesco a caricare l'elenco. Riprova tra poco.</p>;
  if (gruppi === null) return <p className="muted">Carico…</p>;

  return (
    <>
      <p className="eyebrow">Da contattare</p>
      <h1>Chi merita un <em>messaggio</em> oggi.</h1>
      <p className="studio-date">Il sistema ti suggerisce a chi scrivere e cosa dire. Tu decidi.</p>
      {gruppi.length === 0 && <p className="muted">Per oggi non c'è nessuno da contattare. Tutto sotto controllo.</p>}
      {gruppi.map((g) => (
        <section className="cg" key={g.chiave}>
          <h3>{g.titolo} <em className="n">{g.righe.length}</em></h3>
          <p className="muted" style={{ margin: '-6px 0 8px' }}>{g.sotto}</p>
          {g.righe.map((r) => (
            <div className="pv-c" key={r.chiave}>
              <div className="al-m"><b>{r.nome}</b><small>{r.perche}</small></div>
              <div className="pv-b">
                {r.idPersona && diSara.has(r.idPersona)
                  ? <span className="given">La segue Sara: scrive lei</span>
                  : <button type="button" className="btn sm ghost" onClick={() => (r.motivo ? setScrivendo(r) : r.telefono && window.open(`https://wa.me/${numeroWhatsApp(r.telefono)}`, '_blank'))}>{r.bottone}</button>}
                {r.motivo && r.idPersona && !diSara.has(r.idPersona) && (
                  <button type="button" className="btn sm ghost" onClick={async () => { await api.persone.segnaContattato(studio, r.idPersona as string, r.motivo as MotivoMessaggio); await carica(); }}>Fatto</button>
                )}
              </div>
            </div>
          ))}
        </section>
      ))}
      {scrivendo && (
        <Compositore
          nome={scrivendo.nome}
          whatsapp={scrivendo.telefono ? numeroWhatsApp(scrivendo.telefono) : ''}
          email={scrivendo.email}
          testo={scrivendo.testo}
          onChiudi={() => setScrivendo(null)}
          onInviato={async () => {
            const r = scrivendo;
            setScrivendo(null);
            if (r.motivo && r.idPersona) await api.persone.segnaContattato(studio, r.idPersona, r.motivo);
            await carica();
          }}
        />
      )}
    </>
  );
}
