// Esportazione delle Statistiche: un rapporto di testo da dare a un'AI una volta al mese, e la tabella delle lezioni.
// Dentro non ci sono nomi, telefoni, email né note di salute, e i dati delle persone sono a fasce.
// Come nel prototipo (esRapporto): pseudonimo non vuol dire anonimo, quindi sotto le 30 persone niente riga per persona.
import { aggiungiGiorni, giornoDellaSettimana } from './date.ts';
import type { DatiDettaglio } from './dettaglio-stat.ts';
import { ultimiMesi } from './dettaglio-stat.ts';
import { fdate, MESI_LUNGHI } from './formati.ts';
import { NOME_FASE, NOME_MOTIVO, type Fase, type MotivoChiusura } from './leads.ts';
import { eta, euro } from './persone.ts';
import { NOME_GIORNO, NOME_STILE } from './programma.ts';
import { capienza, conversioni, doveSiPerdono, occupazione, rapporto, somma, type ContattoStat, type LezioneFatta } from './statistiche.ts';

const num = (v: number) => String(v).replace('.', ',');
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : 'n/d');
const pc = (v: number | null) => (v === null ? 'n/d' : `${v}%`);
const variazione = (a: number, b: number) => (b ? `${a >= b ? '+' : '-'}${Math.abs(Math.round(((a - b) / b) * 100))}%` : 'n/d');

/** Una tabella in markdown. Il carattere | dentro le celle si sostituisce, altrimenti rompe la tabella. */
export function tabella(testa: readonly string[], righe: readonly (readonly (string | number)[])[]): string {
  const corpo = righe.length ? righe : [testa.map((_, i) => (i ? '' : 'nessun dato'))];
  return `| ${testa.join(' | ')} |\n|${testa.map(() => '---').join('|')}|\n${corpo.map((r) => `| ${r.map((c) => String(c).replace(/\|/g, '/')).join(' | ')} |`).join('\n')}\n`;
}

export function lezioniCsv(lezioni: readonly LezioneFatta[]): string {
  const testa = ['data', 'giorno', 'ora', 'lezione', 'stile', 'insegnanti', 'prenotati', 'posti', 'occupazione_percento'];
  const righe = [...lezioni].sort((a, b) => a.data.localeCompare(b.data)).map((x) => [
    x.data, NOME_GIORNO[giornoDellaSettimana(x.data)], x.modello.ora, x.modello.tipo, NOME_STILE[x.modello.stile] ?? x.modello.stile, x.modello.insegnante, x.pren, x.modello.posti, x.modello.posti ? Math.round((x.pren / x.modello.posti) * 100) : 0,
  ]);
  return `${testa.join(';')}\n${righe.map((r) => r.join(';')).join('\n')}\n`;
}

const fascia = (v: number, limiti: readonly number[], nomi: readonly string[]) => {
  const i = limiti.findIndex((x) => v <= x);
  return i < 0 ? nomi[nomi.length - 1] : nomi[i];
};

function misure(l: readonly LezioneFatta[]) {
  const pren = somma(l), cap = capienza(l);
  return { n: l.length, pren, cap, occ: occupazione(l), med: l.length ? pren / l.length : 0 };
}

function gruppo(l: readonly LezioneFatta[], chiavi: (x: LezioneFatta) => string[]) {
  const m = new Map<string, { n: number; pren: number; cap: number }>();
  for (const x of l) for (const k of chiavi(x)) {
    const e = m.get(k) ?? { n: 0, pren: 0, cap: 0 };
    e.n += 1; e.pren += x.pren; e.cap += x.modello.posti;
    m.set(k, e);
  }
  return [...m.entries()].sort((a, b) => (b[1].cap ? b[1].pren / b[1].cap : 0) - (a[1].cap ? a[1].pren / a[1].cap : 0))
    .map(([k, v]) => [k, v.n, v.pren, pct(v.pren, v.cap), num(Math.round((v.pren / v.n) * 10) / 10)]);
}

export function rapportoStatistiche(d: DatiDettaglio, opz: { studio: string; giorni: number }): string {
  const N = opz.giorni;
  const { oggi } = d;
  const da = aggiungiGiorni(oggi, -N), da2 = aggiungiGiorni(oggi, -2 * N);
  const ls = d.lezioni.filter((x) => x.data >= da);
  const lp = d.lezioni.filter((x) => x.data >= da2 && x.data < da);
  const anno = d.lezioni.filter((x) => x.data >= aggiungiGiorni(oggi, -365));
  const A = misure(ls), B = misure(lp);
  const cA = d.contatti.filter((c) => c.creatoIl.slice(0, 10) >= da), cB = d.contatti.filter((c) => c.creatoIl.slice(0, 10) < da && c.creatoIl.slice(0, 10) >= da2);
  const K = conversioni(cA, oggi), K0 = conversioni(cB, oggi);
  const nuoviA = d.persone.filter((s) => s.persona.iscrittoIl >= da).length, nuoviB = d.persone.filter((s) => s.persona.iscrittoIl < da && s.persona.iscrittoIl >= da2).length;
  const incassi = (a: string, b: string) => d.persone.flatMap((s) => s.acquisti).filter((x) => x.incassato && (x.creatoIl ?? '').slice(0, 10) >= a && (x.creatoIl ?? '').slice(0, 10) < b).reduce((s, x) => s + x.prezzoCent, 0);
  const incA = incassi(da, aggiungiGiorni(oggi, 1)), incB = incassi(da2, da);
  const out: string[] = [];

  out.push(`# Rapporto statistiche · ${opz.studio} · ${fdate(oggi)}`, '');
  out.push('## Cosa ti chiediamo', '',
    `Sei un consulente che aiuta uno studio di yoga di piccole dimensioni (${opz.studio}). Qui sotto trovi i numeri degli ultimi ${N} giorni, confrontati con i ${N} giorni prima, più lo storico dell'ultimo anno.`, '',
    '1. Dimmi in cinque righe come sta andando lo studio.',
    '2. Indicami le cinque cose su cui migliorare, in ordine di importanza. Per ognuna: il numero che la mostra, perché conta e una azione concreta da fare entro il mese.',
    '3. Segnala i numeri che ti sembrano strani o che potrebbero essere errori di raccolta.',
    '4. Dimmi quali dati ti mancano per essere più preciso.', '',
    'Non inventare numeri che non sono nel documento. Le persone sono anonime: ogni codice (P1, P2, ...) è una persona diversa. Se un confronto vale poco perché i numeri sono piccoli, dillo.', '',
    '## Note sui dati', '',
    '- Gli incassi sono quelli registrati nell\'app (pacchetti segnati come incassati), non una stima.',
    '- "Occupazione" è il rapporto tra prenotazioni e posti disponibili nelle lezioni fatte.',
    '- Nelle percentuali del percorso contatto → iscrizione contano solo le persone che hanno già deciso.',
    '- "Dopo la prova" è approssimato: contano le persone che hanno avuto una prova e non sono mai mancate.',
    '- "n/d" vuol dire che il dato non è calcolabile (per esempio perché nessuno ha ancora deciso).', '');

  out.push(`## 1. Sintesi: ultimi ${N} giorni a confronto con i ${N} prima`, '', tabella(['Indicatore', `Ultimi ${N} giorni`, `${N} giorni prima`, 'Variazione'], [
    ['Lezioni fatte', A.n, B.n, variazione(A.n, B.n)], ['Prenotazioni', A.pren, B.pren, variazione(A.pren, B.pren)], ['Posti disponibili', A.cap, B.cap, variazione(A.cap, B.cap)],
    ['Occupazione', `${A.occ}%`, `${B.occ}%`, `${A.occ >= B.occ ? '+' : '-'}${Math.abs(A.occ - B.occ)} punti`], ['Prenotati a lezione', num(Math.round(A.med * 10) / 10), num(Math.round(B.med * 10) / 10), variazione(A.med, B.med)],
    ['Incassato', euro(incA), euro(incB), variazione(incA, incB)], ['Nuove persone iscritte', nuoviA, nuoviB, variazione(nuoviA, nuoviB)],
    ['Contatti arrivati', cA.length, cB.length, variazione(cA.length, cB.length)], ['Contatti diventati iscritti', K.iscritti, K0.iscritti, variazione(K.iscritti, K0.iscritti)],
  ]));

  const percorso = (k: ReturnType<typeof conversioni>) => [pc(rapporto(k.p, k.n)), pc(rapporto(k.f, k.f + k.assenti)), pc(rapporto(k.iscritti, k.iscritti + k.persiDopo)), pc(rapporto(k.iscritti, k.decisi)), k.n];
  const pA = percorso(K), pB = percorso(K0);
  out.push('## 2. Dal contatto all\'iscrizione', '', tabella(['Passaggio', `Ultimi ${N} giorni`, `${N} giorni prima`], [
    ['Contatto → prova fissata', pA[0], pB[0]], ['Presenza alla prova (fissate che si fanno)', pA[1], pB[1]], ['Prova → iscrizione', pA[2], pB[2]], ['Contatto → iscritto (percorso intero)', pA[3], pB[3]], ['Contatti considerati', pA[4], pB[4]],
  ]));
  const persi = doveSiPerdono(cA);
  out.push(`### Dove si perdono le persone (ultimi ${N} giorni)`, '', tabella(['Momento', 'Persone'], [['Prima della prova', persi.prima], ['Assenti alla prova', persi.assenti], ['Dopo la prova', persi.dopo]]));
  const motivi = new Map<string, number>();
  for (const c of cA.filter((x) => x.fase === 'non_prosegue')) { const k = c.motivoChiusura ? (NOME_MOTIVO[c.motivoChiusura as MotivoChiusura] ?? c.motivoChiusura) : 'Non indicato'; motivi.set(k, (motivi.get(k) ?? 0) + 1); }
  out.push('### Perché non proseguono', '', tabella(['Motivo', 'Persone'], [...motivi.entries()].sort((a, b) => b[1] - a[1])));
  const fonti = (arr: readonly ContattoStat[]) => {
    const m = new Map<string, { t: number; i: number }>();
    for (const c of arr) { const k = c.fonte ?? 'Non indicata'; const e = m.get(k) ?? { t: 0, i: 0 }; e.t += 1; if (c.fase === 'iscritto') e.i += 1; m.set(k, e); }
    return [...m.entries()].sort((a, b) => b[1].i - a[1].i || b[1].t - a[1].t).map(([f, e]) => [f, e.t, e.i, pct(e.i, e.t)]);
  };
  out.push(`### Quali fonti portano iscritti (ultimi ${N} giorni)`, '', tabella(['Fonte', 'Contatti', 'Iscritti', 'Tasso'], fonti(cA)));
  out.push('### Quali fonti portano iscritti (tutto lo storico)', '', tabella(['Fonte', 'Contatti', 'Iscritti', 'Tasso'], fonti(d.contatti)));

  const testa = (p: string) => [p, 'Lezioni', 'Prenotazioni', 'Occupazione', 'Prenotati a lezione'];
  out.push(`## 3. Orari e lezioni (ultimi ${N} giorni, dal più pieno al più vuoto)`, '',
    '### Ogni orario della settimana', '', tabella(testa('Orario'), gruppo(ls, (x) => [`${NOME_GIORNO[x.modello.giorno].slice(0, 3)} ${x.modello.ora} · ${x.modello.tipo}`])),
    '### Giorni della settimana', '', tabella(testa('Giorno'), gruppo(ls, (x) => [NOME_GIORNO[x.modello.giorno]])),
    '### Stili', '', tabella(testa('Stile'), gruppo(ls, (x) => [NOME_STILE[x.modello.stile] ?? x.modello.stile])),
    '### Insegnanti', '', tabella(testa('Insegnante'), gruppo(ls, (x) => x.modello.insegnante.split(/\s+e\s+|,\s*/).map((s) => s.trim()).filter(Boolean))));

  const righeMesi = ultimiMesi(oggi).map(({ chiave }, i) => {
    const m = misure(anno.filter((x) => x.data.startsWith(chiave)));
    const [a, mm] = chiave.split('-').map(Number);
    return [`${MESI_LUNGHI[mm - 1]} ${a}${i === 11 ? ' (in corso)' : ''}`, m.n, m.pren, `${m.occ}%`, euro(incassi(`${chiave}-01`, `${chiave}-32`)), d.persone.filter((s) => s.persona.iscrittoIl.startsWith(chiave)).length, d.contatti.filter((c) => c.creatoIl.startsWith(chiave)).length];
  });
  out.push('## 4. Andamento degli ultimi dodici mesi', '', tabella(['Mese', 'Lezioni', 'Prenotazioni', 'Occupazione', 'Incassato', 'Nuove persone', 'Contatti'], righeMesi));

  const tot = d.persone.length;
  const stati = new Map<string, number>();
  for (const s of d.persone) stati.set(s.stato, (stati.get(s.stato) ?? 0) + 1);
  const mesiCon = (s: (typeof d.persone)[number]) => Math.max(1, (Date.parse(oggi) - Date.parse(s.persona.iscrittoIl)) / 86_400_000 / 30.4);
  const fonteP = new Map<string, number>();
  for (const s of d.persone) fonteP.set(s.persona.fonte ?? 'Non indicata', (fonteP.get(s.persona.fonte ?? 'Non indicata') ?? 0) + 1);
  const etaDi = (s: (typeof d.persone)[number]) => (s.persona.dataNascita ? fascia(eta(s.persona.dataNascita, oggi), [29, 49], ['sotto i 30', '30-49', '50 e più']) : 'n/d');
  out.push('## 5. Le persone', '', `Persone in tutto: ${tot}. Con noi da, in media: ${tot ? num(Math.round((d.persone.reduce((a, s) => a + mesiCon(s), 0) / tot) * 10) / 10) : 0} mesi.`, '',
    '### Come stanno', '', tabella(['Stato', 'Persone', 'Percentuale'], [...stati.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, v, pct(v, tot)])),
    '### Come ci hanno conosciuto', '', tabella(['Fonte', 'Persone'], [...fonteP.entries()].sort((a, b) => b[1] - a[1])));
  if (tot >= 30) {
    out.push('### Le persone, per fasce (nessun nome, nessun dato esatto)', '', tabella(['Codice', 'Stato', 'Fascia di età', 'Mesi con noi', 'Giorni dall\'ultima lezione', 'Crediti'],
      d.persone.map((s, i) => [`P${i + 1}`, s.stato, etaDi(s), fascia(mesiCon(s), [3, 6, 12, 24], ['meno di 3', '3-6', '6-12', '12-24', 'più di 24']),
        s.ultimaLezione ? fascia((Date.parse(oggi) - Date.parse(s.ultimaLezione)) / 86_400_000, [7, 14, 30], ['0-7', '8-14', '15-30', 'più di 30']) : 'nessuna', s.persona.creditiIllimitati ? 'illimitati' : fascia(s.saldo, [0, 3, 9], ['0', '1-3', '4-9', '10 e più'])])));
  } else {
    const g = new Map<string, number>();
    for (const s of d.persone) g.set(`${s.stato}|${etaDi(s)}`, (g.get(`${s.stato}|${etaDi(s)}`) ?? 0) + 1);
    out.push('### Le persone, solo conteggi', '', 'Le persone sono meno di 30: una riga per persona le renderebbe riconoscibili, quindi qui ci sono solo conteggi per stato e fascia di età.', '', tabella(['Stato', 'Fascia di età', 'Persone'], [...g.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => [...k.split('|'), n])));
  }
  out.push('### Ogni contatto (anche non ancora iscritto), senza nomi', '', tabella(['Codice', 'Fonte', 'Cosa cerca', 'Fase', 'Motivo', 'Giorni dal primo messaggio', 'Prova avuta', 'Assenze'],
    [...d.contatti].sort((a, b) => b.creatoIl.localeCompare(a.creatoIl)).map((c, i) => [`C${i + 1}`, c.fonte ?? 'n/d', c.cerca ?? 'n/d', NOME_FASE[c.fase as Fase], c.motivoChiusura ? (NOME_MOTIVO[c.motivoChiusura as MotivoChiusura] ?? '') : '',
      fascia(Math.round((Date.parse(oggi) - Date.parse(c.creatoIl.slice(0, 10))) / 86_400_000), [7, 14, 30], ['0-7', '8-14', '15-30', 'più di 30']), c.haAvutoProva ? 'sì' : 'no', c.assenze])));

  const conCrediti = d.persone.filter((s) => !s.persona.creditiIllimitati && s.saldo > 0);
  const daInc = d.persone.flatMap((s) => s.acquisti.filter((a) => !a.incassato).map((a) => ({ a, s })));
  out.push('## 6. Soldi e crediti', '', tabella(['Voce', 'Valore'], [
    ['Da incassare in studio', euro(daInc.reduce((t, x) => t + x.a.prezzoCent, 0))], ['Pagamenti ancora da saldare', daInc.length], ['Persone che devono pagare', new Set(daInc.map((x) => x.s.persona.id)).size],
    ['Lezioni rimaste nei pacchetti', conCrediti.reduce((t, s) => t + s.saldo, 0)], ['Persone con crediti', conCrediti.length], ['Persone con crediti illimitati', d.persone.filter((s) => s.persona.creditiIllimitati).length],
  ]));
  out.push('### Pagamenti da incassare', '', tabella(['Cosa', 'Importo', 'Giorni da quando'], daInc.map((x) => [x.a.nome, euro(x.a.prezzoCent), x.a.creatoIl ? Math.max(0, Math.round((Date.parse(oggi) - Date.parse(x.a.creatoIl.slice(0, 10))) / 86_400_000)) : 'n/d'])));

  out.push('## 7. Eventi, ritiri e approfondimenti', '', tabella(['Evento', 'Date', 'Posti', 'Iscritti', 'Riempimento', 'Quota', 'Incasso previsto'],
    [...d.eventi].sort((a, b) => a.evento.da.localeCompare(b.evento.da)).map(({ evento: e, presi }) => [e.titolo, `${fdate(e.da)}${e.a && e.a !== e.da ? ` → ${fdate(e.a)}` : ''}`, e.posti, presi, pct(presi, e.posti),
      e.suRichiesta || e.prezzoCent === null ? 'da concordare' : euro(e.prezzoCent), e.suRichiesta || e.prezzoCent === null ? 'da concordare' : euro(presi * e.prezzoCent)])));
  out.push('## 8. Dati che oggi non abbiamo', '', 'Non esistono ancora, quindi non cercarli e non stimarli: vendite per tipo di pacchetto, disdette fatte tardi, liste d\'attesa, presenze reali (qui le prenotazioni valgono come presenze), motivo delle pause, quanti giorni passano dal primo messaggio all\'iscrizione, e quali post o storie portano nuovi contatti.', '');
  return out.join('\n');
}
